import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  console.log("=== INICIANDO AUDITORIA DE PAYLOADS DO RAIO-X ===");

  const totalPayloads = await prisma.matchPayload.count();
  const totalMatches = await prisma.match.count();

  console.log(`Total MatchPayload: ${totalPayloads}`);
  console.log(`Total Match: ${totalMatches}`);

  // Amostra de MatchPayload
  const payloads = await prisma.matchPayload.findMany({
    take: 100,
    select: {
      id: true,
      source: true,
      sourceMatchId: true,
      parserVersion: true,
      schemaVersion: true,
      payload: true,
    },
  });

  let hasBlindEvents = 0;
  let hasTeamDamage = 0;
  let hasTeamKills = 0;
  let hasCashSpent = 0;
  let hasLoadoutValue = 0;
  let hasEquipments = 0;
  let hasEconomyPerRound = 0;
  let hasAntiEco = 0;
  let hasPlayers = 0;
  let hasTeamsSides = 0;
  let hasRoundResults = 0;

  // inspecionar estrutura de 1 payload detalhadamente
  if (payloads.length > 0) {
    const sample = payloads[0].payload as any;
    console.log("Sample top-level keys:", Object.keys(sample || {}));
    if (sample?.rounds && Array.isArray(sample.rounds) && sample.rounds.length > 0) {
      console.log("Sample round[0] keys:", Object.keys(sample.rounds[0]));
    }
  }

  for (const p of payloads) {
    const raw = p.payload as any;
    if (!raw) continue;

    // Verificar blind_events
    if (raw.blind_events || raw.blinds || raw.flash_events) {
      hasBlindEvents++;
    }

    // Verificar dano em aliados
    if (raw.damages || raw.damage_events || raw.player_damages) {
      const damages = raw.damages || raw.damage_events || raw.player_damages;
      if (Array.isArray(damages) && damages.some((d: any) => d.attacker_team === d.user_team || d.friendly_fire || d.team_damage)) {
        hasTeamDamage++;
      }
    }

    // Verificar teamkills
    if (raw.kills && Array.isArray(raw.kills)) {
      if (raw.kills.some((k: any) => k.teamkill || k.is_teamkill || (k.attacker_team && k.user_team && k.attacker_team === k.user_team))) {
        hasTeamKills++;
      }
    }

    // Verificar rounds / economia
    if (raw.rounds && Array.isArray(raw.rounds)) {
      hasRoundResults++;
      let roundHasEco = false;
      let roundHasCash = false;
      let roundHasLoadout = false;
      for (const r of raw.rounds) {
        if (r.winner_team || r.winning_team || r.winner) {
          // round results
        }
        if (r.cash_spent || r.cashSpent || r.spent) roundHasCash = true;
        if (r.loadout_value || r.loadoutValue || r.equip_value) roundHasLoadout = true;
        if (r.economy || r.type || r.buy_type) roundHasEco = true;
        if (r.teams) {
          hasTeamsSides++;
        }
      }
      if (roundHasCash) hasCashSpent++;
      if (roundHasLoadout) hasLoadoutValue++;
      if (roundHasEco) hasEconomyPerRound++;
    }

    // Verificar kills.analytics.anti_eco
    if (raw.kills && Array.isArray(raw.kills)) {
      if (raw.kills.some((k: any) => k.analytics?.anti_eco !== undefined || k.anti_eco !== undefined)) {
        hasAntiEco++;
      }
    }

    // Verificar players
    if (raw.players && (Array.isArray(raw.players) || typeof raw.players === "object")) {
      hasPlayers++;
    }
  }

  console.log("\n--- RESULTADO DA AMOSTRA (100 PAYLOADS) ---");
  console.log(`blind_events: ${hasBlindEvents}/100`);
  console.log(`team_damage: ${hasTeamDamage}/100`);
  console.log(`team_kills: ${hasTeamKills}/100`);
  console.log(`cash_spent: ${hasCashSpent}/100`);
  console.log(`loadout_value: ${hasLoadoutValue}/100`);
  console.log(`economy_per_round: ${hasEconomyPerRound}/100`);
  console.log(`anti_eco (analytics): ${hasAntiEco}/100`);
  console.log(`players: ${hasPlayers}/100`);
  console.log(`round_results: ${hasRoundResults}/100`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
