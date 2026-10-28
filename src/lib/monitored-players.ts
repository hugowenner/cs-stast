import type {
  MonitoredPlayerEntry,
  SeasonComparisonEntry,
} from "@/server/services/competitive.service";

export interface CompactRatingVariation {
  rawDiff: number;
  formatted: string;
  type: "up" | "down" | "neutral";
  arrow: "↑" | "↓" | "→";
}

export interface CarouselMonitoredPlayerEntry extends MonitoredPlayerEntry {
  displayRank: number | null;
  isInitialSample: boolean;
  totalSeasonMatches: number;
  sampleMatches: number;
  ratingVariation: CompactRatingVariation | null;
}

export const MIN_MATCHES_TO_SHOW = 5;
export const MIN_MATCHES_FOR_FULL_SAMPLE = 10;
export const MIN_MATCHES_FOR_COMPARISON = 20;

/**
 * Formata a variação compacta do rating entre os dois blocos de 10 partidas:
 * - Evolução: "↑ +0,28"
 * - Queda: "↓ −0,17" (com sinal de menos U+2212)
 * - Variação que arredonda para zero em duas casas: "→ 0,00" (sem sinal negativo nem indicação de alta/queda)
 * Formatação pt-BR com duas casas decimais, calculando a diferença antes de arredondar.
 */
export function formatCompactRatingVariation(rawDiff: number): CompactRatingVariation | null {
  if (typeof rawDiff !== "number" || isNaN(rawDiff) || !isFinite(rawDiff)) {
    return null;
  }

  const roundedAbs = Math.abs(rawDiff).toFixed(2).replace(".", ",");
  if (roundedAbs === "0,00") {
    return {
      rawDiff,
      formatted: "→ 0,00",
      type: "neutral",
      arrow: "→",
    };
  }
  if (rawDiff > 0) {
    return {
      rawDiff,
      formatted: `↑ +${roundedAbs}`,
      type: "up",
      arrow: "↑",
    };
  }
  return {
    rawDiff,
    formatted: `↓ −${roundedAbs}`,
    type: "down",
    arrow: "↓",
  };
}

/**
 * Desempate determinístico para ranking do carrossel:
 * 1. Rating DESC
 * 2. Winrate DESC
 * 3. K/D DESC
 * 4. ADR DESC
 * 5. Nickname ASC (alfabético)
 */
export function comparePlayersDeterministic(
  a: { rating: number; winrate: number; kd: number; adr: number; player: { nickname: string } },
  b: { rating: number; winrate: number; kd: number; adr: number; player: { nickname: string } },
): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  if (b.winrate !== a.winrate) return b.winrate - a.winrate;
  if (b.kd !== a.kd) return b.kd - a.kd;
  if (b.adr !== a.adr) return b.adr - a.adr;
  return a.player.nickname.localeCompare(b.player.nickname);
}

/**
 * Transforma a lista bruta de jogadores monitorados para exibição exclusiva no carrossel da Home:
 * 1. < 5 partidas na temporada: descartado (não exibe).
 * 2. 5 a 9 partidas: grupo 'Amostra inicial' (exibido DEPOIS da amostra completa, sem rank numérico ou destaque).
 * 3. >= 10 partidas: grupo 'Amostra completa' (ordenado por rating com desempate determinístico, numerado #1..#N).
 * 4. Se ninguém atingir 10 partidas: exibe apenas os jogadores com >= 5 partidas, todos como 'Amostra inicial' (sem #1 ou destaque).
 * 5. Não muta os objetos recebidos.
 */
export function transformMonitoredPlayersForCarousel(
  players: MonitoredPlayerEntry[],
  seasonMatchesFallbackMap?: Map<string, number>,
  seasonComparison?: SeasonComparisonEntry[],
): CarouselMonitoredPlayerEntry[] {
  // Mapa de comparação (apenas jogadores com 20 partidas válidas no período constam em seasonComparison)
  const comparisonByPlayer = new Map<string, SeasonComparisonEntry>();
  if (Array.isArray(seasonComparison)) {
    for (const item of seasonComparison) {
      if (item?.player?.id) {
        comparisonByPlayer.set(item.player.id, item);
      }
    }
  }

  // 1. Filtrar elegíveis (>= 5 partidas na temporada)
  const eligible = players
    .map((entry) => {
      const totalSeasonMatches =
        entry.seasonMatchCount ??
        seasonMatchesFallbackMap?.get(entry.player.id) ??
        entry.matchCount;
      const sampleMatches = entry.matchCount;

      // Variação de rating vinculada estritamente à presença de dois blocos completos de 10 jogos no período
      const comp = comparisonByPlayer.get(entry.player.id);
      const rawDiff =
        comp && typeof comp.rawDiff === "number"
          ? comp.rawDiff
          : comp && typeof comp.diff?.rating === "number"
          ? comp.diff.rating
          : null;

      const ratingVariation =
        rawDiff !== null ? formatCompactRatingVariation(rawDiff) : null;

      return {
        entry,
        totalSeasonMatches,
        sampleMatches,
        ratingVariation,
      };
    })
    .filter((item) => item.totalSeasonMatches >= MIN_MATCHES_TO_SHOW);

  // 2. Dividir entre amostra completa (>= 10) e amostra inicial (5 a 9)
  const fullSampleList = eligible.filter(
    (item) => item.totalSeasonMatches >= MIN_MATCHES_FOR_FULL_SAMPLE,
  );
  const initialSampleList = eligible.filter(
    (item) => item.totalSeasonMatches < MIN_MATCHES_FOR_FULL_SAMPLE,
  );

  // 3. Ordenar ambos os grupos com o mesmo desempate determinístico
  fullSampleList.sort((a, b) => comparePlayersDeterministic(a.entry, b.entry));
  initialSampleList.sort((a, b) => comparePlayersDeterministic(a.entry, b.entry));

  // 4. Mapear grupo de amostra completa (com displayRank numérico iniciando em 1)
  const formattedFullSample: CarouselMonitoredPlayerEntry[] = fullSampleList.map(
    (item, index) => ({
      ...item.entry,
      displayRank: index + 1,
      isInitialSample: false,
      totalSeasonMatches: item.totalSeasonMatches,
      sampleMatches: item.sampleMatches,
      ratingVariation: item.ratingVariation,
    }),
  );

  // 5. Mapear grupo de amostra inicial (sem displayRank numérico, isInitialSample = true)
  const formattedInitialSample: CarouselMonitoredPlayerEntry[] = initialSampleList.map(
    (item) => ({
      ...item.entry,
      displayRank: null,
      isInitialSample: true,
      totalSeasonMatches: item.totalSeasonMatches,
      sampleMatches: item.sampleMatches,
      ratingVariation: item.ratingVariation,
    }),
  );

  // 6. Concatenar: amostra completa primeiro, seguida da amostra inicial
  return [...formattedFullSample, ...formattedInitialSample];
}
