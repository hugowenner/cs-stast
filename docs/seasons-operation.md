# Seasons — Guia de Operação

## Visão geral

O sistema de Seasons segmenta o histórico de partidas e estatísticas em períodos mensais. Cada temporada corresponde exatamente a um mês UTC, tem um único registro `ACTIVE` por vez e é encerrada via rollover.

### Status possíveis

| Status | Significado |
|--------|-------------|
| `ACTIVE` | Temporada em andamento. Todas as partidas novas são associadas a ela. |
| `CLOSED` | Temporada encerrada. Snapshot permanente gerado. Somente leitura. |

---

## Funcionamento Normal

### Resolução automática de temporada

Toda query que depende de uma temporada usa `resolveSeasonId()`:

```
Coach Service / Stats Service / Dashboard Service
       ↓
SeasonService.resolveSeasonId(seasonId?)
       ↓
Database → Season[status=ACTIVE]
```

- Se `seasonId` for passado e válido, usa diretamente.
- Se omitido ou `"current"`, busca a temporada `ACTIVE` no banco.
- Não existe cache em memória — toda resolução vai ao banco.

### Criação automática

`ensureCurrentSeason()` cria a temporada do mês atual se nenhuma estiver `ACTIVE`. É chamada nos endpoints de sync ao processar a primeira partida do mês.

---

## Processo de Rollover

O rollover é executado uma vez por mês, no início do novo mês, pelo administrador.

### Sequência de execução

```
1. Detectar temporada ACTIVE
2. Calcular nome e datas da próxima temporada (UTC)
3. Verificar idempotência (próxima já existe como ACTIVE?)
4. Ativar modo de manutenção (MAINTENANCE=true)
5. Aguardar 3s para requisições em andamento finalizarem
6. Gerar snapshot completo (Dashboard + Competitive + Coach)
7. Validar integridade do snapshot
8. Transação atômica:
   a. Temporada atual → CLOSED
   b. Nova temporada → ACTIVE
9. Invalidar cache do Coach IA
10. Desativar modo de manutenção (MAINTENANCE=false) — sempre, mesmo em falha
```

### Via endpoint administrativo

```bash
curl -X POST https://<seu-domínio>/api/admin/seasons/rollover \
  -H "Authorization: Bearer $ADMIN_SECRET_KEY"
```

**Respostas:**

```json
// 200 — sucesso
{ "status": "success", "previousSeason": "Julho/2026", "newSeason": "Agosto/2026" }

// 200 — já executado anteriormente (idempotente)
{ "status": "skipped", "reason": "already_rolled_over" }

// 401 — token inválido ou ausente
{ "error": "Unauthorized" }

// 500 — falha interna (modo de manutenção é desligado automaticamente)
{ "error": "Internal server error" }
```

> **GET não executa rollover.** Retorna 405.

### Via código (uso programático)

```ts
import { rolloverSeason } from "@/server/services/season.service";

const result = await rolloverSeason();
// result.status: "success" | "skipped"
// result.closed?.name — nome da temporada encerrada
// result.opened?.name — nome da nova temporada
```

---

## Falha de Snapshot

Se `createSnapshot()` lançar erro durante o rollover:

- A exceção é propagada pelo `catch`.
- O bloco `finally` **sempre** desativa o modo de manutenção.
- A temporada antiga **não é fechada** (transação não foi executada).
- O sistema volta ao estado anterior automaticamente.

### Diagnóstico

```bash
# Verificar se o modo de manutenção ficou preso
curl https://<domínio>/api/sync/ping

# Verificar no banco
SELECT key, value FROM "Configuration" WHERE key = 'MAINTENANCE';
```

---

## Recuperação Manual

### Cenário: modo de manutenção preso após falha

```sql
UPDATE "Configuration" SET value = '{"enabled": false}' WHERE key = 'MAINTENANCE';
```

### Cenário: temporada criada mas snapshot ausente

```bash
# Re-executar apenas o snapshot via endpoint (se implementado)
# Ou via código:
import { createSnapshot } from "@/server/services/season.service";
await createSnapshot("<season-id>");
```

### Cenário: duas temporadas ACTIVE simultaneamente

Causado por inserção manual incorreta. Corrija no banco:

```sql
-- Identificar a duplicata
SELECT id, name, status, "startDate" FROM "Season" WHERE status = 'ACTIVE' ORDER BY "startDate";

-- Fechar a mais antiga manualmente
UPDATE "Season" SET status = 'CLOSED' WHERE id = '<id-antigo>';
```

---

## Execução Administrativa

### Variável de ambiente obrigatória

```bash
ADMIN_SECRET_KEY=<token-seguro>
```

Defina no painel da Vercel ou no `.env.local` para desenvolvimento.

### Teste de integração

```bash
npm run season:test-rollover
```

Valida o ciclo completo em ambiente real (sem chamada à IA — snapshot é mockado). Cria e remove dados de teste isolados (`Janeiro/2020` e `Fevereiro/2020`).

---

## Calendário UTC

Todas as datas de temporada são calculadas em UTC puro:

| Função | Implementação |
|--------|---------------|
| `getSeasonNameForDate(date)` | `getUTCMonth()` + `getUTCFullYear()` |
| `getSeasonDatesForDate(date)` | `Date.UTC(year, month, 1, 0,0,0,0)` → `Date.UTC(year, month+1, 0, 23,59,59,999)` |
| Cálculo da próxima temporada | `activeSeason.endDate.getTime() + 1000` ms (1 segundo após o fim UTC) |

Não existem buffers de fuso horário, offsets locais ou `getMonth()` / `getFullYear()` (sem UTC) no código de seasons.
