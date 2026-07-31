import type { Prisma } from "@/generated/prisma";

export interface PremiumEventsBundle {
  matchups: Prisma.PlayerMatchupCreateManyInput[];
  clutches: Prisma.PlayerClutchCreateManyInput[];
  entryDuels: Prisma.PlayerEntryDuelCreateManyInput[];
  trades: Prisma.PlayerTradeEventCreateManyInput[];
}

/**
 * Helper to resolve a player's team side ("A" = Terrorist, "B" = CT) in a specific round.
 */
function resolvePlayerSide(
  steamId: string,
  roundNumber: number,
  kills: any[],
  startingTeam: "A" | "B"
): "A" | "B" {
  // 1. Look for any kill by or on this player in this round
  const roundKill = kills.find(
    (k) =>
      k.round === roundNumber &&
      (k.killer_steamid === steamId || k.victim_steamid === steamId)
  );

  if (roundKill) {
    const rawTeam =
      roundKill.killer_steamid === steamId
        ? roundKill.killer_team
        : roundKill.victim_team;
    if (rawTeam) {
      return (rawTeam === "TERRORIST" || rawTeam === "T") ? "A" : "B";
    }
  }

  // 2. Fallback: Halftime side swap (halftime is round 12 in MR12, round 15 in MR15)
  // We check if the round is after the first half. Most CS2 matches are MR12.
  const isSecondHalf = roundNumber > 12;
  if (isSecondHalf) {
    return startingTeam === "A" ? "B" : "A";
  }
  return startingTeam;
}

