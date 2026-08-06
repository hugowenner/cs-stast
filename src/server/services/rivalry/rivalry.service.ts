import { prisma } from "@/server/db";
import { calculateRivalryDeltas } from "@/server/domain/rivalry";
import { isCommunityMatch } from "@/server/domain/matchClassification";

export async function rebuildAllRivalries() {
  return prisma.$transaction(async (tx) => {
    // 1. Apaga todas as rivalidades existentes (Reconstrução completa)
    await tx.rivalry.deleteMany();

    // 2. Busca todos os player stats de partidas com >= 2 tracked players
    const stats = await tx.playerMatchStats.findMany({
      where: {
        match: {
          trackedPlayersCount: { gte: 2 }
        }
      },
      select: {
        matchId: true,
        playerId: true,
        team: true,
        match: {
          select: { seasonId: true }
        }
      }
    });

    // 3. Busca todas as kills das partidas elegíveis
    const kills = await tx.event.findMany({
      where: {
        type: "KILL",
        match: {
          trackedPlayersCount: { gte: 2 }
        },
        victimId: { not: null }
      },
      select: {
        matchId: true,
        playerId: true,
        victimId: true
      }
    });

    // Agrupa por matchId
    const statsByMatch = new Map<string, { playerId: string; team: "A" | "B"; seasonId: string | null }[]>();
    for (const s of stats) {
      const list = statsByMatch.get(s.matchId) ?? [];
      list.push({ playerId: s.playerId, team: s.team as "A" | "B", seasonId: s.match.seasonId });
      statsByMatch.set(s.matchId, list);
    }

    const killsByMatch = new Map<string, { killerId: string; victimId: string }[]>();
    for (const k of kills) {
      if (!k.victimId) continue;
      const list = killsByMatch.get(k.matchId) ?? [];
      list.push({ killerId: k.playerId, victimId: k.victimId });
      killsByMatch.set(k.matchId, list);
    }

    const consolidated = new Map<string, {
      playerAId: string;
      playerBId: string;
      seasonId: string | null;
      killsAOnB: number;
      killsBOnA: number;
      matchesTogether: number;
      matchesAgainst: number;
    }>();

    const addDelta = (
      playerAId: string,
      playerBId: string,
      seasonId: string | null | undefined,
      delta: { killsAOnB: number; killsBOnA: number; matchesTogether: number; matchesAgainst: number }
    ) => {
      const normSeason = seasonId ?? null;
      const key = `${playerAId}:${playerBId}:${normSeason}`;
      let record = consolidated.get(key);
      if (!record) {
        record = {
          playerAId,
          playerBId,
          seasonId: normSeason,
          killsAOnB: 0,
          killsBOnA: 0,
          matchesTogether: 0,
          matchesAgainst: 0,
        };
        consolidated.set(key, record);
      }
      record.killsAOnB += delta.killsAOnB;
      record.killsBOnA += delta.killsBOnA;
      record.matchesTogether += delta.matchesTogether;
      record.matchesAgainst += delta.matchesAgainst;
    };

    // 4. Processa cada partida
    for (const [matchId, matchPlayers] of statsByMatch.entries()) {
      const matchKills = killsByMatch.get(matchId) ?? [];
      const deltas = calculateRivalryDeltas(matchPlayers, matchKills);
      const seasonId = matchPlayers[0]?.seasonId ?? null;

      for (const d of deltas) {
        addDelta(d.playerAId, d.playerBId, null, d);
        if (seasonId) {
          addDelta(d.playerAId, d.playerBId, seasonId, d);
        }
      }
    }

    if (consolidated.size > 0) {
      const list = Array.from(consolidated.values());
      await tx.rivalry.createMany({ data: list });
    }
  });
}

export async function rebuildRivalriesForPlayers(playerIds: string[]) {
  if (playerIds.length === 0) return;

  return prisma.$transaction(async (tx) => {
    // 1. Apaga as rivalidades existentes apenas para os pares desses jogadores
    await tx.rivalry.deleteMany({
      where: {
        playerAId: { in: playerIds },
        playerBId: { in: playerIds },
      },
    });

    // 2. Busca os player stats de partidas com >= 2 tracked players que envolveram esses jogadores
    const stats = await tx.playerMatchStats.findMany({
      where: {
        match: {
          trackedPlayersCount: { gte: 2 },
          playerStats: {
            some: { playerId: { in: playerIds } },
          },
        },
      },
      select: {
        matchId: true,
        playerId: true,
        team: true,
        match: {
          select: { seasonId: true },
        },
      },
    });

    const matchIds = Array.from(new Set(stats.map((s) => s.matchId)));
    if (matchIds.length === 0) return;

    // 3. Busca todas as kills dessas partidas
    const kills = await tx.event.findMany({
      where: {
        matchId: { in: matchIds },
        type: "KILL",
        victimId: { not: null },
      },
      select: {
        matchId: true,
        playerId: true, // killerId
        victimId: true,
      },
    });

    // Agrupa por matchId
    const statsByMatch = new Map<string, { playerId: string; team: "A" | "B"; seasonId: string | null }[]>();
    for (const s of stats) {
      const list = statsByMatch.get(s.matchId) ?? [];
      list.push({ playerId: s.playerId, team: s.team as "A" | "B", seasonId: s.match.seasonId });
      statsByMatch.set(s.matchId, list);
    }

    const killsByMatch = new Map<string, { killerId: string; victimId: string }[]>();
    for (const k of kills) {
      if (!k.victimId) continue;
      const list = killsByMatch.get(k.matchId) ?? [];
      list.push({ killerId: k.playerId, victimId: k.victimId });
      killsByMatch.set(k.matchId, list);
    }

    const consolidated = new Map<string, {
      playerAId: string;
      playerBId: string;
      seasonId: string | null;
      killsAOnB: number;
      killsBOnA: number;
      matchesTogether: number;
      matchesAgainst: number;
    }>();

    const addDelta = (
      playerAId: string,
      playerBId: string,
      seasonId: string | null | undefined,
      delta: { killsAOnB: number; killsBOnA: number; matchesTogether: number; matchesAgainst: number }
    ) => {
      // Filtragem de segurança: só inserimos rivalidades entre o subconjunto de jogadores monitorados de interesse
      if (!playerIds.includes(playerAId) || !playerIds.includes(playerBId)) return;

      const normSeason = seasonId ?? null;
      const key = `${playerAId}:${playerBId}:${normSeason}`;
      let record = consolidated.get(key);
      if (!record) {
        record = {
          playerAId,
          playerBId,
          seasonId: normSeason,
          killsAOnB: 0,
          killsBOnA: 0,
          matchesTogether: 0,
          matchesAgainst: 0,
        };
        consolidated.set(key, record);
      }
      record.killsAOnB += delta.killsAOnB;
      record.killsBOnA += delta.killsBOnA;
      record.matchesTogether += delta.matchesTogether;
      record.matchesAgainst += delta.matchesAgainst;
    };

    // 4. Processa cada partida
    for (const [matchId, matchPlayers] of statsByMatch.entries()) {
      const matchKills = killsByMatch.get(matchId) ?? [];
      const deltas = calculateRivalryDeltas(matchPlayers, matchKills);
      const seasonId = matchPlayers[0]?.seasonId ?? null;

      for (const d of deltas) {
        addDelta(d.playerAId, d.playerBId, null, d);
        if (seasonId) {
          addDelta(d.playerAId, d.playerBId, seasonId, d);
        }
      }
    }

    if (consolidated.size > 0) {
      const list = Array.from(consolidated.values());
      await tx.rivalry.createMany({ data: list });
    }
  });
}
