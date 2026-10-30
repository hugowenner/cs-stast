import { prisma } from '../src/server/db';

async function main() {
  const season = await prisma.season.findFirst({ where: { name: 'Setembro/2026' } });
  if (!season) return;

  const matches = await prisma.match.findMany({
    where: {
      seasonId: season.id,
      trackedPlayersCount: { gte: 2 },
      roundsJson: { not: null },
    },
    select: {
      id: true,
      roundsJson: true,
      playerStats: {
        select: {
          playerId: true,
          team: true,
          player: {
            select: {
              id: true,
              nickname: true,
              trackedPlayer: { select: { active: true } }
            }
          }
        }
      },
      entryDuels: {
        where: { isKiller: true },
        select: {
          roundNumber: true,
          playerId: true,
          side: true,
        }
      }
    }
  });

  let sameTeamMatches = 0;
  let confrontationMatches = 0;

  let sameTeam_monitoredFkTotal = 0;
  let sameTeam_monitoredFkWins = 0;
  let sameTeam_monitoredFkLosses = 0;
  let sameTeam_totalRounds = 0;

  let allComm_monitoredFkTotal = 0;
  let allComm_monitoredFkWins = 0;
  let allComm_monitoredFkLosses = 0;

  for (const m of matches) {
    const rounds = m.roundsJson as any[];
    if (!Array.isArray(rounds)) continue;

    const monitoredTeams = new Set<string>();
    const playerTeamMap = new Map<string, string>();
    for (const ps of m.playerStats) {
      playerTeamMap.set(ps.playerId, ps.team);
      if (ps.player.trackedPlayer?.active) {
        monitoredTeams.add(ps.team);
      }
    }

    const isSameTeam = monitoredTeams.size === 1;
    if (isSameTeam) sameTeamMatches++;
    else confrontationMatches++;

    const fkByRound = new Map<number, { playerId: string; side: 'A' | 'B' }>();
    for (const ed of m.entryDuels) {
      if (!fkByRound.has(ed.roundNumber)) {
        fkByRound.set(ed.roundNumber, { playerId: ed.playerId, side: ed.side });
      }
    }

    for (const r of rounds) {
      if (r.excluded_from_stats || r.type === 'knife_round') continue;
      const roundNum = r.number ?? r.position;
      if (!roundNum) continue;

      let roundWinnerSide: 'A' | 'B' | null = null;
      if (r.winner_team === 'T' || r.winner_team === 'TERRORIST') roundWinnerSide = 'A';
      else if (r.winner_team === 'CT' || r.winner_team === 'COUNTER_TERRORIST') roundWinnerSide = 'B';
      if (!roundWinnerSide) continue;

      if (isSameTeam) sameTeam_totalRounds++;

      const fk = fkByRound.get(roundNum);
      if (!fk) continue;

      const killerTeam = playerTeamMap.get(fk.playerId);
      const killerIsMonitored = m.playerStats.some(ps => ps.playerId === fk.playerId && ps.player.trackedPlayer?.active);

      if (killerIsMonitored) {
        allComm_monitoredFkTotal++;
        if (roundWinnerSide === fk.side) allComm_monitoredFkWins++;
        else allComm_monitoredFkLosses++;

        if (isSameTeam) {
          sameTeam_monitoredFkTotal++;
          if (roundWinnerSide === fk.side) sameTeam_monitoredFkWins++;
          else sameTeam_monitoredFkLosses++;
        }
      }
    }
  }

  console.log(`Setembro/2026: Total matches: ${matches.length}`);
  console.log(`Same team matches (squad): ${sameTeamMatches}, Confrontation matches: ${confrontationMatches}`);
  console.log(`\n--- Squad only (isSameTeam) ---`);
  console.log(`Total eligible rounds: ${sameTeam_totalRounds}`);
  console.log(`Monitored FKs: ${sameTeam_monitoredFkTotal} (${((sameTeam_monitoredFkTotal / sameTeam_totalRounds) * 100).toFixed(1)}% opening duel share)`);
  console.log(`Won after FK: ${sameTeam_monitoredFkWins} (${((sameTeam_monitoredFkWins / sameTeam_monitoredFkTotal) * 100).toFixed(1)}%)`);
  console.log(`Lost after FK (Entregues): ${sameTeam_monitoredFkLosses} (${((sameTeam_monitoredFkLosses / sameTeam_monitoredFkTotal) * 100).toFixed(1)}%)`);

  console.log(`\n--- All Community (including mix) ---`);
  console.log(`Monitored FKs: ${allComm_monitoredFkTotal}`);
  console.log(`Won: ${allComm_monitoredFkWins} (${((allComm_monitoredFkWins / allComm_monitoredFkTotal) * 100).toFixed(1)}%)`);
  console.log(`Lost: ${allComm_monitoredFkLosses} (${((allComm_monitoredFkLosses / allComm_monitoredFkTotal) * 100).toFixed(1)}%)`);
}

main().catch(console.error).finally(() => process.exit(0));
