# Funcionalidades

## Estatísticas por jogador

- Rating, K/D, ADR, KAST, HS%, Kills, Deaths, Assists
- Entry kills/deaths, Trade kills, Impact
- Clutches (1v1 a 1v5) — tentativas e vitórias
- Winrate geral e por mapa
- Performance por horário (manhã/tarde/noite, dia da semana)
- Performance por parceiro de time (com quem joga melhor)
- Performance contra jogador específico (via Rivalry)
- ELO interno (histórico e atual)

## Sessões

Agregado de uma noite de jogo: lista de partidas, resultado geral, MVP da sessão (maior Rating médio ponderado), destaques (maior ace, melhor clutch).

## Conquistas (Achievement Engine)

Motor baseado em regras, avaliado após cada importação:

- **Por partida:** Ace, Clutch (1v1 a 1v5), 5k, Entry King da partida, Headshot Machine da partida
- **Cumulativas:** 100 partidas, 500 HS, 1000 kills, "Mochila"/"Pato Oficial" (critérios específicos do grupo — a definir com o time ao implementar o catálogo)

Cada regra é uma função pura `(históricoDoJogador) => PlayerAchievement[]`, testável isoladamente.

## Rivalidades

Head-to-head entre pares de jogadores: kills de A sobre B vs. B sobre A, partidas juntos vs. contra. Recalculado incrementalmente a cada partida nova, não recomputado do zero.

## Dashboard

- Resumo geral do grupo (partidas totais, jogadores ativos, última sessão)
- Últimos jogos
- Lista de sessões
- Top jogadores (por métrica selecionável)
- Gráficos (Recharts): evolução de ELO, winrate por mapa, distribuição de Rating
- Rivalidades em destaque
- Feed de conquistas recentes
- Histórico completo navegável

## Sincronização (GC Companion)

Uma extensão de navegador irmã (`cs2-stats-companion`, fork do `gamersclub-booster`) observa as respostas dos endpoints da Gamers Club no navegador já autenticado do usuário e envia os dados normalizados para `POST /api/sync/*` neste backend. O backend nunca autentica na GC nem manipula cookies/tokens — apenas recebe JSON estruturado. Evita duplicar partidas já sincronizadas (`gamersClubMatchId` único) e aciona as engines de domínio (rating, elo, achievements, rivalries) para cada partida nova. Ver [docs/COMPANION.md](COMPANION.md) para o protocolo completo.
