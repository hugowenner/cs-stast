import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  console.log("================================================================================");
  console.log("RELATÓRIO DE DIAGNÓSTICO TÉCNICO COMPLETO: RAIO-X DOS MÓDULOS #02, #03 E #05");
  console.log("================================================================================");

  // 1. CONFIRMAÇÃO DO AMBIENTE E DATABASE_URL
  const dbInfo = await prisma.$queryRawUnsafe<any[]>(
    "SELECT current_database() as db, current_user as usr, inet_server_port() as port, version() as ver;"
  );
  console.log("\n--- 1. AMBIENTE & CONEXÃO EFETIVA COM O BANCO ---");
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`Banco Atual: ${dbInfo[0]?.db}`);
  console.log(`Usuário Conectado: ${dbInfo[0]?.usr}`);
  console.log(`Porta Servidor: ${dbInfo[0]?.port}`);
  console.log(`Versão PG: ${dbInfo[0]?.ver?.split(" on ")[0]}`);

  // 2. CONTAGENS GERAIS NO POSTGRESQL DEV
  const existingTables = await prisma.$queryRawUnsafe<any[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
  );
  console.log("\nTabelas existentes no banco DEV:", existingTables.map(t => t.table_name));

  const totalMatches = await prisma.match.count();
  const totalPayloads = await prisma.matchPayload.count();
  const hasRevisions = existingTables.some(t => t.table_name === "ingest_payload_revisions");
  const hasNormJobs = existingTables.some(t => t.table_name === "normalization_jobs");
  const hasProjections = existingTables.some(t => t.table_name === "demo_match_projections");
  const hasSyncJobs = existingTables.some(t => t.table_name === "sync_jobs");

  console.log(`\n--- 2. CONTAGENS GERAIS DE DADOS & FILA DURÁVEL ---`);
  console.log(`Total Matches na tabela "Match": ${totalMatches}`);
  console.log(`Total MatchPayloads (JSONB bruto): ${totalPayloads}`);
  console.log(`Tabela 'ingest_payload_revisions' existe? ${hasRevisions}`);
  console.log(`Tabela 'normalization_jobs' existe? ${hasNormJobs}`);
  console.log(`Tabela 'demo_match_projections' existe? ${hasProjections}`);
  console.log(`Tabela 'sync_jobs' existe? ${hasSyncJobs}`);

  let jobsByStatus: any[] = [];
  if (hasNormJobs) {
    jobsByStatus = await prisma.$queryRawUnsafe<any[]>(
      "SELECT status, count(*)::int as count FROM normalization_jobs GROUP BY status;"
    );
  }
  let syncJobsByStatus: any[] = [];
  if (hasSyncJobs) {
    syncJobsByStatus = await prisma.$queryRawUnsafe<any[]>(
      "SELECT status, count(*)::int as count FROM sync_jobs GROUP BY status;"
    );
  }
  const matchPayloadStatuses = await prisma.$queryRawUnsafe<any[]>(
    `SELECT status, count(*)::int as count FROM match_payloads GROUP BY status;`
  );

  // 3. EXPLICAR A DISCREPÂNCIA DAS 116 DEMOS
  console.log("\n--- 3. FILTRO DA PÁGINA: POR QUE 116 DEMOS NO CABEÇALHO? ---");
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  });
  console.log("Temporadas cadastradas:", seasons);

  const activeSeason = seasons.find((s) => s.status === "ACTIVE") ?? seasons[0];
  console.log(`Temporada Ativa / Resolvida no Raio-X: ${activeSeason?.name} (${activeSeason?.id})`);

  // Matches na temporada ativa
  const matchesInActiveSeason = await prisma.match.count({
    where: { seasonId: activeSeason.id },
  });
  const communityInActiveSeason = await prisma.match.count({
    where: { seasonId: activeSeason.id, trackedPlayersCount: { gte: 2 } },
  });
  const demosCommunityInActiveSeason = await prisma.match.count({
    where: { seasonId: activeSeason.id, trackedPlayersCount: { gte: 2 }, demoUrl: { not: null } },
  });
  const allCommunityWithDemos = await prisma.match.count({
    where: { trackedPlayersCount: { gte: 2 }, demoUrl: { not: null } },
  });

  console.log(`Matches totais na temporada ativa (${activeSeason?.name}): ${matchesInActiveSeason}`);
  console.log(`Matches comunitários (trackedPlayersCount >= 2) na temporada ativa: ${communityInActiveSeason}`);
  console.log(`Matches comunitários COM DEMO na temporada ativa: ${demosCommunityInActiveSeason}  <-- ESTE É O 116!`);
  console.log(`Matches comunitários COM DEMO em TODO O HISTÓRICO: ${allCommunityWithDemos}`);

  // 4. AUDITORIA PROFUNDA DOS 480 PAYLOADS
  console.log("\n--- 4. AUDITORIA ESTRUTURAL DOS 480 PAYLOADS JSONB ---");
  const allPayloads = await prisma.matchPayload.findMany({
    select: {
      id: true,
      sourceMatchId: true,
      parserVersion: true,
      schemaVersion: true,
      createdAt: true,
      payload: true,
    },
  });

  // Mapear campos de cada payload
  let m2_hasDamage = 0;
  let m2_hasFriendlyDamage = 0;
  let m2_hasBlindEvents = 0;
  let m2_hasFriendlyBlind = 0;
  let m2_hasTeamKills = 0;
  let m2_damageWithAttackerVictim = 0;
  let m2_blindWithThrowerVictim = 0;

  let m3_hasRounds = 0;
  let m3_hasRoundEconomy = 0;
  let m3_hasCashSpent = 0;
  let m3_hasLoadoutValue = 0;
  let m3_hasEquipmentValue = 0;
  let m3_hasStartCash = 0;
  let m3_hasPurchases = 0;
  let m3_hasBuyType = 0;

  let m5_hasKills = 0;
  let m5_hasKillsAnalytics = 0;
  let m5_hasAntiEcoField = 0;
  let m5_hasAntiEcoTrue = 0;
  const analyticsKeys = new Set<string>();
  const roundKeys = new Set<string>();
  const playerKeys = new Set<string>();

  // Exemplos concretos
  let sampleFriendlyDamage: any = null;
  let sampleFriendlyBlind: any = null;
  let sampleTeamKill: any = null;
  let sampleRoundEconomy: any = null;
  let sampleAntiEcoKill: any = null;
  let sampleKillAnalytics: any = null;

  for (const p of allPayloads) {
    const raw = p.payload as any;
    if (!raw) continue;

    // --- Módulo #02: Dano e Flashes ---
    // 1. Danos
    const damages = raw.damage || raw.damages || raw.damage_events || [];
    if (Array.isArray(damages) && damages.length > 0) {
      m2_hasDamage++;
      let foundFriendlyDamageInThisMatch = false;
      for (const d of damages) {
        if (d.attacker_steamid && d.victim_steamid) {
          m2_damageWithAttackerVictim++;
        }
        // Friendly fire check
        const isFriendly =
          (d.attacker_team && d.victim_team && d.attacker_team === d.victim_team && d.attacker_steamid !== d.victim_steamid) ||
          d.friendly_fire === true ||
          d.is_friendly_fire === true ||
          d.team_damage === true;
        if (isFriendly) {
          foundFriendlyDamageInThisMatch = true;
          if (!sampleFriendlyDamage) {
            sampleFriendlyDamage = { matchId: p.sourceMatchId, event: d };
          }
        }
      }
      if (foundFriendlyDamageInThisMatch) m2_hasFriendlyDamage++;
    }

    // 2. Blind events
    const blinds = raw.blind_events || raw.blinds || raw.flash_events || [];
    if (Array.isArray(blinds) && blinds.length > 0) {
      m2_hasBlindEvents++;
      let foundFriendlyBlindInThisMatch = false;
      for (const b of blinds) {
        if ((b.attacker_steamid || b.thrower_steamid) && (b.victim_steamid || b.blinded_steamid)) {
          m2_blindWithThrowerVictim++;
        }
        const isFriendlyBlind =
          (b.attacker_team && b.victim_team && b.attacker_team === b.victim_team) ||
          (b.thrower_team && b.victim_team && b.thrower_team === b.victim_team) ||
          b.friendly_blind === true ||
          b.team_flash === true;
        if (isFriendlyBlind) {
          foundFriendlyBlindInThisMatch = true;
          if (!sampleFriendlyBlind) {
            sampleFriendlyBlind = { matchId: p.sourceMatchId, event: b };
          }
        }
      }
      if (foundFriendlyBlindInThisMatch) m2_hasFriendlyBlind++;
    }

    // 3. Teamkills
    const kills = raw.kills || [];
    if (Array.isArray(kills) && kills.length > 0) {
      m5_hasKills++;
      let foundTkInThisMatch = false;
      for (const k of kills) {
        if (k.analytics) {
          m5_hasKillsAnalytics++;
          Object.keys(k.analytics).forEach((key) => analyticsKeys.add(key));
          if (!sampleKillAnalytics) {
            sampleKillAnalytics = { matchId: p.sourceMatchId, analytics: k.analytics };
          }
          if ("anti_eco" in k.analytics) {
            m5_hasAntiEcoField++;
            if (k.analytics.anti_eco === true) {
              m5_hasAntiEcoTrue++;
              if (!sampleAntiEcoKill) {
                sampleAntiEcoKill = { matchId: p.sourceMatchId, kill: k };
              }
            }
          }
        }
        const isTk =
          k.analytics?.teamkill === true ||
          k.teamkill === true ||
          (k.killer_team && k.victim_team && k.killer_team === k.victim_team && k.killer_steamid !== k.victim_steamid);
        if (isTk) {
          foundTkInThisMatch = true;
          if (!sampleTeamKill) {
            sampleTeamKill = { matchId: p.sourceMatchId, kill: k };
          }
        }
      }
      if (foundTkInThisMatch) m2_hasTeamKills++;
    }

    // --- Módulo #03: Economia dos Rounds ---
    const rounds = raw.rounds || [];
    if (Array.isArray(rounds) && rounds.length > 0) {
      m3_hasRounds++;
      for (const r of rounds) {
        Object.keys(r).forEach((key) => roundKeys.add(key));
        if (r.cash_spent || r.team_a_cash_spent || r.team_b_cash_spent) m3_hasCashSpent++;
        if (r.loadout_value || r.team_a_loadout_value || r.team_b_loadout_value) m3_hasLoadoutValue++;
        if (r.equipment_value || r.team_a_equipment_value || r.team_b_equipment_value) m3_hasEquipmentValue++;
        if (r.start_cash || r.team_a_start_cash || r.team_b_start_cash) m3_hasStartCash++;
        if (r.economy || r.team_a_economy || r.team_b_economy) m3_hasRoundEconomy++;
        if (r.buy_type || r.team_a_buy_type || r.team_b_buy_type) m3_hasBuyType++;
        if (r.purchases || r.buy_events) m3_hasPurchases++;

        if (!sampleRoundEconomy && (r.cash_spent || r.loadout_value || r.economy || r.start_cash || r.type)) {
          sampleRoundEconomy = { matchId: p.sourceMatchId, round: r };
        }
      }
    }

    // Jogadores
    const players = raw.players || [];
    if (Array.isArray(players) && players.length > 0) {
      Object.keys(players[0]).forEach((key) => playerKeys.add(key));
    }
  }

  console.log("\n=================== RESULTADOS DA AUDITORIA MÓDULO A MÓDULO ===================");
  console.log(`\n### MÓDULO #02: TERROR DOS AMIGOS`);
  console.log(`- Payloads com array 'damage': ${m2_hasDamage} de ${allPayloads.length}`);
  console.log(`- Payloads com Dano em Aliados identificado: ${m2_hasFriendlyDamage} de ${allPayloads.length}`);
  console.log(`- Payloads com array 'blind_events': ${m2_hasBlindEvents} de ${allPayloads.length}`);
  console.log(`- Payloads com Cegueira em Aliados identificada: ${m2_hasFriendlyBlind} de ${allPayloads.length}`);
  console.log(`- Payloads com TeamKills identificados: ${m2_hasTeamKills} de ${allPayloads.length}`);

  console.log(`\n### MÓDULO #03: ECONOMIA DO DESASTRE`);
  console.log(`- Payloads com array 'rounds': ${m3_hasRounds} de ${allPayloads.length}`);
  console.log(`- Chaves encontradas no objeto 'round':`, Array.from(roundKeys));
  console.log(`- Rounds com 'cash_spent': ${m3_hasCashSpent}`);
  console.log(`- Rounds com 'loadout_value': ${m3_hasLoadoutValue}`);
  console.log(`- Rounds com 'equipment_value': ${m3_hasEquipmentValue}`);
  console.log(`- Rounds com 'start_cash': ${m3_hasStartCash}`);
  console.log(`- Rounds com 'economy': ${m3_hasRoundEconomy}`);
  console.log(`- Rounds com 'buy_type': ${m3_hasBuyType}`);
  console.log(`- Rounds com 'purchases': ${m3_hasPurchases}`);

  console.log(`\n### MÓDULO #05: MATADOR DE ECO`);
  console.log(`- Payloads com array 'kills': ${m5_hasKills} de ${allPayloads.length}`);
  console.log(`- Chaves encontradas no objeto 'kill.analytics':`, Array.from(analyticsKeys));
  console.log(`- Kills com campo 'anti_eco' em analytics: ${m5_hasAntiEcoField}`);
  console.log(`- Kills com 'anti_eco === true': ${m5_hasAntiEcoTrue}`);

  console.log("\n=================== EXEMPLOS CONCRETOS DE PAYLOADS REAIS ===================");
  console.log("\n1. Exemplo de Friendly Damage:", JSON.stringify(sampleFriendlyDamage, null, 2));
  console.log("\n2. Exemplo de Friendly Blind:", JSON.stringify(sampleFriendlyBlind, null, 2));
  console.log("\n3. Exemplo de TeamKill:", JSON.stringify(sampleTeamKill, null, 2));
  console.log("\n4. Exemplo de Round / Economia:", JSON.stringify(sampleRoundEconomy, null, 2));
  console.log("\n5. Exemplo de Kill Analytics:", JSON.stringify(sampleKillAnalytics, null, 2));
  console.log("\n6. Exemplo de Anti-Eco Kill:", JSON.stringify(sampleAntiEcoKill, null, 2));

  // 5. AUDITORIA DA FILA DURÁVEL E JOBS
  console.log("\n--- 5. AUDITORIA DA FILA DURÁVEL ---");
  if (hasNormJobs) {
    const failedJobs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, source_match_id, status, normalizer_version, attempts, max_attempts, last_error, updated_at
       FROM normalization_jobs WHERE status = 'FAILED' LIMIT 5;`
    );
    console.log(`Jobs FAILED (amostra até 5):`, failedJobs);

    const pendingJobs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, source_match_id, status, normalizer_version, available_at
       FROM normalization_jobs WHERE status = 'PENDING' LIMIT 5;`
    );
    console.log(`Jobs PENDING (amostra até 5):`, pendingJobs);

    const completedJobs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, source_match_id, status, normalizer_version, finished_at
       FROM normalization_jobs WHERE status = 'COMPLETED' LIMIT 5;`
    );
    console.log(`Jobs COMPLETED (amostra até 5):`, completedJobs);
  } else {
    console.log("AVISO CRÍTICO: A tabela 'normalization_jobs' NÃO existe neste snapshot do banco DEV!");
  }
}

main()
  .catch((e) => {
    console.error("ERRO NO DIAGNÓSTICO:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
