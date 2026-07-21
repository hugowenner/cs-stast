# GC Companion — protocolo de sincronização

## Contexto

Uma tentativa anterior de autenticar diretamente na Gamers Club a partir do backend esbarrou nos mecanismos de autenticação da GC. Decisão de arquitetura: **o backend nunca autentica na Gamers Club**. Em vez disso, uma extensão de navegador roda no navegador já autenticado do usuário, lê dados da GC e os envia normalizados para a API local.

## Ecossistema

| Projeto                                                               | Papel                                         | Stack                                                   |
| --------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| **CS2 Stats Desktop** (este repo)                                     | API, banco, dashboard                         | Next.js, Prisma, PostgreSQL                             |
| **CS2 Stats Companion** (`../cs2-stats-companion`, repositório irmão) | Captura dados da GC no navegador e sincroniza | Baseado no `gamersclub-booster` (extensão de navegador) |

## Fluxo

```
Usuário logado na Gamers Club (cookies/sessão só no navegador)
        │
        ▼
GC Companion busca {url-da-partida}/1 (mesmos cookies do navegador)
        │  a extensão NÃO interpreta o JSON — só encaminha bruto
        ▼
POST http://localhost:3210/api/sync/gamersclub/match  ({ payload: <JSON bruto> })
        │
        ▼
adapters/gamersclub/normalize.ts  (única fronteira que conhece o formato da GC,
        │                          testada contra fixtures — normalize.test.ts)
        ▼
DTO interno validado (Zod) → Services → Repositories → PostgreSQL
        │
        ▼
Engines de domínio (rating, elo, achievements, rivalries)
```

`Import.rawPayload` guarda o JSON bruto de cada sincronização — mesmo que o adapter tenha mapeado algo errado, o dado original não se perde e pode ser reprocessado depois de corrigir `normalize.ts`.

## Estudo do `gamersclub-booster` (Etapa 7 — concluído)

Repositório clonado em `C:\Users\ramobh\Documents\gamersclub-booster` para referência. Principais achados:

### Arquitetura

- Manifest V3, **sem service worker/background** — só content scripts injetados via `content_scripts` no `manifest.json`, um por página (`main`, `lobby`, `my-matches`, `team`, `profile`, `missions`), todos rodando em `*.gamersclub.com.br` e `cs.gamersclub.gg`.
- Permissão declarada: só `storage`. Sem `cookies`, `webRequest` ou `scripting`.
- **Não há interceptação de fetch/XHR/WebSocket** — o booster não observa o tráfego da SPA da GC. Ele faz suas **próprias chamadas diretas** aos endpoints da GC a partir do content script, aproveitando os cookies de sessão que o navegador já envia automaticamente (`credentials: 'include'` / comportamento padrão do axios).
- Identidade do usuário logado é obtida **sem nenhuma chamada de API** — via regex sobre `<script>` tags inline que a própria GC injeta no HTML server-rendered (`window.currentUser = {...}` ou o payload do Hotjar `window.hj('identify', userId, {...})`).
- Todo o "roteamento" de dados entre partes da extensão é feito via `chrome.storage` (não há `chrome.runtime.sendMessage`).

### Endpoints da GC identificados

