import type { CompetitiveDataset } from "../competitive.service";
import { getMapSpecialistsFromDataset } from "../competitive.service";
import type {
  DashboardHighlight,
  HighlightPlayer,
  HighlightEvidenceMatch,
  HighlightRarity,
  NarrativeType,
  HighlightCategory,
  StoryCategory,
  StoryProvider,
} from "./highlight.types";
import { calculateConfidence, calculateHighlightScore } from "./highlight.scoring";

// ─── Shared utilities ─────────────────────────────────────────────────────────

export function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

export function avgArr(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avgArr(arr);
  return Math.sqrt(avgArr(arr.map((v) => (v - m) ** 2)));
}

export function evidence(stats: any[], count = 3): HighlightEvidenceMatch[] {
  return stats.slice(0, count).map((s) => {
    const scoreSelf = s.team === "A" ? s.match?.scoreTeamA ?? 0 : s.match?.scoreTeamB ?? 0;
    const scoreOpp = s.team === "A" ? s.match?.scoreTeamB ?? 0 : s.match?.scoreTeamA ?? 0;
    return { mapName: s.match?.map?.name ?? "Mapa", scoreSelf, scoreOpp, won: scoreSelf > scoreOpp };
  });
}

function rarity(priority: number, isRecord = false): HighlightRarity {
  if (isRecord || priority >= 88) return "legendary";
  if (priority >= 70) return "epic";
  if (priority >= 50) return "rare";
  return "common";
}

function h(
  id: string,
  type: NarrativeType,
  category: HighlightCategory,
  storyCategory: StoryCategory,
  priority: number,
  confidence: number,
  title: string,
  subtitle: string,
  text: string,
  players: HighlightPlayer[],
  metrics: { label: string; value: string | number }[],
  period: "week" | "season",
  ev?: HighlightEvidenceMatch[],
  isRec = false,
): DashboardHighlight {
  return {
    id,
    type,
    category,
    storyCategory,
    rarity: rarity(priority, isRec),
    priority,
    confidence: Math.min(100, Math.round(confidence * 100)),
    title,
    subtitle,
    text,
    players,
    metrics,
    period,
    evidenceMatches: ev,
  };
}

type PlayerRow = CompetitiveDataset["activePlayers"][0];

// ─── Performance Individual ───────────────────────────────────────────────────

export const ratingLeaderProvider: StoryProvider = {
  id: "rating-leader",
  storyCategory: "performance",
  weight: 9,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; rating: number; n: number; above120: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const ratings = stats.map((s) => s.rating);
      const rating = avgArr(ratings);
      const above120 = ratings.filter((r) => r >= 1.2).length;
      if (!best || rating > best.rating) best = { player, rating, n: stats.length, above120 };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.rating / 1.5, best.n);
    const prio = calculateHighlightScore(84, conf, best.rating, 0.9);
    const p = best.player;
    return h(
      "rating-leader", "DOMINANCE", "competitive", "performance", prio, conf,
      `Rating ${best.rating.toFixed(2)}`, "Líder de Rating da temporada",
      `${p.nickname} lidera o Hub em performance com rating médio de ${best.rating.toFixed(2)} em ${best.n} partidas. ${Math.round((best.above120 / best.n) * 100)}% das partidas acima de 1.20.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Rating Médio", value: best.rating.toFixed(2) }, { label: "Acima 1.20", value: `${Math.round((best.above120 / best.n) * 100)}%` }, { label: "Partidas", value: best.n }],
      "season",
    );
  },
};

export const adrLeaderProvider: StoryProvider = {
  id: "adr-leader",
  storyCategory: "performance",
  weight: 9,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; adr: number; n: number; peak: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      const adrs = stats.map((s) => s.adr).filter((v) => v > 0);
      if (adrs.length < 3) continue;
      const adr = avgArr(adrs);
      const peak = Math.max(...adrs);
      if (!best || adr > best.adr) best = { player, adr, n: stats.length, peak };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.adr / 150, best.n);
    const prio = calculateHighlightScore(82, conf, best.adr / 90, 0.9);
    const p = best.player;
    return h(
      "adr-leader", "ADR_MONSTER", "competitive", "performance", prio, conf,
      `${Math.round(best.adr)} ADR`, "Maior ADR da temporada",
      `${p.nickname} é o jogador que mais causa dano por round nesta temporada: ${Math.round(best.adr)} ADR médio em ${best.n} partidas. Pico: ${Math.round(best.peak)} ADR.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ADR Médio", value: Math.round(best.adr) }, { label: "Pico ADR", value: Math.round(best.peak) }, { label: "Partidas", value: best.n }],
      "season",
    );
  },
};

export const kdLeaderProvider: StoryProvider = {
  id: "kd-leader",
  storyCategory: "performance",
  weight: 8,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; kd: number; kills: number; deaths: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const kills = stats.reduce((s, x) => s + x.kills, 0);
      const deaths = stats.reduce((s, x) => s + x.deaths, 0);
      if (deaths === 0) continue;
      const kd = kills / deaths;
      if (!best || kd > best.kd) best = { player, kd, kills, deaths, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(Math.min(best.kd / 2, 1), best.n);
    const prio = calculateHighlightScore(80, conf, best.kd / 1.2, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "kd-leader", "IMPACT", "competitive", "performance", prio, conf,
      `K/D ${best.kd.toFixed(2)}`, "Melhor K/D da temporada",
      `${p.nickname} está eliminando muito mais do que sendo eliminado: K/D de ${best.kd.toFixed(2)} (${best.kills} kills / ${best.deaths} mortes em ${best.n} partidas).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "K/D", value: best.kd.toFixed(2) }, { label: "Total Kills", value: best.kills }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const hsLeaderProvider: StoryProvider = {
  id: "hs-leader",
  storyCategory: "performance",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; pct: number; hs: number; kills: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const kills = stats.reduce((s, x) => s + x.kills, 0);
      const hs = stats.reduce((s, x) => s + x.headshots, 0);
      if (kills < 10) continue;
      const pct = hs / kills;
      if (!best || pct > best.pct) best = { player, pct, hs, kills, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.pct, best.n);
    const prio = calculateHighlightScore(75, conf, best.pct / 0.6, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "hs-leader", "HEADSHOT_MACHINE", "competitive", "performance", prio, conf,
      `${Math.round(best.pct * 100)}% Headshot`, "Maior taxa de HS da temporada",
      `${p.nickname} é uma máquina de headshots: ${Math.round(best.pct * 100)}% das eliminações foram na cabeça (${best.hs} de ${best.kills} kills em ${best.n} partidas).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "HS%", value: `${Math.round(best.pct * 100)}%` }, { label: "Headshots", value: best.hs }, { label: "Kills", value: best.kills }],
      "season", evidence(stats),
    );
  },
};

