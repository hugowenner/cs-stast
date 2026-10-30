import "dotenv/config";
import { prisma } from "../src/server/db";

async function testPrototype() {
  console.log("=== TESTANDO PROTÓTIPO DE CÁLCULO DOS 3 MÓDULOS (OUTUBRO/2026) ===");

  // 1. Buscar jogadores monitorados para rankings
  const activeTracked = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, nickname: true, avatarUrl: true, steamId: true },
  });
  const trackedMap = new Map(activeTracked.map((p) => [p.steamId, p]));
  console.log(`Jogadores monitorados ativos: ${trackedMap.size}`);

  // 2. Buscar as partidas elegíveis de Outubro/2026
  const season = await prisma.season.findFirst({
    where: { name: "Outubro/2026" },
  });
  const seasonId = season?.id;

  const eligibleMatches = await prisma.match.findMany({
    where: {
      seasonId,
      trackedPlayersCount: { gte: 2 },
      demoUrl: { not: null },
    },
    select: { gamersClubMatchId: true },
  });

  const gcIds = eligibleMatches.map((m) => m.gamersClubMatchId).filter(Boolean) as string[];
  console.log(`Partidas elegíveis na temporada: ${gcIds.length}`);

  // 3. Buscar os payloads correspondentes
  const startTime = Date.now();
  const payloads = await prisma.matchPayload.findMany({
    where: { sourceMatchId: { in: gcIds } },
    select: { sourceMatchId: true, payload: true },
  });
  const queryTime = Date.now() - startTime;
  console.log(`Payloads carregados: ${payloads.length} em ${queryTime}ms`);

  // --- MÓDULO #02: TERROR DOS AMIGOS ---
  let totalMatchesAnalyzed = payloads.length;
  let totalRoundsAnalyzed = 0;
  let totalTeamDamage = 0;
  let totalTeamKills = 0;
  let totalTeamFlashes = 0;
  let totalTeamBlindDuration = 0;

  // Por jogador monitorado
  interface PlayerFFAccumulator {
    player: typeof activeTracked[0];
    roundsPlayed: number;
    teamDamage: number;
    teamKills: number;
    teamFlashes: number;
    teamBlindDurationSeconds: number;
  }
  const playerFF = new Map<string, PlayerFFAccumulator>();
  for (const p of activeTracked) {
    playerFF.set(p.steamId, {
      player: p,
      roundsPlayed: 0,
      teamDamage: 0,
      teamKills: 0,
      teamFlashes: 0,
      teamBlindDurationSeconds: 0,
    });
  }

  // --- MÓDULO #03: ECONOMIA DO DESASTRE ---
  let eco_totalRounds = 0;
  let forceBuyRounds = 0;
  let forceBuyWins = 0;
  let fullEcoRounds = 0;
  let fullEcoWins = 0;
  let fullBuyRounds = 0;
  let fullBuyWins = 0;
  let estimatedEquipmentLostValue = 0;

  // --- MÓDULO #05: MATADOR DE ECO ---
  let totalAnalyzedKills = 0;
  let totalEcoKills = 0;
  const playerKillsTotal = new Map<string, number>();
  const playerEcoKillsMap = new Map<string, number>();

  for (const p of payloads) {
    const raw = p.payload as any;
    if (!raw) continue;

    // Rastrear rounds válidos (excluir warmup e knife_round)
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

    const matchRoundsCount = validRoundNumbers.size;
    totalRoundsAnalyzed += matchRoundsCount;

    // Mapa de jogador para lado por round a partir de economy
    const playerSideByRound = new Map<string, "T" | "CT">();
    const roundSideLoadout = new Map<string, { totalLoadout: number; playerCount: number }>();
    const roundSideCashSpent = new Map<string, number>();

    if (Array.isArray(raw.economy)) {
      for (const e of raw.economy) {
        const rNum = e.round;
        if (!validRoundNumbers.has(rNum)) continue;
        const steam = String(e.player_steamid);
        const side = String(e.side).toUpperCase() as "T" | "CT";
        playerSideByRound.set(`${rNum}:${steam}`, side);

        // Economia por time no round
        const teamKey = `${rNum}:${side}`;
        const prev = roundSideLoadout.get(teamKey) || { totalLoadout: 0, playerCount: 0 };
        prev.totalLoadout += e.loadout_value || e.equipment_value || 0;
        prev.playerCount++;
        roundSideLoadout.set(teamKey, prev);

        const prevSpent = roundSideCashSpent.get(teamKey) || 0;
        roundSideCashSpent.set(teamKey, prevSpent + (e.cash_spent || 0));
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

    // --- Processar Danos Aliados (#02) ---
    if (Array.isArray(raw.damage)) {
      for (const d of raw.damage) {
        if (!validRoundNumbers.has(d.round)) continue;
        const aSteam = String(d.attacker_steamid);
        const vSteam = String(d.victim_steamid);
        if (aSteam === vSteam) continue;

        const aSide = playerSideByRound.get(`${d.round}:${aSteam}`);
        const vSide = playerSideByRound.get(`${d.round}:${vSteam}`);

        if (aSide && vSide && aSide === vSide) {
          const dmg = (d.damage_health || 0);
          totalTeamDamage += dmg;
          const acc = playerFF.get(aSteam);
          if (acc) {
            acc.teamDamage += dmg;
          }
        }
      }
    }

    // --- Processar Flashes Aliadas (#02) ---
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
          totalTeamBlindDuration += duration;
          const acc = playerFF.get(tSteam);
          if (acc) {
            acc.teamFlashes++;
            acc.teamBlindDurationSeconds += duration;
          }
        }
      }
    }

    // --- Processar Kills (TeamKills #02 e Anti-Eco #05) ---
    if (Array.isArray(raw.kills)) {
      for (const k of raw.kills) {
        if (!validRoundNumbers.has(k.round)) continue;
        const kSteam = String(k.killer_steamid);
        const vSteam = String(k.victim_steamid);

        // Teamkill check
        const isTk =
          k.analytics?.teamkill === true ||
          (k.killer_team && k.victim_team && k.killer_team === k.victim_team && kSteam !== vSteam);

        if (isTk) {
          totalTeamKills++;
          const acc = playerFF.get(kSteam);
          if (acc) {
            acc.teamKills++;
          }
          continue; // Pula teamkill para não contar como kill regular
        }

        // Se for kill normal contra inimigo:
        totalAnalyzedKills++;
        if (trackedMap.has(kSteam)) {
          playerKillsTotal.set(kSteam, (playerKillsTotal.get(kSteam) || 0) + 1);
        }

        // Anti-Eco check
        if (k.analytics?.anti_eco === true) {
          totalEcoKills++;
          if (trackedMap.has(kSteam)) {
            playerEcoKillsMap.set(kSteam, (playerEcoKillsMap.get(kSteam) || 0) + 1);
          }
        }
      }
    }

    // --- Processar Economia por Round (#03) ---
    for (const rNum of validRoundNumbers) {
      eco_totalRounds++;
      const winner = roundWinners.get(rNum);

      for (const side of ["T", "CT"] as const) {
        const teamKey = `${rNum}:${side}`;
        const info = roundSideLoadout.get(teamKey);
        if (!info || info.playerCount === 0) continue;

        const avgLoadout = info.totalLoadout / info.playerCount;
        const isWin = winner === side;
        const spent = roundSideCashSpent.get(teamKey) || 0;

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
            // Em forçados perdidos, o equipamento investido foi perdido
            estimatedEquipmentLostValue += info.totalLoadout;
          }
        } else {
          fullBuyRounds++;
          if (isWin) fullBuyWins++;
        }
      }
    }
  }

  const calcDuration = Date.now() - startTime;
  console.log(`Tempo total de processamento: ${calcDuration}ms`);

  // --- RESULTADOS #02 TERROR DOS AMIGOS ---
  const validRankings = Array.from(playerFF.values())
    .filter((a) => a.roundsPlayed >= 20)
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

  const topFlasher = [...validRankings].sort((a, b) => b.teamFlashes - a.teamFlashes)[0] || null;
  const topDamager = [...validRankings].sort((a, b) => b.teamDamage - a.teamDamage)[0] || null;

  console.log("\n--- RESULTADO FINAL MÓDULO #02 ---");
  console.log({
    totalMatchesAnalyzed,
    totalRoundsAnalyzed,
    totalTeamDamage,
    totalTeamKills,
    totalTeamFlashes,
    topFlasher: topFlasher ? { nick: topFlasher.player.nickname, flashes: topFlasher.teamFlashes, blindSec: topFlasher.teamBlindDurationSeconds } : null,
    topDamager: topDamager ? { nick: topDamager.player.nickname, damage: topDamager.teamDamage, tks: topDamager.teamKills } : null,
    topRankings: validRankings.slice(0, 3).map(r => ({ nick: r.player.nickname, incidents100R: r.incidentsPer100Rounds, dmg: r.teamDamage, flashes: r.teamFlashes, tks: r.teamKills })),
  });

  // --- RESULTADOS #03 ECONOMIA DO DESASTRE ---
  const fullBuyWinrate = fullBuyRounds > 0 ? Math.round((fullBuyWins / fullBuyRounds) * 100) : null;
  const forceBuyWinrate = forceBuyRounds > 0 ? Math.round((forceBuyWins / forceBuyRounds) * 100) : null;
  const fullEcoWinrate = fullEcoRounds > 0 ? Math.round((fullEcoWins / fullEcoRounds) * 100) : null;

  console.log("\n--- RESULTADO FINAL MÓDULO #03 ---");
  console.log({
    totalRoundsAnalyzed: eco_totalRounds,
    fullBuyRounds,
    fullBuyWins,
    fullBuyWinrate: `${fullBuyWinrate}%`,
    forceBuyRounds,
    forceBuyWins,
    forceBuyWinrate: `${forceBuyWinrate}%`,
    fullEcoRounds,
    fullEcoWins,
    fullEcoWinrate: `${fullEcoWinrate}%`,
    estimatedEquipmentLostValue: `$${estimatedEquipmentLostValue.toLocaleString()}`,
  });

  // --- RESULTADOS #05 MATADOR DE ECO ---
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
    .sort((a, b) => b.ecoKills - a.ecoKills);

  const topEcoHunter = ecoRankings[0] || null;

  console.log("\n--- RESULTADO FINAL MÓDULO #05 ---");
  console.log({
    totalAnalyzedKills,
    totalEcoKills,
    ecoKillPercentageGlobal: `${Math.round((totalEcoKills / totalAnalyzedKills) * 100)}%`,
    topEcoHunter: topEcoHunter ? { nick: topEcoHunter.player.nickname, ecoKills: topEcoHunter.ecoKills, pct: `${topEcoHunter.ecoKillPercentage}%` } : null,
    topRankings: ecoRankings.slice(0, 4).map(r => ({ nick: r.player.nickname, ecoKills: r.ecoKills, pct: `${r.ecoKillPercentage}%` })),
  });
}

testPrototype().finally(() => prisma.$disconnect());
