# Checklist de Implementação: Auditoria de Pipeline e Exibição de Métricas Nativas (Fase 4A - GC Stats)

- [x] Auditoria de Campos Ingestão Gamers Club
  - [x] Auditar campos no JSON bruto da GC (damage, rating_points, levels, headshots, flash_assist, entrykills, etc.)
  - [x] Auditar mapeamento no Normalizer (`normalize.ts`)
  - [x] Auditar colunas na tabela `PlayerMatchStats` do schema Prisma
  - [x] Elaborar mapeamento de pendências e sugestões de visualização

- [x] Exibição de Métricas Nativas (Fase 2)
  - [x] Atualizar query de repositório `getPlayerCareerTotals` em `playerMatchStats.repository.ts` para somar `damage`, `tradeKills`, `clutchesWon`, `flashAssists`, `doubleKills`, `tripleKills`, `quadKills`, `aces` e obter a média de `gcRating`
  - [x] Estender o contrato `PlayerProfileDTO` com as novas estatísticas de carreira
  - [x] Atualizar função de cálculo `calculateOverview` em `metrics.service.ts` para mapear e formatar os campos agregados no DTO
  - [x] Adicionar blocos de visualização "Métricas Nativas Gamers Club" e detalhamento de "Multikills (2K, 3K, 4K, Aces)" na página de perfil público (`/players/[id]`)

- [x] Ranking de Especialistas: Top Multikills da Temporada (`src/app/(public)/page.tsx`)
  - [x] Computar em memória a partir do dataset existente as leaderboards de Double Kills, Triple Kills, Quad Kills, Aces
  - [x] Atualizar DTOs e bundles competitivos em `competitive.service.ts`
  - [x] Renderizar 4 mini-cards condicionais no Dashboard Público
  - [x] Adicionar testes unitários correspondentes em `competitive.test.ts`

- [x] Validação e Verificação
  - [x] Executar typecheck global
  - [x] Rodar os testes unitários do vitest