export const mostKillsProvider: StoryProvider = {
  id: "most-kills-season",
  storyCategory: "performance",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; kills: number; perMatch: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const kills = stats.reduce((s, x) => s + x.kills, 0);
      const perMatch = kills / stats.length;
      if (!best || kills > best.kills) best = { player, kills, perMatch, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.perMatch / 25, best.n);
    const prio = calculateHighlightScore(74, conf, best.perMatch / 18, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-kills-season", "IMPACT", "competitive", "performance", prio, conf,
      `${best.kills} Kills`, "Mais eliminações da temporada",
      `${p.nickname} acumula o maior número de kills da temporada: ${best.kills} eliminações em ${best.n} partidas (média de ${best.perMatch.toFixed(1)} por jogo).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Total Kills", value: best.kills }, { label: "Média/Jogo", value: best.perMatch.toFixed(1) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const mostAssistsProvider: StoryProvider = {
  id: "most-assists",
  storyCategory: "performance",
  weight: 6,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; assists: number; fa: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const assists = stats.reduce((s, x) => s + x.assists, 0);
      const fa = stats.reduce((s, x) => s + (x.flashAssists ?? 0), 0);
      if (!best || assists > best.assists) best = { player, assists, fa, n: stats.length };
    }
    if (!best || best.assists < 20) return null;
    const conf = calculateConfidence(best.assists / (best.n * 8), best.n);
    const prio = calculateHighlightScore(68, conf, 1.0, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-assists", "SUPPORT_HERO", "competitive", "performance", prio, conf,
      `${best.assists} Assistências`, "Herói do suporte — mais assists da temporada",
      `${p.nickname} é o grande suporte do Hub: ${best.assists} assists nesta temporada${best.fa > 0 ? `, incluindo ${best.fa} flash assists` : ""}. O trabalho invisível que move o time.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Assists", value: best.assists }, { label: "Flash Assists", value: best.fa }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const bestKastProvider: StoryProvider = {
  id: "best-kast",
  storyCategory: "performance",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; kast: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      const kasts = stats.map((s) => s.kast).filter((v) => v > 0);
      if (kasts.length < 3) continue;
      const kast = avgArr(kasts);
      if (!best || kast > best.kast) best = { player, kast, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.kast / 100, best.n);
    const prio = calculateHighlightScore(72, conf, best.kast / 75, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "best-kast", "CONSISTENCY", "competitive", "performance", prio, conf,
      `${Math.round(best.kast)}% KAST`, "Melhor impacto por round",
      `${p.nickname} lidera o KAST do Hub com ${Math.round(best.kast)}% — significa que em ${Math.round(best.kast)}% dos rounds teve pelo menos um kill, assist, sobreviveu ou foi trocado.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "KAST", value: `${Math.round(best.kast)}%` }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const bestImpactProvider: StoryProvider = {
  id: "best-impact",
  storyCategory: "performance",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; impact: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      const impacts = stats.map((s) => s.impact).filter((v) => v > 0);
      if (impacts.length < 3) continue;
      const impact = avgArr(impacts);
      if (!best || impact > best.impact) best = { player, impact, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.impact / 2, best.n);
    const prio = calculateHighlightScore(76, conf, best.impact, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "best-impact", "IMPACT", "competitive", "performance", prio, conf,
      `Impact ${best.impact.toFixed(2)}`, "Maior Impact Rating da temporada",
      `${p.nickname} tem o maior Impact Rating do Hub: ${best.impact.toFixed(2)} médio em ${best.n} partidas. Mede a contribuição real em rounds decisivos.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Impact", value: best.impact.toFixed(2) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const fewestDeathsProvider: StoryProvider = {
  id: "fewest-deaths",
  storyCategory: "performance",
  weight: 6,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; deathsPerMatch: number; total: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 5) continue;
      const total = stats.reduce((s, x) => s + x.deaths, 0);
      const deathsPerMatch = total / stats.length;
      if (!best || deathsPerMatch < best.deathsPerMatch) best = { player, deathsPerMatch, total, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(1 - best.deathsPerMatch / 25, best.n);
    const prio = calculateHighlightScore(65, conf, 1.0, 0.85);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "fewest-deaths", "CONSISTENCY", "competitive", "performance", prio, conf,
      `${best.deathsPerMatch.toFixed(1)} mortes/jogo`, "Menor número de mortes por partida",
      `${p.nickname} é o mais difícil de matar do Hub: apenas ${best.deathsPerMatch.toFixed(1)} mortes por partida em média (${best.total} no total em ${best.n} jogos).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Mortes/Jogo", value: best.deathsPerMatch.toFixed(1) }, { label: "Total Mortes", value: best.total }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const mostConsistentProvider: StoryProvider = {
  id: "most-consistent",
  storyCategory: "performance",
  weight: 6,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; pct: number; count: number; n: number; avg: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 5) continue;
      const count = stats.filter((s) => s.rating >= 1.0).length;
      const pct = count / stats.length;
      const avg = avgArr(stats.map((s) => s.rating));
      if (!best || pct > best.pct || (pct === best.pct && avg > best.avg)) best = { player, pct, count, n: stats.length, avg };
    }
    if (!best || best.pct < 0.5) return null;
    const conf = calculateConfidence(best.pct, best.n);
    const prio = calculateHighlightScore(70, conf, best.pct * 1.4, 0.85);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-consistent", "CONSISTENCY", "competitive", "performance", prio, conf,
      `${Math.round(best.pct * 100)}% acima de 1.00`, "Jogador mais consistente da temporada",
      `${p.nickname} é o mais consistente do Hub: ${Math.round(best.pct * 100)}% das partidas com rating acima de 1.00 (${best.count} de ${best.n} jogos).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Consistência", value: `${Math.round(best.pct * 100)}%` }, { label: "Rating Médio", value: best.avg.toFixed(2) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const mostAggressiveProvider: StoryProvider = {
  id: "most-aggressive",
  storyCategory: "curiosity",
  weight: 5,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; volume: number; n: number; kd: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const kills = stats.reduce((s, x) => s + x.kills, 0);
      const deaths = stats.reduce((s, x) => s + x.deaths, 0);
      const volume = (kills + deaths) / stats.length;
      const kd = deaths > 0 ? kills / deaths : kills;
      if (!best || volume > best.volume) best = { player, volume, n: stats.length, kd };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.volume / 40, best.n);
    const prio = calculateHighlightScore(62, conf, 1.0, 0.85);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-aggressive", "CURIOSITY", "curiosity", "curiosity", prio, conf,
      "O Mais Agressivo", `${best.volume.toFixed(1)} duelos por jogo`,
      `${p.nickname} está sempre no meio da ação: ${best.volume.toFixed(1)} duelos (kills + mortes) por partida em média, o maior volume do Hub. K/D de ${best.kd.toFixed(2)}.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Duelos/Jogo", value: best.volume.toFixed(1) }, { label: "K/D", value: best.kd.toFixed(2) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

// ─── Evolução ─────────────────────────────────────────────────────────────────

export const ratingEvolutionProvider: StoryProvider = {
  id: "rating-evolution",
  storyCategory: "evolution",
  weight: 8,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; evo: number; from: number; to: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 5) continue;
      const seasonRating = avgArr(stats.map((s) => s.rating));
      const recentRating = avgArr(stats.slice(0, 10).map((s) => s.rating));
      const evo = (recentRating - seasonRating) / seasonRating;
      if (evo < 0.04) continue;
      if (!best || evo > best.evo) best = { player, evo, from: seasonRating, to: recentRating, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(1.0, best.n);
    const prio = calculateHighlightScore(80, conf, 1.0 + best.evo, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "rating-evolution", "BREAKOUT", "competitive", "evolution", prio, conf,
      `+${Math.round(best.evo * 100)}% Rating`, `${best.from.toFixed(2)} → ${best.to.toFixed(2)}`,
      `${p.nickname} está em franca ascensão: rating saltou de ${best.from.toFixed(2)} (média da temporada) para ${best.to.toFixed(2)} nas últimas partidas — uma melhora de +${Math.round(best.evo * 100)}%.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Rating Antes", value: best.from.toFixed(2) }, { label: "Rating Agora", value: best.to.toFixed(2) }, { label: "Evolução", value: `+${Math.round(best.evo * 100)}%` }],
      "week", evidence(stats),
    );
  },
};

