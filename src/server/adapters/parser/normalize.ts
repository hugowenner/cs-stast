import type { SyncMatchInput } from "@/server/dtos/sync.dto";

/**
 * Normaliza o payload bruto gerado pelo cs2-parser para o formato de contrato interno SyncMatchInput.
 */
export function normalizeParserMatch(payload: any, sourceMatchId: string, createdAt: Date): SyncMatchInput {
  const match = payload.match ?? {};
  const players = payload.players ?? [];
  const rounds = payload.rounds ?? [];
  const kills = payload.kills ?? [];
  const damage = payload.damage ?? [];
  const clutches = payload.clutches ?? [];
  const multikills = payload.multikills ?? [];

  const totalRounds = Math.max(rounds.length, 1);

  // Mapeia jogadores para a estrutura final
  const normalizedPlayers = players.map((player: any) => {
    const steamId = player.steamid;

    // 1. Kills e Headshots (excluindo suicídios/teamkills)
    const playerKills = kills.filter((k: any) => 
      k.killer_steamid === steamId && 
      !k.analytics?.suicide &&
      !(k.killer_team && k.victim_team && k.killer_team === k.victim_team)
    );
    const killsCount = playerKills.length;
    const headshotsCount = playerKills.filter((k: any) => k.headshot === true).length;

    // 2. Deaths e Assists
    const deathsCount = kills.filter((k: any) => k.victim_steamid === steamId).length;
    const assistsCount = kills.filter((k: any) => k.assister_steamid === steamId).length;

    // 3. ADR (Average Damage per Round)
    const playerDamageEvents = damage.filter((d: any) => 
      d.attacker_steamid === steamId && 
      d.victim_steamid !== steamId
    );
    const totalDamage = playerDamageEvents.reduce((acc: number, cur: any) => acc + (cur.damage_health ?? 0), 0);
    const adr = totalDamage / totalRounds;

    // 4. KAST Calculation
    const kast = calculateKAST(steamId, kills, totalRounds);

    // 5. Entry e Trade Kills
    const entryKills = playerKills.filter((k: any) => k.analytics?.entry_kill === true).length;
    const entryDeaths = kills.filter((k: any) => k.victim_steamid === steamId && k.analytics?.entry_kill === true).length;
    const tradeKills = playerKills.filter((k: any) => k.analytics?.trade_kill === true).length;

    // 6. Multikills (Double, Triple, Quad, Aces)
    const playerMultikills = multikills.filter((m: any) => m.player_steamid === steamId);
    const doubleKills = playerMultikills.filter((m: any) => m.kill_count === 2).length;
    const tripleKills = playerMultikills.filter((m: any) => m.kill_count === 3).length;
    const quadKills = playerMultikills.filter((m: any) => m.kill_count === 4).length;
    const aces = playerMultikills.filter((m: any) => m.kill_count >= 5).length;

    // 7. Clutches
    const playerClutches = clutches.filter((c: any) => c.player_steamid === steamId);
    const clutchesWon = playerClutches.filter((c: any) => c.won === true).length;

    const buildClutchStats = (opponents: number) => {
      const tierClutches = playerClutches.filter((c: any) => c.opponents === opponents);
      return {
        attempts: tierClutches.length,
        wins: tierClutches.filter((c: any) => c.won === true).length
      };
    };

    // 8. Kills Detail (para alimentar Rivalidade)
    const killsDetail = playerKills
      .filter((k: any) => k.victim_steamid)
      .map((k: any) => ({
        victimSteamId: k.victim_steamid,
        roundNumber: k.round
      }));

    return {
      steamId,
      nickname: player.name || "Desconhecido",
      team: (player.team ?? "").toUpperCase() === "TERRORIST" ? ("A" as const) : ("B" as const),
      kills: killsCount,
      deaths: deathsCount,
      assists: assistsCount,
      headshots: headshotsCount,
      adr,
      kast,
      entryKills,
      entryDeaths,
      tradeKills,
      clutchesWon,
      flashAssists: 0, // Não rastreado no output contratual v1
      damage: totalDamage,
      doubleKills,
      tripleKills,
      quadKills,
      aces,
      clutches: {
        "1v1": buildClutchStats(1),
        "1v2": buildClutchStats(2),
        "1v3": buildClutchStats(3),
        "1v4": buildClutchStats(4),
        "1v5": buildClutchStats(5)
      },
      killsDetail
    };
  });

  return {
    matchId: sourceMatchId,
    map: normalizeMapName(match.map_name ?? "Desconhecido"),
    playedAt: parseDate(match.date, createdAt),
    scoreTeamA: match.score_a ?? 0,
    scoreTeamB: match.score_b ?? 0,
    durationSeconds: match.duration_seconds ? Math.round(match.duration_seconds) : 0,
    demoUrl: match.demo_name ? String(match.demo_name) : undefined,
    roundsJson: rounds,
    players: normalizedPlayers
  };
}

/**
 * Calcula a métrica KAST (porcentagem de rounds com Kill, Assist, Survival ou Trade) para um jogador.
 */
function calculateKAST(steamId: string, kills: any[], totalRounds: number): number {
  let kastRounds = 0;

  for (let r = 1; r <= totalRounds; r++) {
    // 1. Teve Kill no round?
    const hadKill = kills.some((k: any) => k.round === r && k.killer_steamid === steamId && !k.analytics?.suicide);
    if (hadKill) {
      kastRounds++;
      continue;
    }

    // 2. Teve Assist no round?
    const hadAssist = kills.some((k: any) => k.round === r && k.assister_steamid === steamId);
    if (hadAssist) {
      kastRounds++;
      continue;
    }

    // 3. Sobreviveu (não morreu no round)?
    const died = kills.some((k: any) => k.round === r && k.victim_steamid === steamId);
    if (!died) {
      kastRounds++;
      continue;
    }

    // 4. Foi trocado no round (morreu, mas o assassino foi morto por um colega como trade)?
    const playerDeath = kills.find((k: any) => k.round === r && k.victim_steamid === steamId);
    if (playerDeath && playerDeath.killer_steamid) {
      const wasTraded = kills.some((k: any) => 
        k.round === r && 
        k.victim_steamid === playerDeath.killer_steamid && 
        k.analytics?.trade_kill === true
      );
      if (wasTraded) {
        kastRounds++;
        continue;
      }
    }
  }

  return (kastRounds / totalRounds) * 100;
}

const MAP_NAME_ALIASES: Record<string, string> = {
  de_dust2: "Dust2",
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_vertigo: "Vertigo",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_train: "Train"
};

function normalizeMapName(rawName: string): string {
  return MAP_NAME_ALIASES[rawName.toLowerCase()] ?? rawName;
}

function parseDate(dateStr: string | undefined, fallback: Date): Date {
  if (!dateStr) return fallback;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
