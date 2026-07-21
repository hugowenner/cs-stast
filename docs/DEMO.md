# Modo demo (SQLite, sem Docker)

Sobe uma aplicação completa e funcional em segundos, sem depender do Docker/Postgres: SQLite local (`prisma/dev.db`), catálogo de achievements/mapas semeado, uma partida de exemplo sincronizada através do **pipeline real** (adapter → Zod → Services → engines → banco — não é um INSERT direto), e o Dashboard aberto em `http://localhost:3210`.

```bash
npm run demo
```

Para testar com partidas **reais** da extensão a partir de um banco zerado (sem a partida de exemplo atrapalhando a contagem), use `empty-demo` em vez de `demo`:

```bash
npm run reset-demo   # se já tinha um banco de demo rodando
npm run empty-demo   # banco novo: 0 partidas, 0 jogadores, só o catálogo semeado
```

Para resetar (apaga o banco de demo e volta para Postgres):

```bash
npm run reset-demo
```

`reset-demo` só mexe no SQLite local (`prisma/dev.db`, `prisma/schema.sqlite.prisma`, `src/generated/prisma-sqlite`) — nunca existiu um Postgres rodando neste projeto pra limpar (Docker nunca foi instalado), então não há nada do lado Postgres para se preocupar.

## Por que existe

Não é o banco de produção. É só para testar rapidamente sem precisar do Docker Desktop instalado — normalizador, validação Zod, Services, engines (Rating, ELO, Achievements, Rivalry) e o Dashboard, tudo com dados reais passando pelo sistema de verdade, sem mock.

## Como funciona por baixo

`schema.prisma` continua sendo a **única fonte de verdade** (Postgres, o banco de produção real). O modo demo nunca edita esse arquivo — ele deriva um schema temporário e descartável a partir dele:

```
scripts/demo/generate-sqlite-schema.mjs
  lê prisma/schema.prisma
  troca provider "postgresql" → "sqlite" e o output do client
  escreve prisma/schema.sqlite.prisma (gitignored, sempre gerado, nunca editado à mão)

scripts/demo/generate-provider.mjs sqlite|postgres
  reescreve src/server/db.provider.ts — a única indireção que db.ts usa
  para saber qual driver adapter + Prisma Client importar
```

`npm run dev` e `npm run build` têm hooks `predev`/`prebuild` que **sempre regeneram `db.provider.ts` de volta para Postgres antes de rodar** — então esquecer de sair do modo demo nunca quebra o fluxo normal.

## O que `npm run demo` faz, na ordem

1. Aponta `db.provider.ts` para SQLite.
2. Gera `prisma/schema.sqlite.prisma` a partir do schema real.
3. `prisma db push` — cria `prisma/dev.db` a partir desse schema (sem histórico de migrations — é descartável, não precisa).
4. `prisma generate` — gera o Prisma Client para SQLite em `src/generated/prisma-sqlite`.
5. Roda o seed (`prisma/seed.ts`) — catálogo de achievements e mapas.
6. Ingesta `src/server/adapters/gamersclub/fixtures/match-standard.json` através do pipeline real (`normalizeGamersClubMatch` → `ingestMatchSync`) — exercita adapter, Zod, Services, RatingCalculator, EloEngine, AchievementEngine e RivalryEngine de verdade. **`npm run empty-demo` pula esta etapa** — banco sai do passo 5 direto para o 7, com 0 partidas.
7. Sobe `next dev -p 3210`.

## Diferenças do Postgres (leia antes de generalizar um resultado)

- **Enums** (`MatchTeam`, `EventType`, etc.) viram coluna `TEXT` simples no SQLite — sem `CHECK` no banco. Continuam válidos porque só escrevemos neles através de código TypeScript/Zod já tipado, mas o SQLite não pegaria um valor inválido que o Postgres pegaria.
- `skipDuplicates` do Prisma **não existe no SQLite** — descoberto rodando o modo demo de verdade (ver `playerAchievement.repository.ts`). Removido porque não era necessário (os invariantes de quem chama já evitam duplicata real), mas é um lembrete de que o SQLite não é um substituto perfeito do Postgres — qualquer coisa Postgres-specific (o índice único parcial de `PlayerAchievement`, por exemplo) precisa ser conferida manualmente se você adicionar alguma no futuro.
- Sem histórico de migrations no modo demo (`db push` em vez de `migrate dev`) — de propósito, já que o banco é descartável.

Se algo funciona no demo e não funciona no Postgres (ou vice-versa), assuma primeiro que é uma dessas diferenças antes de qualquer outra hipótese.