export const adrEvolutionProvider: StoryProvider = {
  id: "adr-evolution",
  storyCategory: "evolution",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; evo: number; from: number; to: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      const adrs = stats.map((s) => s.adr).filter((v) => v > 0);
      if (adrs.length < 5) continue;
      const seasonAdr = avgArr(adrs);
      const recentAdr = avgArr(adrs.slice(0, 10));
      const evo = (recentAdr - seasonAdr) / seasonAdr;
      if (evo < 0.08) continue;
      if (!best || evo > best.evo) best = { player, evo, from: seasonAdr, to: recentAdr, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(1.0, best.n);
    const prio = calculateHighlightScore(74, conf, 1.0 + best.evo * 0.5, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "adr-evolution", "BREAKOUT", "competitive", "evolution", prio, conf,
      `+${Math.round(best.evo * 100)}% ADR`, `${Math.round(best.from)} → ${Math.round(best.to)} ADR`,
      `${p.nickname} está causando muito mais dano: ADR subiu de ${Math.round(best.from)} para ${Math.round(best.to)} nas últimas partidas, alta de +${Math.round(best.evo * 100)}%.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ADR Antes", value: Math.round(best.from) }, { label: "ADR Agora", value: Math.round(best.to) }, { label: "Diferença", value: `+${Math.round(best.to - best.from)}` }],
      "week", evidence(stats),
    );
  },
};

export const mostStableProvider: StoryProvider = {
  id: "most-stable",
  storyCategory: "curiosity",
  weight: 5,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; dev: number; avg: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 6) continue;
      const ratings = stats.map((s) => s.rating);
      const dev = stdDev(ratings);
      const avg = avgArr(ratings);
      if (avg < 0.9) continue;
      if (!best || dev < best.dev) best = { player, dev, avg, n: stats.length };
    }
    if (!best || best.dev > 0.25) return null;
    const conf = calculateConfidence(1 - best.dev, best.n);
    const prio = calculateHighlightScore(60, conf, 1.0, 0.8);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-stable", "CONSISTENCY", "competitive", "curiosity", prio, conf,
      "O Mais Estável", `Variação ±${best.dev.toFixed(2)} no rating`,
      `${p.nickname} é o jogador mais previsível (no bom sentido) do Hub: variação de apenas ±${best.dev.toFixed(2)} no rating com média de ${best.avg.toFixed(2)} em ${best.n} partidas.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Variação", value: `±${best.dev.toFixed(2)}` }, { label: "Rating Médio", value: best.avg.toFixed(2) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const mostVolatileProvider: StoryProvider = {
  id: "most-volatile",
  storyCategory: "curiosity",
  weight: 5,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; dev: number; avg: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 5) continue;
      const ratings = stats.map((s) => s.rating);
      const dev = stdDev(ratings);
      const avg = avgArr(ratings);
      if (!best || dev > best.dev) best = { player, dev, avg, n: stats.length };
    }
    if (!best || best.dev < 0.15) return null;
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "most-volatile", "CURIOSITY", "curiosity", "curiosity", 55, 0.7,
      "O Mais Imprevisível", `Variação ±${best.dev.toFixed(2)} no rating`,
      `${p.nickname} é o jogador mais imprevisível do Hub: variação de ±${best.dev.toFixed(2)} no rating (média ${best.avg.toFixed(2)}). Pode estar genial ou catastrófico — ninguém sabe.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Variação", value: `±${best.dev.toFixed(2)}` }, { label: "Rating Médio", value: best.avg.toFixed(2) }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

// ─── Recordes (single match) ──────────────────────────────────────────────────

export const recordKillsProvider: StoryProvider = {
  id: "record-kills",
  storyCategory: "record",
  weight: 10,
  generate({ activePlayers, allStats }) {
    let best: any = null;
    for (const s of allStats) {
      if (!best || s.kills > best.kills) best = s;
    }
    if (!best || best.kills < 28) return null;
    const p = activePlayers.find((ap) => ap.id === best.playerId);
    if (!p) return null;
    const scoreSelf = best.team === "A" ? best.match.scoreTeamA : best.match.scoreTeamB;
    const scoreOpp = best.team === "A" ? best.match.scoreTeamB : best.match.scoreTeamA;
    return h(
      "record-kills", "RECORD", "achievement", "record", 95, 1.0,
      `${best.kills} Kills`, "Recorde de eliminações em uma partida",
      `${p.nickname} cravou seu nome na história do Hub: ${best.kills} eliminações em uma única partida na ${best.match.map.name}. O maior número de kills em uma partida desta temporada.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Kills Recorde", value: best.kills }, { label: "Mapa", value: best.match.map.name }, { label: "Placar", value: `${scoreSelf}x${scoreOpp}` }],
      "season",
      [{ mapName: best.match.map.name, scoreSelf, scoreOpp, won: scoreSelf > scoreOpp }],
      true,
    );
  },
};

