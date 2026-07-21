import * as sessionRepo from "@/server/repositories/session.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import {
  computeSmartSession,
  RuleBasedSessionInsightProvider,
} from "@/server/analytics/session.analytics";
import type { SessionSummaryDTO } from "@/server/dtos/sessionSummary.dto";

export function listSessions(params: { skip?: number; take?: number }) {
  return sessionRepo.listSessions(params);
}

export async function syncSession(input: { name?: string; date: Date }) {
  const session = await sessionRepo.findOrCreateSessionForDate(input.date);
  if (input.name && input.name !== session.name) {
    return sessionRepo.renameSession(session.id, input.name);
  }
  return session;
}

export async function getSessionSummary(id: string): Promise<SessionSummaryDTO | null> {
  const session = await sessionRepo.findSessionById(id);
  if (!session) return null;

  // 1. Achar todos os IDs de jogadores participantes
  const playerIds = Array.from(
    new Set(session.matches.flatMap((m) => m.playerStats.map((s) => s.playerId)))
  );

  // 2. Buscar médias históricas de carreira de cada jogador para calcular as tendências
  const careerTotals = await Promise.all(
    playerIds.map(async (playerId) => {
      const totals = await statsRepo.getPlayerCareerTotals(playerId);
      const outcomes = await statsRepo.getPlayerMatchOutcomes(playerId);
      const wins = outcomes.filter((o) => {
        const scoreSelf = o.team === "A" ? o.match.scoreTeamA : o.match.scoreTeamB;
        const scoreOpp = o.team === "A" ? o.match.scoreTeamB : o.match.scoreTeamA;
        return scoreSelf > scoreOpp;
      }).length;
      const winrate = outcomes.length > 0 ? (wins / outcomes.length) * 100 : 50;

      return {
        id: playerId,
        rating: totals._avg.rating ?? 1.0,
        adr: totals._avg.adr ?? 80,
        hs: totals._sum.kills ? ((totals._sum.headshots ?? 0) / (totals._sum.kills ?? 1)) * 100 : 40,
        winrate,
      };
    })
  );

  const playerCareerAverages = Object.fromEntries(careerTotals.map((c) => [c.id, c]));

  // Adaptar o formato do banco para RawMatchData do analytics
  const matchesData = session.matches.map((m) => ({
    id: m.id,
    playedAt: m.playedAt,
    scoreTeamA: m.scoreTeamA,
    scoreTeamB: m.scoreTeamB,
    map: { name: m.map.name },
    playerStats: m.playerStats.map((s) => ({
      playerId: s.playerId,
      team: s.team,
      rating: s.rating,
      adr: s.adr,
      kast: s.kast,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      headshots: s.headshots,
      eloBefore: s.eloBefore,
      eloAfter: s.eloAfter,
      player: {
        id: s.player.id,
        nickname: s.player.nickname,
        avatarUrl: s.player.avatarUrl,
        trackedPlayer: { active: true },
      },
    })),
  }));

  // 3. Chamar a computação inteligente do analytics
  const baseSummary = computeSmartSession(
    { id: session.id, name: session.name, date: session.date },
    matchesData,
    playerCareerAverages
  );

  // 4. Executar o provedor de insights estruturado
  const insightProvider = new RuleBasedSessionInsightProvider();
  const insights = insightProvider.getInsights(baseSummary);

  return {
    ...baseSummary,
    insights,
  };
}

// Manter compatibilidade com rotas antigas caso necessário
export async function getSessionDetail(id: string) {
  const session = await sessionRepo.findSessionById(id);
  if (!session) return null;

  const ratingByPlayer = new Map<string, { total: number; count: number; nickname: string }>();
  for (const match of session.matches) {
    for (const stat of match.playerStats) {
      const entry = ratingByPlayer.get(stat.playerId) ?? {
        total: 0,
        count: 0,
        nickname: stat.player.nickname,
      };
      entry.total += stat.rating;
      entry.count += 1;
      ratingByPlayer.set(stat.playerId, entry);
    }
  }

  let mvp: { playerId: string; nickname: string; avgRating: number } | null = null;
  for (const [playerId, entry] of ratingByPlayer) {
    const avgRating = entry.total / entry.count;
    if (!mvp || avgRating > mvp.avgRating) {
      mvp = { playerId, nickname: entry.nickname, avgRating: Math.round(avgRating * 100) / 100 };
    }
  }

  return { session, mvp };
}
