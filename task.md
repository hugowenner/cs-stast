# Checklist de Implementação: Dashboard 4.1 — Level GC, Nomenclatura e Ranking Mensal

- [x] Modificar `prisma/schema.prisma` adicionando `levelGc` em `Player` e `PlayerMatchStats`.
- [x] Criar e executar a migration Prisma (`prisma migrate dev` localmente).
- [x] Atualizar o DTO `syncPlayerMatchStatsSchema` em `src/server/dtos/sync.dto.ts` para validar `levelGc`.
- [x] Atualizar o adapter da GC em `src/server/adapters/gamersclub/types.ts` e `normalize.ts` para mapear `levelGc`.
- [x] Adicionar testes unitários de normalização para `levelGc` em `normalize.test.ts`.
- [x] Atualizar o `match.service.ts` para persistir o histórico de `levelGc` e atualizar condicionalmente o `Player.levelGc` se a partida for a mais recente.
- [x] Corrigir `playerMatchStats.repository.ts` na query de Rankings para filtrar partidas jogadas nos últimos 30 dias.
- [x] Renomear exibições de "ELO" para "Rating do Hub" no `competitive.service.ts` e na UI.
- [x] Integrar exibição do Level GC na UI (Dashboard e perfis) ao lado do Rating.
- [x] Validar compilação typescript e build de produção.
