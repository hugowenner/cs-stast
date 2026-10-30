export interface ClutchTierStats {
  wins: number;
  attempts: number;
  winrate: number;
}

export interface DecisivePlayerEntry {
  player: { id: string; nickname: string; avatarUrl: string | null };
  impactPercent: number;
  entryKills: number;
  entryDeaths: number | null;
  openingWinrate: number | null;
  tradeKills: number;
  tradedDeaths: number;
  tradeEfficiency: number | null;
  clutchWins: number;
  hideTradesAndClutches: boolean; // Oculta se os dados de toda a comunidade forem 0
  matchCount?: number;
  totalRounds?: number;
  totalDeaths?: number;
  totalOpeningDuels?: number | null;
  rawOpeningWinrate?: number | null;
  rawTradeEfficiency?: number | null;
  rawImpactPercent?: number;
  hasOpeningDeathsTelemetry?: boolean;
  hasTradeTelemetry?: boolean;
  hasClutchTelemetry?: boolean;

  // --- FASE 1: Destaques & Telemetria Avançada ---
  // Rei do Clutch
  clutchAttempts?: number | null;
  clutchWinrate?: number | null;
  rawClutchWinrate?: number | null;
  clutchHighDisadvantageWins?: number | null;
  clutchTiers?: {
    "1v1": ClutchTierStats;
    "1v2": ClutchTierStats;
    "1v3": ClutchTierStats;
    "1v4": ClutchTierStats;
    "1v5": ClutchTierStats;
  } | null;

  // Ponta de Lança
  teamWinrateAfterFk?: number | null;
  rawTeamWinrateAfterFk?: number | null;
  roundsWonAfterFk?: number | null;
  firstKillsWithRoundData?: number | null;

  // Anjo da Guarda
  avgTradeReactionTime?: number | null;
  deathsInTradeMatches?: number | null;
  tradeTelemetryMatchesCount?: number;
}

export interface CategoryLeaderResult {
  leader: DecisivePlayerEntry | null;
  candidates: DecisivePlayerEntry[];
  isPreliminary: boolean;
  isPartial: boolean;
  hasTelemetry: boolean;
  thresholdLabel: string;
}

export interface DecisiveCategoriesSummary {
  reiDoClutch: CategoryLeaderResult;
  pontaDeLanca: CategoryLeaderResult;
  anjoDaGuarda: CategoryLeaderResult;
}

/**
 * Computa os 3 líderes independentes da seção Jogador Decisivo:
 * 1. Rei do Clutch:
 *    - Principal: clutches vencidos
 *    - Desempate 1: taxa de conversão (vencidos / tentados)
 *    - Desempate 2: vitórias em alta desvantagem (1v2+)
 *    - Desempate 3: playerId determinístico
 *    - Elegibilidade: mínimo de 30 tentativas (com fallback gracioso)
 *
 * 2. Ponta de Lança:
 *    - Principal: duelos de abertura vencidos (First Kills)
 *    - Desempate 1: taxa de vitória no 1º duelo (FK / (FK + FD))
 *    - Desempate 2: taxa de vitória da equipe após FK
 *    - Desempate 3: playerId determinístico
 *    - Elegibilidade: mínimo de 50 duelos completos (ou 30 FKs se for amostra parcial GC)
 *
 * 3. Anjo da Guarda:
 *    - Principal: trades executados (como vingador)
 *    - Desempate 1: menor tempo médio de reação em trades
 *    - Desempate 2: maior taxa de retaliação de mortes (deaths_traded / deaths_in_trade_matches)
 *    - Desempate 3: playerId determinístico
 *    - Elegibilidade: mínimo de 10 partidas com telemetria de trade (ou 30 mortes na amostra)
 */
