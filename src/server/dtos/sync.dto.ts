import { z } from "zod";

export const matchTeamSchema = z.enum(["A", "B"]);

const clutchTierSchema = z.object({
  attempts: z.number().int().min(0).default(0),
  wins: z.number().int().min(0).default(0),
});

const killDetailSchema = z.object({
  victimSteamId: z.string().min(1),
  roundNumber: z.number().int().min(1),
});

export const syncPlayerMatchStatsSchema = z.object({
  steamId: z.string().min(1),
  gamersClubId: z.string().min(1).optional(),
  nickname: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  levelGc: z.number().int().min(1).max(21).optional(),
  team: matchTeamSchema,
  kills: z.number().int().min(0),
  deaths: z.number().int().min(0),
  assists: z.number().int().min(0),
  headshots: z.number().int().min(0),
  adr: z.number().min(0),
  kast: z.number().min(0).max(100),
  entryKills: z.number().int().min(0).default(0),
  entryDeaths: z.number().int().min(0).default(0),
  tradeKills: z.number().int().min(0).default(0),
  clutches: z
    .object({
      "1v1": clutchTierSchema.optional(),
      "1v2": clutchTierSchema.optional(),
      "1v3": clutchTierSchema.optional(),
      "1v4": clutchTierSchema.optional(),
      "1v5": clutchTierSchema.optional(),
    })
    .optional(),
  /** Opcional — quando presente, habilita rivalidades (head-to-head) e detecção de Ace/multi-kill. */
  killsDetail: z.array(killDetailSchema).optional(),
});

export const syncMatchSchema = z.object({
  matchId: z.string().min(1),
  map: z.string().min(1),
  playedAt: z.coerce.date(),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).default(0),
  players: z.array(syncPlayerMatchStatsSchema).min(1),
});

export type SyncMatchInput = z.infer<typeof syncMatchSchema>;

export const syncPlayerSchema = z.object({
  steamId: z.string().min(1),
  gamersClubId: z.string().min(1).optional(),
  nickname: z.string().min(1),
  avatarUrl: z.string().url().optional(),
});

export type SyncPlayerInput = z.infer<typeof syncPlayerSchema>;

export const syncSessionSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.coerce.date(),
});

export type SyncSessionInput = z.infer<typeof syncSessionSchema>;

export const syncPingSchema = z.object({
  version: z.string().min(1),
});

export type SyncPingInput = z.infer<typeof syncPingSchema>;

/**
 * Payload bruto de um provedor externo (ex: JSON de `{url-da-partida}/1` da Gamers
 * Club) — validado só como "é um objeto JSON", já que o formato exato é responsabilidade
 * do adapter do provedor (`src/server/adapters/**`), não desta camada.
 */
export const syncProviderMatchSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export type SyncProviderMatchInput = z.infer<typeof syncProviderMatchSchema>;
