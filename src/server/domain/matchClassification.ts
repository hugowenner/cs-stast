/**
 * Fonte única da regra SOLO x COMUNIDADE. Uma partida é COMUNIDADE quando 2 ou mais
 * jogadores monitorados (TrackedPlayer.active = true) participaram dela; caso
 * contrário é SOLO. A contagem é calculada uma única vez na ingestão
 * (match.service.ts) e persistida em Match.trackedPlayersCount — nunca recalculada
 * em memória em tempo de leitura, e nunca reimplementada em outro arquivo.
 *
 * Toda consulta que representa uma métrica coletiva (ranking, winrate da comunidade,
 * destaques, Coach IA, etc.) deve filtrar por essa regra usando os helpers de `where`
 * abaixo. Perfil do jogador e listagens de histórico de partidas NÃO filtram — devem
 * continuar mostrando SOLO e COMUNIDADE, com o tipo apenas exibido como badge (ver
 * getMatchType).
 */

export const MIN_TRACKED_PLAYERS_FOR_COMMUNITY = 2;

export type MatchType = "SOLO" | "COMMUNITY";

export function getMatchType(trackedPlayersCount: number): MatchType {
  return trackedPlayersCount >= MIN_TRACKED_PLAYERS_FOR_COMMUNITY ? "COMMUNITY" : "SOLO";
}

export function isCommunityMatch(trackedPlayersCount: number): boolean {
  return trackedPlayersCount >= MIN_TRACKED_PLAYERS_FOR_COMMUNITY;
}

/**
 * Fragmento de `where` para queries feitas diretamente em `Match`
 * (ex: prisma.match.count, prisma.match.groupBy, prisma.match.aggregate).
 */
export function communityMatchWhere() {
  return { trackedPlayersCount: { gte: MIN_TRACKED_PLAYERS_FOR_COMMUNITY } };
}

/**
 * Fragmento de `where` para queries feitas diretamente em `Match`
 * (ex: prisma.match.count, prisma.match.groupBy, prisma.match.aggregate).
 * Para métricas individuais (Dashboard geral, histórico do jogador, rankings individuais, conquistas).
 */
export function individualMatchWhere() {
  return { trackedPlayersCount: { gte: 1 } };
}

/**
 * Mesmo filtro, para queries feitas em `PlayerMatchStats` (via a relação `match`).
 * Use isto em qualquer agregação "coletiva" — ranking, winrate por mapa, streaks,
 * destaques, etc. Nunca em consultas de perfil de jogador (essas devem ver tudo).
 */
export function communityMatchStatsWhere() {
  return { match: communityMatchWhere() };
}

/**
 * Mesmo filtro, para queries feitas em `PlayerMatchStats` (via a relação `match`).
 * Para métricas individuais.
 */
export function individualMatchStatsWhere() {
  return { match: individualMatchWhere() };
}
