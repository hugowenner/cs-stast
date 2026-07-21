# CS2 Stats Hub

Plataforma de estatísticas para Counter-Strike 2, inspirada no HLTV/Leetify/FACEIT, focada em um **grupo privado** de jogadores. Centraliza automaticamente as partidas jogadas na Gamers Club, calcula estatísticas avançadas, ELO interno, conquistas e rivalidades, e apresenta tudo em um dashboard moderno.

> **Fase atual: MVP local.** Sem Kubernetes, cloud, microserviços ou alta disponibilidade — isso é Fase 2. Aqui o objetivo é código limpo, arquitetura correta e tudo rodando na máquina local via Docker Compose.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Framer Motion, TanStack Query, Recharts, Lucide Icons
- **Backend:** Next.js Route Handlers, Prisma, Zod
- **Banco:** PostgreSQL (Docker Compose)

## Ecossistema

O backend nunca autentica na Gamers Club. Uma extensão de navegador irmã (**CS2 Stats Companion**, fork do `gamersclub-booster`) roda no navegador já autenticado do usuário e sincroniza os dados via API local — ver [docs/COMPANION.md](docs/COMPANION.md).

```
Gamers Club (navegador) → GC Companion (extensão) → POST localhost:3210/api/sync/* → CS2 Stats API → PostgreSQL → Dashboard
```

## Conceito central: Sessão

```
Mix de Quinta (Session)
  └─ 10 partidas (Matches)
       └─ Resultado da noite
            └─ MVP
                 └─ Estatísticas
                      └─ Conquistas
                           └─ Rivalidades atualizadas
```

## Documentação

| Documento                                    | Conteúdo                                               |
| -------------------------------------------- | ------------------------------------------------------ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura, camadas, decisões técnicas                |
| [docs/DATABASE.md](docs/DATABASE.md)         | Modelo de dados, entidades, relacionamentos            |
| [docs/API.md](docs/API.md)                   | Rotas, DTOs, contratos                                 |
| [docs/COMPANION.md](docs/COMPANION.md)       | Protocolo de sincronização com a extensão GC Companion |
| [docs/FEATURES.md](docs/FEATURES.md)         | Funcionalidades e regras de negócio                    |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | Etapas do projeto e status                             |
| [docs/INSTALL.md](docs/INSTALL.md)           | Como rodar localmente                                  |
| [docs/DEMO.md](docs/DEMO.md)                 | Modo demo (SQLite, sem Docker) — `npm run demo`        |

## Status

Ver [docs/ROADMAP.md](docs/ROADMAP.md) para a etapa atual.