export function computeDecisiveCategories(entries: DecisivePlayerEntry[]): DecisiveCategoriesSummary {
  const hasClutch = entries.some((e) => (e.clutchAttempts ?? 0) > 0 || (e.hasClutchTelemetry && e.clutchWins > 0));
  const hasTrade = entries.some((e) => e.tradeKills > 0 || (e.deathsInTradeMatches ?? 0) > 0);

  // 1. Rei do Clutch: maior número de clutches vencidos
  const clutchEligible = entries.filter((e) => (e.clutchAttempts ?? 0) >= 30);
  const clutchPreliminary = entries.filter((e) => (e.clutchAttempts ?? 0) > 0 || e.clutchWins > 0);
  const clutchPool = clutchEligible.length > 0 ? clutchEligible : clutchPreliminary;
  const isClutchPreliminary = clutchEligible.length === 0 && clutchPreliminary.length > 0;
  const isClutchPartial = entries.some(
    (e) => e.clutchWins > 0 && (e.clutchAttempts === null || e.clutchAttempts === undefined),
  );

  const sortedClutch = [...clutchPool].sort((a, b) => {
    const winsDiff = b.clutchWins - a.clutchWins;
    if (winsDiff !== 0) return winsDiff;
    const wrA = a.rawClutchWinrate ?? a.clutchWinrate ?? -1;
    const wrB = b.rawClutchWinrate ?? b.clutchWinrate ?? -1;
    const wrDiff = wrB - wrA;
    if (Math.abs(wrDiff) > 1e-9) return wrDiff;
    const highDiff = (b.clutchHighDisadvantageWins ?? 0) - (a.clutchHighDisadvantageWins ?? 0);
    if (highDiff !== 0) return highDiff;
    return a.player.id.localeCompare(b.player.id);
  });

  // 2. Ponta de Lança: maior número de duelos de abertura vencidos (First Kills)
  const hasFullEntryTelemetry = entries.some(
    (e) => e.hasOpeningDeathsTelemetry && e.entryDeaths !== null && e.entryDeaths !== undefined,
  );
  const hasPartialEntryKills = entries.some((e) => e.entryKills > 0);
  const hasEntry = hasFullEntryTelemetry || hasPartialEntryKills;
  const isEntryPartial = !hasFullEntryTelemetry && hasPartialEntryKills;

  // Se telemetria completa de duelos estiver disponível, exige mínimo de 50 duelos
  // Se for amostra parcial (apenas First Kills de súmula GC), exige mínimo de 30 First Kills
  const entryEligible = isEntryPartial
    ? entries.filter((e) => e.entryKills >= 30)
    : entries.filter((e) => (e.totalOpeningDuels ?? 0) >= 50);

  const entryPreliminary = entries.filter((e) => e.entryKills > 0);
  const entryPool = entryEligible.length > 0 ? entryEligible : entryPreliminary;
  const isEntryPreliminary = entryEligible.length === 0 && entryPreliminary.length > 0;

  const sortedEntry = [...entryPool].sort((a, b) => {
    const fkDiff = b.entryKills - a.entryKills;
    if (fkDiff !== 0) return fkDiff;
    const owrA = a.rawOpeningWinrate ?? a.openingWinrate ?? -1;
    const owrB = b.rawOpeningWinrate ?? b.openingWinrate ?? -1;
    const owrDiff = owrB - owrA;
    if (Math.abs(owrDiff) > 1e-9) return owrDiff;
    const postA = a.rawTeamWinrateAfterFk ?? a.teamWinrateAfterFk ?? -1;
    const postB = b.rawTeamWinrateAfterFk ?? b.teamWinrateAfterFk ?? -1;
    const postDiff = postB - postA;
    if (Math.abs(postDiff) > 1e-9) return postDiff;
    return a.player.id.localeCompare(b.player.id);
  });

  // 3. Anjo da Guarda: maior número de trades realizados
  const isTradePartial = entries.some(
    (e) =>
      e.tradeKills > 0 &&
      (e.deathsInTradeMatches === null || e.deathsInTradeMatches === undefined || e.deathsInTradeMatches === 0),
  );
  const tradeEligible = entries.filter(
    (e) => (e.deathsInTradeMatches ?? 0) >= 30 || (e.tradeTelemetryMatchesCount ?? 0) >= 10,
  );
  const tradePreliminary = entries.filter((e) => e.tradeKills > 0 || (e.deathsInTradeMatches ?? 0) > 0);
  const tradePool = tradeEligible.length > 0 ? tradeEligible : tradePreliminary;
  const isTradePreliminary = tradeEligible.length === 0 && tradePreliminary.length > 0;

  const sortedTrade = [...tradePool].sort((a, b) => {
    const tradeDiff = b.tradeKills - a.tradeKills;
    if (tradeDiff !== 0) return tradeDiff;
    const timeA = a.avgTradeReactionTime ?? 999;
    const timeB = b.avgTradeReactionTime ?? 999;
    const timeDiff = timeA - timeB;
    if (Math.abs(timeDiff) > 1e-9) return timeDiff;
    const effA = a.rawTradeEfficiency ?? a.tradeEfficiency ?? -1;
    const effB = b.rawTradeEfficiency ?? b.tradeEfficiency ?? -1;
    const effDiff = effB - effA;
    if (Math.abs(effDiff) > 1e-9) return effDiff;
    return a.player.id.localeCompare(b.player.id);
  });

  return {
    reiDoClutch: {
      leader: sortedClutch[0] ?? null,
      candidates: sortedClutch,
      isPreliminary: isClutchPreliminary,
      isPartial: isClutchPartial,
      hasTelemetry: hasClutch,
      thresholdLabel: isClutchPartial ? "Apenas Clutches GC" : "Mínimo de 30 tentativas",
    },
    pontaDeLanca: {
      leader: sortedEntry[0] ?? null,
      candidates: sortedEntry,
      isPreliminary: isEntryPreliminary,
      isPartial: isEntryPartial,
      hasTelemetry: hasEntry,
      thresholdLabel: isEntryPartial ? "Apenas First Kills (GC)" : "Mínimo de 50 duelos",
    },
    anjoDaGuarda: {
      leader: sortedTrade[0] ?? null,
      candidates: sortedTrade,
      isPreliminary: isTradePreliminary,
      isPartial: isTradePartial,
      hasTelemetry: hasTrade,
      thresholdLabel: "Mínimo de 10 partidas em telemetria",
    },
  };
}
