export interface PodiumPlayer {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  levelGc?: number | null;
}

export interface OfficialTop3Entry {
  player: PodiumPlayer | null;
  matchesPlayed: number;
  value: number;
  rawScore: number;
  rawRating: number;
  isEligible: boolean;
  confidenceStatus?: string;
}

export interface LeaderDiffResult {
  diff: number | null;
  formattedDiff: string | null;
  isTied: boolean;
}

/**
 * Calcula a diferença de pontuação em relação ao líder oficial.
 * Valores calculados com precisão direta sobre os números de origem.
 * 
 * Regras:
 * - Se scores inválidos ou ausentes: omite a diferença (formattedDiff: null).
 * - Se diff < 0 (runner > líder): omite a diferença (formattedDiff: null), nunca exibe distância negativa.
 * - Se empate real (|diff| < 1e-9): "Mesmo score do líder"
 * - Se diff > 0 e arredonda para 0,000 (ex: < 0,0005): "Menos de 0,001 atrás do líder"
 * - Diferença padrão: 3 casas decimais com vírgula (pt-BR) + " atrás do líder" (ex: "0,030 atrás do líder")
 */
export function calculateLeaderDiff(
  leaderScore?: number | null,
  runnerScore?: number | null
): LeaderDiffResult {
  if (
    leaderScore == null ||
    runnerScore == null ||
    typeof leaderScore !== "number" ||
    typeof runnerScore !== "number" ||
    Number.isNaN(leaderScore) ||
    Number.isNaN(runnerScore)
  ) {
    return {
      diff: null,
      formattedDiff: null,
      isTied: false,
    };
  }

  const rawDiff = leaderScore - runnerScore;

  // Empate real no score
  if (Math.abs(rawDiff) < 1e-9) {
    return {
      diff: 0,
      formattedDiff: "Mesmo score do líder",
      isTied: true,
    };
  }

  // Diferença negativa: inconsistência ou corredor com score superior. Nunca exibir distância negativa.
  if (rawDiff < 0) {
    return {
      diff: rawDiff,
      formattedDiff: null,
      isTied: false,
    };
  }

  // Diferença positiva que arredonda para 0,000 (ex.: menor que 0,0005)
  if (Number(rawDiff.toFixed(3)) === 0) {
    return {
      diff: rawDiff,
      formattedDiff: "Menos de 0,001 atrás do líder",
      isTied: false,
    };
  }

  const formattedNumber = rawDiff.toFixed(3).replace(".", ",");
  return {
    diff: rawDiff,
    formattedDiff: `${formattedNumber} atrás do líder`,
    isTied: false,
  };
}

/**
 * Formata o timestamp da última sincronização confiável no fuso de São Paulo (America/Sao_Paulo).
 * Formato auditado: "Dados atualizados em DD/MM às HH:mm"
 */
export function formatLastSync(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;

    if (!day || !month || !hour || !minute) return null;
    return `Dados atualizados em ${day}/${month} às ${hour}:${minute}`;
  } catch {
    return null;
  }
}

/**
 * Formata título e status do período selecionado.
 * Para All-Time/Carreira: "Histórico geral", sem status de temporada ativa.
 * Para Temporadas: "Temporada Outubro/2026", status "EM ANDAMENTO" ou "ENCERRADA".
 */
export function formatSeasonHeader(
  seasonLabel: string,
  seasonStatus?: string,
  seasonId?: string
): { title: string; isAllTime: boolean; statusBadge: { label: string; variant: "good" | "neutral" } | null } {
  const isAllTime =
    seasonStatus === "ALL" ||
    seasonId === "all" ||
    seasonLabel.toLowerCase().includes("carreira") ||
    seasonLabel.toLowerCase().includes("histórico");

  if (isAllTime) {
    return {
      title: "Histórico Geral",
      isAllTime: true,
      statusBadge: null,
    };
  }

  const cleaned = seasonLabel
    .replace(" de ", "/")
    .replace(/^\w/, (c) => c.toUpperCase());

  const title = cleaned.toLowerCase().startsWith("temporada") ? cleaned : `Temporada ${cleaned}`;
  const isActive = seasonStatus === "ACTIVE";

  return {
    title,
    isAllTime: false,
    statusBadge: {
      label: isActive ? "EM ANDAMENTO" : "ENCERRADA",
      variant: isActive ? "good" : "neutral",
    },
  };
}
