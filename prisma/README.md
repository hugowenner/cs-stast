# prisma

`schema.prisma` — modelo de dados (ver `docs/DATABASE.md`).

`migrations/20260716173246_init` — migration inicial, gerada offline via `prisma migrate diff --from-empty --to-schema` (sem depender de um banco ativo). Inclui um índice único parcial para conquistas cumulativas que não é representável diretamente no `schema.prisma` — ver comentário no próprio `migration.sql`. Como nenhuma migration foi aplicada a um banco real ainda, o schema tem sido regenerado do zero a cada mudança em vez de acumular migrations incrementais — isso muda assim que o Docker subir e uma primeira migration for de fato aplicada.

Aplicar contra um Postgres local (Docker Compose): `npm run db:deploy` (produção/CI) ou `npm run db:migrate` (dev, detecta novas mudanças no schema).
