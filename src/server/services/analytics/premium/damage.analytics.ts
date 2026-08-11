import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumDamageDTO {
  totalDamage: number;
  totalEvents: number;
  avgDamagePerRound: number | null;
  avgDamagePerHit: number | null;
  // Hitgroup distribution as % of damage events (0–100)
  headPercent: number;
  chestNeckPercent: number;
  stomachPercent: number;
  armsPercent: number;
  legsPercent: number;
  genericPercent: number;
}

function zeroDamage(): PremiumDamageDTO {
  return {
    totalDamage: 0,
    totalEvents: 0,
    avgDamagePerRound: null,
    avgDamagePerHit: null,
    headPercent: 0,
    chestNeckPercent: 0,
    stomachPercent: 0,
    armsPercent: 0,
    legsPercent: 0,
    genericPercent: 0,
  };
}

export async function getPlayerDamageStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumDamageDTO> {
  // Step 1 — parallel: get player steamId + match GC IDs + total rounds
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
        match: { select: { gamersClubMatchId: true, scoreTeamA: true, scoreTeamB: true } },
      },
    }),
  ]);

  if (!playerRecord) return zeroDamage();

  const gcMatchIds = matchStats
    .map((s) => s.match.gamersClubMatchId)
    .filter((id): id is string => id !== null);

  if (gcMatchIds.length === 0) return zeroDamage();

  const totalRounds = matchStats.reduce(
    (acc, s) => acc + s.match.scoreTeamA + s.match.scoreTeamB,
    0,
  );

  // Step 2 — batch fetch MatchPayloads (no N+1)
  const payloads = await prisma.matchPayload.findMany({
    where: { sourceMatchId: { in: gcMatchIds } },
    select: { payload: true },
  });

  if (payloads.length === 0) return zeroDamage();

  // Step 3 — aggregate in memory (consistent with ADR: damage_health only, no self-damage)
  const { steamId } = playerRecord;

  const counts = {
    head: 0,
    chestNeck: 0,
    stomach: 0,
    arms: 0,
    legs: 0,
    generic: 0,
  };

  let totalDamage = 0;
  let totalEvents = 0;

  for (const { payload } of payloads) {
    const damage: any[] = (payload as any)?.damage ?? [];
    for (const d of damage) {
      if (d.attacker_steamid !== steamId) continue;
      if (d.victim_steamid === steamId) continue; // exclude self-damage (consistent with ADR)

      const hp = d.damage_health ?? 0;
      totalDamage += hp;
      totalEvents++;

      switch (d.hitgroup) {
        case "head":
          counts.head++;
          break;
        case "chest":
        case "neck":
          counts.chestNeck++;
          break;
        case "stomach":
          counts.stomach++;
          break;
        case "left_arm":
        case "right_arm":
          counts.arms++;
          break;
        case "left_leg":
        case "right_leg":
          counts.legs++;
          break;
        default:
          counts.generic++;
          break;
      }
    }
  }

  if (totalEvents === 0) return zeroDamage();

  const pct = (n: number) => Math.round((n / totalEvents) * 1000) / 10; // 1 decimal

  return {
    totalDamage,
    totalEvents,
    avgDamagePerRound:
      totalRounds > 0 ? Math.round((totalDamage / totalRounds) * 10) / 10 : null,
    avgDamagePerHit: Math.round((totalDamage / totalEvents) * 10) / 10,
    headPercent: pct(counts.head),
    chestNeckPercent: pct(counts.chestNeck),
    stomachPercent: pct(counts.stomach),
    armsPercent: pct(counts.arms),
    legsPercent: pct(counts.legs),
    genericPercent: pct(counts.generic),
  };
}
