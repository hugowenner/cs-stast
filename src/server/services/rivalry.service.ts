import * as rivalryRepo from "@/server/repositories/rivalry.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import { processH2HMatches } from "@/server/analytics/comparison.analytics";

export function listTopRivalries(take?: number) {
  return rivalryRepo.listTopRivalries(take);
}

export interface RivalryH2HSummary {
  id: string;
  playerA: { id: string; nickname: string; avatarUrl: string | null };
  playerB: { id: string; nickname: string; avatarUrl: string | null };
  matchesAgainst: number;
  winsA: number;
  winsB: number;
  winrateA: number;
  /** K/D ratio médio de playerA nos confrontos diretos (kills / max(deaths, 1)) */
  avgKdA: number | null;
  /** K/D ratio médio de playerB nos confrontos diretos */
  avgKdB: number | null;
  lastMatch: {
    id: string;
    mapName: string;
    scoreA: number;
    scoreB: number;
  } | null;
}

/**
 * Confronto direto (V/D/winrate/KD) calculado a partir dos resultados reais de partida —
 * mesma fonte usada na comparação de jogadores (já validada).
 */
export async function listTopRivalriesWithH2H(take = 10): Promise<RivalryH2HSummary[]> {
  const candidates = await rivalryRepo.listTopRivalries(take * 2);

  const summaries = await Promise.all(
    candidates.map(async (r) => {
      const [outcomesA, outcomesB] = await Promise.all([
        statsRepo.getPlayerMatchOutcomes(r.playerAId),
        statsRepo.getPlayerMatchOutcomes(r.playerBId),
      ]);
      const h2h = processH2HMatches(r.playerAId, r.playerBId, outcomesA, outcomesB);
      const winsA = h2h.against.wins[r.playerAId] ?? 0;
      const winsB = h2h.against.wins[r.playerBId] ?? 0;
      const total = h2h.against.total;

      // Partidas de confronto direto (times opostos), ordenadas da mais recente
      const matchesBMap = new Map(outcomesB.map((o) => [o.match.id, o]));
      const againstMatches = outcomesA
        .filter((oa) => {
          const ob = matchesBMap.get(oa.match.id);
          return ob && oa.team !== ob.team;
        })
        .sort((a, b) => new Date(b.match.playedAt).getTime() - new Date(a.match.playedAt).getTime());

      // Último confronto
      const lastMatch = againstMatches[0]?.match ?? null;
      let lastMatchDetail = null;

      if (lastMatch) {
        const statA = outcomesA.find((o) => o.match.id === lastMatch.id);
        if (statA) {
          const scoreA = statA.team === "A" ? lastMatch.scoreTeamA : lastMatch.scoreTeamB;
          const scoreB = statA.team === "A" ? lastMatch.scoreTeamB : lastMatch.scoreTeamA;
          lastMatchDetail = {
            id: lastMatch.id,
            mapName: lastMatch.map.name,
            scoreA,
            scoreB,
          };
        }
      }

      // K/D médio nos confrontos diretos
      let avgKdA: number | null = null;
      let avgKdB: number | null = null;

      if (againstMatches.length > 0) {
        const matchIdsAgainst = new Set(againstMatches.map((m) => m.match.id));

        const statsAInAgainst = outcomesA.filter((o) => matchIdsAgainst.has(o.match.id));
        const statsBInAgainst = outcomesB.filter((o) => matchIdsAgainst.has(o.match.id));

        if (statsAInAgainst.length > 0) {
          const totalKillsA = statsAInAgainst.reduce((s, o) => s + (o.kills ?? 0), 0);
          const totalDeathsA = statsAInAgainst.reduce((s, o) => s + (o.deaths ?? 0), 0);
          avgKdA = totalDeathsA > 0 ? Math.round((totalKillsA / totalDeathsA) * 100) / 100 : null;
        }

        if (statsBInAgainst.length > 0) {
          const totalKillsB = statsBInAgainst.reduce((s, o) => s + (o.kills ?? 0), 0);
          const totalDeathsB = statsBInAgainst.reduce((s, o) => s + (o.deaths ?? 0), 0);
          avgKdB = totalDeathsB > 0 ? Math.round((totalKillsB / totalDeathsB) * 100) / 100 : null;
        }
      }

      return {
        id: r.id,
        playerA: { id: r.playerA.id, nickname: r.playerA.nickname, avatarUrl: r.playerA.avatarUrl },
        playerB: { id: r.playerB.id, nickname: r.playerB.nickname, avatarUrl: r.playerB.avatarUrl },
        matchesAgainst: total,
        winsA,
        winsB,
        winrateA: total > 0 ? Math.round((winsA / total) * 100) : 0,
        avgKdA,
        avgKdB,
        lastMatch: lastMatchDetail,
      };
    })
  );

  return summaries
    .filter((s) => s.matchesAgainst > 0)
    .sort((a, b) => b.matchesAgainst - a.matchesAgainst)
    .slice(0, take);
}
