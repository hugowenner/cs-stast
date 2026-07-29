import { NextResponse, type NextRequest } from "next/server";
import * as teamBalanceService from "@/server/services/team-balance.service";
import { handleRouteError, parseQuery, parseJsonBody } from "@/server/http";
import { paginationSchema } from "@/server/dtos/common.dto";
import { z } from "zod";
import { mulberry32, parseSeed, generateSeed } from "@/lib/team-balance/rng";
import { generateTeams } from "@/lib/team-balance/balancer";

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

const createBalanceSchema = z.object({
  players: z.array(playerSchema).length(10),
  mode: z.enum(["RANDOM", "BALANCED"]),
  metric: z.enum(["LEVEL", "RATING", "ADR", "KD", "COMPOUND"]),
  seed: z.string().optional(),
});

// GET /api/team-balance/matches - Listar histórico paginado
export async function GET(request: NextRequest) {
  try {
    const { skip = 0, take = 20 } = parseQuery(request.nextUrl.searchParams, paginationSchema);
    const result = await teamBalanceService.getHistory(take, skip);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

// POST /api/team-balance/matches - Gerar e salvar novo balanceamento
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, createBalanceSchema);
    const { players, mode, metric, seed: inputSeed } = body;

    // 1. Validar se há jogadores sem campos obrigatórios
    for (const player of players) {
      if (player.rating === undefined || player.rating === null || isNaN(player.rating)) {
        return NextResponse.json(
          { success: false, error: `Jogador '${player.name}' está sem Rating.` },
          { status: 400 }
        );
      }
      if (player.levelGc === undefined || player.levelGc === null || isNaN(player.levelGc)) {
        return NextResponse.json(
          { success: false, error: `Jogador '${player.name}' está sem Nível GC.` },
          { status: 400 }
        );
      }
    }

    // 2. Gerar ou validar seed
    const seed = inputSeed || generateSeed();
    if (seed && !/^\d+$/.test(seed) && isNaN(Number(seed))) {
      return NextResponse.json(
        { success: false, error: "Seed inválida. A seed deve ser numérica." },
        { status: 400 }
      );
    }

    const seedNum = parseSeed(seed);
    const rng = mulberry32(seedNum);

    // 3. Gerar os times equilibrados
    let balanceResult;
    try {
      balanceResult = generateTeams(players, mode, metric, rng);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Erro no algoritmo de balanceamento." },
        { status: 400 }
      );
    }

    // 4. Salvar no banco de dados de forma relacional
    let savedMatch;
    try {
      savedMatch = await teamBalanceService.saveBalance({
        seed,
        mode,
        metric,
        difference: balanceResult.diff,
        ct: balanceResult.ct,
        tr: balanceResult.tr,
      });
    } catch (err: any) {
      console.error("Erro ao salvar balanceamento:", err);
      
      const errMsg = err.message || "";
      if (errMsg.includes("relation") && errMsg.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Tabela TeamBalanceMatch não encontrada. Migration pendente." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: "Erro ao salvar balanceamento no banco de dados." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: savedMatch,
      result: balanceResult,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
