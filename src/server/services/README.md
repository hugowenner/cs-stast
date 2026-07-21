# services

Regra de negócio. Orquestra `repositories/` e `domain/`. Chamado pelos Route Handlers (`app/api/**`), incluindo as rotas `/api/sync/*` que recebem dados do GC Companion (ver `docs/COMPANION.md`). Nunca acessa o Prisma diretamente — sempre via repository.
