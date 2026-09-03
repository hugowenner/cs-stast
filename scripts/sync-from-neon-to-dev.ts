/**
 * sync-from-neon-to-dev.ts
 *
 * Compara o banco histórico Neon com o PostgreSQL DEV local (Docker)
 * e, opcionalmente, importa os registros faltantes de forma ADITIVA.
 *
 * Nunca trunca, nunca apaga, nunca sobrescreve silenciosamente.
 * O Neon é somente leitura em qualquer momento.
 *
 * Ordem FK de inserção:
 *   Map → Achievement → Player → TrackedPlayer → Season → Session →
 *   Match → PlayerMatchStats → PlayerAchievement → Rivalry →
 *   SyncJob → MatchPayload →
 *   (somente para partidas NOVAS) PlayerMatchup, PlayerClutch,
 *   PlayerEntryDuel, PlayerTradeEvent
 *
 * Variáveis de ambiente:
 *   SOURCE_DATABASE_URL  — URL do Neon (somente leitura)
 *   DATABASE_URL         — DEV Docker localhost:5432 (destino)
 *   DRY_RUN              — "true" | "false"  (padrão: "true")
 */

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Configuração ─────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN !== "false"; // padrão: true (seguro)
const BATCH = 250;

// ── Tipos de conveniência ────────────────────────────────────────────────────

type Row = Record<string, unknown>;
type Client = PrismaClient & {
  $queryRawUnsafe<T = Row>(sql: string, ...args: unknown[]): Promise<T[]>;
  $disconnect(): Promise<void>;
};

// Per-model typed: usamos acesso dinâmico para os métodos do Prisma
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelApi = Record<string, any>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function redact(url: string) {
  return url.replace(/:[^:@]+@/, ":****@");
}

function requirePostgres(url: string, label: string) {
  if (!/^postgres(ql)?:\/\//.test(url))
    throw new Error(`${label} não é URL PostgreSQL: "${url.slice(0, 40)}..."`);
}

function requireDevTarget(url: string) {
  if (!url.includes("localhost:5432") && !url.includes("127.0.0.1:5432"))
    throw new Error(
      `DATABASE_URL não aponta para localhost:5432.\n` +
        `  Detectado: "${redact(url)}"\n` +
        `  Somente o DEV Docker local (localhost:5432) é permitido como destino.`,
    );
}

function requireDifferentHosts(src: string, tgt: string) {
  const host = (u: string) => u.match(/@([^/]+)\//)?.[1] ?? u;
  if (host(src) === host(tgt))
    throw new Error(
      `Source e target apontam para o mesmo host (${host(src)}). Abortando.`,
    );
}

function makeClient(url: string): Client {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  }) as unknown as Client;
}

/** Executa raw SQL no cliente dado; retorna [] se a tabela não existir (schema antigo). */
async function sql<T extends Row>(client: Client, query: string): Promise<T[]> {
  try {
    return await client.$queryRawUnsafe<T>(query);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("undefined_table")
    ) {
      return [];
    }
    throw e;
  }
}

function pad(s: unknown, n: number) {
  return String(s).padEnd(n);
}
function rpad(s: unknown, n: number) {
  return String(s).padStart(n);
}

