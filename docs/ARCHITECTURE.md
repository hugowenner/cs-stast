# Arquitetura

## Visão geral

MVP local, monólito único (Next.js), sem microserviços. O objetivo é manutenibilidade e clareza, não escala global.

```
┌─────────────────────────────────────────────────┐
│  Frontend (app/**)                               │
│  React 19 + Tailwind v4 + shadcn/ui + Framer     │
│  TanStack Query (client state / cache de fetch)  │
└───────────────────────┬───────────────────────────┘
                         │ fetch
┌───────────────────────▼───────────────────────────┐
│  Route Handlers (app/api/**)                       │
│  Controllers finos: parseiam request, validam com  │
│  Zod (DTO), chamam Service, formatam resposta       │
└───────────────────────┬───────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────┐
│  Services (src/server/services/**)                 │
│  Regra de negócio. Orquestram Repositories e        │
│  Engines de domínio.                                │
└───────────────────────┬───────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────┐
│  Repositories (src/server/repositories/**)          │
│  Único ponto de acesso ao Prisma. Sem regra de      │
│  negócio aqui — só queries.                         │
└───────────────────────┬───────────────────────────┘
                         │ Prisma Client
┌───────────────────────▼───────────────────────────┐
│  PostgreSQL (Docker Compose)                        │
└─────────────────────────────────────────────────────┘
```

## Engines de domínio (puros, sem I/O)

Vivem em `src/server/domain/**`. Recebem dados em memória, devolvem resultados. Não conhecem Prisma, HTTP ou o importador — por isso são testáveis isoladamente e reutilizáveis tanto pela API quanto pelo importador.

- `RatingCalculator` — Rating, ADR, KAST, Impact a partir dos eventos brutos de uma partida.
- `EloEngine` — ELO interno por jogador, atualizado por partida (K-factor configurável via `Configuration`).
- `AchievementEngine` — avalia regras (Ace, Clutch, 1000 kills...) contra o histórico e emite `PlayerAchievement` novos.
- `RivalryEngine` — recalcula o head-to-head de um par de jogadores incrementalmente após cada partida.

## Sincronização com a Gamers Club — ecossistema de dois projetos

Decisão de arquitetura (substitui o importador por polling originalmente previsto): o backend **nunca autentica na Gamers Club nem manipula cookies/tokens/sessão**. Toda autenticação permanece exclusivamente no navegador do usuário, que já está logado na GC normalmente. Ver [docs/COMPANION.md](COMPANION.md) para o protocolo completo.

```
Gamers Club (navegador, sessão do usuário)
        │  cookies/sessão nunca saem do browser
        ▼
GC Companion (extensão de navegador — projeto irmão)
        │  busca {url-da-partida}/1 e encaminha o JSON BRUTO, sem interpretar
        ▼
POST http://localhost:3210/api/sync/gamersclub/match
        ▼
adapters/gamersclub/normalize.ts (única fronteira que conhece o formato da GC,
        │                         testada contra fixtures — ver docs/COMPANION.md)
        ▼
CS2 Stats API (este projeto) → Services → Repositories → PostgreSQL
```

- **Projeto 1 — CS2 Stats Desktop** (este repositório): Next.js, API, banco, dashboard.
- **Projeto 2 — CS2 Stats Companion** (repositório irmão, `../cs2-stats-companion`): extensão de navegador que só busca e encaminha o payload bruto de cada partida — não interpreta o formato da GC.

O backend expõe rotas `POST /api/sync/*` (ver `docs/API.md`) que recebem os payloads e os persistem **através dos mesmos Services/Repositories** usados pelo resto da API — nunca grava direto no banco, garantindo que toda partida sincronizada passa pelas mesmas engines (rating, elo, conquistas, rivalidades). A tradução do formato de um provedor específico (ex: Gamers Club) para o contrato interno vive isolada em `src/server/adapters/<provider>/` — nenhum Service ou engine de domínio conhece o formato de um provedor externo. O payload bruto de cada sincronização é persistido em `Import.rawPayload` para reprocessamento/depuração futura.

**Por que essa divisão:** se a Gamers Club mudar o mecanismo de autenticação, apenas a extensão precisa ser ajustada — o backend, que nunca conheceu credenciais, permanece intocado.

## Autenticação

Não implementada no MVP — grupo privado, uso local. A tabela `User` existe no schema para não bloquear uma Fase 2, mas nenhum fluxo de login é construído agora. Toda a aplicação assume acesso de confiança.

## Containers

Docker Compose sobe **apenas o PostgreSQL** (+ pgAdmin opcional para inspeção). A aplicação Next.js roda localmente via `npm run dev` — mantém hot reload rápido e evita rebuild de imagem a cada mudança.

## Por que não

- **Microserviços:** overhead desnecessário para uso de um grupo privado local.
- **Redis/cache distribuído:** TanStack Query no client + queries diretas no Postgres bastam nesta escala.
- **Multiempresa:** schema assume um único grupo. Fase 2 trataria isolamento por tenant se necessário.

## Convenções de código

- TypeScript strict, sem `any` implícito.
- Zod valida toda entrada externa (API e importador).
- Funções e arquivos pequenos — quebrar antes de crescer demais.
- Sem duplicação de lógica entre API e importador (reuso via Services).
- Lint e types limpos antes de considerar uma etapa concluída.
