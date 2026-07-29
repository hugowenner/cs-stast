# Checklist de Implementação: Temporadas Mensais (Seasons)

- [x] FASE 1 — Infraestrutura
  - [x] Adicionar `SeasonStatus` enum em `prisma/schema.prisma`
  - [x] Adicionar `Season` model em `prisma/schema.prisma`
  - [x] Adicionar `SeasonSnapshot` model em `prisma/schema.prisma`
  - [x] Vincular `seasonId` e relação `Season` no model `Match`
  - [x] Criar índices de banco (`seasonId` e `(seasonId, playedAt)`)
  - [x] Gerar e aplicar a migração Prisma (`add_seasons_models`)
  - [x] Atualizar o script de seed (`prisma/seed.ts`) para gerar dinamicamente a temporada do mês corrente (ex: "Julho/2026")
  - [x] Criar `src/server/services/season.service.ts` com métodos base (`getActiveSeason`, `getSeason`, `listSeasons`, `createSeason`, `ensureCurrentSeason`)
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com `npm run test`

- [x] FASE 2 — Persistência
  - [x] Associar novas partidas à temporada activa na ingestão (`src/server/services/match.service.ts`)
  - [x] Criar script de migração de partidas existentes para a temporada default no seed (`prisma/seed.ts`)
  - [x] Validar persistência e associação de novas partidas
  - [x] Validar compilação (`npm run typecheck`)
  - [x] Validar testes unitários (`npm run test`)

- [x] FASE 3.1 — Correção obrigatória (Backfill) e Competitive Service
  - [x] Remover o backfill de `seed.ts` e deixá-lo focado em sementes de novas temporadas
  - [x] Criar o script dedicado e idempotente `src/server/admin/backfill-match-seasons.ts` para backfill de histórico
  - [x] Atualizar `package.json` com o comando `"db:backfill-seasons"`
  - [x] Adaptar `loadCompetitiveDataset(seasonId?: string)` em `competitive.service.ts` para aceitar filtro de temporada e fallback automático para a temporada ativa
  - [x] Validar compilação (`npm run typecheck`)
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 3.2A — Stats Service
  - [x] Adaptar todos os métodos públicos de `stats.service.ts` para aceitar `seasonId?: string`
  - [x] Resolver a temporada ativa com fallback automático quando `seasonId` for omitido
  - [x] Alterar consultas Prisma para filtrar por `match.seasonId`
  - [x] Fase 6: Integração de Navegação e Homologação
  - [x] Atualizar os menus `sidebar.tsx` e `layout-shell.tsx` para o link interno
  - [x] Rodar builds de teste (`npm run typecheck` e `npm run build`) para validar a compilação final
  - [x] Fase 7: Correção do Hall da Fama e Ajuste de Layout
  - [x] Remover abas extras do Hall da Fama e focar apenas na temporada atual
  - [x] Renomear todos os rótulos de medalha para "Recorde da Temporada"
  - [x] Remover seção "Histórias da Semana" e mover "Hall da Fama" para seu lugar
- [x] Fase 8: Expansão dos Recordes (12 Métricas)
  - [x] Adicionar 5 novas categorias (Maior Impacto, Mais MultiKills, Maior Dano, Maior Clutch, Maior Consistência) no backend
  - [x] Mapear os metadados visuais de design no frontend sem alteração de estilo ou redesenho
  - [x] Executar testes de tipos e build de produção para certificar estabilidade
- [x] Fase 9: Proteção do Histórico de Auditoria
  - [x] Remover botão de deletar registro do frontend público
  - [x] Proteger o endpoint `DELETE /api/team-balance/matches/[id]` no backend com `checkAdminAuth()`
  - [x] Mantenha métricas de janela móvel / timelines históricos intocados
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 3.2B — Coach IA e Cache por Temporada
  - [x] Centralizar e atualizar chaves do Coach IA em `src/server/coach/services/coach.service.ts`
  - [x] Isolar chaves de cache e ponteiros do Coach por `seasonId`
  - [x] Adicionar cache de ID de temporada ativa na memória em `src/server/services/season.service.ts` para leitura síncrona
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 3.3 — Dashboard Service e Sazonalização Completa do Dashboard
  - [x] Adaptar `getDashboardSummary` no `dashboard.service.ts` para aceitar `seasonId?: string`
  - [x] Sazonalizar contagem de partidas, rounds, mapas e MVPs no Dashboard
  - [x] Conectar as chaves do Coach no Dashboard à temporada ativa
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 4.1 — APIs
  - [x] Adicionar suporte a `seasonId` (ou `season`) nas APIs existentes (dashboard, coach dashboard, stats ranking, stats maps, etc.)
  - [x] Manter compatibilidade total com chamadas antigas
  - [x] Centralizar `resolveSeasonId` em `src/server/services/season.service.ts` e remover duplicados
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 4.2 — Frontend (SeasonSelect)
  - [x] Criar componente `SeasonSelect` para exibição e controle de navegação de temporadas
  - [x] Adicionar suporte a parâmetro de busca na URL `?season=` preservando SSR
  - [x] Adicionar badges visuais dinâmicos ("Temporada Atual" vs "Arquivo") ao lado do título da dashboard
  - [x] Conectar o `CoachReportCard` para propagar o parâmetro de temporada correspondente
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 5.1 — SeasonSnapshot
  - [x] Criar método `createSnapshot(seasonId)` em `SeasonService` para compilar e salvar o dashboard completo
  - [x] Criar método `validateSnapshot(snapshotData)` para verificar a integridade estrutural e de versão do snapshot
  - [x] Integrar leitura rápida $O(1)$ de snapshots para temporadas fechadas no Dashboard Server Component
  - [x] Integrar leitura rápida $O(1)$ de snapshots para o Coach IA nas rotas `api/coach/dashboard` e `api/dashboard`
  - [x] Corrigir bug estrutural de Alternate Data Streams no Coach Cache sob Windows (substituição de colons por underscores nos arquivos de ponteiro)
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)

- [x] FASE 5.2 — Automação de Rollover
  - [x] Implementar fluxo transacional de rollover no `SeasonService`
  - [x] Bloquear endpoints de sincronização com HTTP 503 e mensagem explicativa durante a janela de rollover
  - [x] Validar o funcionamento de meses de 28, 29, 30 e 31 dias no motor de datas com independência de fuso horário local (+48h buffer)
  - [x] Criar testes unitários para a máquina de rollover (idempotência, sucesso, rollback e calendário)
  - [x] Validar compilação com `npm run typecheck`
  - [x] Validar regressões com testes unitários (`npm run test`)