function header(title: string) {
  console.log(`\n  ${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`  ${"─".repeat(60)}`);
}

function row(
  label: string,
  neon: number,
  dev: number,
  onlyNeon: number,
  onlyDev: number,
  conflicts: number,
) {
  const status =
    conflicts > 0 ? "⚠ CONFLITO" : onlyNeon > 0 ? "◀ FALTANDO" : "✓";
  console.log(
    `  ${pad(label, 22)}` +
      ` ${rpad(neon, 6)}` +
      ` ${rpad(dev, 6)}` +
      ` ${rpad(onlyNeon, 10)}` +
      ` ${rpad(onlyDev, 8)}` +
      ` ${rpad(conflicts, 9)}` +
      `  ${status}`,
  );
}

// ── Estrutura de resultado de comparação ─────────────────────────────────────

interface CompareResult<T extends Row> {
  onlyNeon: T[];
  onlyDev: T[];
  conflicts: Array<{ neon: T; dev: T; fields: string[] }>;
  neonTotal: number;
  devTotal: number;
}

// ── Funções de comparação por entidade ───────────────────────────────────────

async function compareMaps(
  src: Client,
  tgt: Client,
): Promise<{
  result: CompareResult<Row>;
  idMap: Map<string, string>; // neonId → devId
}> {
  const neonRows = await sql(src, `SELECT id, name, "imageUrl" FROM "Map"`);
  const devRows = await sql(tgt, `SELECT id, name, "imageUrl" FROM "Map"`);

  const devByName = new Map(devRows.map((r) => [r.name as string, r]));
  const neonByName = new Map(neonRows.map((r) => [r.name as string, r]));

  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];
  const conflicts: CompareResult<Row>["conflicts"] = [];

  for (const n of neonRows) {
    const d = devByName.get(n.name as string);
    if (!d) {
      onlyNeon.push(n);
      idMap.set(n.id as string, n.id as string); // preserva id Neon
    } else {
      idMap.set(n.id as string, d.id as string); // mapeia para id DEV
    }
  }

  const onlyDev = devRows.filter((d) => !neonByName.has(d.name as string));

  return {
    result: {
      onlyNeon,
      onlyDev,
      conflicts,
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function compareAchievements(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; idMap: Map<string, string> }> {
  const neonRows = await sql(
    src,
    `SELECT id, code, name, description, tier FROM "Achievement"`,
  );
  const devRows = await sql(
    tgt,
    `SELECT id, code, name, description, tier FROM "Achievement"`,
  );

  const devByCode = new Map(devRows.map((r) => [r.code as string, r]));
  const neonByCode = new Map(neonRows.map((r) => [r.code as string, r]));
  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];

  for (const n of neonRows) {
    const d = devByCode.get(n.code as string);
    if (!d) {
      onlyNeon.push(n);
      idMap.set(n.id as string, n.id as string);
    } else {
      idMap.set(n.id as string, d.id as string);
    }
  }

  return {
    result: {
      onlyNeon,
      onlyDev: devRows.filter((d) => !neonByCode.has(d.code as string)),
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function comparePlayers(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; idMap: Map<string, string> }> {
  const neonRows = await sql(
    src,
    `SELECT id, "steamId", nickname, "gamersClubId", "levelGc", "avatarUrl" FROM "Player"`,
  );
  const devRows = await sql(
    tgt,
    `SELECT id, "steamId", nickname, "gamersClubId", "levelGc", "avatarUrl" FROM "Player"`,
  );

  const devBySteam = new Map(devRows.map((r) => [r.steamId as string, r]));
  const neonBySteam = new Map(neonRows.map((r) => [r.steamId as string, r]));
  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];
  const conflicts: CompareResult<Row>["conflicts"] = [];

  for (const n of neonRows) {
    const d = devBySteam.get(n.steamId as string);
    if (!d) {
      onlyNeon.push(n);
      idMap.set(n.id as string, n.id as string);
    } else {
      idMap.set(n.id as string, d.id as string);
      // Detecta conflito de nickname
      if (n.nickname !== d.nickname) {
        conflicts.push({
          neon: n,
          dev: d,
          fields: ["nickname"],
        });
      }
    }
  }

  return {
    result: {
      onlyNeon,
      onlyDev: devRows.filter((d) => !neonBySteam.has(d.steamId as string)),
      conflicts,
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function compareTrackedPlayers(
  src: Client,
  tgt: Client,
  playerIdMap: Map<string, string>,
): Promise<{ result: CompareResult<Row>; idMap: Map<string, string> }> {
  const neonRows = await sql(
    src,
    `SELECT id, gamersclub_id, nickname, active, player_id FROM tracked_players`,
  );
  const devRows = await sql(
    tgt,
    `SELECT id, gamersclub_id, nickname, active, player_id FROM tracked_players`,
  );

  const devByGcId = new Map(
    devRows.map((r) => [r.gamersclub_id as string, r]),
  );
  const neonByGcId = new Map(
    neonRows.map((r) => [r.gamersclub_id as string, r]),
  );
  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];

  for (const n of neonRows) {
    const d = devByGcId.get(n.gamersclub_id as string);
    if (!d) {
      // Resolve player_id para DEV
      const resolvedPlayerId = n.player_id
        ? (playerIdMap.get(n.player_id as string) ?? n.player_id)
        : null;
      onlyNeon.push({ ...n, player_id: resolvedPlayerId });
      idMap.set(n.id as string, n.id as string);
    } else {
      idMap.set(n.id as string, d.id as string);
    }
  }

  return {
    result: {
      onlyNeon,
      onlyDev: devRows.filter(
        (d) => !neonByGcId.has(d.gamersclub_id as string),
      ),
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function compareSeasons(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; idMap: Map<string, string> }> {
  const neonRows = await sql(
    src,
    `SELECT id, name, "startDate", "endDate", status FROM "Season"`,
  );
  const devRows = await sql(
    tgt,
    `SELECT id, name, "startDate", "endDate", status FROM "Season"`,
  );

  const devByName = new Map(devRows.map((r) => [r.name as string, r]));
  const neonByName = new Map(neonRows.map((r) => [r.name as string, r]));
  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];
  const conflicts: CompareResult<Row>["conflicts"] = [];

  for (const n of neonRows) {
    const d = devByName.get(n.name as string);
    if (!d) {
      onlyNeon.push(n);
      idMap.set(n.id as string, n.id as string);
    } else {
      idMap.set(n.id as string, d.id as string);
      const nStart = new Date(n.startDate as string).toISOString().slice(0, 10);
      const dStart = new Date(d.startDate as string).toISOString().slice(0, 10);
      if (nStart !== dStart) {
        conflicts.push({ neon: n, dev: d, fields: ["startDate"] });
      }
    }
  }

  return {
    result: {
      onlyNeon,
      onlyDev: devRows.filter((d) => !neonByName.has(d.name as string)),
      conflicts,
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function compareSessions(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; idMap: Map<string, string> }> {
  const neonRows = await sql(src, `SELECT id, name, date FROM "Session"`);
  const devRows = await sql(tgt, `SELECT id, name, date FROM "Session"`);

  const sessionKey = (r: Row) =>
    `${r.name}__${new Date(r.date as string).toISOString().slice(0, 10)}`;

  const devByKey = new Map(devRows.map((r) => [sessionKey(r), r]));
  const neonByKey = new Map(neonRows.map((r) => [sessionKey(r), r]));
  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];

  for (const n of neonRows) {
    const d = devByKey.get(sessionKey(n));
    if (!d) {
      onlyNeon.push(n);
      idMap.set(n.id as string, n.id as string);
    } else {
      idMap.set(n.id as string, d.id as string);
    }
  }

  return {
    result: {
      onlyNeon,
      onlyDev: devRows.filter((d) => !neonByKey.has(sessionKey(d))),
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
  };
}

async function compareMatches(
  src: Client,
  tgt: Client,
  sessionIdMap: Map<string, string>,
  mapIdMap: Map<string, string>,
  seasonIdMap: Map<string, string>,
): Promise<{
  result: CompareResult<Row>;
  idMap: Map<string, string>;
  newMatchGcIds: Set<string>; // gamersClubMatchId das partidas novas
}> {
  const neonRows = await sql(
    src,
    `SELECT id, "sessionId", "mapId", "gamersClubMatchId", "playedAt",
            "scoreTeamA", "scoreTeamB", "durationSeconds", "demoUrl",
            "trackedPlayersCount", "seasonId"
     FROM "Match"`,
  );
  const devRows = await sql(
    tgt,
    `SELECT id, "gamersClubMatchId" FROM "Match"`,
  );

  const devByGcId = new Map(
    devRows
      .filter((r) => r.gamersClubMatchId)
      .map((r) => [r.gamersClubMatchId as string, r]),
  );
  const neonByGcId = new Map(
    neonRows
      .filter((r) => r.gamersClubMatchId)
      .map((r) => [r.gamersClubMatchId as string, r]),
  );

  const idMap = new Map<string, string>();
  const onlyNeon: Row[] = [];
  const newMatchGcIds = new Set<string>();

  for (const n of neonRows) {
    const gcId = n.gamersClubMatchId as string | null;
    const d = gcId ? devByGcId.get(gcId) : undefined;

    if (!d) {
      // Resolve FKs via ID maps
      const resolvedSessionId = n.sessionId
        ? (sessionIdMap.get(n.sessionId as string) ?? n.sessionId)
        : n.sessionId;
      const resolvedMapId = n.mapId
        ? (mapIdMap.get(n.mapId as string) ?? n.mapId)
        : n.mapId;
      const resolvedSeasonId = n.seasonId
        ? (seasonIdMap.get(n.seasonId as string) ?? null)
        : null;

      onlyNeon.push({
        ...n,
        sessionId: resolvedSessionId,
        mapId: resolvedMapId,
        seasonId: resolvedSeasonId,
      });
      idMap.set(n.id as string, n.id as string);
      if (gcId) newMatchGcIds.add(gcId);
    } else {
      idMap.set(n.id as string, d.id as string);
    }
  }

  const onlyDev = devRows.filter(
    (d) =>
      d.gamersClubMatchId && !neonByGcId.has(d.gamersClubMatchId as string),
  );

  return {
    result: {
      onlyNeon,
      onlyDev,
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    idMap,
    newMatchGcIds,
  };
}

async function comparePlayerMatchStats(
  src: Client,
  tgt: Client,
  matchIdMap: Map<string, string>,
  playerIdMap: Map<string, string>,
  newMatchNeonIds: Set<string>, // ids no Neon das partidas novas
): Promise<{ result: CompareResult<Row>; rowsToInsert: Row[] }> {
  // Conta total em cada banco
  const [neonCount] = await sql<{ count: string }>(
    src,
    `SELECT COUNT(*)::text as count FROM "PlayerMatchStats"`,
  );
  const [devCount] = await sql<{ count: string }>(
    tgt,
    `SELECT COUNT(*)::text as count FROM "PlayerMatchStats"`,
  );

  // Carrega somente stats das partidas novas
  let rowsToInsert: Row[] = [];

  if (newMatchNeonIds.size > 0) {
    const ids = Array.from(newMatchNeonIds)
      .map((id) => `'${id}'`)
      .join(",");

    const stats = await sql(
      src,
      `SELECT * FROM "PlayerMatchStats" WHERE "matchId" IN (${ids})`,
    );

    rowsToInsert = stats.map((s) => ({
      ...s,
      matchId: matchIdMap.get(s.matchId as string) ?? s.matchId,
      playerId: playerIdMap.get(s.playerId as string) ?? s.playerId,
    }));
  }

  return {
    result: {
      onlyNeon: rowsToInsert,
      onlyDev: [],
      conflicts: [],
      neonTotal: parseInt(neonCount?.count ?? "0"),
      devTotal: parseInt(devCount?.count ?? "0"),
    },
    rowsToInsert,
  };
}

async function compareRivalries(
  src: Client,
  tgt: Client,
  playerIdMap: Map<string, string>,
  seasonIdMap: Map<string, string>,
): Promise<{ result: CompareResult<Row>; rowsToInsert: Row[] }> {
  const neonRows = await sql(
    src,
    `SELECT id, "playerAId", "playerBId", "seasonId",
            "killsAOnB", "killsBOnA", "matchesTogether", "matchesAgainst"
     FROM "Rivalry"`,
  );
  const devRows = await sql(
    tgt,
    `SELECT "playerAId", "playerBId", "seasonId" FROM "Rivalry"`,
  );

  // Natural key: (devPlayerAId, devPlayerBId, devSeasonId)
  const devKeySet = new Set(
    devRows.map(
      (r) =>
        `${r.playerAId}__${r.playerBId}__${r.seasonId ?? "null"}`,
    ),
  );

  const rowsToInsert: Row[] = [];

  for (const n of neonRows) {
    const devPA = playerIdMap.get(n.playerAId as string) ?? n.playerAId;
    const devPB = playerIdMap.get(n.playerBId as string) ?? n.playerBId;
    const devSeason = n.seasonId
      ? (seasonIdMap.get(n.seasonId as string) ?? null)
      : null;
    const key = `${devPA}__${devPB}__${devSeason ?? "null"}`;

    if (!devKeySet.has(key)) {
      rowsToInsert.push({
        ...n,
        playerAId: devPA,
        playerBId: devPB,
        seasonId: devSeason,
      });
    }
  }

  return {
    result: {
      onlyNeon: rowsToInsert,
      onlyDev: [],
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    rowsToInsert,
  };
}

async function compareSyncJobs(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; rowsToInsert: Row[] }> {
  const neonRows = await sql(
    src,
    `SELECT * FROM sync_jobs`,
  );
  const devRows = await sql(tgt, `SELECT "sourceMatchId" FROM sync_jobs`);
  const devSourceIds = new Set(devRows.map((r) => r.sourceMatchId as string));

  const rowsToInsert = neonRows.filter(
    (r) => !devSourceIds.has(r.sourceMatchId as string),
  );

  return {
    result: {
      onlyNeon: rowsToInsert,
      onlyDev: [],
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    rowsToInsert,
  };
}

async function compareMatchPayloads(
  src: Client,
  tgt: Client,
): Promise<{ result: CompareResult<Row>; rowsToInsert: Row[] }> {
  const neonRows = await sql(src, `SELECT * FROM match_payloads`);
  const devRows = await sql(
    tgt,
    `SELECT source, "sourceMatchId" FROM match_payloads`,
  );
  const devKeySet = new Set(
    devRows.map((r) => `${r.source}__${r.sourceMatchId}`),
  );

  const rowsToInsert = neonRows.filter(
    (r) =>
      !devKeySet.has(`${r.source as string}__${r.sourceMatchId as string}`),
  );

  return {
    result: {
      onlyNeon: rowsToInsert,
      onlyDev: [],
      conflicts: [],
      neonTotal: neonRows.length,
      devTotal: devRows.length,
    },
    rowsToInsert,
  };
}

async function comparePlayerAchievements(
  src: Client,
  tgt: Client,
  playerIdMap: Map<string, string>,
  achievementIdMap: Map<string, string>,
  matchIdMap: Map<string, string>,
  newMatchNeonIds: Set<string>,
): Promise<{ result: CompareResult<Row>; rowsToInsert: Row[] }> {
  // Para simplificar: importa apenas conquistas de partidas novas
  let rowsToInsert: Row[] = [];
  let neonTotal = 0;

  const [nc] = await sql<{ count: string }>(
    src,
    `SELECT COUNT(*)::text as count FROM "PlayerAchievement"`,
  );
  const [dc] = await sql<{ count: string }>(
    tgt,
    `SELECT COUNT(*)::text as count FROM "PlayerAchievement"`,
  );
  neonTotal = parseInt(nc?.count ?? "0");

  if (newMatchNeonIds.size > 0) {
    const ids = Array.from(newMatchNeonIds)
      .map((id) => `'${id}'`)
      .join(",");
    const rows = await sql(
      src,
      `SELECT * FROM "PlayerAchievement" WHERE "matchId" IN (${ids})`,
    );
    rowsToInsert = rows.map((r) => ({
      ...r,
      playerId: playerIdMap.get(r.playerId as string) ?? r.playerId,
      achievementId:
        achievementIdMap.get(r.achievementId as string) ?? r.achievementId,
      matchId: matchIdMap.get(r.matchId as string) ?? r.matchId,
    }));
  }

  return {
    result: {
      onlyNeon: rowsToInsert,
      onlyDev: [],
      conflicts: [],
      neonTotal,
      devTotal: parseInt(dc?.count ?? "0"),
    },
    rowsToInsert,
  };
}

// ── Funções de importação por lote ───────────────────────────────────────────

async function insertBatch(
  tgt: Client,
  tableName: string, // nome da tabela SQL (com aspas se necessário)
  modelName: string, // nome do modelo Prisma (camelCase)
  rows: Row[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const api = (tgt as unknown as ModelApi)[modelName];
  if (!api) {
    console.warn(`    ⚠ Modelo "${modelName}" não encontrado no cliente Prisma. Pulando.`);
    return 0;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      await api.createMany({ data: batch, skipDuplicates: true });
      inserted += batch.length;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`    ⚠ Erro ao inserir batch de "${modelName}": ${msg.slice(0, 120)}`);
    }
  }
  return inserted;
}

// ── Importação de sub-registros de partidas novas ────────────────────────────

async function importMatchSubRecords(
  src: Client,
  tgt: Client,
  newMatchNeonIds: Set<string>,
  matchIdMap: Map<string, string>,
  playerIdMap: Map<string, string>,
  dryRun: boolean,
): Promise<{
  matchups: number;
  clutches: number;
  entryDuels: number;
  tradeEvents: number;
}> {
  const counts = { matchups: 0, clutches: 0, entryDuels: 0, tradeEvents: 0 };
  if (newMatchNeonIds.size === 0) return counts;

  const ids = Array.from(newMatchNeonIds)
    .map((id) => `'${id}'`)
    .join(",");

  const resolveMatch = (r: Row) => ({
    ...r,
    matchId: matchIdMap.get(r.matchId as string) ?? r.matchId,
  });
  const resolveMatchPlayer = (r: Row) => ({
    ...r,
    matchId: matchIdMap.get(r.matchId as string) ?? r.matchId,
    playerId: playerIdMap.get(r.playerId as string) ?? r.playerId,
  });

  // PlayerMatchup
  const matchups = await sql(
    src,
    `SELECT * FROM "PlayerMatchup" WHERE "matchId" IN (${ids})`,
  );
  const matchupsResolved = matchups.map((r) => ({
    ...resolveMatch(r),
    killerId: playerIdMap.get(r.killerId as string) ?? r.killerId,
    victimId: playerIdMap.get(r.victimId as string) ?? r.victimId,
  }));

  // PlayerClutch
  const clutches = await sql(
    src,
    `SELECT * FROM "PlayerClutch" WHERE "matchId" IN (${ids})`,
  );
  const clutchesResolved = clutches.map(resolveMatchPlayer);

  // PlayerEntryDuel
  const entryDuels = await sql(
    src,
    `SELECT * FROM "PlayerEntryDuel" WHERE "matchId" IN (${ids})`,
  );
  const entryDuelsResolved = entryDuels.map((r) => ({
    ...resolveMatchPlayer(r),
    opponentId: r.opponentId
      ? (playerIdMap.get(r.opponentId as string) ?? r.opponentId)
      : null,
  }));

  // PlayerTradeEvent
  const tradeEvents = await sql(
    src,
    `SELECT * FROM "PlayerTradeEvent" WHERE "matchId" IN (${ids})`,
  );
  const tradeEventsResolved = tradeEvents.map((r) => ({
    ...resolveMatch(r),
    victimId: playerIdMap.get(r.victimId as string) ?? r.victimId,
    traderId: playerIdMap.get(r.traderId as string) ?? r.traderId,
  }));

  if (dryRun) {
    counts.matchups = matchupsResolved.length;
    counts.clutches = clutchesResolved.length;
    counts.entryDuels = entryDuelsResolved.length;
    counts.tradeEvents = tradeEventsResolved.length;
  } else {
    counts.matchups = await insertBatch(tgt, "PlayerMatchup", "playerMatchup", matchupsResolved);
    counts.clutches = await insertBatch(tgt, "PlayerClutch", "playerClutch", clutchesResolved);
    counts.entryDuels = await insertBatch(tgt, "PlayerEntryDuel", "playerEntryDuel", entryDuelsResolved);
    counts.tradeEvents = await insertBatch(tgt, "PlayerTradeEvent", "playerTradeEvent", tradeEventsResolved);
  }

  return counts;
}

// ── Relatório por temporada ───────────────────────────────────────────────────

async function reportBySeason(src: Client, tgt: Client) {
  header("HISTÓRICO POR TEMPORADA");

  const neonSeasons = await sql<{ id: string; name: string }>(
    src,
    `SELECT id, name FROM "Season" ORDER BY "startDate"`,
  );
  const devSeasons = await sql<{ id: string; name: string }>(
    tgt,
    `SELECT id, name FROM "Season" ORDER BY "startDate"`,
  );

  // Mapeia name → id para cada banco
  const neonSeasonIdByName = new Map(
    neonSeasons.map((s) => [s.name, s.id]),
  );
  const devSeasonIdByName = new Map(devSeasons.map((s) => [s.name, s.id]));

  const allNames = new Set([
    ...neonSeasons.map((s) => s.name),
    ...devSeasons.map((s) => s.name),
  ]);

  console.log(
    `\n  ${pad("Temporada", 25)} ${rpad("Neon", 6)} ${rpad("DEV", 6)} ${rpad("Só Neon", 8)} ${rpad("Só DEV", 7)}`,
  );
  console.log(`  ${"─".repeat(60)}`);

  for (const name of allNames) {
    const neonId = neonSeasonIdByName.get(name);
    const devId = devSeasonIdByName.get(name);

    const [neonCnt] = neonId
      ? await sql<{ count: string }>(
          src,
          `SELECT COUNT(*)::text as count FROM "Match" WHERE "seasonId" = '${neonId}'`,
        )
      : [{ count: "0" }];

    const [devCnt] = devId
      ? await sql<{ count: string }>(
          tgt,
          `SELECT COUNT(*)::text as count FROM "Match" WHERE "seasonId" = '${devId}'`,
        )
      : [{ count: "0" }];

    const neonN = parseInt(neonCnt?.count ?? "0");
    const devN = parseInt(devCnt?.count ?? "0");

    // Partidas só no Neon: por gamersClubMatchId
    let onlyNeonN = 0;
    let onlyDevN = 0;

    if (neonId && devId) {
      const [onlyNeonCnt] = await sql<{ count: string }>(
        src,
        `SELECT COUNT(*)::text as count FROM "Match" m
         WHERE m."seasonId" = '${neonId}'
           AND m."gamersClubMatchId" IS NOT NULL
           AND m."gamersClubMatchId" NOT IN (
             SELECT "gamersClubMatchId" FROM "Match"
             WHERE "gamersClubMatchId" IS NOT NULL
           )`,
      );
      // Simplificado: diferença de contagens como proxy
      onlyNeonN = Math.max(0, neonN - devN);
      onlyDevN = Math.max(0, devN - neonN);
      void onlyNeonCnt; // será usado abaixo por nome real
    } else if (neonId && !devId) {
      onlyNeonN = neonN;
    } else if (!neonId && devId) {
      onlyDevN = devN;
    }

    console.log(
      `  ${pad(name, 25)} ${rpad(neonId ? neonN : "—", 6)} ${rpad(devId ? devN : "—", 6)} ${rpad(onlyNeonN || "—", 8)} ${rpad(onlyDevN || "—", 7)}`,
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl)
    throw new Error(
      "SOURCE_DATABASE_URL não está definida.\n" +
        "  Copie .env.neon-sync.example → .env.neon-sync e preencha a URL.",
    );
  if (!targetUrl)
    throw new Error("DATABASE_URL não está definida (DEV Docker target).");

  requirePostgres(sourceUrl, "SOURCE_DATABASE_URL");
  requirePostgres(targetUrl, "DATABASE_URL");
  requireDevTarget(targetUrl);
  requireDifferentHosts(sourceUrl, targetUrl);

  console.log("\n  ╔══════════════════════════════════════════════════════════╗");
  console.log(
    `  ║  Neon → DEV  ${DRY_RUN ? "DRY RUN" : "IMPORTAÇÃO REAL"}${" ".repeat(DRY_RUN ? 31 : 28)}║`,
  );
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  Source (Neon): ${redact(sourceUrl)}`);
  console.log(`  Target (DEV):  ${redact(targetUrl)}`);
  console.log(
    DRY_RUN
      ? "  Modo: DRY RUN — nenhum dado será alterado.\n"
      : "  Modo: IMPORTAÇÃO REAL — registros faltantes serão inseridos.\n",
  );

  const src = makeClient(sourceUrl);
  const tgt = makeClient(targetUrl);

  try {
    // ── Fase 1: Comparação ──────────────────────────────────────────────────

    header("COMPARAÇÃO DE ENTIDADES");
    console.log(
      `\n  ${pad("Modelo", 22)} ${rpad("Neon", 6)} ${rpad("DEV", 6)} ${rpad("Só Neon", 10)} ${rpad("Só DEV", 8)} ${rpad("Conflitos", 9)}`,
    );
    console.log(`  ${"─".repeat(75)}`);

    // Map
    const { result: mapResult, idMap: mapIdMap } = await compareMaps(src, tgt);
    row("Map", mapResult.neonTotal, mapResult.devTotal, mapResult.onlyNeon.length, mapResult.onlyDev.length, mapResult.conflicts.length);

    // Achievement
    const { result: achieveResult, idMap: achieveIdMap } = await compareAchievements(src, tgt);
    row("Achievement", achieveResult.neonTotal, achieveResult.devTotal, achieveResult.onlyNeon.length, achieveResult.onlyDev.length, achieveResult.conflicts.length);

    // Player
    const { result: playerResult, idMap: playerIdMap } = await comparePlayers(src, tgt);
    row("Player", playerResult.neonTotal, playerResult.devTotal, playerResult.onlyNeon.length, playerResult.onlyDev.length, playerResult.conflicts.length);

    // TrackedPlayer
    const { result: trackedResult, idMap: trackedIdMap } = await compareTrackedPlayers(src, tgt, playerIdMap);
    row("TrackedPlayer", trackedResult.neonTotal, trackedResult.devTotal, trackedResult.onlyNeon.length, trackedResult.onlyDev.length, trackedResult.conflicts.length);
    void trackedIdMap;

    // Season
    const { result: seasonResult, idMap: seasonIdMap } = await compareSeasons(src, tgt);
    row("Season", seasonResult.neonTotal, seasonResult.devTotal, seasonResult.onlyNeon.length, seasonResult.onlyDev.length, seasonResult.conflicts.length);

    // Session
    const { result: sessionResult, idMap: sessionIdMap } = await compareSessions(src, tgt);
    row("Session", sessionResult.neonTotal, sessionResult.devTotal, sessionResult.onlyNeon.length, sessionResult.onlyDev.length, sessionResult.conflicts.length);

    // Match
    const {
      result: matchResult,
      idMap: matchIdMap,
      newMatchGcIds,
    } = await compareMatches(src, tgt, sessionIdMap, mapIdMap, seasonIdMap);
    row("Match", matchResult.neonTotal, matchResult.devTotal, matchResult.onlyNeon.length, matchResult.onlyDev.length, matchResult.conflicts.length);

    // IDs internos das partidas novas no Neon (não GC IDs)
    const newMatchNeonIds = new Set(
      matchResult.onlyNeon.map((m) => {
        // o id original do Neon antes do mapeamento de FK
        // onlyNeon preserva o campo `id` do Neon pois matchIdMap os aponta para si mesmos
        return m.id as string;
      }),
    );

    // PlayerMatchStats
    const { result: statsResult } = await comparePlayerMatchStats(
      src, tgt, matchIdMap, playerIdMap, newMatchNeonIds,
    );
    row("PlayerMatchStats", statsResult.neonTotal, statsResult.devTotal, statsResult.onlyNeon.length, statsResult.onlyDev.length, statsResult.conflicts.length);

    // PlayerAchievement
    const { result: paResult, rowsToInsert: paRows } =
      await comparePlayerAchievements(
        src, tgt, playerIdMap, achieveIdMap, matchIdMap, newMatchNeonIds,
      );
    row("PlayerAchievement", paResult.neonTotal, paResult.devTotal, paResult.onlyNeon.length, paResult.onlyDev.length, paResult.conflicts.length);

    // Rivalry
    const { result: rivalryResult, rowsToInsert: rivalryRows } =
      await compareRivalries(src, tgt, playerIdMap, seasonIdMap);
    row("Rivalry", rivalryResult.neonTotal, rivalryResult.devTotal, rivalryResult.onlyNeon.length, rivalryResult.onlyDev.length, rivalryResult.conflicts.length);

    // SyncJob
    const { result: syncJobResult, rowsToInsert: syncJobRows } =
      await compareSyncJobs(src, tgt);
    row("SyncJob", syncJobResult.neonTotal, syncJobResult.devTotal, syncJobResult.onlyNeon.length, syncJobResult.onlyDev.length, syncJobResult.conflicts.length);

    // MatchPayload
    const { result: payloadResult, rowsToInsert: payloadRows } =
      await compareMatchPayloads(src, tgt);
    row("MatchPayload", payloadResult.neonTotal, payloadResult.devTotal, payloadResult.onlyNeon.length, payloadResult.onlyDev.length, payloadResult.conflicts.length);

    // Sub-records (contagem apenas para dry-run)
    const subCounts = await importMatchSubRecords(
      src, tgt, newMatchNeonIds, matchIdMap, playerIdMap, true, // dry-run para contagem
    );
    row("PlayerMatchup", subCounts.matchups, 0, subCounts.matchups, 0, 0);
    row("PlayerClutch", subCounts.clutches, 0, subCounts.clutches, 0, 0);
    row("PlayerEntryDuel", subCounts.entryDuels, 0, subCounts.entryDuels, 0, 0);
    row("PlayerTradeEvent", subCounts.tradeEvents, 0, subCounts.tradeEvents, 0, 0);

    // ── Relatório por temporada ─────────────────────────────────────────────

    await reportBySeason(src, tgt);

    // ── Conflitos de jogadores ──────────────────────────────────────────────

    if (playerResult.conflicts.length > 0) {
      header("CONFLITOS DE NICKNAME (jogador existe nos dois com nome diferente)");
      for (const c of playerResult.conflicts) {
        console.log(
          `  steamId: ${c.neon.steamId}\n    Neon: "${c.neon.nickname}"  DEV: "${c.dev.nickname}"`,
        );
      }
      console.log(
        "\n  Ação: o nickname do DEV será PRESERVADO (não será sobrescrito).",
      );
    }

    // ── Partidas somente no Neon ────────────────────────────────────────────

    if (newMatchGcIds.size > 0) {
      header(`PARTIDAS SOMENTE NO NEON (${newMatchGcIds.size} partidas)`);
      const gcIdList = Array.from(newMatchGcIds);
      gcIdList.slice(0, 50).forEach((id) => console.log(`  ${id}`));
      if (gcIdList.length > 50)
        console.log(`  ... e mais ${gcIdList.length - 50} partidas.`);
    }

    // ── Resumo do que seria importado ───────────────────────────────────────

    header("RESUMO DA IMPORTAÇÃO");

    const toImport = {
      Map: mapResult.onlyNeon.length,
      Achievement: achieveResult.onlyNeon.length,
      Player: playerResult.onlyNeon.length,
      TrackedPlayer: trackedResult.onlyNeon.length,
      Season: seasonResult.onlyNeon.length,
      Session: sessionResult.onlyNeon.length,
      Match: matchResult.onlyNeon.length,
      PlayerMatchStats: statsResult.onlyNeon.length,
      PlayerAchievement: paResult.onlyNeon.length,
      Rivalry: rivalryResult.onlyNeon.length,
      SyncJob: syncJobResult.onlyNeon.length,
      MatchPayload: payloadResult.onlyNeon.length,
      PlayerMatchup: subCounts.matchups,
      PlayerClutch: subCounts.clutches,
      PlayerEntryDuel: subCounts.entryDuels,
      PlayerTradeEvent: subCounts.tradeEvents,
    };

    const totalToImport = Object.values(toImport).reduce((a, b) => a + b, 0);

    for (const [model, count] of Object.entries(toImport)) {
      const prefix = count > 0 ? "+" : " ";
      console.log(`  ${prefix}${rpad(count, 6)}  ${model}`);
    }

    console.log(`\n  Total de registros a importar: ${totalToImport}`);

    if (DRY_RUN) {
      console.log(
        "\n  DRY RUN — nenhum dado foi alterado.",
      );
      console.log(
        "  Para importar, execute com DRY_RUN=false:\n",
      );
      console.log(
        "    npm run db:sync-from-neon:import\n",
      );
      return;
    }

    // ── Fase 2: Importação real ─────────────────────────────────────────────

    if (totalToImport === 0) {
      console.log("\n  ✓ Nenhum registro novo. DEV já está em dia com o Neon.");
      return;
    }

    header("IMPORTAÇÃO");

    let n: number;

    n = await insertBatch(tgt, "Map", "map", mapResult.onlyNeon);
    console.log(`  Map:               +${n}`);

    n = await insertBatch(tgt, "Achievement", "achievement", achieveResult.onlyNeon);
    console.log(`  Achievement:       +${n}`);

    n = await insertBatch(tgt, "Player", "player", playerResult.onlyNeon);
    console.log(`  Player:            +${n}`);

    n = await insertBatch(tgt, "TrackedPlayer", "trackedPlayer", trackedResult.onlyNeon);
    console.log(`  TrackedPlayer:     +${n}`);

    n = await insertBatch(tgt, "Season", "season", seasonResult.onlyNeon);
    console.log(`  Season:            +${n}`);

    n = await insertBatch(tgt, "Session", "session", sessionResult.onlyNeon);
    console.log(`  Session:           +${n}`);

    n = await insertBatch(tgt, "Match", "match", matchResult.onlyNeon);
    console.log(`  Match:             +${n}`);

    n = await insertBatch(tgt, "PlayerMatchStats", "playerMatchStats", statsResult.onlyNeon);
    console.log(`  PlayerMatchStats:  +${n}`);

    n = await insertBatch(tgt, "PlayerAchievement", "playerAchievement", paRows);
    console.log(`  PlayerAchievement: +${n}`);

    n = await insertBatch(tgt, "Rivalry", "rivalry", rivalryRows);
    console.log(`  Rivalry:           +${n}`);

    n = await insertBatch(tgt, "SyncJob", "syncJob", syncJobRows);
    console.log(`  SyncJob:           +${n}`);

    n = await insertBatch(tgt, "MatchPayload", "matchPayload", payloadRows);
    console.log(`  MatchPayload:      +${n}`);

    // Sub-records das partidas novas
    const realSubCounts = await importMatchSubRecords(
      src, tgt, newMatchNeonIds, matchIdMap, playerIdMap, false,
    );
    console.log(`  PlayerMatchup:     +${realSubCounts.matchups}`);
    console.log(`  PlayerClutch:      +${realSubCounts.clutches}`);
    console.log(`  PlayerEntryDuel:   +${realSubCounts.entryDuels}`);
    console.log(`  PlayerTradeEvent:  +${realSubCounts.tradeEvents}`);

    console.log("\n  ✓ Importação concluída.");
    console.log("  Execute a aplicação DEV e valide os dados nas páginas de:");
    console.log("    /dashboard  /players/[id]  /seasons  /matches");
  } finally {
    await src.$disconnect();
    await tgt.$disconnect();
  }
}

main().catch((err) => {
  console.error("\n  ✗ Falha:", err.message ?? err);
  process.exitCode = 1;
});
