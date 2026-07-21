# API

Route Handlers do Next.js (`app/api/**`), REST-like, JSON. Toda entrada validada com Zod; toda saída tipada. Sem autenticação no MVP.

> Convenção: rotas de leitura pública, rotas de escrita reservadas ao importador/admin local (sem controle de acesso ainda — confiança implícita no ambiente local).

## Players

- `GET /api/players` — lista jogadores (paginação simples)
- `GET /api/players/:id` — detalhe + estatísticas agregadas
- `GET /api/players/:id/rivalries` — rivalidades do jogador
- `GET /api/players/:id/achievements` — conquistas do jogador
- `GET /api/players/:id/matches` — histórico de partidas

## Sessions

- `GET /api/sessions` — lista sessões (mais recentes primeiro)
- `GET /api/sessions/:id` — detalhe: partidas, MVP da noite, resumo

Sessões não têm rota de criação própria — são inferidas automaticamente pela data da partida sincronizada (ver `findOrCreateSessionForDate`) ou renomeadas via `POST /api/sync/session`.

## Matches

- `GET /api/matches` — lista partidas recentes
- `GET /api/matches/:id` — detalhe completo: stats por jogador, eventos, clutches

Partidas não têm rota de criação direta — são criadas exclusivamente via `POST /api/sync/match` (ver Sync abaixo), que computa rating/ELO antes de persistir.

## Stats / Rankings

- `GET /api/stats/ranking?metric=rating|adr|kast|impact|elo&take=20` — ranking geral por métrica (`elo` usa o valor mais recente por jogador; as demais são médias)
- `GET /api/stats/maps` — winrate agregado por mapa
- `GET /api/stats/timeline?playerId=...` — evolução do ELO do jogador ao longo do tempo

## Achievements

- `GET /api/achievements` — catálogo de conquistas
- `GET /api/achievements/recent` — conquistados recentemente (feed)

## Rivalries

- `GET /api/rivalries/top` — maiores rivalidades do grupo

## Sync (GC Companion)

Rotas que recebem dados **empurrados** pela extensão CS2 Stats Companion (ver [docs/COMPANION.md](COMPANION.md)). O backend nunca inicia essas chamadas nem autentica na Gamers Club — apenas recebe e persiste o que a extensão já capturou do navegador do usuário. Sem autenticação própria: a superfície de confiança é "roda em localhost".

- `POST /api/sync/player` — upsert de um jogador (steamId/gamersClubId, nickname, avatar)
- `POST /api/sync/match` — cria/atualiza uma partida completa já no formato interno (`SyncMatchInput`) — idempotente por `gamersClubMatchId`. **Agnóstica de provedor**: não conhece o formato da Gamers Club, só o nosso contrato interno.
- `POST /api/sync/gamersclub/match` — recebe o payload **bruto** de `{url-da-partida}/1` da Gamers Club (`{ payload: {...} }`), normaliza via `src/server/adapters/gamersclub/normalize.ts` e delega para o mesmo fluxo de `/api/sync/match`. É esta rota que a extensão chama — ver [docs/COMPANION.md](COMPANION.md).
- `POST /api/sync/session` — cria/atualiza uma sessão ("Mix de Quinta")
- `POST /api/sync/ping` — heartbeat da extensão (versão instalada, timestamp) — alimenta o indicador "Backend conectado" da UI da extensão

Toda chamada que resulta em ingestão de partida (criação ou já sincronizada) grava um registro em `Import`, incluindo o payload bruto recebido (`rawPayload`) quando aplicável — para auditoria, depuração e reprocessamento futuro. As demais rotas de sync não geram log de import por serem operações auxiliares (upsert de jogador, sessão, heartbeat).

- `GET /api/imports` — histórico de sincronizações de partidas recebidas

## Configuration

- `GET /api/config` / `PUT /api/config` — parâmetros de sistema (K-factor ELO, ID do grupo Gamers Club)

---

Contratos de request/response (schemas Zod) serão definidos junto ao código em `src/server/dtos/**` na Etapa 6 — este documento descreve a superfície da API, não os schemas exatos, para evitar duplicação que fica desatualizada.
