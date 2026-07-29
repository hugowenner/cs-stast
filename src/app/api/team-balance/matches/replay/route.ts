import { NextResponse } from "next/server";
import * as teamBalanceService from "@/server/services/team-balance.service";
import { handleRouteError, parseJsonBody } from "@/server/http";
import { z } from "zod";

const playerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  levelGc: z.coerce.number().int().min(1).max(21),
  rating: z.coerce.number().min(0),
  adr: z.coerce.number().min(0),
  kd: z.coerce.number().min(0),
  winrate: z.coerce.number().min(0).max(100),
  avatarUrl: z.string().nullable().optional(),
  role: z.string().optional(),
  guest: z.boolean().optional(),
});

const replaySchema = z.object({
  seed: z.string(),
  mode: z.enum(["RANDOM", "BALANCED"]),
  metric: z.enum(["LEVEL", "RATING", "ADR", "KD", "COMPOUND"]),
  players: z.array(playerSchema).length(10),
});

// POST /api/team-balance/matches/replay - Regerar balanceamento via seed
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, replaySchema);
    const { seed, mode, metric, players } = body;

    const balanceResult = await teamBalanceService.replayBalance({
      seed,
      mode,
      metric,
      players,
    });

    return NextResponse.json({
      success: true,
      result: balanceResult,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