export const recordAdrProvider: StoryProvider = {
  id: "record-adr",
  storyCategory: "record",
  weight: 10,
  generate({ activePlayers, allStats }) {
    let best: any = null;
    for (const s of allStats) {
      if (s.adr > 0 && (!best || s.adr > best.adr)) best = s;
    }
    if (!best || best.adr < 130) return null;
    const p = activePlayers.find((ap) => ap.id === best.playerId);
    if (!p) return null;
    const scoreSelf = best.team === "A" ? best.match.scoreTeamA : best.match.scoreTeamB;
    const scoreOpp = best.team === "A" ? best.match.scoreTeamB : best.match.scoreTeamA;
    return h(
      "record-adr", "RECORD", "achievement", "record", 93, 1.0,
      `${Math.round(best.adr)} ADR`, "Maior ADR em uma única partida",
      `${p.nickname} registrou ${Math.round(best.adr)} ADR em uma partida na ${best.match.map.name} — o maior dano por round em uma única partida desta temporada.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ADR Pico", value: Math.round(best.adr) }, { label: "Mapa", value: best.match.map.name }],
      "season",
      [{ mapName: best.match.map.name, scoreSelf, scoreOpp, won: scoreSelf > scoreOpp }],
      true,
    );
  },
};

export const recordRatingProvider: StoryProvider = {
  id: "record-rating",
  storyCategory: "record",
  weight: 10,
  generate({ activePlayers, allStats }) {
    let best: any = null;
    for (const s of allStats) {
      if (!best || s.rating > best.rating) best = s;
    }
    if (!best || best.rating < 2.0) return null;
    const p = activePlayers.find((ap) => ap.id === best.playerId);
    if (!p) return null;
    const scoreSelf = best.team === "A" ? best.match.scoreTeamA : best.match.scoreTeamB;
    const scoreOpp = best.team === "A" ? best.match.scoreTeamB : best.match.scoreTeamA;
    return h(
      "record-rating", "RECORD", "achievement", "record", 94, 1.0,
      `Rating ${best.rating.toFixed(2)}`, "Maior Rating em uma única partida",
      `${p.nickname} registrou ${best.rating.toFixed(2)} de rating na ${best.match.map.name} — a performance individual mais dominante em uma partida desta temporada.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Rating Pico", value: best.rating.toFixed(2) }, { label: "Mapa", value: best.match.map.name }],
      "season",
      [{ mapName: best.match.map.name, scoreSelf, scoreOpp, won: scoreSelf > scoreOpp }],
      true,
    );
  },
};

