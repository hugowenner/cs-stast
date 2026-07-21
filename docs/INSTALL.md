# Instalação (ambiente local)

## Pré-requisitos

- Node.js LTS (usado: v24)
- Docker Desktop (para o PostgreSQL via Docker Compose) — **pendente de instalação nesta máquina**
- npm

## Passos

```bash
# 1. instalar dependências
npm install

# 2. copiar variáveis de ambiente
cp .env.example .env

# 3. subir o banco (Postgres via Docker Compose)
docker compose up -d

# 4. aplicar a migration inicial (já gerada, em prisma/migrations/)
npm run db:deploy

# 5. popular catálogo de achievements/mapas
npm run db:seed

# 6. rodar em desenvolvimento (porta 3210)
npm run dev
```

A aplicação sobe em **http://localhost:3210**.

## Variáveis de ambiente (`.env`)

```
DATABASE_URL="postgresql://cs2stats:cs2stats@localhost:5432/cs2stats"
GAMERSCLUB_GROUP_ID=""
```

`.env.example` é versionado; `.env` fica no `.gitignore`.

## GC Companion (extensão)

Projeto irmão em `../cs2-stats-companion` (fora deste repositório). Sincroniza partidas da Gamers Club com `POST http://localhost:3210/api/sync/*` — só funciona com a aplicação rodando localmente na porta 3210. Ver `../cs2-stats-companion/README.md` para carregar a extensão como "unpacked" no Chrome, e [docs/COMPANION.md](COMPANION.md) para o protocolo.

## Scripts úteis

| Script                                                  | O que faz                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                                           | Next.js em modo desenvolvimento, porta 3210                             |
| `npm run build` / `npm run start`                       | Build e start de produção                                               |
| `npm run lint` / `npm run typecheck` / `npm run format` | Qualidade de código                                                     |
| `npm run db:generate`                                   | Regenera o Prisma Client a partir do schema                             |
| `npm run db:migrate`                                    | Cria/aplica migrations em desenvolvimento (precisa do Postgres rodando) |
| `npm run db:deploy`                                     | Aplica migrations existentes sem gerar novas (uso em produção/CI)       |
| `npm run db:seed`                                       | Popular catálogo de achievements e mapas                                |
| `npm run db:studio`                                     | Abre o Prisma Studio                                                    |
