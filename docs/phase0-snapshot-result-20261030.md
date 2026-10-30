# Fase 0 — resultado da sincronização de 30/10/2026

## Resultado
Sincronização concluída com código 0. DEV promovido para `cs2_stats_dev_snapshot_20261030133537066`. Banco anterior `cs2_stats_dev_snapshot_20260920` preservado sem sobrescrita. Snapshot de referência: **30/10/2026 10:36:04.366990 America/Sao_Paulo** (13:36:04.366990 UTC), identificador `44358:44358:`.

## Causa comprovada
O script anterior não usava snapshot abrangente. A coluna VPS da validação exibia vpsCounts, coletado antes da cópia. Os findMany por tabela e a validação ocorriam em momentos diferentes. O código de saída 1 não revertia as exclusões e inserções já confirmadas no DEV. Além das contagens, duas partidas (28174348 e 28174636) comprovaram mistura de rounds GC antigos com payloads posteriores PROCESSED.

## Mecanismo corrigido
Conexão de origem dedicada REPEATABLE READ READ ONLY, com papel efetivo pg_read_all_data e verificação de ausência de privilégios INSERT/UPDATE/DELETE/TRUNCATE nas 20 tabelas. Manifesto e extração compartilham o snapshot. Cópia em transação única no banco local novo, conferência de contagens e SHA-256 de todas as colunas. Backup restaurado e validado antes da cópia. Promoção de .env/.env.local somente depois da validação.

## Backup verificado
Arquivo: `C:\Users\ramobh\Documents\cs2-stats\backups\dev_backup_before_vps_sync_20261030133537066.dump`.
SHA-256: `7ce48b1d090f57dacebb81d5838715fe56f64699851d0e34c4a185c11d4cdd77`.
Tamanho: 28.000.040 bytes. O catálogo foi lido e houve restauração completa real em banco local novo com pg_restore --single-transaction --exit-on-error. As 29 FKs do banco restaurado foram validadas. O backup anterior de 10:12 também foi preservado; sua decodificação completa havia sido validada sem restauração sobre o DEV.

## Quantidades — todas conferem com o mesmo snapshot

| Tabela | Registros | Conteúdo SHA-256 |
|---|---:|---|
| Map | 10 | Confere |
| Achievement | 35 | Confere |
| Player | 4938 | Confere |
| tracked_players | 13 | Confere |
| Season | 11 | Confere |
| Session | 172 | Confere |
| Match | 750 | Confere |
| PlayerMatchStats | 7649 | Confere |
| PlayerAchievement | 17870 | Confere |
| Rivalry | 31677 | Confere |
| Event | 71435 | Confere |
| PlayerClutch | 7152 | Confere |
| PlayerEntryDuel | 10969 | Confere |
| PlayerMatchup | 11411 | Confere |
| PlayerTradeEvent | 6804 | Confere |
| sync_jobs | 611 | Confere |
| match_payloads | 480 | Confere |
| SeasonSnapshot | 1 | Confere |
| TeamBalanceMatch | 13 | Confere |
| team_balance_players | 130 | Confere |

## Integridade
- 29 chaves estrangeiras validadas; zero órfãos.
- Zero índices inválidos.
- Zero duplicidades nos grupos verificados: jogador/partida, origem/ID de payload, ID GC de partida e papel de entry por round.
- Zero payloads GC sem Match; zero adversários de entry inexistentes; zero partidas sem estatísticas.
- 480 payloads PROCESSED; schema 1.0.0 e parser 0.41.4.
- Timestamps, JSONB e todas as demais colunas incluídos no manifesto de conteúdo.
- Fonte e destino comparados nas mesmas versões para estados, schema/parser, anomalias e quatro partidas prioritárias.

## Partidas prioritárias

| GC ID | Estado | Event total | Clutches | Entries | Trades |
|---|---|---:|---:|---:|---:|
| 28120889 | PROCESSED | 196 | 39 | 50 | 44 |
| 28121066 | PROCESSED | 164 | 0 | 0 | 0 |
| 28124471 | PROCESSED | 151 | 0 | 0 | 0 |
| 28187540 | PROCESSED | 162 | 28 | 44 | 29 |

Event total inclui KILL e eventos especiais. Zeros premium das duas partidas solo reproduzem a regra vigente; não foram corrigidos por uma cópia de banco. Os hashes dos payloads e contagens das fixtures coincidiram com a origem no snapshot.

## Diferenças residuais
Nenhuma divergência de contagem ou conteúdo nas 20 tabelas copiadas. Há 29 partidas fora do intervalo da temporada e 61 divergências rounds/payload, ambas presentes na origem no mesmo snapshot. As 61 correspondem a rounds JSON null legados; as duas misturas adicionais introduzidas pela cópia anterior desapareceram. Isso comprova fidelidade da cópia, não saneamento estatístico.

Configuration, User, Import, Log e histórico de migrations foram preservados a partir do backup DEV. São dados fora do escopo de cópia definido, não divergências omitidas.

## Produção
Nenhuma instrução de alteração de dados/schema/grants foi executada na VPS. Origem com papel efetivo de leitura e transação READ ONLY; pg_dump/pg_restore e CREATE DATABASE foram executados apenas no Docker local. Containers públicos permaneceram running, sem reinício (app iniciada 29/10 19:18:27 UTC, PostgreSQL 28/10 14:44:58 UTC; RestartCount 0). A rota pública respondeu HTTP 405 ao GET de /api/sync/ping, comportamento esperado de endpoint POST-only. Isso verifica alcance HTTP, sem alegar teste visual completo.

## Testes e arquivos
13 testes passaram em duas suítes: alvos permitidos, snapshot sob escrita concorrente, rollback, schema incompatível, corrupção com contagem igual, precisão temporal/numérica, NULL/JSONB null, repetição e FKs. Typecheck do projeto e compilação TypeScript específica do script passaram; ESLint dos arquivos alterados passou.
Arquivos: scripts/sync-db-from-vps.ps1; scripts/sync-from-vps-to-pg.ts; scripts/verify-dev-snapshot.ts; src/server/operations/snapshot-copy.ts; snapshot-copy.test.ts; snapshot-copy.integration.test.ts; snapshot-integrity.ts; package.json; docs/snapshot-sync.md; este relatório. Nenhuma migration criada ou aplicada.

## Auditoria repetível e rollback
Manifesto completo: `backups/sync-manifest-20261030133537066.json`.
Verificação independente somente leitura: `npm run db:verify-snapshot -- --manifest backups/sync-manifest-20261030133537066.json`.
Rollback de conexão: restaurar os arquivos backups/env-before-20261030133537066 e env.local-before-20261030133537066 para .env e .env.local e reiniciar somente a aplicação DEV. O banco anterior continua existente. Não há motivo para sobrescrever um banco com dump para reverter esta promoção.

## Pendências do projeto
As demais fases da operação (fila durável, worker, parser, reconciliação, estatísticas, backfill) não são corrigidas por esta sincronização e permanecem pendentes. Fórmulas oficiais, snapshots oficiais e produção não foram alterados.

## Verificação independente após promoção
O comando db:verify-snapshot concluiu com código 0, verificando novamente SHA-256/contagem das 20 tabelas e as 29 FKs. Os 13 testes foram repetidos com sucesso após os ajustes finais. A aplicação Next.js exclusivamente local foi reiniciada; GET http://localhost:3210/api/dashboard retornou HTTP 200, e pg_stat_activity confirmou sete conexões da aplicação no banco cs2_stats_dev_snapshot_20261030133537066. Nenhuma conexão da aplicação foi encontrada no DEV anterior nesse momento.