export const longestWinStreakProvider: StoryProvider = {
  id: "longest-win-streak",
  storyCategory: "record",
  weight: 9,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; streak: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = [...(statsByPlayer.get(player.id) ?? [])].reverse();
      let maxStreak = 0;
      let cur = 0;
      for (const s of stats) {
        if (isWin(s)) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0;
      }
      if (!best || maxStreak > best.streak) best = { player, streak: maxStreak, n: stats.length };
    }
    if (!best || best.streak < 5) return null;
    const prio = calculateHighlightScore(88, 1.0, 1.0 + (best.streak - 5) * 0.1, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "longest-win-streak", "HOT_STREAK", "achievement", "record", prio, 1.0,
      `${best.streak} Vitórias Seguidas`, "Maior sequência da temporada",
      `${p.nickname} atingiu a maior sequência de vitórias da temporada: ${best.streak} vitórias consecutivas sem perder uma única partida.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Sequência Recorde", value: best.streak }, { label: "Partidas Total", value: best.n }],
      "season", evidence(stats),
      best.streak >= 8,
    );
  },
};

export const mostDominantWinProvider: StoryProvider = {
  id: "most-dominant-win",
  storyCategory: "record",
  weight: 7,
  generate({ activePlayers, allStats }) {
    let best: any = null;
    let bestDiff = 0;
    for (const s of allStats) {
      if (!isWin(s)) continue;
      const scoreSelf = s.team === "A" ? s.match.scoreTeamA : s.match.scoreTeamB;
      const scoreOpp = s.team === "A" ? s.match.scoreTeamB : s.match.scoreTeamA;
      const diff = scoreSelf - scoreOpp;
      if (diff > bestDiff) { bestDiff = diff; best = s; }
    }
    if (!best || bestDiff < 8) return null;
    const p = activePlayers.find((ap) => ap.id === best.playerId);
    if (!p) return null;
    const scoreSelf = best.team === "A" ? best.match.scoreTeamA : best.match.scoreTeamB;
    const scoreOpp = best.team === "A" ? best.match.scoreTeamB : best.match.scoreTeamA;
    return h(
      "most-dominant-win", "DOMINANCE", "achievement", "record", 80, 1.0,
      `${scoreSelf}x${scoreOpp}`, "Vitória mais dominante da temporada",
      `A partida mais dominante da temporada: ${scoreSelf}x${scoreOpp} na ${best.match.map.name}. ${p.nickname} estava em campo neste dia histórico.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Placar", value: `${scoreSelf}x${scoreOpp}` }, { label: "Diferença", value: `+${bestDiff}` }, { label: "Mapa", value: best.match.map.name }],
      "season",
      [{ mapName: best.match.map.name, scoreSelf, scoreOpp, won: true }],
    );
  },
};

// ─── Sequências (ativas) ──────────────────────────────────────────────────────

export const hotStreakProvider: StoryProvider = {
  id: "hot-streak",
  storyCategory: "streak",
  weight: 9,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; streak: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      let streak = 0;
      for (const s of stats) { if (isWin(s)) streak++; else break; }
      if (streak >= 3 && (!best || streak > best.streak)) best = { player, streak, n: stats.length };
    }
    if (!best) return null;
    const prio = calculateHighlightScore(88, 1.0, 1.0 + (best.streak - 3) * 0.12, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "hot-streak", "HOT_STREAK", "competitive", "streak", prio, 1.0,
      `${best.streak} Vitórias Seguidas`, "Sequência invicta ativa",
      `${p.nickname} está dominando: ${best.streak} vitórias consecutivas e a sequência ainda está ativa.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Sequência Ativa", value: best.streak }, { label: "Status", value: "Invicto" }],
      "week", evidence(stats),
      best.streak >= 7,
    );
  },
};

export const coldStreakProvider: StoryProvider = {
  id: "cold-streak",
  storyCategory: "streak",
  weight: 4,
  generate({ activePlayers, statsByPlayer }) {
    let worst: { player: PlayerRow; streak: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      let streak = 0;
      for (const s of stats) { if (!isWin(s)) streak++; else break; }
      if (streak >= 3 && (!worst || streak > worst.streak)) worst = { player, streak, n: stats.length };
    }
    if (!worst) return null;
    const p = worst.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "cold-streak", "COLD_STREAK", "curiosity", "streak", 40, 0.8,
      `${worst.streak} Derrotas Seguidas`, "Sequência negativa ativa",
      `${p.nickname} está passando por um momento difícil: ${worst.streak} derrotas consecutivas. A hora da virada chegará.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Derrotas Seguidas", value: worst.streak }, { label: "Status", value: "Em recuperação" }],
      "week", evidence(stats),
    );
  },
};

// ─── Semana ───────────────────────────────────────────────────────────────────

