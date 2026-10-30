import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const p = await prisma.matchPayload.findFirst({
    where: { sourceMatchId: "27544295" },
    select: { payload: true, parserVersion: true, schemaVersion: true },
  });

  const raw = p?.payload as any;
  console.log("=== TOP-LEVEL KEYS ===");
  console.log(Object.keys(raw || {}));

  console.log("\n=== PARSER VERSION & SCHEMA ===");
  console.log("Parser:", p?.parserVersion, "Schema:", p?.schemaVersion);

  console.log("\n=== SAMPLE DAMAGE EVENT (first 3) ===");
  console.log(JSON.stringify(raw?.damage?.slice(0, 3), null, 2));

  console.log("\n=== SAMPLE BLIND EVENT (first 3) ===");
  console.log(JSON.stringify(raw?.blind_events?.slice(0, 3), null, 2));

  console.log("\n=== SAMPLE PLAYER OBJECT ===");
  if (raw?.players && raw.players.length > 0) {
    console.log(JSON.stringify(raw.players[0], null, 2));
  }

  // Verificar se há em algum dos 480 payloads algum evento de damage com friendly_fire ou times iguais
  console.log("\n=== BUSCA EXAUSTIVA DE FRIENDLY DAMAGE NOS 480 PAYLOADS ===");
  const payloads = await prisma.matchPayload.findMany({
    select: { sourceMatchId: true, payload: true },
  });

  let totalDamageEvents = 0;
  let friendlyDamageFound = 0;
  let sampleFoundDmg: any = null;

  let totalBlindEvents = 0;
  let friendlyBlindFound = 0;
  let sampleFoundBlind: any = null;

  for (const pay of payloads) {
    const r = pay.payload as any;
    if (!r) continue;

    // Build map of steamId to team
    const steamTeam = new Map<string, string>();
    if (Array.isArray(r.players)) {
      for (const pl of r.players) {
        if (pl.steamid && pl.team) {
          steamTeam.set(String(pl.steamid), String(pl.team).toUpperCase());
        }
      }
    }

    if (Array.isArray(r.damage)) {
      totalDamageEvents += r.damage.length;
      for (const d of r.damage) {
        const aTeam = d.attacker_team ? String(d.attacker_team).toUpperCase() : steamTeam.get(String(d.attacker_steamid));
        const vTeam = d.victim_team ? String(d.victim_team).toUpperCase() : steamTeam.get(String(d.victim_steamid));
        const isSameSteam = d.attacker_steamid && d.victim_steamid && d.attacker_steamid === d.victim_steamid;

        if (aTeam && vTeam && aTeam === vTeam && !isSameSteam) {
          friendlyDamageFound++;
          if (!sampleFoundDmg) {
            sampleFoundDmg = { matchId: pay.sourceMatchId, damage: d, aTeam, vTeam };
          }
        }
      }
    }

    if (Array.isArray(r.blind_events)) {
      totalBlindEvents += r.blind_events.length;
      for (const b of r.blind_events) {
        const throwerSteam = b.thrower_steamid || b.attacker_steamid;
        const victimSteam = b.blinded_steamid || b.victim_steamid;
        const tTeam = b.thrower_team || b.attacker_team ? String(b.thrower_team || b.attacker_team).toUpperCase() : steamTeam.get(String(throwerSteam));
        const vTeam = b.blinded_team || b.victim_team ? String(b.blinded_team || b.victim_team).toUpperCase() : steamTeam.get(String(victimSteam));
        const isSameSteam = throwerSteam && victimSteam && throwerSteam === victimSteam;

        if (tTeam && vTeam && tTeam === vTeam && !isSameSteam) {
          friendlyBlindFound++;
          if (!sampleFoundBlind) {
            sampleFoundBlind = { matchId: pay.sourceMatchId, blind: b, tTeam, vTeam };
          }
        }
      }
    }
  }

  console.log(`Total Damage Events analisados: ${totalDamageEvents}`);
  console.log(`Friendly Damage Events encontrados: ${friendlyDamageFound}`);
  console.log("Sample friendly damage:", sampleFoundDmg);

  console.log(`Total Blind Events analisados: ${totalBlindEvents}`);
  console.log(`Friendly Blind Events encontrados: ${friendlyBlindFound}`);
  console.log("Sample friendly blind:", sampleFoundBlind);

  // Verificar se há em algum lugar do JSON termos como "cash", "money", "spent", "loadout", "buy", "eco"
  console.log("\n=== BUSCA DE TERMOS ECONÔMICOS NO JSON ===");
  let foundAnyCash = 0;
  let foundAnyLoadout = 0;
  let foundAnyBuy = 0;
  let sampleEconomicKey: string[] = [];

  for (const pay of payloads.slice(0, 50)) {
    const str = JSON.stringify(pay.payload);
    if (str.includes("cash")) foundAnyCash++;
    if (str.includes("loadout")) foundAnyLoadout++;
    if (str.includes("equipment")) foundAnyBuy++;
    if (sampleEconomicKey.length === 0) {
      const matches = str.match(/"[a-zA-Z0-9_]*(?:cash|money|spent|loadout|buy|economy|equipment)[a-zA-Z0-9_]*"/gi);
      if (matches) {
        sampleEconomicKey = Array.from(new Set(matches)).slice(0, 10);
      }
    }
  }

  console.log(`Matches com "cash": ${foundAnyCash}`);
  console.log(`Matches com "loadout": ${foundAnyLoadout}`);
  console.log(`Matches com "equipment": ${foundAnyBuy}`);
  console.log("Amostra de chaves com termos econômicos encontradas:", sampleEconomicKey);
}

main().catch(console.error).finally(() => prisma.$disconnect());
