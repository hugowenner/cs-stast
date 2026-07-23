import { prisma } from "@/server/db";

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function getSteamKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY não configurada.");
  return key;
}

// ─── Tipos Steam ──────────────────────────────────────────────────────────────

interface SteamSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
}

interface PlayerSummariesResponse {
  response: { players: SteamSummary[] };
}

interface VanityUrlResponse {
  response: { steamid?: string; success: number; message?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSteamId64(value: string): boolean {
  return /^\d{17}$/.test(value);
}

// ─── API Steam ────────────────────────────────────────────────────────────────

export async function resolveVanityUrl(vanity: string): Promise<string | null> {
  const key = getSteamKey();
  const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Steam ResolveVanityURL falhou: ${res.status}`);
  const data: VanityUrlResponse = await res.json();
  return data.response.success === 1 ? (data.response.steamid ?? null) : null;
}

export async function getPlayerSummaries(steamId64s: string[]): Promise<SteamSummary[]> {
  if (steamId64s.length === 0) return [];
  const key = getSteamKey();
  // Steam API aceita até 100 IDs por chamada
  const chunks: string[][] = [];
  for (let i = 0; i < steamId64s.length; i += 100) {
    chunks.push(steamId64s.slice(i, i + 100));
  }
  const results: SteamSummary[] = [];
  for (const chunk of chunks) {
    const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${chunk.join(",")}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Steam GetPlayerSummaries falhou: ${res.status}`);
    const data: PlayerSummariesResponse = await res.json();
    results.push(...data.response.players);
  }
  return results;
}

// ─── Sync de um jogador ───────────────────────────────────────────────────────

export async function syncPlayerSteamProfile(steamId: string): Promise<"synced" | "skipped" | "failed"> {
  try {
    let steamId64 = steamId;
    if (!isSteamId64(steamId64)) {
      const resolved = await resolveVanityUrl(steamId64);
      if (!resolved) return "failed";
      steamId64 = resolved;
    }

    const summaries = await getPlayerSummaries([steamId64]);
    const s = summaries[0];
    if (!s) return "failed";

    await prisma.player.update({
      where: { steamId },
      data: {
        avatarUrl: s.avatarfull,
        steamNickname: s.personaname,
        steamAvatarSmall: s.avatar,
        steamAvatarMedium: s.avatarmedium,
        steamAvatarFull: s.avatarfull,
        steamProfileUrl: s.profileurl,
        steamLastSync: new Date(),
      },
    });

    return "synced";
  } catch {
    return "failed";
  }
}

// ─── Sync em lote de todos os tracked players ─────────────────────────────────

export interface SteamSyncResult {
  synced: number;
  skipped: number;
  failed: number;
  players: { steamId: string; nickname: string; status: "synced" | "skipped" | "failed" }[];
}

export async function syncAllTrackedPlayers(force = false): Promise<SteamSyncResult> {
  const players = await prisma.player.findMany({
    where: { trackedPlayer: { active: true } },
    select: { id: true, steamId: true, nickname: true, steamLastSync: true },
  });

  const result: SteamSyncResult = { synced: 0, skipped: 0, failed: 0, players: [] };

  // Separar quem precisa de update vs quem está em cache
  const needsSync = players.filter((p) => {
    if (force) return true;
    if (!p.steamLastSync) return true;
    return Date.now() - p.steamLastSync.getTime() > STEAM_CACHE_TTL_MS;
  });

  const skipped = players.filter((p) => !needsSync.includes(p));
  result.skipped = skipped.length;
  for (const p of skipped) {
    result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "skipped" });
  }

  if (needsSync.length === 0) return result;

  // Buscar todos de uma vez em batch
  const validIds = needsSync.filter((p) => isSteamId64(p.steamId)).map((p) => p.steamId);
  const vanityPlayers = needsSync.filter((p) => !isSteamId64(p.steamId));

  // Resolver vanity URLs (um por um — raridade)
  const resolvedIds: { steamId: string; id64: string }[] = [];
  for (const p of vanityPlayers) {
    try {
      const id64 = await resolveVanityUrl(p.steamId);
      if (id64) resolvedIds.push({ steamId: p.steamId, id64 });
      else {
        result.failed++;
        result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
      }
    } catch {
      result.failed++;
      result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
    }
  }

  // Batch GetPlayerSummaries para SteamID64s diretos + resolvidos
  const allIds64 = [...validIds, ...resolvedIds.map((r) => r.id64)];
  let summaries: SteamSummary[] = [];
  try {
    summaries = await getPlayerSummaries(allIds64);
  } catch {
    // Se o batch falhar, marcar todos como failed
    for (const p of needsSync) {
      if (!result.players.find((x) => x.steamId === p.steamId)) {
        result.failed++;
        result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
      }
    }
    return result;
  }

  // Mapear por steamid
  const summaryMap = new Map(summaries.map((s) => [s.steamid, s]));

  // Atualizar banco para cada jogador que precisa de sync
  for (const p of needsSync) {
    if (result.players.find((x) => x.steamId === p.steamId)) continue; // já marcado como failed

    const id64 =
      isSteamId64(p.steamId)
        ? p.steamId
        : resolvedIds.find((r) => r.steamId === p.steamId)?.id64;

    if (!id64) {
      result.failed++;
      result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
      continue;
    }

    const s = summaryMap.get(id64);
    if (!s) {
      result.failed++;
      result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
      continue;
    }

    try {
      await prisma.player.update({
        where: { id: p.id },
        data: {
          avatarUrl: s.avatarfull,
          steamNickname: s.personaname,
          steamAvatarSmall: s.avatar,
          steamAvatarMedium: s.avatarmedium,
          steamAvatarFull: s.avatarfull,
          steamProfileUrl: s.profileurl,
          steamLastSync: new Date(),
        },
      });
      result.synced++;
      result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "synced" });
    } catch {
      result.failed++;
      result.players.push({ steamId: p.steamId, nickname: p.nickname, status: "failed" });
    }
  }

  return result;
}