export const weeklyBestProvider: StoryProvider = {
  id: "weekly-best",
  storyCategory: "week",
  weight: 8,
  generate({ activePlayers, statsByPlayer, allStats }) {
    const maxDate = allStats.reduce((max, s) => s.match.playedAt.getTime() > max.getTime() ? s.match.playedAt : max, new Date(0));
    const cutoff = new Date(maxDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    let best: { player: PlayerRow; rating: number; n: number; wr: number } | null = null;
    for (const player of activePlayers) {
      const recent = (statsByPlayer.get(player.id) ?? []).filter((s) => s.match.playedAt >= cutoff);
      if (recent.length < 3) continue;
      const rating = avgArr(recent.map((s) => s.rating));
      const wins = recent.filter((s) => isWin(s)).length;
      const wr = wins / recent.length;
      if (!best || rating > best.rating) best = { player, rating, n: recent.length, wr };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.rating / 1.5, best.n);
    const prio = calculateHighlightScore(86, conf, best.rating, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "weekly-best", "WEEKLY_STAR", "competitive", "week", prio, conf,
      "Jogador da Semana", `Rating ${best.rating.toFixed(2)} • ${Math.round(best.wr * 100)}% WR`,
      `${p.nickname} é o destaque das últimas 2 semanas: rating ${best.rating.toFixed(2)} com ${Math.round(best.wr * 100)}% de vitórias em ${best.n} partidas.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Rating Recente", value: best.rating.toFixed(2) }, { label: "Winrate", value: `${Math.round(best.wr * 100)}%` }, { label: "Jogos Recentes", value: best.n }],
      "week", evidence(stats),
    );
  },
};

export const weeklyAdrProvider: StoryProvider = {
  id: "weekly-adr",
  storyCategory: "week",
  weight: 7,
  generate({ activePlayers, statsByPlayer, allStats }) {
    const maxDate = allStats.reduce((max, s) => s.match.playedAt.getTime() > max.getTime() ? s.match.playedAt : max, new Date(0));
    const cutoff = new Date(maxDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    let best: { player: PlayerRow; adr: number; n: number } | null = null;
    for (const player of activePlayers) {
      const recent = (statsByPlayer.get(player.id) ?? []).filter((s) => s.match.playedAt >= cutoff);
      const adrs = recent.map((s) => s.adr).filter((v) => v > 0);
      if (adrs.length < 3) continue;
      const adr = avgArr(adrs);
      if (!best || adr > best.adr) best = { player, adr, n: recent.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.adr / 150, best.n);
    const prio = calculateHighlightScore(78, conf, best.adr / 90, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "weekly-adr", "ADR_MONSTER", "competitive", "week", prio, conf,
      `${Math.round(best.adr)} ADR Semanal`, "Maior ADR nas últimas 2 semanas",
      `${p.nickname} está causando o maior dano por round nas últimas 2 semanas: ${Math.round(best.adr)} ADR em ${best.n} partidas recentes.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ADR Recente", value: Math.round(best.adr) }, { label: "Jogos Recentes", value: best.n }],
      "week", evidence(stats),
    );
  },
};

// ─── Parcerias ────────────────────────────────────────────────────────────────

function buildDuoStats(
  pA: PlayerRow,
  pB: PlayerRow,
  statsA: any[],
  statsB: any[],
): { shared: any[]; wins: number; winrate: number; ratingAvg: number; bByMatch: Map<string, any> } | null {
  const bByMatch = new Map(statsB.map((s: any) => [s.matchId, s]));
  const shared: any[] = [];
  for (const sA of statsA) {
    const sB = bByMatch.get(sA.matchId);
    if (sB && sA.team === sB.team) shared.push(sA);
  }
  if (shared.length < 3) return null;
  const wins = shared.filter((s) => isWin(s)).length;
  const winrate = wins / shared.length;
  const ratingAvg = avgArr(shared.map((s) => (s.rating + (bByMatch.get(s.matchId)?.rating ?? s.rating)) / 2));
  return { shared, wins, winrate, ratingAvg, bByMatch };
}

export const bestDuoProvider: StoryProvider = {
  id: "best-duo",
  storyCategory: "duo",
  weight: 8,
  generate({ activePlayers, statsByPlayer }) {
    let best: { pA: PlayerRow; pB: PlayerRow; winrate: number; rating: number; n: number; ev: any[] } | null = null;
    for (let i = 0; i < activePlayers.length; i++) {
      for (let j = i + 1; j < activePlayers.length; j++) {
        const pA = activePlayers[i], pB = activePlayers[j];
        const duo = buildDuoStats(pA, pB, statsByPlayer.get(pA.id) ?? [], statsByPlayer.get(pB.id) ?? []);
        if (!duo || duo.shared.length < 5) continue;
        const conf = calculateConfidence(duo.winrate, duo.shared.length);
        const score = conf * duo.ratingAvg;
        if (!best || score > calculateConfidence(best.winrate, best.n) * best.rating)
          best = { pA, pB, winrate: duo.winrate, rating: duo.ratingAvg, n: duo.shared.length, ev: evidence(duo.shared) };
      }
    }
    if (!best) return null;
    const conf = calculateConfidence(best.winrate, best.n);
    const prio = calculateHighlightScore(84, conf, best.rating / 1.1, 0.9);
    const players = [{ id: best.pA.id, nickname: best.pA.nickname, avatarUrl: best.pA.avatarUrl }, { id: best.pB.id, nickname: best.pB.nickname, avatarUrl: best.pB.avatarUrl }];
    return h(
      "best-duo", "DUO_SYNERGY", "social", "duo", prio, conf,
      "Melhor Parceria", `${Math.round(best.winrate * 100)}% winrate em ${best.n} partidas`,
      `${best.pA.nickname} e ${best.pB.nickname} formam a dupla mais forte do Hub: ${Math.round(best.winrate * 100)}% de vitórias em ${best.n} partidas juntos. Rating médio da dupla: ${best.rating.toFixed(2)}.`,
      players,
      [{ label: "Winrate Dupla", value: `${Math.round(best.winrate * 100)}%` }, { label: "Rating Dupla", value: best.rating.toFixed(2) }, { label: "Partidas Juntos", value: best.n }],
      "season", best.ev,
    );
  },
};

export const volumeDuoProvider: StoryProvider = {
  id: "volume-duo",
  storyCategory: "duo",
  weight: 6,
  generate({ activePlayers, statsByPlayer }) {
    let best: { pA: PlayerRow; pB: PlayerRow; n: number; winrate: number; ev: any[] } | null = null;
    for (let i = 0; i < activePlayers.length; i++) {
      for (let j = i + 1; j < activePlayers.length; j++) {
        const pA = activePlayers[i], pB = activePlayers[j];
        const duo = buildDuoStats(pA, pB, statsByPlayer.get(pA.id) ?? [], statsByPlayer.get(pB.id) ?? []);
        if (!duo || duo.shared.length < 8) continue;
        if (!best || duo.shared.length > best.n) best = { pA, pB, n: duo.shared.length, winrate: duo.winrate, ev: evidence(duo.shared) };
      }
    }
    if (!best) return null;
    const conf = calculateConfidence(best.winrate, best.n);
    const prio = calculateHighlightScore(72, conf, 1.2, 0.8);
    const players = [{ id: best.pA.id, nickname: best.pA.nickname, avatarUrl: best.pA.avatarUrl }, { id: best.pB.id, nickname: best.pB.nickname, avatarUrl: best.pB.avatarUrl }];
    return h(
      "volume-duo", "DUO_SYNERGY", "social", "duo", prio, conf,
      "Dupla Mais Assídua", `${best.n} partidas juntos`,
      `${best.pA.nickname} e ${best.pB.nickname} lideram a cooperação do Hub com ${best.n} partidas disputadas no mesmo time (${Math.round(best.winrate * 100)}% de vitórias).`,
      players,
      [{ label: "Partidas Juntos", value: best.n }, { label: "Winrate", value: `${Math.round(best.winrate * 100)}%` }],
      "season", best.ev,
    );
  },
};

export const hotDuoProvider: StoryProvider = {
  id: "hot-duo",
  storyCategory: "duo",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { pA: PlayerRow; pB: PlayerRow; wins: number; n: number; rating: number; ev: any[] } | null = null;
    for (let i = 0; i < activePlayers.length; i++) {
      for (let j = i + 1; j < activePlayers.length; j++) {
        const pA = activePlayers[i], pB = activePlayers[j];
        const duo = buildDuoStats(pA, pB, statsByPlayer.get(pA.id) ?? [], statsByPlayer.get(pB.id) ?? []);
        if (!duo) continue;
        const recent = duo.shared.slice(0, 8);
        if (recent.length < 3) continue;
        const wins = recent.filter((s) => isWin(s)).length;
        const wr = wins / recent.length;
        if (wr < 0.6) continue;
        const rating = avgArr(recent.map((s) => (s.rating + (duo.bByMatch.get(s.matchId)?.rating ?? s.rating)) / 2));
        if (!best || wins > best.wins || (wins === best.wins && rating > best.rating))
          best = { pA, pB, wins, n: recent.length, rating, ev: evidence(recent) };
      }
    }
    if (!best) return null;
    const conf = calculateConfidence(best.wins / best.n, best.n);
    const prio = calculateHighlightScore(82, conf, best.rating / 1.1, 1.0);
    const players = [{ id: best.pA.id, nickname: best.pA.nickname, avatarUrl: best.pA.avatarUrl }, { id: best.pB.id, nickname: best.pB.nickname, avatarUrl: best.pB.avatarUrl }];
    return h(
      "hot-duo", "DUO_SYNERGY", "social", "duo", prio, conf,
      "Dupla em Alta", `${best.wins}/${best.n} recentes`,
      `${best.pA.nickname} e ${best.pB.nickname} estão impossíveis juntos: ${best.wins} vitórias nas últimas ${best.n} partidas disputadas no mesmo time.`,
      players,
      [{ label: "Vitórias Recentes", value: best.wins }, { label: "Jogos Recentes", value: best.n }, { label: "Rating Dupla", value: best.rating.toFixed(2) }],
      "week", best.ev,
    );
  },
};