| Endpoint                                                                                                         | Retorna                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/lobby/match`                                                                                           | Estado do lobby/partida atual: mapa, ip/senha do servidor, `teamA`/`teamB` com `players[].nick`/`.level` — **é estado de lobby, não box score final** |
| `GET /api/box/init/{playerId}`                                                                                   | Nick, level, rating, últimas partidas (id, mapa, variação de rating)                                                                                  |
| `GET /api/player-card/{playerId}`                                                                                | Estatísticas **agregadas** do jogador: `KDR`, `ADR`, `KAST%` como snapshot atual/período — não por partida                                            |
| `GET /api/box/history/{id}?json` + `/historyFilterDate/{id}/{month}` + `/historyMatchesPage/{id}/{month}/{page}` | Histórico paginado por mês: só `{ map, win }` por partida — sem kills/deaths/ADR por partida                                                          |
| `GET /player/{id}`                                                                                               | HTML da página de perfil (scraping de contagens, não JSON)                                                                                            |
| `GET /campeonatos/getEndedMatchMaps/{matchId}`                                                                   | Mapas jogados numa partida de campeonato                                                                                                              |
| `GET /api/ebacon2/stats/scoreboards/{campId}/{matchId}`                                                          | Apesar do nome, retorna **apenas o link de download da demo** (`.dem`), não um box score em JSON                                                      |

### Lacuna identificada — importante

**Nenhum endpoint usado pelo `gamersclub-booster` expõe estatísticas granulares por partida** (kills, deaths, assists, headshots, ADR, KAST, entry kills, clutches por round). O que existe é:

- Estado de lobby pré-jogo (`/api/lobby/match`)
- Estatísticas **agregadas por período** (KDR/ADR/KAST "atuais", não por partida)
- Histórico só com mapa + vitória/derrota
- Link de download da demo (`.dem`) da partida

Isso não significa que a GC não exponha esses dados — só significa que **esta extensão em particular não precisa deles** para suas features (auto-ready, cópia de IP, etc.) e por isso não os usa. Só um teste com sessão autenticada real revela se existe um endpoint mais rico (ex: algo como `/api/box/history/{id}/{matchId}` com o box score completo), ou se a única fonte de dados granulares é **parsear o arquivo `.dem` da partida** (dado bruto do jogo — kills, mortes, dano, clutches, entries — tudo estaria lá, com precisão total, mas exige um parser de demo do CS2, que é um projeto bem maior).

## Investigação da aplicação real da GC (resolvido)

A lacuna acima levou a uma investigação direta da própria aplicação web da Gamers Club (não só do `gamersclub-booster`, que é só uma extensão de UX, não uma referência completa de coleta de dados). Achado central, consistente com o que o `my-matches/index.js` do booster já fazia (`fetch({matchLink}/1)`):

**A própria URL da página de resultado, com `/1` anexado, retorna o box score completo da partida em JSON**, usando o cookie de sessão já existente do navegador — sem chamada adicional, sem GraphQL, sem necessidade de interceptar tráfego da SPA:

```
GET https://gamersclub.com.br/lobby/match/{matchId}   → página HTML
GET https://gamersclub.com.br/lobby/match/{matchId}/1 → JSON completo (box score + timeline de rounds)
```

Isso muda a estratégia: em vez de "extensão observa/adivinha dados", a extensão faz **uma única chamada HTTP adicional** por partida, na mesma origem, com os mesmos cookies que o navegador já envia.

> **Validado contra uma resposta real** capturada em 2026-07-20 (partida 27483022, ver `fixtures/match-real-27483022.json`). Os nomes de campo (`nb_kill`, `pkast`, `plSteamID64`, `jogos.rounds[]`, etc.) batem com o que a investigação previu. Três diferenças reais apareceram e já foram corrigidas em `normalize.ts`:
>
> 1. **Todo campo numérico vem como string** (`"nb_kill": "16"`, não `16`) — 32 dos 34 erros de validação na primeira tentativa. `toNumber()` converte.
> 2. **`player.avatar` é um path relativo** (`players/avatar/757573/757573`), não uma URL completa — `z.string().url()` rejeitava. `toAbsoluteUrl()` omite em vez de adivinhar o CDN.
> 3. **`data` vem como `"DD/MM/YYYY HH:mm"`** (formato brasileiro, não ISO) — `new Date()` nativo falhava silenciosamente e gravava a data de hoje em vez da data real da partida. `parseDate()` agora reconhece esse formato explicitamente.

### O que essa fonte cobre

- Box score por jogador: kills, deaths, assists, ADR, KAST%, headshots, dano total, first kills (→ `entryKills`), clutches (só o total agregado, sem quebra por tier).
- Timeline de rounds: placar acumulado, time vencedor, motivo (kill/bomb), sobreviventes por time.
- Metadados da partida: mapa, placar final, data.

### O que essa fonte NÃO cobre (lacunas mantidas, não bloqueiam o MVP)

- **Kill-by-kill** (quem matou quem, arma, round) — não está no payload. Sem isso, `killsDetail` fica vazio e o `RivalryEngine` não computa `killsAOnB`/`killsBOnA` ainda (mas `matchesTogether`/`matchesAgainst` funcionam normalmente, já que dependem só de time).
- **Clutches por tier (1v1..1v5)** — só existe `clutch_won` agregado, sem indicar se foi 1v1 ou 1v5. As conquistas `CLUTCH_1V1`..`CLUTCH_1V5` não são concedidas por enquanto via esta fonte.

### Estratégia em camadas

1. **Camada 1 (implementada agora)** — `GET {url-da-partida}/1` como fonte primária. Cobre a grande maioria dos campos de `PlayerMatchStats` com uma única chamada por partida.
2. **Camada 2 (resiliência, futura)** — o path já mudou uma vez no próprio código do booster (`partida` → `match`); o Companion deveria tentar múltiplos padrões conhecidos antes de desistir, e cair para extração de DOM como fallback se o endpoint mudar de novo.
3. **Camada 3 (futuro, opt-in)** — parser de demo (`.dem`) para eventos kill-by-kill e clutches por tier. Não bloqueia o produto; é um módulo avançado a ser adicionado depois.

O domínio (engines de rating/elo/achievements/rivalry) **não foi alterado** — já eram flexíveis o suficiente (campos de clutch/killsDetail opcionais) para absorver uma fonte de dados parcial sem mudança de modelo. O schema Prisma teve só uma adição aditiva: `Import.rawPayload`/`Import.providerVersion`, para o padrão de payload bruto descrito acima.

## Camada de adapter e testes de contrato

A extensão nunca conhece o formato da Gamers Club — ela só busca `{url-da-partida}/1` e encaminha o JSON bruto. Toda a interpretação desse formato vive isolada em:

```
src/server/adapters/gamersclub/
  types.ts                     — tipos do payload bruto da GC (validados contra resposta real)
  normalize.ts                 — função pura: payload bruto → SyncMatchInput (nosso formato interno)
  normalize.test.ts            — testes de contrato contra os fixtures abaixo
  fixtures/
    match-standard.json        — exemplo sintético (placeholder — ver campo "_note")
    match-partial.json         — payload degradado (campos faltando/nomes alternativos), garante que o adapter nunca quebra
    match-real-27483022.json   — captura REAL de {url-da-partida}/1 (2026-07-20) — o teste que mais importa
