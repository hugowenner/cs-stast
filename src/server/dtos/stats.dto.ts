import { z } from "zod";

export const rankingQuerySchema = z.object({
  metric: z.enum(["rating", "adr", "kast", "impact", "elo"]).default("rating"),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export const timelineQuerySchema = z.object({
  playerId: z.string().min(1),
});
