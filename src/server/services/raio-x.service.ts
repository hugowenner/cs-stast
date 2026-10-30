import { prisma } from "@/server/db";
import { Prisma } from "@/generated/prisma";
import type { CompetitiveDataset } from "@/server/services/competitive.service";
import { loadCompetitiveDataset } from "@/server/services/competitive.service";
import type {
  RaioXBundle,
  Entregamos5v4Stats,
  TerrorDosAmigosStats,
  EconomiaDesastreStats,
  MelhorDuplaStats,
  DuoTradeSynergy,
  MatadorEcoStats,
  PlantouGanhouStats,
  PlantouGanhouDefuser,
  EspecialistaArmasStats,
  CategorySpecialist,
  PlayerWeaponDominance,
  WeaponStat,
  WeaponCategory,
  ReiRoundsDecisivosStats,
  DecisivePlayerStat,
  PartnersRankings,
  DuoPartnership,
  PlayerPartnerDetail,
  PlayerPartnershipsSummary,
} from "@/lib/raio-x-types";

interface DemoRoundData {
  number?: number;
  position?: number;
  reason?: string;
  type?: string;
  excluded_from_stats?: boolean;
  winner_team?: string;
  mvp_steamid?: string;
}

function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

function isLoss(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA < s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB < s.match.scoreTeamA)
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DE NOMES E CATEGORIAS DE ARMAS
// ────────────────────────────────────────────────────────────────────────────

export const WEAPON_NAMES_MAP: Record<string, { displayName: string; category: WeaponCategory }> = {
  // Rifles
  ak47: { displayName: "AK-47", category: "rifles" },
  m4a1: { displayName: "M4A4", category: "rifles" },
  m4a1_silencer: { displayName: "M4A1-S", category: "rifles" },
  galilar: { displayName: "Galil AR", category: "rifles" },
  famas: { displayName: "FAMAS", category: "rifles" },
  sg556: { displayName: "SG 553", category: "rifles" },
  aug: { displayName: "AUG", category: "rifles" },

  // Snipers
  awp: { displayName: "AWP", category: "snipers" },
  ssg08: { displayName: "Scout (SSG 08)", category: "snipers" },
  g3sg1: { displayName: "G3SG1", category: "snipers" },
  scar20: { displayName: "SCAR-20", category: "snipers" },

  // Pistolas
  usp_silencer: { displayName: "USP-S", category: "pistols" },
  glock: { displayName: "Glock-18", category: "pistols" },
  deagle: { displayName: "Desert Eagle", category: "pistols" },
  p250: { displayName: "P250", category: "pistols" },
  fiveseven: { displayName: "Five-SeveN", category: "pistols" },
  tec9: { displayName: "Tec-9", category: "pistols" },
  cz75a: { displayName: "CZ75-Auto", category: "pistols" },
  hkp2000: { displayName: "P2000", category: "pistols" },
  revolver: { displayName: "R8 Revolver", category: "pistols" },
  elite: { displayName: "Dual Berettas", category: "pistols" },

  // SMGs
  mp9: { displayName: "MP9", category: "smgs" },
  mac10: { displayName: "MAC-10", category: "smgs" },
  mp7: { displayName: "MP7", category: "smgs" },
  mp5sd: { displayName: "MP5-SD", category: "smgs" },
  ump45: { displayName: "UMP-45", category: "smgs" },
  p90: { displayName: "P90", category: "smgs" },
  bizon: { displayName: "PP-Bizon", category: "smgs" },

  // Pesadas (Shotguns & LMGs)
  nova: { displayName: "Nova", category: "heavy" },
  xm1014: { displayName: "XM1014", category: "heavy" },
  mag7: { displayName: "MAG-7", category: "heavy" },
  sawedoff: { displayName: "Sawed-Off", category: "heavy" },
  m249: { displayName: "M249", category: "heavy" },
  negev: { displayName: "Negev", category: "heavy" },

  // Utilitárias / Facas / Taser
  hegrenade: { displayName: "Granada HE", category: "utility" },
  inferno: { displayName: "Molotov / Incendiária", category: "utility" },
  molotov: { displayName: "Molotov", category: "utility" },
  incgrenade: { displayName: "Incendiária", category: "utility" },
  taser: { displayName: "Zeus x27", category: "utility" },
};