// ─── Mapas ────────────────────────────────────────────────────────────────────

function makeMapProvider(targetMap: string): StoryProvider {
  return {
    id: `map-king-${targetMap.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    storyCategory: "map",
    weight: 7,
    generate(dataset) {
      const specialists = getMapSpecialistsFromDataset(dataset);
      const spec = specialists.find((s) => s.mapName === targetMap);
      if (!spec) return null;
      const mapStats = (dataset.statsByPlayer.get(spec.player.id) ?? []).filter((s) => s.match.map.name === targetMap);
      if (mapStats.length < 3 || spec.rating < 1.1) return null;
      const wins = mapStats.filter((s) => isWin(s)).length;
      const wr = Math.round((wins / mapStats.length) * 100);
      const conf = calculateConfidence(spec.rating / 2.0, mapStats.length);
      const prio = calculateHighlightScore(80, conf, spec.rating / 1.1, 0.9);
      const p = spec.player;
      return h(
        `map-king-${targetMap.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        "MAP_MASTER", "competitive", "map", prio, conf,
        `Rei da ${targetMap}`, `Rating ${spec.rating.toFixed(2)} • ${wr}% WR`,
        `${p.nickname} domina completamente a ${targetMap}: rating ${spec.rating.toFixed(2)}, ${wr}% de vitórias em ${mapStats.length} partidas nesta temporada.`,
        [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
        [{ label: "Rating no Mapa", value: spec.rating.toFixed(2) }, { label: "Winrate", value: `${wr}%` }, { label: "Partidas", value: mapStats.length }],
        "season", evidence(mapStats),
      );
    },
  };
}

export const mapProviders: StoryProvider[] = [
  "Mirage", "Inferno", "Ancient", "Dust2", "Nuke", "Overpass", "Vertigo", "Anubis", "Train",
].map(makeMapProvider);

export const bestMapAdrProvider: StoryProvider = {
  id: "best-map-adr",
  storyCategory: "map",
  weight: 5,
  generate({ activePlayers, statsByPlayer, allStats }) {
    const maps = new Set(allStats.map((s) => s.match.map.name));
    let best: { player: PlayerRow; mapName: string; adr: number; n: number } | null = null;
    for (const mapName of maps) {
      for (const player of activePlayers) {
        const mapStats = (statsByPlayer.get(player.id) ?? []).filter((s) => s.match.map.name === mapName);
        const adrs = mapStats.map((s) => s.adr).filter((v) => v > 0);
        if (adrs.length < 3) continue;
        const adr = avgArr(adrs);
        if (adr < 100) continue;
        if (!best || adr > best.adr) best = { player, mapName, adr, n: mapStats.length };
      }
    }
    if (!best) return null;
    const conf = calculateConfidence(best.adr / 150, best.n);
    const prio = calculateHighlightScore(68, conf, best.adr / 90, 0.85);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "best-map-adr", "ADR_MONSTER", "competitive", "map", prio, conf,
      `${Math.round(best.adr)} ADR na ${best.mapName}`, "Maior ADR por mapa",
      `${p.nickname} lidera o ADR na ${best.mapName}: ${Math.round(best.adr)} ADR médio em ${best.n} partidas nesse mapa.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ADR no Mapa", value: Math.round(best.adr) }, { label: "Mapa", value: best.mapName }, { label: "Partidas", value: best.n }],
      "season", evidence(stats.filter((s) => s.match.map.name === best!.mapName)),
    );
  },
};

// ─── Multikills ───────────────────────────────────────────────────────────────

export const aceKingProvider: StoryProvider = {
  id: "ace-king",
  storyCategory: "multikill",
  weight: 10,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; aces: number; quads: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const aces = stats.reduce((s, x) => s + (x.clutch1v5Wins ?? 0), 0);
      const quads = stats.reduce((s, x) => s + (x.quadKills ?? 0), 0);
      if (aces < 1) continue;
      if (!best || aces > best.aces) best = { player, aces, quads, n: stats.length };
    }
    if (!best) return null;
    const prio = calculateHighlightScore(90, 1.0, 1.5, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "ace-king", "MULTIKILL_SPECIALIST", "achievement", "multikill", prio, 1.0,
      `${best.aces} ACE${best.aces > 1 ? "S" : ""}`, "Especialista em eliminações totais",
      `${p.nickname} limpou o round sozinho ${best.aces} vez${best.aces > 1 ? "es" : ""} nesta temporada — ${best.aces} aces em ${best.n} partidas. O mais perigoso do Hub em rounds decisivos.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "ACEs", value: best.aces }, { label: "4Ks", value: best.quads }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
      best.aces >= 3,
    );
  },
};

