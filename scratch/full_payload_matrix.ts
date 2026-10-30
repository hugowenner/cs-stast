import "dotenv/config";
import { prisma } from "../src/server/db";

interface MatrixStats {
  totalPayloads: number;
  totalWithBlindEvents: number;
  totalWithFriendlyBlind: number;
  totalWithDamage: number;
  totalWithFriendlyDamage: number;
  totalWithKills: number;
  totalWithTeamKills: number;
  totalWithEconomy: number;
  totalWithCashSpent: number;
  totalWithLoadoutValue: number;
  totalWithPurchases: number;
  totalWithKillsAnalytics: number;
  totalWithAntiEcoKills: number;
  totalWithRounds: number;
  totalWithRoundFacts: number;
  sampleVersions: Record<string, number>;
  steamIdsTrackedInDev: Set<string>;
}

async function run() {
  console.log("=== EXECUTANDO AUDITORIA COMPLETA DOS 480 PAYLOADS ===");

  const trackedPlayers = await prisma.player.findMany({
    select: { steamId: true, nickname: true },
  });
  const trackedSet = new Set(trackedPlayers.map((p) => p.steamId));
  console.log(`Jogadores monitorados cadastrados no banco: ${trackedSet.size}`);

  const payloads = await prisma.matchPayload.findMany({
    select: {
      sourceMatchId: true,
      parserVersion: true,
      schemaVersion: true,
      payload: true,
    },
  });

  const stats: MatrixStats = {
    totalPayloads: payloads.length,
    totalWithBlindEvents: 0,
    totalWithFriendlyBlind: 0,
    totalWithDamage: 0,
    totalWithFriendlyDamage: 0,
    totalWithKills: 0,
    totalWithTeamKills: 0,
    totalWithEconomy: 0,
    totalWithCashSpent: 0,
    totalWithLoadoutValue: 0,
    totalWithPurchases: 0,
    totalWithKillsAnalytics: 0,
    totalWithAntiEcoKills: 0,
    totalWithRounds: 0,
    totalWithRoundFacts: 0,
    sampleVersions: {},
    steamIdsTrackedInDev: trackedSet,
  };

  let sampleFriendlyDamageFound = 0;
  let sampleTeamKillFound = 0;
  let sampleFriendlyFlashFound = 0;

  for (const p of payloads) {
    const v = `${p.parserVersion || "unknown"} (schema ${p.schemaVersion || "unknown"})`;
    stats.sampleVersions[v] = (stats.sampleVersions[v] || 0) + 1;

    const raw = p.payload as any;
    if (!raw) continue;

    // Map player to team per round/match
    const playerTeamMap = new Map<string, string>();
    if (Array.isArray(raw.players)) {
      for (const pl of raw.players) {
        if (pl.steamid && pl.team) {
          playerTeamMap.set(String(pl.steamid), String(pl.team).toUpperCase());
        }
      }
    }

    // 1. BLIND EVENTS
    if (Array.isArray(raw.blind_events) && raw.blind_events.length > 0) {
      stats.totalWithBlindEvents++;
      // check friendly blind
      const hasFb = raw.blind_events.some((b: any) => {
        const throwerTeam = playerTeamMap.get(String(b.thrower_steamid));
        const victimTeam = playerTeamMap.get(String(b.blind_player_steamid));
        return (
          throwerTeam &&
          victimTeam &&
          throwerTeam === victimTeam &&
          String(b.thrower_steamid) !== String(b.blind_player_steamid) &&
          b.blind_duration > 0.5
        );
      });
      if (hasFb) {
        stats.totalWithFriendlyBlind++;
        sampleFriendlyFlashFound++;
      }
    }

    // 2. DAMAGE
    if (Array.isArray(raw.damage) && raw.damage.length > 0) {
      stats.totalWithDamage++;
      const hasFd = raw.damage.some((d: any) => {
        const attTeam = playerTeamMap.get(String(d.attacker_steamid));
        const vicTeam = playerTeamMap.get(String(d.victim_steamid));
        return (
          attTeam &&
          vicTeam &&
          attTeam === vicTeam &&
          String(d.attacker_steamid) !== String(d.victim_steamid) &&
          d.damage_health > 0
        );
      });
      if (hasFd) {
        stats.totalWithFriendlyDamage++;
        sampleFriendlyDamageFound++;
      }
    }

    // 3. KILLS & TEAMKILLS & ANTI-ECO
    if (Array.isArray(raw.kills) && raw.kills.length > 0) {
      stats.totalWithKills++;
      let hasAnalytics = false;
      let hasAntiEco = false;
      let hasTk = false;

      for (const k of raw.kills) {
        if (k.analytics) {
          hasAnalytics = true;
          if (k.analytics.anti_eco === true) {
            hasAntiEco = true;
          }
          if (k.analytics.teamkill === true) {
            hasTk = true;
          }
        }
        // Fallback: compare teams if killer_team and victim_team match
        if (k.killer_team && k.victim_team && k.killer_team === k.victim_team && k.killer_steamid !== k.victim_steamid) {
          hasTk = true;
        }
      }
      if (hasAnalytics) stats.totalWithKillsAnalytics++;
      if (hasAntiEco) stats.totalWithAntiEcoKills++;
      if (hasTk) {
        stats.totalWithTeamKills++;
        sampleTeamKillFound++;
      }
    }

    // 4. ECONOMY
    if (Array.isArray(raw.economy) && raw.economy.length > 0) {
      stats.totalWithEconomy++;
      const hasSpent = raw.economy.some((e: any) => typeof e.cash_spent === "number" && e.cash_spent > 0);
      const hasLoadout = raw.economy.some((e: any) => typeof e.loadout_value === "number" && e.loadout_value > 0);
      if (hasSpent) stats.totalWithCashSpent++;
      if (hasLoadout) stats.totalWithLoadoutValue++;
    }

    // 5. PURCHASES
    if (Array.isArray(raw.purchases) && raw.purchases.length > 0) {
      stats.totalWithPurchases++;
    }

    // 6. ROUNDS & ROUND FACTS
    if (Array.isArray(raw.rounds) && raw.rounds.length > 0) {
      stats.totalWithRounds++;
    }
    if (Array.isArray(raw.round_facts) && raw.round_facts.length > 0) {
      stats.totalWithRoundFacts++;
    }
  }

  console.log("\n================ MATRIZ DE COBERTURA DOS PAYLOADS (480) ================");
  console.log(`Total de payloads analisados: ${stats.totalPayloads}`);
  console.log("\nVersões dos Parsers:");
  for (const [k, v] of Object.entries(stats.sampleVersions)) {
    console.log(`  - ${k}: ${v} demos (${((v / stats.totalPayloads) * 100).toFixed(1)}%)`);
  }

  console.log("\nMódulo #02 — Terror dos Amigos:");
  console.log(`  - blind_events presentes: ${stats.totalWithBlindEvents} (${((stats.totalWithBlindEvents / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - friendly blind (>0.5s) identificado: ${stats.totalWithFriendlyBlind} (${((stats.totalWithFriendlyBlind / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - damage presente: ${stats.totalWithDamage} (${((stats.totalWithDamage / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - friendly damage identificado: ${stats.totalWithFriendlyDamage} (${((stats.totalWithFriendlyDamage / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - teamkills identificados: ${stats.totalWithTeamKills} (${((stats.totalWithTeamKills / stats.totalPayloads) * 100).toFixed(1)}%)`);

  console.log("\nMódulo #03 — Economia do Desastre:");
  console.log(`  - economy presente: ${stats.totalWithEconomy} (${((stats.totalWithEconomy / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - cash_spent > 0 presente: ${stats.totalWithCashSpent} (${((stats.totalWithCashSpent / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - loadout_value > 0 presente: ${stats.totalWithLoadoutValue} (${((stats.totalWithLoadoutValue / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - purchases presentes: ${stats.totalWithPurchases} (${((stats.totalWithPurchases / stats.totalPayloads) * 100).toFixed(1)}%)`);

  console.log("\nMódulo #05 — Matador de Eco:");
  console.log(`  - kills presentes: ${stats.totalWithKills} (${((stats.totalWithKills / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - kills.analytics presente: ${stats.totalWithKillsAnalytics} (${((stats.totalWithKillsAnalytics / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - anti_eco == true presente: ${stats.totalWithAntiEcoKills} (${((stats.totalWithAntiEcoKills / stats.totalPayloads) * 100).toFixed(1)}%)`);

  console.log("\nEstrutura de Partidas e Rounds:");
  console.log(`  - rounds presentes: ${stats.totalWithRounds} (${((stats.totalWithRounds / stats.totalPayloads) * 100).toFixed(1)}%)`);
  console.log(`  - round_facts presentes: ${stats.totalWithRoundFacts} (${((stats.totalWithRoundFacts / stats.totalPayloads) * 100).toFixed(1)}%)`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
