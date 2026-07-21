import { calculateHSPercentage } from "./player.analytics";

export interface PlayerPerformanceInput {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  isTracked: boolean;
  rating: number;
  adr: number;
  kast: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
}

export interface MatchHighlightOutput {
  type: string;
  label: string;
  value: string | number;
  player: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    isTracked: boolean;
  };
}

export function extractMatchHighlights(players: PlayerPerformanceInput[]): MatchHighlightOutput[] {
  if (players.length === 0) return [];

  const highlights: MatchHighlightOutput[] = [];
  const getPlayerInfo = (p: PlayerPerformanceInput) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    isTracked: p.isTracked,
  });

  // 1. MVP (highest rating)
  const mvp = [...players].sort((a, b) => b.rating - a.rating)[0];
  highlights.push({
    type: "mvp",
    label: "MVP da Partida",
    value: mvp.rating.toFixed(2),
    player: getPlayerInfo(mvp),
  });

  // 2. Rating
  const bestRating = [...players].sort((a, b) => b.rating - a.rating)[0];
  highlights.push({
    type: "rating",
    label: "Maior Rating",
    value: bestRating.rating.toFixed(2),
    player: getPlayerInfo(bestRating),
  });

  // 3. ADR
  const bestAdr = [...players].sort((a, b) => b.adr - a.adr)[0];
  highlights.push({
    type: "adr",
    label: "Maior ADR",
    value: bestAdr.adr.toFixed(1),
    player: getPlayerInfo(bestAdr),
  });

  // 4. HS% (mínimo de 5 kills para relevância)
  const eligibleForHs = players.filter((p) => p.kills >= 5);
  const hsPool = eligibleForHs.length > 0 ? eligibleForHs : players;
  const bestHs = [...hsPool].sort((a, b) => {
    const aHs = calculateHSPercentage(a.headshots, a.kills);
    const bHs = calculateHSPercentage(b.headshots, b.kills);
    return bHs - aHs;
  })[0];
  const bestHsVal = calculateHSPercentage(bestHs.headshots, bestHs.kills);
  highlights.push({
    type: "hs",
    label: "Maior HS %",
    value: `${bestHsVal.toFixed(1)}%`,
    player: getPlayerInfo(bestHs),
  });

  // 5. Kills
  const bestKills = [...players].sort((a, b) => b.kills - a.kills)[0];
  highlights.push({
    type: "kills",
    label: "Mais Kills",
    value: bestKills.kills,
    player: getPlayerInfo(bestKills),
  });

  // 6. Assists
  const bestAssists = [...players].sort((a, b) => b.assists - a.assists)[0];
  highlights.push({
    type: "assists",
    label: "Mais Assistências",
    value: bestAssists.assists,
    player: getPlayerInfo(bestAssists),
  });

  // 7. KAST
  const bestKast = [...players].sort((a, b) => b.kast - a.kast)[0];
  highlights.push({
    type: "kast",
    label: "Melhor KAST",
    value: `${bestKast.kast.toFixed(1)}%`,
    player: getPlayerInfo(bestKast),
  });

  return highlights;
}