export const quadKingProvider: StoryProvider = {
  id: "quad-king",
  storyCategory: "multikill",
  weight: 8,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; quads: number; triples: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const quads = stats.reduce((s, x) => s + (x.quadKills ?? 0), 0);
      const triples = stats.reduce((s, x) => s + (x.tripleKills ?? 0), 0);
      if (quads < 2) continue;
      if (!best || quads > best.quads) best = { player, quads, triples, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.quads / 10, best.n);
    const prio = calculateHighlightScore(80, conf, 1.3, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "quad-king", "MULTIKILL_SPECIALIST", "achievement", "multikill", prio, conf,
      `${best.quads} Quads`, "Rei dos 4Ks",
      `${p.nickname} é o especialista em 4 kills por round: ${best.quads} quads registrados em ${best.n} partidas nesta temporada.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "4Ks", value: best.quads }, { label: "3Ks", value: best.triples }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

export const tripleKingProvider: StoryProvider = {
  id: "triple-king",
  storyCategory: "multikill",
  weight: 6,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; triples: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const triples = stats.reduce((s, x) => s + (x.tripleKills ?? 0), 0);
      if (triples < 5) continue;
      if (!best || triples > best.triples) best = { player, triples, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.triples / 15, best.n);
    const prio = calculateHighlightScore(68, conf, 1.1, 0.9);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "triple-king", "MULTIKILL_SPECIALIST", "competitive", "multikill", prio, conf,
      `${best.triples} Triple Kills`, "Rei dos 3Ks",
      `${p.nickname} acumula o maior número de triple kills do Hub: ${best.triples} em ${best.n} partidas esta temporada.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "3Ks", value: best.triples }, { label: "Partidas", value: best.n }],
      "season", evidence(stats),
    );
  },
};

// ─── Clutch ───────────────────────────────────────────────────────────────────

export const clutchKingProvider: StoryProvider = {
  id: "clutch-king",
  storyCategory: "clutch",
  weight: 9,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; clutches: number; v2: number; v3: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const clutches = stats.reduce((s, x) => s + (x.clutchesWon ?? 0), 0);
      const v2 = stats.reduce((s, x) => s + (x.clutch1v2Wins ?? 0), 0);
      const v3 = stats.reduce((s, x) => s + (x.clutch1v3Wins ?? 0), 0);
      if (clutches < 2) continue;
      if (!best || clutches > best.clutches) best = { player, clutches, v2, v3, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.clutches / 10, best.n);
    const prio = calculateHighlightScore(85, conf, 1.2, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "clutch-king", "CLUTCH_KING", "achievement", "clutch", prio, conf,
      "Rei do Clutch", `${best.clutches} clutches vencidos`,
      `${p.nickname} resolve quando a pressão é máxima: ${best.clutches} clutches vencidos nesta temporada${best.v2 > 0 ? `, incluindo ${best.v2} situações 1v2 e ${best.v3} situações 1v3` : ""}.`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "Clutches", value: best.clutches }, { label: "1v2 Ganhos", value: best.v2 }, { label: "1v3 Ganhos", value: best.v3 }],
      "season", evidence(stats),
      best.clutches >= 5,
    );
  },
};

export const clutch1v2Provider: StoryProvider = {
  id: "clutch-1v2",
  storyCategory: "clutch",
  weight: 7,
  generate({ activePlayers, statsByPlayer }) {
    let best: { player: PlayerRow; v2: number; v2Att: number; rate: number; n: number } | null = null;
    for (const player of activePlayers) {
      const stats = statsByPlayer.get(player.id) ?? [];
      if (stats.length < 3) continue;
      const v2 = stats.reduce((s, x) => s + (x.clutch1v2Wins ?? 0), 0);
      const v2Att = stats.reduce((s, x) => s + (x.clutch1v2Attempts ?? 0), 0);
      if (v2 < 1 || v2Att < 2) continue;
      const rate = v2 / v2Att;
      if (!best || v2 > best.v2 || (v2 === best.v2 && rate > best.rate)) best = { player, v2, v2Att, rate, n: stats.length };
    }
    if (!best) return null;
    const conf = calculateConfidence(best.rate, best.v2Att);
    const prio = calculateHighlightScore(78, conf, 1.3, 1.0);
    const p = best.player;
    const stats = statsByPlayer.get(p.id) ?? [];
    return h(
      "clutch-1v2", "CLUTCH_KING", "achievement", "clutch", prio, conf,
      `${best.v2} Clutches 1v2`, `${Math.round(best.rate * 100)}% de aproveitamento`,
      `${p.nickname} lidera os clutches 1v2 do Hub: ${best.v2} vencidos de ${best.v2Att} tentativas (${Math.round(best.rate * 100)}% de aproveitamento).`,
      [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
      [{ label: "1v2 Ganhos", value: best.v2 }, { label: "Tentativas", value: best.v2Att }, { label: "Aproveitamento", value: `${Math.round(best.rate * 100)}%` }],
      "season", evidence(stats),
    );
  },
};
