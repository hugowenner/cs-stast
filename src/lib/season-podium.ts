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
  diff: number;
  formattedDiff: string;
  isTied: boolean;
}

/**
 * Calcula a diferença de pontuação em relação ao líder oficial.
 * Valores calculados com precisão antes de qualquer arredondamento de exibição.
 * 
 * Regras:
 * - Se diff <= 0: "Empatado em pontos"
 * - Se diff > 0 && diff < 1: "Menos de 1 ponto atrás" (nunca "0 pontos atrás")
 * - Se diff >= 1: "X pontos atrás do líder" (ou "1 ponto atrás do líder")
 */
export function calculateLeaderDiff(leaderScore: number, runnerScore: number): LeaderDiffResult {
  const diff = Number((leaderScore - runnerScore).toFixed(6));

  if (diff <= 0) {
    return {
      diff: 0,
      formattedDiff: "Empatado em pontos",
      isTied: true,
    };
  }

  if (diff < 1) {
    return {
      diff,
      formattedDiff: "Menos de 1 ponto atrás",
      isTied: false,
    };
  }

  const rounded = Math.round(diff);
  return {
    diff,
    formattedDiff: `${rounded} ${rounded === 1 ? "ponto" : "pontos"} atrás do líder`,
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