export function normalizeWeapon(rawKey: string): { displayName: string; category: WeaponCategory } {
  const clean = rawKey.toLowerCase().trim();
  if (WEAPON_NAMES_MAP[clean]) {
    return WEAPON_NAMES_MAP[clean];
  }
  if (clean.includes("knife") || clean.includes("bayonet") || clean.includes("karambit") || clean.includes("dagger")) {
    return { displayName: "Faca", category: "utility" };
  }
  // Fallback limpo
  const formatted = clean.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { displayName: formatted, category: "utility" };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 1 — Entregamos o 5v4?
// ────────────────────────────────────────────────────────────────────────────

export async function calculateEntregamos5v4(
  seasonId?: string | "all",
): Promise<Entregamos5v4Stats> {
  const matches = await prisma.match.findMany({
    where: {
      seasonId: seasonId === "all" ? undefined : seasonId,
      trackedPlayersCount: { gte: 2 },
      demoUrl: { not: null },
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
              trackedPlayer: { select: { active: true } },
            },
          },
        },
      },
      entryDuels: {
        where: { isKiller: true },
        select: {
          roundNumber: true,
          playerId: true,
          side: true,
        },
      },
    },
  });

  let totalEligibleRounds = 0;
  let totalAdvantagesCreated = 0;
  let roundsWonAfterFk = 0;
  let roundsLostAfterFk = 0;

  for (const m of matches) {
    const rounds = m.roundsJson as DemoRoundData[];
    if (!Array.isArray(rounds)) continue;

    const monitoredPlayerIds = new Set<string>();
    for (const ps of m.playerStats) {
      if (ps.player.trackedPlayer?.active) {
        monitoredPlayerIds.add(ps.playerId);
      }
    }

    const fkByRound = new Map<number, { playerId: string; side: "A" | "B" }>();
    for (const ed of m.entryDuels) {
      if (!fkByRound.has(ed.roundNumber)) {
        fkByRound.set(ed.roundNumber, { playerId: ed.playerId, side: ed.side });
      }
    }

    for (const r of rounds) {
      if (r.excluded_from_stats || r.type === "knife_round") continue;
      const roundNum = r.number ?? r.position;
      if (!roundNum) continue;

      let roundWinnerSide: "A" | "B" | null = null;
      const winner = (r.winner_team ?? "").toUpperCase();
      if (winner === "T" || winner === "TERRORIST") {
        roundWinnerSide = "A";
      } else if (winner === "CT" || winner === "COUNTER_TERRORIST") {
        roundWinnerSide = "B";
      }

      if (!roundWinnerSide) continue;
      totalEligibleRounds++;

      const fk = fkByRound.get(roundNum);
      if (!fk) continue;

      const killerIsMonitored = monitoredPlayerIds.has(fk.playerId);
      if (!killerIsMonitored) continue;

      totalAdvantagesCreated++;
      if (roundWinnerSide === fk.side) {
        roundsWonAfterFk++;
      } else {
        roundsLostAfterFk++;
      }
    }
  }

  const hasTelemetry = totalAdvantagesCreated > 0;
  const conversionRate = hasTelemetry
    ? Math.round((roundsWonAfterFk / totalAdvantagesCreated) * 100)
    : null;
  const surrenderRate = hasTelemetry
    ? Math.round((roundsLostAfterFk / totalAdvantagesCreated) * 100)
    : null;

  return {
    totalEligibleRounds,
    totalAdvantagesCreated,
    roundsWonAfterFk,
    roundsLostAfterFk,
    conversionRate,
    surrenderRate,
    hasTelemetry,
    telemetryUnavailableReason: hasTelemetry
      ? null
      : "Telemetria de duelos de abertura ausente nesta temporada. Estatística disponível quando houver parsing avançado de demos.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 2 — Terror dos Amigos (Incidentes com Aliados)
// ────────────────────────────────────────────────────────────────────────────
// CACHE EM MEMÓRIA & BUNDLE COMPARTILHADO DE PAYLOADS DE DEMOS
// ────────────────────────────────────────────────────────────────────────────

interface EligibleDemoPayload {
  sourceMatchId: string;
  payload: unknown;
}

interface DemoPayloadsBundle {
  payloads: EligibleDemoPayload[];
  activeTracked: Array<{ id: string; nickname: string; avatarUrl: string | null; steamId: string }>;
}

const PAYLOADS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos de TTL em memória
const payloadsCache = new Map<string, { data: DemoPayloadsBundle; timestamp: number }>();
const inFlightBundlePromise = new Map<string, Promise<DemoPayloadsBundle>>();

async function getEligiblePayloadsBundle(seasonId?: string | "all"): Promise<DemoPayloadsBundle> {
  const cacheKey = seasonId ?? "current";
  const cached = payloadsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PAYLOADS_CACHE_TTL_MS) {
    return cached.data;
  }

  const existingPromise = inFlightBundlePromise.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async () => {
    try {
      const activeTracked = await prisma.player.findMany({
        where: { trackedPlayer: { active: true } },
        select: { id: true, nickname: true, avatarUrl: true, steamId: true },
      });

      const matches = await prisma.match.findMany({
        where: {
          seasonId: seasonId === "all" ? undefined : seasonId,
          trackedPlayersCount: { gte: 2 },
          demoUrl: { not: null },
        },
        select: { gamersClubMatchId: true },
      });

      const gcIds = matches.map((m) => m.gamersClubMatchId).filter(Boolean) as string[];
      if (gcIds.length === 0) {
        return { payloads: [], activeTracked };
      }

      const payloads = await prisma.matchPayload.findMany({
        where: { sourceMatchId: { in: gcIds } },
        select: { sourceMatchId: true, payload: true },
      });

      const bundle: DemoPayloadsBundle = {
        payloads: payloads as EligibleDemoPayload[],
        activeTracked,
      };

      payloadsCache.set(cacheKey, { data: bundle, timestamp: Date.now() });
      return bundle;
    } finally {
      inFlightBundlePromise.delete(cacheKey);
    }
  })();

  inFlightBundlePromise.set(cacheKey, loadPromise);
  return loadPromise;
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 2 — Terror dos Amigos (Incidentes com Aliados)
// ────────────────────────────────────────────────────────────────────────────