```

Rodar os testes: `npm run test` (ou `npm run test:watch`).

**Por que essa fronteira importa:** se a Gamers Club renomear `nb_kill` para `kills` amanhã, só `normalize.ts` (e seus testes) devem precisar mudar — nenhum Service, Repository ou engine de domínio conhece o formato da GC. `POST /api/sync/match` continua agnóstico de provedor, recebendo sempre o formato interno já validado.

**Próximo passo real:** a partida 27483022 era MD1 (mapa único, sem overtime). Payloads de BO3, partidas com overtime, ou partidas com jogador banido/expulso ainda não foram capturados — se `normalize.ts` quebrar de novo com um formato desses, o processo é o mesmo: capturar o JSON real, salvar como novo fixture, rodar contra `normalize.ts`, corrigir o que a validação apontar.

## Trust boundary (mantém-se válido em qualquer caminho)

- O backend **nunca** conhece cookie, JWT, sessão, refresh token ou fluxo de login da GC.
- O backend recebe apenas dados já extraídos e normalizados pela extensão/parser.
- As rotas `/api/sync/*` não implementam autenticação própria no MVP — a superfície de confiança é "requisição originada em localhost". Não expor essas rotas fora da máquina local.

## Contrato interno (`POST /api/sync/match`, ver `src/server/dtos/sync.dto.ts`)

A extensão hoje chama `POST /api/sync/gamersclub/match` com `{ "payload": <JSON bruto de {url-da-partida}/1> }` — o backend normaliza via `normalize.ts` e então segue o mesmo caminho de `/api/sync/match` internamente. O formato abaixo é o **contrato interno** (`SyncMatchInput`), independente de provedor:

```jsonc
{
  "matchId": "gc_123456", // gamersClubMatchId — chave de idempotência
  "map": "Inferno",
  "playedAt": "2026-07-16T22:10:00Z",
  "scoreTeamA": 13,
  "scoreTeamB": 9,
  "players": [
    {
      "steamId": "...",
      "gamersClubId": "...",
      "nickname": "...",
      "team": "A",
      "kills": 24,
      "deaths": 15,
      "assists": 4,
      "headshots": 12,
      "adr": 88.4,
      "kast": 74.0,
      "entryKills": 3,
      "entryDeaths": 1,
      "tradeKills": 2,
      "clutches": { "1v1": { "attempts": 2, "wins": 1 } },
      "killsDetail": [{ "victimSteamId": "...", "roundNumber": 7 }],
    },
  ],
}
```

Este contrato assume que a fonte de dados (extensão ou parser de demo) consegue preencher esses campos. Ele já está implementado no backend (`match.service.ts`) e pronto para receber dados assim que a fonte estiver definida.

## Importar histórico (em construção, por etapas)

Hoje a extensão só sincroniza partida por partida (você abre `/lobby/match/{id}`, ela sincroniza aquela). Objetivo: um botão "Importar histórico" que varre `/minhas-partidas` e sincroniza várias de uma vez. Implementado em etapas separadas para reduzir risco:

- **Etapa 1 (implementada)** — botão no popup, visível só em `gamersclub.com.br/minhas-partidas` (ou `.../my-matches`), que **detecta e conta** partidas na página atual via `chrome.scripting.executeScript` procurando links `a:contains("Ver partida")` — mesmo padrão usado pelo `gamersclub-booster` em duas páginas diferentes (`my-matches/index.js`, `team/matches.js`), então é um padrão confiável, não um chute. Não sincroniza nada ainda — só mostra a contagem e loga as URLs no console, para validar a detecção antes de automatizar o resto.
- **Etapa 2 (próxima)** — paginação: a lista em `/minhas-partidas` é paginada (`#myMatchesPagination` no DOM da GC) — a Etapa 1 só escaneia a página visível. Falta confirmar com uma sessão real quantas partidas por página e como o "próxima página" se comporta (desabilita no fim?).
- **Etapa 3 (depois)** — backend: `POST /api/sync/gamersclub/history` recebendo uma lista de URLs, processando cada uma através do mesmo `ingestMatchSync` já existente (nenhuma mudança em `normalize.ts`, engines ou banco — só um novo endpoint que chama o pipeline em loop), devolvendo `{ total, imported, skipped, errors }`.
- Sincronizações vindas do histórico devem marcar `source: "companion-history"` no `Import` (hoje é sempre `"gamersclub"`), para diferenciar de sincronizações manuais partida-a-partida — útil mais pra frente para depuração/auditoria.
