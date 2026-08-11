import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumCombatDTO {
  wallbangKills: number;
  throughSmokeKills: number;
  noScopeKills: number;
  blindedKills: number;
  totalSkillKills: number; // Unique kills with at least one skill modifier (OR, not sum)
}

function zeroCombat(): PremiumCombatDTO {
  return {
    wallbangKills: 0,
    throughSmokeKills: 0,
    noScopeKills: 0,
    blindedKills: 0,
    totalSkillKills: 0,
  };
}

export async function getPlayerCombatStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumCombatDTO> {
  // Step 1 — parallel: get player steamId + match GC IDs for this player/season
  const [playerRecord, matchStats] = await Promise.all([
    prisma.player.findUnique({
      where: { id: filter.playerId },
      select: { steamId: true },
    }),
    prisma.playerMatchStats.findMany({
      where: {
        playerId: filter.playerId,
        ...buildBaseWhere(filter),
      },
      select: {
        match: { select: { gamersClubMatchId: true } },
      },
    }),
  ]);

  if (!playerRecord) return zeroCombat();

  const gcMatchIds = matchStats
    .map((s) => s.match.gamersClubMatchId)
    .filter((id): id is string => id !== null);

  if (gcMatchIds.length === 0) return zeroCombat();

  // Step 2 — single batch query for all MatchPayloads (no N+1)
  const payloads = await prisma.matchPayload.findMany({
    where: { sourceMatchId: { in: gcMatchIds } },
    select: { payload: true },
  });

  if (payloads.length === 0) return zeroCombat();

  // Step 3 — count skill kills in memory
  const { steamId } = playerRecord;
  let wallbang = 0;
  let thrusmoke = 0;
  let noscope = 0;
  let blinded = 0;
  let totalSkill = 0;

  for (const { payload } of payloads) {
    const kills: any[] = (payload as any)?.kills ?? [];
    for (const k of kills) {
      if (k.killer_steamid !== steamId) continue;
      if (k.killer_steamid === k.victim_steamid) continue;        // suicide
      if (k.analytics?.teamkill === true) continue;               // teamkill

      const isWallbang = k.wallbang === true;
      const isThruSmoke = k.thrusmoke === true;
      const isNoScope = k.noscope === true;
      const isBlinded = k.attacker_blind === true;

      if (isWallbang) wallbang++;
      if (isThruSmoke) thrusmoke++;
      if (isNoScope) noscope++;
      if (isBlinded) blinded++;
      if (isWallbang || isThruSmoke || isNoScope || isBlinded) totalSkill++;
    }
  }

  return {
    wallbangKills: wallbang,
    throughSmokeKills: thrusmoke,
    noScopeKills: noscope,
    blindedKills: blinded,
    totalSkillKills: totalSkill,
  };
}
