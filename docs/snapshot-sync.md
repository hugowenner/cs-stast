# Sincronização consistente VPS → DEV

## Diagnóstico de 30/10/2026

O script anterior lia contagens da VPS antes da cópia (`vpsCounts`), copiava cada
tabela com outro `findMany()` e comparava o DEV com aquelas contagens iniciais.
Não existia transação de leitura abrangendo as tabelas. O número 464 apresentado
na coluna VPS da validação não era uma nova contagem final. Com gravações
concorrentes, 466 payloads podiam ser copiados após uma contagem inicial de 464.

A limpeza e os lotes de inserção também não estavam em uma única transação no
destino: código de saída 1 não desfazia o DEV. Foram comprovadas misturas de
versões em `28174348` e `28174636`: Match.roundsJson ainda tinha rounds GC,
enquanto o payload posterior já estava PROCESSED. Em produção esses mesmos
payloads tinham hash idêntico ao DEV e rounds corretamente projetados no Match.

## Implementação

- `scripts/sync-db-from-vps.ps1`: túnel SSH próprio, validação da identidade do
  container remoto, processo oculto no Windows, restauração das variáveis de
  ambiente anteriores e encerramento apenas do túnel que o script criou.
- `scripts/sync-from-vps-to-pg.ts`: backup completo do DEV, leitura do catálogo,
  SHA-256, restauração real em banco NOVO, validação, cópia e promoção de conexão.
- `src/server/operations/snapshot-copy.ts`: conexão dedicada em REPEATABLE READ
  READ ONLY, SET LOCAL ROLE pg_read_all_data, verificação efetiva de SELECT e
  ausência de INSERT/UPDATE/DELETE/TRUNCATE nas 20 tabelas. Nunca altera grants,
  papéis ou configuração persistente na origem.
- Manifesto e cópia usam a MESMA transação e o mesmo snapshot. Novas gravações
  na VPS continuam permitidas e ficam fora desse snapshot.
- Origem e destino são comparados por quantidade e SHA-256 de todas as colunas,
  ordenadas pela chave primária. Casts textuais preservam microsegundos, números
  grandes, NULL SQL e null JSONB. Encoding/collation e colunas são conferidos.
- A substituição das 20 tabelas é uma única transação no banco temporário. Falhas
  causam rollback. A transação usa advisory lock e locks exclusivos apenas no
  destino local isolado.
- Verificações referenciais e dos quatro IDs prioritários são executadas também
  na conexão de origem antes de encerrar o snapshot; não contra a VPS futura.
- `.env` e `.env.local` só são promovidos depois da validação. O banco anterior
  nunca é apagado, renomeado ou sobrescrito. Backups dos arquivos são privados,
  ficam em `backups/` e não devem ser versionados.

## Escopo

Map, Achievement, Player, tracked_players, Season, Session, Match,
PlayerMatchStats, PlayerAchievement, Rivalry, Event, PlayerClutch,
PlayerEntryDuel, PlayerMatchup, PlayerTradeEvent, sync_jobs, match_payloads,
SeasonSnapshot, TeamBalanceMatch e team_balance_players.

Configuration, User, Import, Log e histórico de migrations são preservados a
partir do backup DEV verificado. Não se trata de clone integral de todos os
dados administrativos da produção. Divergência de schema impede a cópia.

## Execução

```powershell
npm run db:sync-from-vps
# Somente quando a operação já estiver expressamente autorizada:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-db-from-vps.ps1 -Yes
```

O entrypoint direto exige túnel próprio verificado em localhost:5433, banco de
origem cs2stats e flag `--execute`. `--promote-dev` promove os arquivos de conexão;
sem ela o banco novo validado fica disponível para inspeção, sem promoção.
Nenhum consumidor de normalização ou worker é iniciado por esses comandos.

## Verificação e rollback

O relatório `backups/sync-manifest-<referência>.json` contém snapshot, horário UTC,
papel efetivo, manifesto por tabela, hash/local do dump, estado da restauração,
integridade, fixtures e nomes dos bancos. Não contém senhas.

Após promoção, reinicie somente a aplicação DEV local para que pools existentes
leiam o novo DATABASE_URL. Novas conexões passam a apontar ao banco promovido.
Nunca reinicie a VPS por causa desta operação.

Para rollback de conexão, pare apenas a aplicação DEV, restaure `.env` e
`.env.local` pelos arquivos `backups/env-before-*` e `env.local-before-*` da
execução correspondente e reinicie o DEV. O banco anterior continua existente.
Não restaure um dump sobre um banco existente por impulso; uma restauração de
recuperação deve utilizar outro banco local novo e passar pela validação.

Backups incompletos, bancos temporários ou arquivos de tentativas falhas são
preservados para diagnóstico. Não são promovidos nem apagados automaticamente.

## Limites da integridade

Igualdade com o snapshot comprova fidelidade da cópia, não correção estatística
dos dados de produção. Anomalias históricas são registradas separadamente e não
reparadas por este comando. O relatório distingue integridade estrutural,
conteúdo copiado, estados operacionais e inconsistências históricas.

## Testes isolados

`snapshot-copy.test.ts` verifica alvos permitidos e rejeita URLs enganosas.
`snapshot-copy.integration.test.ts` cria dois bancos descartáveis cujo nome é
gerado pelo teste. O admin precisa ser local e apontar para /postgres. A suíte
testa escrita concorrente, snapshot estável, rollback integral, schema
incompatível, corrupção com contagem igual, precisão temporal, números grandes,
NULL/JSONB null, repetição e FKs. Não usa o banco DEV real como destino de teste.

Defina CS2_SNAPSHOT_TEST_ADMIN_URL apenas para a conexão admin local de testes e
execute a suíte com Vitest. Sem essa variável os testes de integração são pulados.
