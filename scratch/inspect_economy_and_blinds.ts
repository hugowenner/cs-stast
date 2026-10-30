import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const p = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: "27544295" },
    select: { payload: true },
  });

  const raw = p?.payload as any;

  console.log("=== INSPEÇÃO DE PAYLOAD.ECONOMY ===");
  console.log("Is array?", Array.isArray(raw.economy), "Length:", raw.economy?.length);
  if (raw.economy?.length > 0) {
    console.log("First 3 economy items:");
    console.log(JSON.stringify(raw.economy.slice(0, 3), null, 2));
  }

  console.log("\n=== INSPEÇÃO DE PAYLOAD.PURCHASES ===");
  console.log("Is array?", Array.isArray(raw.purchases), "Length:", raw.purchases?.length);
  if (raw.purchases?.length > 0) {
    console.log("First 3 purchases items:");
    console.log(JSON.stringify(raw.purchases.slice(0, 3), null, 2));
  }

  // BUSCA EXAUSTIVA DE FRIENDLY BLINDS COM blind_player_steamid
  console.log("\n=== BUSCA EXAUSTIVA DE FRIENDLY BLINDS COM blind_player_steamid ===");
  const payloads = await prisma.matchPayload.findMany({
    select: { sourceMatchId: true, payload: true },
  });

  let totalBlindEvents = 0;
  let friendlyBlindFound = 0;
  let sampleFoundBlind: any = null;

  for (const pay of payloads) {
    const r = pay.payload as any;
    if (!r) continue;

    const steamTeam = new Map<string, string>();
    if (Array.isArray(r.players)) {
      for (const pl of r.players) {
        if (pl.steamid && pl.team) {
          steamTeam.set(String(pl.steamid), String(pl.team).toUpperCase());
        }
      }
    }

    if (Array.isArray(r.blind_events)) {
      totalBlindEvents += r.blind_events.length;
      for (const b of r.blind_events) {
        const throwerSteam = String(b.thrower_steamid || "");
        const victimSteam = String(b.blind_player_steamid || "");
        const tTeam = steamTeam.get(throwerSteam);
        const vTeam = steamTeam.get(victimSteam);

        if (tTeam && vTeam && tTeam === vTeam && throwerSteam !== victimSteam) {
          friendlyBlindFound++;
          if (!sampleFoundBlind) {
            sampleFoundBlind = {
              matchId: pay.sourceMatchId,
              event: b,
              throwerTeam: tTeam,
              victimTeam: vTeam,
            };
          }
        }
      }
    }
  }

  console.log(`Total Blind Events analisados: ${totalBlindEvents}`);
  console.log(`Friendly Blind Events encontrados: ${friendlyBlindFound}`);
  console.log("Sample friendly blind:", sampleFoundBlind);

  // AUDITORIA DO TOP LEVEL ECONOMY EM TODOS OS 480 PAYLOADS
  let payloadsWithEconomy = 0;
  let totalEconomyRows = 0;
  let payloadsWithPurchases = 0;
  let totalPurchasesRows = 0;

  for (const pay of payloads) {
    const r = pay.payload as any;
    if (Array.isArray(r?.economy) && r.economy.length > 0) {
      payloadsWithEconomy++;
      totalEconomyRows += r.economy.length;
    }
    if (Array.isArray(r?.purchases) && r.purchases.length > 0) {
      payloadsWithPurchases++;
      totalPurchasesRows += r.purchases.length;
    }
  }

  console.log(`\n=== COBERTURA DE ECONOMY E PURCHASES NOS 480 PAYLOADS ===`);
  console.log(`Payloads com 'economy': ${payloadsWithEconomy} de ${payloads.length} (${totalEconomyRows} registros)`);
  console.log(`Payloads com 'purchases': ${payloadsWithPurchases} de ${payloads.length} (${totalPurchasesRows} registros)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