export function extractPremiumEvents(
  payload: any,
  matchId: string,
  playerBySteamId: Map<string, { id: string; team: "A" | "B" }>,
  trackedPlayersCount: number
): PremiumEventsBundle {
  const result: PremiumEventsBundle = {
    matchups: [],
    clutches: [],
    entryDuels: [],
    trades: [],
  };

  // Guard: premium events are only processed for community/mix matches (>= 2 tracked players)
  if (trackedPlayersCount < 2) {
    return result;
  }

  const kills = payload.kills ?? [];
  const clutches = payload.clutches ?? [];

  // =========================================================================
  // 1. MATCHUPS ("Quem matou quem")
  // =========================================================================
  const matchupMap = new Map<string, {
    kills: number;
    headshots: number;
    entryKills: number;
    tradeKills: number;
    weapons: Record<string, number>;
    rounds: Record<string, { weapon: string; hs: boolean; entry: boolean; trade: boolean }>;
    totalDistance: number;
    distanceCount: number;
  }>();

  for (const k of kills) {
    if (!k.killer_steamid || !k.victim_steamid) continue;
    if (k.killer_steamid === k.victim_steamid) continue; // Suicide
    if (k.analytics?.teamkill === true) continue; // Teamkill

    const killerInfo = playerBySteamId.get(k.killer_steamid);
    const victimInfo = playerBySteamId.get(k.victim_steamid);
    if (!killerInfo || !victimInfo) continue;

    const killerId = killerInfo.id;
    const victimId = victimInfo.id;
    const key = `${killerId}:${victimId}`;

    let entry = matchupMap.get(key);
    if (!entry) {
      entry = {
        kills: 0,
        headshots: 0,
        entryKills: 0,
        tradeKills: 0,
        weapons: {},
        rounds: {},
        totalDistance: 0,
        distanceCount: 0,
      };
      matchupMap.set(key, entry);
    }

    entry.kills++;
    if (k.headshot === true) entry.headshots++;
    const isEntry = k.analytics?.entry_kill === true || k.analytics?.entry === true;
    const isTrade = k.analytics?.trade_kill === true || k.analytics?.trade === true;
    
    if (isEntry) entry.entryKills++;
    if (isTrade) entry.tradeKills++;

    const weapon = k.weapon ?? "unknown";
    entry.weapons[weapon] = (entry.weapons[weapon] || 0) + 1;

    const roundNum = String(k.round ?? 0);
    entry.rounds[roundNum] = {
      weapon,
      hs: k.headshot === true,
      entry: isEntry,
      trade: isTrade,
    };

    if (typeof k.distance === "number" && k.distance > 0) {
      entry.totalDistance += k.distance;
      entry.distanceCount++;
    }
  }

  for (const [key, val] of matchupMap.entries()) {
    const [killerId, victimId] = key.split(":");
    const avgDistance = val.distanceCount > 0 ? val.totalDistance / val.distanceCount : null;
    result.matchups.push({
      matchId,
      killerId,
      victimId,
      kills: val.kills,
      headshots: val.headshots,
      entryKills: val.entryKills,
      tradeKills: val.tradeKills,
      weapons: val.weapons as any,
      rounds: val.rounds as any,
      avgDistance,
    });
  }

  // =========================================================================
  // 2. CLUTCHES (Tentativas e vitórias)
  // =========================================================================
  for (const c of clutches) {
    if (!c.player_steamid) continue;
    const playerInfo = playerBySteamId.get(c.player_steamid);
    if (!playerInfo) continue;

    const side = resolvePlayerSide(c.player_steamid, c.round, kills, playerInfo.team);

    // Encontrar arma usada no round para ganhar/finalizar o clutch (se venceu)
    let clutchWeapon: string | null = null;
    if (c.won === true) {
      const finalKillInRound = [...kills]
        .filter((k) => k.round === c.round && k.killer_steamid === c.player_steamid)
        .sort((a, b) => (b.tick ?? 0) - (a.tick ?? 0))[0];
      if (finalKillInRound) {
        clutchWeapon = finalKillInRound.weapon ?? null;
      }
    }

    result.clutches.push({
      matchId,
      playerId: playerInfo.id,
      opponents: c.opponents ?? 1,
      won: c.won === true,
      roundNumber: c.round ?? 1,
      side,
      weapon: clutchWeapon,
    });
  }

  // =========================================================================
  // 3. ENTRY DUELS
  // =========================================================================
  // Group kills by round
  const killsByRound = new Map<number, any[]>();
  for (const k of kills) {
    if (!k.round) continue;
    const list = killsByRound.get(k.round) ?? [];
    list.push(k);
    killsByRound.set(k.round, list);
  }

  for (const [roundNumber, roundKills] of killsByRound.entries()) {
    // Sort kills by tick to find the first kill of the round
    const sortedKills = [...roundKills].sort((a, b) => (a.tick ?? 0) - (b.tick ?? 0));
    const firstKill = sortedKills[0];

    if (firstKill && firstKill.killer_steamid && firstKill.victim_steamid) {
      const killerInfo = playerBySteamId.get(firstKill.killer_steamid);
      const victimInfo = playerBySteamId.get(firstKill.victim_steamid);

      if (killerInfo) {
        const side = resolvePlayerSide(firstKill.killer_steamid, roundNumber, kills, killerInfo.team);
        result.entryDuels.push({
          matchId,
          playerId: killerInfo.id,
          isKiller: true,
          side,
          weapon: firstKill.weapon ?? null,
          roundNumber,
          opponentId: victimInfo?.id ?? null,
        });
      }

      if (victimInfo) {
        const side = resolvePlayerSide(firstKill.victim_steamid, roundNumber, kills, victimInfo.team);
        result.entryDuels.push({
          matchId,
          playerId: victimInfo.id,
          isKiller: false,
          side,
          weapon: firstKill.weapon ?? null,
          roundNumber,
          opponentId: killerInfo?.id ?? null,
        });
      }
    }
  }

  // =========================================================================
  // 4. TRADES
  // =========================================================================
  for (const k of kills) {
    const isTrade = k.analytics?.trade_kill === true || k.analytics?.trade === true;
    if (isTrade && k.round && k.killer_steamid && k.victim_steamid) {
      const traderInfo = playerBySteamId.get(k.killer_steamid); // O que matou no trade
      if (!traderInfo) continue;

      // Find the previous kill in the same round to locate the teammate who died (victim)
      const roundKills = killsByRound.get(k.round) ?? [];
      const priorKills = roundKills
        .filter((pk) => (pk.tick ?? 0) < (k.tick ?? 0))
        .sort((a, b) => (b.tick ?? 0) - (a.tick ?? 0)); // nearest first

      // Find the nearest kill where the killer is our victim (i.e. the guy we just traded)
      const prevKill = priorKills.find((pk) => pk.killer_steamid === k.victim_steamid);

      if (prevKill && prevKill.victim_steamid) {
        const victimInfo = playerBySteamId.get(prevKill.victim_steamid); // Teammate who died first
        if (victimInfo) {
          const timeDiff =
            typeof k.time_seconds === "number" && typeof prevKill.time_seconds === "number"
              ? k.time_seconds - prevKill.time_seconds
              : typeof k.tick === "number" && typeof prevKill.tick === "number"
              ? (k.tick - prevKill.tick) / 64
              : 0;

          result.trades.push({
            matchId,
            victimId: victimInfo.id,
            traderId: traderInfo.id,
            roundNumber: k.round,
            timeDiff: Math.max(0, Number(timeDiff.toFixed(2))),
            weapon: k.weapon ?? null,
          });
        }
      }
    }
  }

  return result;
}
