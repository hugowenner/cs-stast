import { z } from "zod";
import { matchTeamSchema } from "./sync.dto";

const clutchTierSchema = z.object({
  attempts: z.number().int().min(0).default(0),
  wins: z.number().int().min(0).default(0),
});

const killDetailSchema = z.object({
  victimSteamId: z.string().min(1),
  roundNumber: z.number().int().min(1),
});

export const parserPlayerMatchStatsSchema = z.object({
  steamId: z.string().min(1),
  nickname: z.string().min(1),
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
  clutchesWon: z.number().int().min(0).default(0).optional(),
  flashAssists: z.number().int().min(0).default(0).optional(),
  damage: z.number().int().min(0).optional(),
  doubleKills: z.number().int().min(0).optional(),
  tripleKills: z.number().int().min(0).optional(),
  quadKills: z.number().int().min(0).optional(),
  aces: z.number().int().min(0).optional(),
  clutches: z
    .object({
      "1v1": clutchTierSchema.optional(),
      "1v2": clutchTierSchema.optional(),
      "1v3": clutchTierSchema.optional(),
      "1v4": clutchTierSchema.optional(),
      "1v5": clutchTierSchema.optional(),
    })
    .optional(),
  killsDetail: z.array(killDetailSchema).optional(),
}).strict(); // strict() garante que não existam campos extras como levelGc ou gcRating

export const parserMatchSchema = z.object({
  matchId: z.string().min(1),
  map: z.string().min(1),
  playedAt: z.coerce.date(),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).default(0),
  demoUrl: z.string().url().or(z.string()).optional(),
  roundsJson: z.unknown().optional(),
  players: z.array(parserPlayerMatchStatsSchema).min(1),
}).strict();

export type ParserMatchInput = z.infer<typeof parserMatchSchema>;
export type ParserPlayerMatchStatsInput = z.infer<typeof parserPlayerMatchStatsSchema>;