export async function calculateTerrorDosAmigos(
  seasonId?: string | "all",
  fixtureData?: Partial<TerrorDosAmigosStats>,
): Promise<TerrorDosAmigosStats> {
  if (fixtureData) {
    return {
      totalMatchesAnalyzed: fixtureData.totalMatchesAnalyzed ?? 0,
      totalRoundsAnalyzed: fixtureData.totalRoundsAnalyzed ?? 0,
      totalTeamDamage: fixtureData.totalTeamDamage ?? 0,
      totalTeamKills: fixtureData.totalTeamKills ?? 0,
      totalTeamFlashes: fixtureData.totalTeamFlashes ?? 0,
      topTeamFlasher: fixtureData.topTeamFlasher ?? null,
      topTeamDamager: fixtureData.topTeamDamager ?? null,
      rankings: fixtureData.rankings ?? [],
      hasTelemetry: fixtureData.hasTelemetry ?? true,
      telemetryUnavailableReason: fixtureData.telemetryUnavailableReason ?? null,
    };
  }

  const bundle = await getEligiblePayloadsBundle(seasonId);
  if (!bundle.payloads || bundle.payloads.length === 0) {
    return {
      totalMatchesAnalyzed: 0,
      totalRoundsAnalyzed: 0,
      totalTeamDamage: 0,
      totalTeamKills: 0,
      totalTeamFlashes: 0,
      topTeamFlasher: null,
      topTeamDamager: null,
      rankings: [],
      hasTelemetry: false,
      telemetryUnavailableReason: "Nenhuma partida comunitária com demo encontrada para o período selecionado.",
    };
  }

  const playerFF = new Map<
    string,
    {
      player: (typeof bundle.activeTracked)[0];
      roundsPlayed: number;
      teamDamage: number;
      teamKills: number;
      teamFlashes: number;
      teamBlindDurationSeconds: number;
    }
  >();

  for (const p of bundle.activeTracked) {
    playerFF.set(p.steamId, {
      player: p,
      roundsPlayed: 0,
      teamDamage: 0,
      teamKills: 0,
      teamFlashes: 0,
      teamBlindDurationSeconds: 0,
    });
  }

  const totalMatchesAnalyzed = bundle.payloads.length;
  let totalRoundsAnalyzed = 0;
  let totalTeamDamage = 0;
  let totalTeamKills = 0;
  let totalTeamFlashes = 0;

  for (const p of bundle.payloads) {
    const raw = p.payload as Record<string, unknown>;
    if (!raw) continue;

    // Rastrear rounds válidos (exclui warmup e rounds de faca)
    const validRoundNumbers = new Set<number>();
    if (Array.isArray(raw.rounds)) {
      for (const r of raw.rounds) {
        if (r.excluded_from_stats || r.type === "knife_round") continue;
        const rNum = r.number ?? r.position;
        if (typeof rNum === "number") {
          validRoundNumbers.add(rNum);
        }
      }
    }
    const matchRoundsCount = validRoundNumbers.size;
    totalRoundsAnalyzed += matchRoundsCount;

    // Mapear time/lado de cada jogador por round
    const playerSideByRound = new Map<string, "T" | "CT">();
    if (Array.isArray(raw.economy)) {
      for (const e of raw.economy) {
        const rNum = e.round;
        if (!validRoundNumbers.has(rNum)) continue;
        const steam = String(e.player_steamid);
        const side = String(e.side).toUpperCase() as "T" | "CT";
        playerSideByRound.set(`${rNum}:${steam}`, side);
      }
    }

    // Contar rounds jogados para jogadores monitorados presentes na partida
    if (Array.isArray(raw.players)) {
      for (const pl of raw.players) {
        const steam = String(pl.steamid);
        const acc = playerFF.get(steam);
        if (acc) {
          acc.roundsPlayed += matchRoundsCount;
        }
      }
    }

    // Processar danos em aliados
    if (Array.isArray(raw.damage)) {
      for (const d of raw.damage) {
        if (!validRoundNumbers.has(d.round)) continue;
        const aSteam = String(d.attacker_steamid);
        const vSteam = String(d.victim_steamid);
        if (aSteam === vSteam) continue;

        const aSide = playerSideByRound.get(`${d.round}:${aSteam}`);
        const vSide = playerSideByRound.get(`${d.round}:${vSteam}`);

        if (aSide && vSide && aSide === vSide) {
          const dmg = Number(d.damage_health) || 0;
          totalTeamDamage += dmg;
          const acc = playerFF.get(aSteam);
          if (acc) {
            acc.teamDamage += dmg;
          }
        }
      }
    }

    // Processar flashes em companheiros
    if (Array.isArray(raw.blind_events)) {
      for (const b of raw.blind_events) {
        if (!validRoundNumbers.has(b.round)) continue;
        const tSteam = String(b.thrower_steamid);
        const vSteam = String(b.blind_player_steamid);
        if (tSteam === vSteam) continue;

        const tSide = playerSideByRound.get(`${b.round}:${tSteam}`);
        const vSide = playerSideByRound.get(`${b.round}:${vSteam}`);

        if (tSide && vSide && tSide === vSide) {
          const duration = Number(b.blind_duration) || 0;
          totalTeamFlashes++;
          const acc = playerFF.get(tSteam);
          if (acc) {
            acc.teamFlashes++;
            acc.teamBlindDurationSeconds += duration;
          }
        }
      }
    }

    // Processar teamkills
    if (Array.isArray(raw.kills)) {
      for (const k of raw.kills) {
        if (!validRoundNumbers.has(k.round)) continue;
        const kSteam = String(k.killer_steamid);
        const vSteam = String(k.victim_steamid);

        const isTk =
          k.analytics?.teamkill === true ||
          (k.killer_team && k.victim_team && k.killer_team === k.victim_team && kSteam !== vSteam);

        if (isTk) {
          totalTeamKills++;
          const acc = playerFF.get(kSteam);
          if (acc) {
            acc.teamKills++;
          }
        }
      }
    }
  }

  // Filtrar rankings com critério mínimo de exposição (mínimo 10 rounds jogados)
  const validRankings = Array.from(playerFF.values())
    .filter((a) => a.roundsPlayed >= 10)
    .map((a) => {
      const totalIncidents = a.teamDamage + a.teamFlashes * 10 + a.teamKills * 50;
      const incidentsPer100Rounds =
        a.roundsPlayed > 0 ? Number(((totalIncidents / a.roundsPlayed) * 100).toFixed(1)) : 0;
      return {
        player: {
          id: a.player.id,
          nickname: a.player.nickname,
          avatarUrl: a.player.avatarUrl,
        },
        roundsPlayed: a.roundsPlayed,
        teamDamage: a.teamDamage,
        teamKills: a.teamKills,
        teamFlashes: a.teamFlashes,
        teamBlindDurationSeconds: Number(a.teamBlindDurationSeconds.toFixed(1)),
        incidentsPer100Rounds,
      };
    })
    .sort((a, b) => b.incidentsPer100Rounds - a.incidentsPer100Rounds);

  const topTeamFlasher = [...validRankings].sort((a, b) => b.teamFlashes - a.teamFlashes)[0] ?? null;
  const topTeamDamager = [...validRankings].sort((a, b) => b.teamDamage - a.teamDamage)[0] ?? null;

  return {
    totalMatchesAnalyzed,
    totalRoundsAnalyzed,
    totalTeamDamage,
    totalTeamKills,
    totalTeamFlashes,
    topTeamFlasher,
    topTeamDamager,
    rankings: validRankings,
    hasTelemetry: totalMatchesAnalyzed > 0,
    telemetryUnavailableReason: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 3 — Economia do Desastre
// ────────────────────────────────────────────────────────────────────────────

export async function calculateEconomiaDesastre(
  seasonId?: string | "all",
  fixtureData?: Partial<EconomiaDesastreStats>,
): Promise<EconomiaDesastreStats> {
  if (fixtureData) {
    return {
      totalRoundsAnalyzed: fixtureData.totalRoundsAnalyzed ?? 0,
      forceBuyRounds: fixtureData.forceBuyRounds ?? 0,
      forceBuyWins: fixtureData.forceBuyWins ?? 0,
      forceBuyWinrate: fixtureData.forceBuyWinrate ?? null,
      fullEcoRounds: fixtureData.fullEcoRounds ?? 0,
      fullEcoWins: fixtureData.fullEcoWins ?? 0,
      fullEcoWinrate: fixtureData.fullEcoWinrate ?? null,
      fullBuyRounds: fixtureData.fullBuyRounds ?? 0,
      fullBuyWins: fixtureData.fullBuyWins ?? 0,
      fullBuyWinrate: fixtureData.fullBuyWinrate ?? null,
      estimatedEquipmentLostValue: fixtureData.estimatedEquipmentLostValue ?? null,
      hasTelemetry: fixtureData.hasTelemetry ?? true,
      telemetryUnavailableReason: fixtureData.telemetryUnavailableReason ?? null,
    };
  }

  const bundle = await getEligiblePayloadsBundle(seasonId);
  if (!bundle.payloads || bundle.payloads.length === 0) {
    return {
      totalRoundsAnalyzed: 0,
      forceBuyRounds: 0,
      forceBuyWins: 0,
      forceBuyWinrate: null,
      fullEcoRounds: 0,
      fullEcoWins: 0,
      fullEcoWinrate: null,
      fullBuyRounds: 0,
      fullBuyWins: 0,
      fullBuyWinrate: null,
      estimatedEquipmentLostValue: null,
      hasTelemetry: false,
      telemetryUnavailableReason: "Nenhuma partida comunitária com demo encontrada para o período selecionado.",
    };
  }

  let totalRoundsAnalyzed = 0;
  let forceBuyRounds = 0;
  let forceBuyWins = 0;
  let fullEcoRounds = 0;
  let fullEcoWins = 0;
  let fullBuyRounds = 0;
  let fullBuyWins = 0;
  let estimatedEquipmentLostValue = 0;

  for (const p of bundle.payloads) {
    const raw = p.payload as Record<string, unknown>;
    if (!raw) continue;

    const validRoundNumbers = new Set<number>();
    const roundWinners = new Map<number, "T" | "CT">();

    if (Array.isArray(raw.rounds)) {
      for (const r of raw.rounds) {
        if (r.excluded_from_stats || r.type === "knife_round") continue;
        const rNum = r.number ?? r.position;
        if (typeof rNum === "number") {
          validRoundNumbers.add(rNum);
          const w = String(r.winner_team || "").toUpperCase();
          if (w === "T" || w === "TERRORIST") roundWinners.set(rNum, "T");
          else if (w === "CT" || w === "COUNTER_TERRORIST") roundWinners.set(rNum, "CT");
        }
      }
    }

    const roundSideLoadout = new Map<string, { totalLoadout: number; playerCount: number }>();
    if (Array.isArray(raw.economy)) {
      for (const e of raw.economy) {
        const rNum = e.round;
        if (!validRoundNumbers.has(rNum)) continue;
        const side = String(e.side).toUpperCase() as "T" | "CT";
        const teamKey = `${rNum}:${side}`;
        const prev = roundSideLoadout.get(teamKey) || { totalLoadout: 0, playerCount: 0 };
        prev.totalLoadout += Number(e.loadout_value || e.equipment_value || 0);
        prev.playerCount++;
        roundSideLoadout.set(teamKey, prev);
      }
    }

    for (const rNum of validRoundNumbers) {
      totalRoundsAnalyzed++;
      const winner = roundWinners.get(rNum);

      for (const side of ["T", "CT"] as const) {
        const teamKey = `${rNum}:${side}`;
        const info = roundSideLoadout.get(teamKey);
        if (!info || info.playerCount === 0) continue;

        const avgLoadout = info.totalLoadout / info.playerCount;
        const isWin = winner === side;

        // Classificação econômica:
        // Eco: avgLoadout < 2000
        // Force Buy: avgLoadout >= 2000 e avgLoadout < 3700
        // Full Buy: avgLoadout >= 3700
        if (avgLoadout < 2000) {
          fullEcoRounds++;
          if (isWin) fullEcoWins++;
        } else if (avgLoadout < 3700) {
          forceBuyRounds++;
          if (isWin) {
            forceBuyWins++;
          } else {
            estimatedEquipmentLostValue += info.totalLoadout;
          }
        } else {
          fullBuyRounds++;
          if (isWin) fullBuyWins++;
        }
      }
    }
  }

  const fullBuyWinrate = fullBuyRounds > 0 ? Math.round((fullBuyWins / fullBuyRounds) * 100) : null;
  const forceBuyWinrate = forceBuyRounds > 0 ? Math.round((forceBuyWins / forceBuyRounds) * 100) : null;
  const fullEcoWinrate = fullEcoRounds > 0 ? Math.round((fullEcoWins / fullEcoRounds) * 100) : null;

  return {
    totalRoundsAnalyzed,
    forceBuyRounds,
    forceBuyWins,
    forceBuyWinrate,
    fullEcoRounds,
    fullEcoWins,
    fullEcoWinrate,
    fullBuyRounds,
    fullBuyWins,
    fullBuyWinrate,
    estimatedEquipmentLostValue,
    hasTelemetry: totalRoundsAnalyzed > 0,
    telemetryUnavailableReason: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 4 — Melhor Dupla da Zinda (Sinergia de Trocas)
// ────────────────────────────────────────────────────────────────────────────

export async function calculateMelhorDuplaZinda(
  seasonId?: string | "all",
  minTradesThreshold = 5,
): Promise<MelhorDuplaStats> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true, avatarUrl: true },
  });

  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));
  const playerIds = Array.from(playerMap.keys());

  const trades = await prisma.playerTradeEvent.findMany({
    where: {
      traderId: { in: playerIds },
      victimId: { in: playerIds },
      match: {
        seasonId: seasonId === "all" ? undefined : seasonId,
        trackedPlayersCount: { gte: 2 },
      },
    },
    select: {
      traderId: true,
      victimId: true,
      timeDiff: true,
      matchId: true,
      match: {
        select: {
          scoreTeamA: true,
          scoreTeamB: true,
          playerStats: {
            select: { playerId: true, team: true },
          },
        },
      },
    },
  });

  if (trades.length === 0) {
    return {
      minTradesThreshold,
      totalTrackedTrades: 0,
      mostSynergicDuo: null,
      fastestTradeDuo: null,
      allEligibleDuos: [],
      hasTelemetry: false,
      telemetryUnavailableReason: "Nenhuma telemetria de trocas mútuas disponível para o período selecionado.",
    };
  }

  // Agrupa re-frags por par não-ordenado
  interface PairData {
    playerAId: string;
    playerBId: string;
    tradesAAvengedB: number;
    tradesBAvengedA: number;
    totalMutualTrades: number;
    sumTime: number;
    fastestTime: number;
    matchesSet: Set<string>;
    matchesTogether: number;
    winsTogether: number;
  }

  const pairTrades = new Map<string, PairData>();

  for (const t of trades) {
    // Validação estrita: trader e vítima devem estar no mesmo time na partida
    const pTrader = t.match.playerStats.find((ps) => ps.playerId === t.traderId);
    const pVictim = t.match.playerStats.find((ps) => ps.playerId === t.victimId);
    if (!pTrader || !pVictim || pTrader.team !== pVictim.team) continue;

    const [idA, idB] = [t.traderId, t.victimId].sort();
    const key = `${idA}_${idB}`;

    let data = pairTrades.get(key);
    if (!data) {
      data = {
        playerAId: idA,
        playerBId: idB,
        tradesAAvengedB: 0,
        tradesBAvengedA: 0,
        totalMutualTrades: 0,
        sumTime: 0,
        fastestTime: Infinity,
        matchesSet: new Set<string>(),
        matchesTogether: 0,
        winsTogether: 0,
      };
      pairTrades.set(key, data);
    }

    data.totalMutualTrades++;
    data.sumTime += t.timeDiff;
    if (t.timeDiff < data.fastestTime) {
      data.fastestTime = t.timeDiff;
    }

    if (t.traderId === idA) {
      data.tradesAAvengedB++; // A vingou B
    } else {
      data.tradesBAvengedA++; // B vingou A
    }

    if (!data.matchesSet.has(t.matchId)) {
      data.matchesSet.add(t.matchId);
      data.matchesTogether++;
      const isWinner =
        (pTrader.team === "A" && t.match.scoreTeamA > t.match.scoreTeamB) ||
        (pTrader.team === "B" && t.match.scoreTeamB > t.match.scoreTeamA);
      if (isWinner) {
        data.winsTogether++;
      }
    }
  }

  const allEligibleDuos: DuoTradeSynergy[] = [];

  for (const data of pairTrades.values()) {
    if (data.totalMutualTrades >= minTradesThreshold) {
      const pA = playerMap.get(data.playerAId)!;
      const pB = playerMap.get(data.playerBId)!;
      const winrateTogether =
        data.matchesTogether > 0 ? Math.round((data.winsTogether / data.matchesTogether) * 100) : 0;

      allEligibleDuos.push({
        playerA: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
        playerB: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
        totalMutualTrades: data.totalMutualTrades,
        tradesAAvengedB: data.tradesAAvengedB,
        tradesBAvengedA: data.tradesBAvengedA,
        avgRefragTimeSeconds: Number((data.sumTime / data.totalMutualTrades).toFixed(2)),
        fastestRefragTimeSeconds: Number(data.fastestTime.toFixed(2)),
        matchesTogether: data.matchesTogether,
        winrateTogether,
      });
    }
  }

  // Ordenação determinística com desempate
  allEligibleDuos.sort(
    (a, b) =>
      b.totalMutualTrades - a.totalMutualTrades ||
      a.avgRefragTimeSeconds - b.avgRefragTimeSeconds ||
      b.winrateTogether - a.winrateTogether ||
      a.playerA.nickname.localeCompare(b.playerA.nickname),
  );

  const mostSynergicDuo = allEligibleDuos[0] ?? null;

  const fastestTradeDuo =
    [...allEligibleDuos].sort(
      (a, b) =>
        a.avgRefragTimeSeconds - b.avgRefragTimeSeconds ||
        b.totalMutualTrades - a.totalMutualTrades ||
        a.playerA.nickname.localeCompare(b.playerA.nickname),
    )[0] ?? null;

  return {
    minTradesThreshold,
    totalTrackedTrades: trades.length,
    mostSynergicDuo,
    fastestTradeDuo,
    allEligibleDuos,
    hasTelemetry: true,
    telemetryUnavailableReason: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 5 — Matador de Eco
// ────────────────────────────────────────────────────────────────────────────

export async function calculateMatadorEco(
  seasonId?: string | "all",
  fixtureData?: Partial<MatadorEcoStats>,
): Promise<MatadorEcoStats> {
  if (fixtureData) {
    return {
      totalAnalyzedKills: fixtureData.totalAnalyzedKills ?? 0,
      totalEcoKills: fixtureData.totalEcoKills ?? 0,
      topEcoHunter: fixtureData.topEcoHunter ?? null,
      rankings: fixtureData.rankings ?? [],
      hasTelemetry: fixtureData.hasTelemetry ?? true,
      telemetryUnavailableReason: fixtureData.telemetryUnavailableReason ?? null,
    };
  }

  const bundle = await getEligiblePayloadsBundle(seasonId);
  if (!bundle.payloads || bundle.payloads.length === 0) {
    return {
      totalAnalyzedKills: 0,
      totalEcoKills: 0,
      topEcoHunter: null,
      rankings: [],
      hasTelemetry: false,
      telemetryUnavailableReason: "Nenhuma partida comunitária com demo encontrada para o período selecionado.",
    };
  }

  const trackedMap = new Map(bundle.activeTracked.map((p) => [p.steamId, p]));
  let totalAnalyzedKills = 0;
  let totalEcoKills = 0;
  const playerKillsTotal = new Map<string, number>();
  const playerEcoKillsMap = new Map<string, number>();

  for (const p of bundle.payloads) {
    const raw = p.payload as Record<string, unknown>;
    if (!raw) continue;

    const validRoundNumbers = new Set<number>();
    if (Array.isArray(raw.rounds)) {
      for (const r of raw.rounds) {
        if (r.excluded_from_stats || r.type === "knife_round") continue;
        const rNum = r.number ?? r.position;
        if (typeof rNum === "number") {
          validRoundNumbers.add(rNum);
        }
      }
    }

    if (Array.isArray(raw.kills)) {
      for (const k of raw.kills) {
        if (!validRoundNumbers.has(k.round)) continue;
        const kSteam = String(k.killer_steamid);
        const vSteam = String(k.victim_steamid);
        if (kSteam === vSteam) continue; // Suicídio

        const isTk =
          k.analytics?.teamkill === true ||
          (k.killer_team && k.victim_team && k.killer_team === k.victim_team);
        if (isTk) continue; // Pula teamkills

        totalAnalyzedKills++;
        if (trackedMap.has(kSteam)) {
          playerKillsTotal.set(kSteam, (playerKillsTotal.get(kSteam) || 0) + 1);
        }

        if (k.analytics?.anti_eco === true) {
          totalEcoKills++;
          if (trackedMap.has(kSteam)) {
            playerEcoKillsMap.set(kSteam, (playerEcoKillsMap.get(kSteam) || 0) + 1);
          }
        }
      }
    }
  }

  const ecoRankings = Array.from(playerEcoKillsMap.entries())
    .map(([steam, ecoKills]) => {
      const p = trackedMap.get(steam)!;
      const totalKills = playerKillsTotal.get(steam) || 0;
      const pct = totalKills > 0 ? Math.round((ecoKills / totalKills) * 100) : 0;
      return {
        player: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl },
        ecoKills,
        totalKills,
        ecoKillPercentage: pct,
        antiEcoRoundKillsPerRound: 0,
      };
    })
    .sort((a, b) => b.ecoKills - a.ecoKills || b.ecoKillPercentage - a.ecoKillPercentage);

  const topEcoHunter = ecoRankings[0] ?? null;

  return {
    totalAnalyzedKills,
    totalEcoKills,
    topEcoHunter,
    rankings: ecoRankings,
    hasTelemetry: totalAnalyzedKills > 0,
    telemetryUnavailableReason: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 6 — Plantou, Ganhou?
// ────────────────────────────────────────────────────────────────────────────

export async function calculatePlantouGanhou(
  seasonId?: string | "all",
): Promise<PlantouGanhouStats> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true, avatarUrl: true, steamId: true },
  });

  const steamMap = new Map(
    activePlayers.filter((p) => p.steamId).map((p) => [p.steamId!, p]),
  );

  const matches = await prisma.match.findMany({
    where: {
      seasonId: seasonId === "all" ? undefined : seasonId,
      trackedPlayersCount: { gte: 2 },
      roundsJson: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      roundsJson: true,
    },
  });

  let totalEligibleRounds = 0;
  let bombsExploded = 0;
  let bombsDefused = 0;
  const defusesByPlayer = new Map<string, number>();

  for (const m of matches) {
    const rounds = m.roundsJson as DemoRoundData[];
    if (!Array.isArray(rounds)) continue;

    for (const r of rounds) {
      if (r.excluded_from_stats || r.type === "knife_round") continue;
      totalEligibleRounds++;

      if (r.reason === "bomb_exploded") {
        bombsExploded++;
      } else if (r.reason === "bomb_defused") {
        bombsDefused++;
        if (r.mvp_steamid && steamMap.has(r.mvp_steamid)) {
          const p = steamMap.get(r.mvp_steamid)!;
          defusesByPlayer.set(p.id, (defusesByPlayer.get(p.id) || 0) + 1);
        }
      }
    }
  }

  const totalPostPlants = bombsExploded + bombsDefused;
  const hasTelemetry = totalPostPlants > 0;

  const postPlantConversionRate = hasTelemetry
    ? Math.round((bombsExploded / totalPostPlants) * 100)
    : null;

  const retakeSuccessRate = hasTelemetry
    ? Math.round((bombsDefused / totalPostPlants) * 100)
    : null;

  const topDefusers: PlantouGanhouDefuser[] = Array.from(defusesByPlayer.entries())
    .map(([playerId, defuses]) => {
      const p = activePlayers.find((ap) => ap.id === playerId)!;
      return {
        player: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl },
        defuses,
      };
    })
    .sort((a, b) => b.defuses - a.defuses || a.player.nickname.localeCompare(b.player.nickname));

  return {
    totalEligibleRounds,
    totalPostPlants,
    bombsExploded,
    bombsDefused,
    postPlantConversionRate,
    retakeSuccessRate,
    topDefusers,
    hasTelemetry,
    telemetryUnavailableReason: hasTelemetry
      ? null
      : "Telemetria de desfechos de C4 (bomb_exploded e bomb_defused) ausente nesta temporada.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 7 — Especialista em Armas
// ────────────────────────────────────────────────────────────────────────────

export async function calculateEspecialistaArmas(
  seasonId?: string | "all",
): Promise<EspecialistaArmasStats> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true, avatarUrl: true },
  });

  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));
  const playerIds = Array.from(playerMap.keys());

  const matchups = await prisma.playerMatchup.findMany({
    where: {
      killerId: { in: playerIds },
      weapons: { not: Prisma.JsonNull },
      match: {
        seasonId: seasonId === "all" ? undefined : seasonId,
        trackedPlayersCount: { gte: 2 },
      },
    },
    select: {
      killerId: true,
      kills: true,
      weapons: true,
    },
  });

  if (matchups.length === 0) {
    return {
      totalKillsAnalyzed: 0,
      topRifler: null,
      topSniper: null,
      topPistoleiro: null,
      topSmg: null,
      playerProfiles: [],
      hasTelemetry: false,
      telemetryUnavailableReason: "Nenhuma telemetria detalhada de armamento encontrada para os filtros selecionados.",
    };
  }

  // Agrega abates por arma por jogador
  const playerWeaponKills = new Map<string, Map<string, number>>();
  const categoryKillsByPlayer = new Map<
    WeaponCategory,
    Map<string, { totalKills: number; weaponCounts: Map<string, number> }>
  >();

  const categories: WeaponCategory[] = ["rifles", "snipers", "pistols", "smgs"];
  for (const cat of categories) {
    categoryKillsByPlayer.set(cat, new Map());
  }

  let totalKillsAnalyzed = 0;

  for (const m of matchups) {
    const rawWeapons = m.weapons as Record<string, number>;
    if (!rawWeapons) continue;

    let pMap = playerWeaponKills.get(m.killerId);
    if (!pMap) {
      pMap = new Map<string, number>();
      playerWeaponKills.set(m.killerId, pMap);
    }

    for (const [wepKey, count] of Object.entries(rawWeapons)) {
      if (typeof count !== "number" || count <= 0) continue;
      totalKillsAnalyzed += count;
      pMap.set(wepKey, (pMap.get(wepKey) || 0) + count);

      const norm = normalizeWeapon(wepKey);
      const catMap = categoryKillsByPlayer.get(norm.category);
      if (catMap) {
        let entry = catMap.get(m.killerId);
        if (!entry) {
          entry = { totalKills: 0, weaponCounts: new Map() };
          catMap.set(m.killerId, entry);
        }
        entry.totalKills += count;
        entry.weaponCounts.set(wepKey, (entry.weaponCounts.get(wepKey) || 0) + count);
      }
    }
  }

  // Identifica líderes por categoria
  const getLeaderForCategory = (
    category: WeaponCategory,
    categoryLabel: string,
  ): CategorySpecialist | null => {
    const catMap = categoryKillsByPlayer.get(category);
    if (!catMap || catMap.size === 0) return null;

    const sortedPlayers = Array.from(catMap.entries()).sort(
      (a, b) => b[1].totalKills - a[1].totalKills,
    );
    const topEntry = sortedPlayers[0];
    if (!topEntry || topEntry[1].totalKills === 0) return null;

    const [playerId, data] = topEntry;
    const player = playerMap.get(playerId)!;

    // Top weapon específica da categoria
    const topWepKey = Array.from(data.weaponCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] || "";

    const normWep = normalizeWeapon(topWepKey);
    const totalPlayerKills = Array.from(playerWeaponKills.get(playerId)?.values() || []).reduce(
      (acc, c) => acc + c,
      0,
    );
    const categoryShare =
      totalPlayerKills > 0 ? Math.round((data.totalKills / totalPlayerKills) * 100) : 0;

    return {
      category,
      categoryLabel,
      leader: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      weaponDisplayName: normWep.displayName,
      weaponKey: topWepKey,
      kills: data.totalKills,
      totalPlayerKills,
      categoryShare,
    };
  };

  const topRifler = getLeaderForCategory("rifles", "Rifles");
  const topSniper = getLeaderForCategory("snipers", "Snipers");
  const topPistoleiro = getLeaderForCategory("pistols", "Pistolas");
  const topSmg = getLeaderForCategory("smgs", "Submetralhadoras (SMGs)");

  // Perfis por jogador
  const playerProfiles: PlayerWeaponDominance[] = [];
  for (const [playerId, wepMap] of playerWeaponKills.entries()) {
    const player = playerMap.get(playerId);
    if (!player) continue;

    const weaponStats: WeaponStat[] = Array.from(wepMap.entries())
      .map(([wKey, kills]) => {
        const norm = normalizeWeapon(wKey);
        return {
          weaponKey: wKey,
          displayName: norm.displayName,
          category: norm.category,
          kills,
        };
      })
      .sort((a, b) => b.kills - a.kills);

    const totalKills = weaponStats.reduce((acc, w) => acc + w.kills, 0);
    const favoriteWeapon = weaponStats[0] || {
      weaponKey: "unknown",
      displayName: "Nenhuma",
      category: "rifles" as WeaponCategory,
      kills: 0,
    };

    playerProfiles.push({
      player: { id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl },
      totalKills,
      favoriteWeapon,
      weapons: weaponStats.slice(0, 5),
    });
  }

  playerProfiles.sort((a, b) => b.totalKills - a.totalKills);

  return {
    totalKillsAnalyzed,
    topRifler,
    topSniper,
    topPistoleiro,
    topSmg,
    playerProfiles,
    hasTelemetry: true,
    telemetryUnavailableReason: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 8 — Rei dos Rounds Decisivos
// ────────────────────────────────────────────────────────────────────────────

export async function calculateReiRoundsDecisivos(
  seasonId?: string | "all",
): Promise<ReiRoundsDecisivosStats> {
  const activePlayers = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true, avatarUrl: true, steamId: true },
  });

  const steamMap = new Map(
    activePlayers.filter((p) => p.steamId).map((p) => [p.steamId!, p]),
  );
  const idMap = new Map(activePlayers.map((p) => [p.id, p]));

  const matches = await prisma.match.findMany({
    where: {
      seasonId: seasonId === "all" ? undefined : seasonId,
      trackedPlayersCount: { gte: 2 },
      roundsJson: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      roundsJson: true,
      playerStats: {
        select: { playerId: true },
      },
      entryDuels: {
        where: { isKiller: true },
        select: { roundNumber: true, playerId: true },
      },
      clutches: {
        where: { won: true },
        select: { roundNumber: true, playerId: true },
      },
    },
  });

  let totalDecisiveRoundsAnalyzed = 0;

  interface DecisiveAccumulator {
    mvps: number;
    firstKills: number;
    clutchesWon: number;
    decisiveRoundsPlayed: number;
  }

  const accumulators = new Map<string, DecisiveAccumulator>();
  for (const p of activePlayers) {
    accumulators.set(p.id, { mvps: 0, firstKills: 0, clutchesWon: 0, decisiveRoundsPlayed: 0 });
  }

  for (const m of matches) {
    const rounds = m.roundsJson as DemoRoundData[];
    if (!Array.isArray(rounds)) continue;

    const presentPlayerIds = new Set(
      m.playerStats.map((ps) => ps.playerId).filter((id) => idMap.has(id)),
    );

    for (const r of rounds) {
      if (r.excluded_from_stats || r.type === "knife_round") continue;
      const num = r.number ?? r.position;
      if (!num) continue;

      // Definição objetiva de round decisivo:
      // 1. Round 12 (último round do half, define a vantagem da troca de lados)
      // 2. Round 24 (último round de regulação)
      // 3. Rounds 25+ (prorrogações completas)
      const isDecisive = num === 12 || num === 24 || num >= 25;
      if (!isDecisive) continue;

      totalDecisiveRoundsAnalyzed++;

      for (const pid of presentPlayerIds) {
        const acc = accumulators.get(pid);
        if (acc) acc.decisiveRoundsPlayed++;
      }

      // MVP do round decisivo
      if (r.mvp_steamid && typeof r.mvp_steamid === "string" && steamMap.has(r.mvp_steamid)) {
        const p = steamMap.get(r.mvp_steamid)!;
        const acc = accumulators.get(p.id);
        if (acc) acc.mvps++;
      }

      // First kills no round decisivo
      const fks = m.entryDuels.filter((d) => d.roundNumber === num);
      for (const fk of fks) {
        const acc = accumulators.get(fk.playerId);
        if (acc) acc.firstKills++;
      }

      // Clutches convertidos no round decisivo
      const cls = m.clutches.filter((c) => c.roundNumber === num);
      for (const cl of cls) {
        const acc = accumulators.get(cl.playerId);
        if (acc) acc.clutchesWon++;
      }
    }
  }

  const rankings: DecisivePlayerStat[] = [];

  for (const p of activePlayers) {
    const acc = accumulators.get(p.id)!;
    // Score ponderado de impacto decisivo: MVP (2.0) + First Kill (1.5) + Clutch (2.0)
    const decisiveImpactScore = Math.round(
      acc.mvps * 2 + acc.firstKills * 1.5 + acc.clutchesWon * 2,
    );

    rankings.push({
      player: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl },
      decisiveImpactScore,
      mvps: acc.mvps,
      firstKills: acc.firstKills,
      clutchesWon: acc.clutchesWon,
      decisiveRoundsPlayed: acc.decisiveRoundsPlayed,
    });
  }

  // Ordenação determinística com múltiplos critérios de desempate
  rankings.sort(
    (a, b) =>
      b.decisiveImpactScore - a.decisiveImpactScore ||
      b.mvps - a.mvps ||
      b.firstKills - a.firstKills ||
      b.clutchesWon - a.clutchesWon ||
      a.decisiveRoundsPlayed - b.decisiveRoundsPlayed ||
      a.player.nickname.localeCompare(b.player.nickname),
  );

  const topDecisivePlayer = rankings.find((r) => r.decisiveImpactScore > 0) ?? null;

  const topDecisiveMvp =
    [...rankings].sort((a, b) => b.mvps - a.mvps || b.decisiveImpactScore - a.decisiveImpactScore)[0]
      ?.mvps > 0
      ? [...rankings].sort((a, b) => b.mvps - a.mvps || b.decisiveImpactScore - a.decisiveImpactScore)[0]
      : null;

  const topDecisiveFirstKiller =
    [...rankings].sort(
      (a, b) => b.firstKills - a.firstKills || b.decisiveImpactScore - a.decisiveImpactScore,
    )[0]?.firstKills > 0
      ? [...rankings].sort(
          (a, b) => b.firstKills - a.firstKills || b.decisiveImpactScore - a.decisiveImpactScore,
        )[0]
      : null;

  const topDecisiveClutcher =
    [...rankings].sort(
      (a, b) => b.clutchesWon - a.clutchesWon || b.decisiveImpactScore - a.decisiveImpactScore,
    )[0]?.clutchesWon > 0
      ? [...rankings].sort(
          (a, b) => b.clutchesWon - a.clutchesWon || b.decisiveImpactScore - a.decisiveImpactScore,
        )[0]
      : null;

  const hasTelemetry = totalDecisiveRoundsAnalyzed > 0;

  return {
    totalDecisiveRoundsAnalyzed,
    topDecisivePlayer,
    topDecisiveMvp,
    topDecisiveFirstKiller,
    topDecisiveClutcher,
    rankings,
    hasTelemetry,
    telemetryUnavailableReason: hasTelemetry
      ? null
      : "Nenhuma partida com telemetria de rounds decisivos disponível no período.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 9 — Parceiros de Vitória e Derrota
// ────────────────────────────────────────────────────────────────────────────

export function calculatePartnersRankings(
  dataset: CompetitiveDataset,
  minMatchesThreshold = 10,
): PartnersRankings {
  const { activePlayers, statsByPlayer } = dataset;

  const allEligibleDuos: DuoPartnership[] = [];
  const partnerPairsByPlayer = new Map<string, PlayerPartnerDetail[]>();

  for (const p of activePlayers) {
    partnerPairsByPlayer.set(p.id, []);
  }

  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];

      const statsA = statsByPlayer.get(pA.id) ?? [];
      const statsB = statsByPlayer.get(pB.id) ?? [];
      const statsBByMatch = new Map(statsB.map((s) => [s.matchId, s]));

      let total = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let lastMatchPlayedAt: Date | null = null;

      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.matchId);
        // Regra estrita: participaram NO MESMO TIME na partida comunitária
        if (sB && sA.team === sB.team) {
          total++;
          if (isWin(sA)) {
            wins++;
          } else if (isLoss(sA)) {
            losses++;
          } else {
            ties++;
          }

          const playedAt = sA.match.playedAt;
          if (!lastMatchPlayedAt || playedAt > lastMatchPlayedAt) {
            lastMatchPlayedAt = playedAt;
          }
        }
      }

      if (total >= minMatchesThreshold) {
        const winrate = Math.round((wins / total) * 100);
        const lossRate = Math.round((losses / total) * 100);
        const lastMatchStr = lastMatchPlayedAt ? lastMatchPlayedAt.toISOString() : null;

        const duo: DuoPartnership = {
          playerA: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
          playerB: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
          total,
          wins,
          losses,
          ties,
          winrate,
          lossRate,
          lastMatchPlayedAt: lastMatchStr,
        };

        allEligibleDuos.push(duo);

        // Adiciona aos mapas individuais de pA e pB
        partnerPairsByPlayer.get(pA.id)?.push({
          partner: { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
          total,
          wins,
          losses,
          ties,
          winrate,
          lossRate,
          lastMatchPlayedAt: lastMatchStr,
        });

        partnerPairsByPlayer.get(pB.id)?.push({
          partner: { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
          total,
          wins,
          losses,
          ties,
          winrate,
          lossRate,
          lastMatchPlayedAt: lastMatchStr,
        });
      }
    }
  }

  // Ordenações determinísticas para os 4 rankings gerais
  const mostWinsDuo =
    [...allEligibleDuos].sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winrate - a.winrate ||
        b.total - a.total ||
        a.playerA.nickname.localeCompare(b.playerA.nickname) ||
        a.playerB.nickname.localeCompare(b.playerB.nickname),
    )[0] ?? null;

  const mostLossesDuo =
    [...allEligibleDuos].sort(
      (a, b) =>
        b.losses - a.losses ||
        b.lossRate - a.lossRate ||
        b.total - a.total ||
        a.playerA.nickname.localeCompare(b.playerA.nickname) ||
        a.playerB.nickname.localeCompare(b.playerB.nickname),
    )[0] ?? null;

  const bestWinrateDuo =
    [...allEligibleDuos].sort(
      (a, b) =>
        b.winrate - a.winrate ||
        b.wins - a.wins ||
        b.total - a.total ||
        a.playerA.nickname.localeCompare(b.playerA.nickname) ||
        a.playerB.nickname.localeCompare(b.playerB.nickname),
    )[0] ?? null;

  const worstWinrateDuo =
    [...allEligibleDuos].sort(
      (a, b) =>
        a.winrate - b.winrate ||
        b.losses - a.losses ||
        b.total - a.total ||
        a.playerA.nickname.localeCompare(b.playerA.nickname) ||
        a.playerB.nickname.localeCompare(b.playerB.nickname),
    )[0] ?? null;

  // Constrói a visão por jogador
  const playersMap: Record<string, PlayerPartnershipsSummary> = {};
  for (const p of activePlayers) {
    const list = partnerPairsByPlayer.get(p.id) ?? [];

    const sortedByWinrate = [...list].sort(
      (a, b) =>
        b.winrate - a.winrate ||
        b.wins - a.wins ||
        b.total - a.total ||
        a.partner.nickname.localeCompare(b.partner.nickname),
    );

    const sortedByWins = [...list].sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winrate - a.winrate ||
        b.total - a.total ||
        a.partner.nickname.localeCompare(b.partner.nickname),
    );

    const sortedByLosses = [...list].sort(
      (a, b) =>
        b.losses - a.losses ||
        b.lossRate - a.lossRate ||
        b.total - a.total ||
        a.partner.nickname.localeCompare(b.partner.nickname),
    );

    playersMap[p.id] = {
      player: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl },
      totalPartnersCount: list.length,
      mostWins: sortedByWins[0] ?? null,
      mostLosses: sortedByLosses[0] ?? null,
      bestWinrate: sortedByWinrate[0] ?? null,
      worstWinrate: sortedByWinrate[sortedByWinrate.length - 1] ?? null,
      allPartners: sortedByWinrate,
    };
  }

  return {
    minMatchesThreshold,
    totalEligibleDuos: allEligibleDuos.length,
    mostWinsDuo,
    mostLossesDuo,
    bestWinrateDuo,
    worstWinrateDuo,
    allEligibleDuos,
    playersMap,
    monitoredPlayers: activePlayers.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// BUNDLE COMPLETO DO RAIO-X
// ────────────────────────────────────────────────────────────────────────────

export async function getRaioXBundle(
  seasonId?: string | "all",
  dataset?: CompetitiveDataset,
): Promise<RaioXBundle> {
  const [
    ds,
    entregamos5v4,
    terrorDosAmigos,
    economiaDesastre,
    melhorDupla,
    matadorEco,
    plantouGanhou,
    especialistaArmas,
    reiRoundsDecisivos,
  ] = await Promise.all([
    dataset ? Promise.resolve(dataset) : loadCompetitiveDataset(seasonId),
    calculateEntregamos5v4(seasonId),
    calculateTerrorDosAmigos(seasonId),
    calculateEconomiaDesastre(seasonId),
    calculateMelhorDuplaZinda(seasonId),
    calculateMatadorEco(seasonId),
    calculatePlantouGanhou(seasonId),
    calculateEspecialistaArmas(seasonId),
    calculateReiRoundsDecisivos(seasonId),
  ]);

  const parceiros = calculatePartnersRankings(ds, 10);

  return {
    entregamos5v4,
    terrorDosAmigos,
    economiaDesastre,
    melhorDupla,
    matadorEco,
    plantouGanhou,
    especialistaArmas,
    reiRoundsDecisivos,
    parceiros,
  };
}
