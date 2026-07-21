import { NextResponse } from "next/server";
import * as matchService from "@/server/services/match.service";
import { syncMatchSchema, syncProviderMatchSchema } from "@/server/dtos/sync.dto";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";
import { HttpError, handleRouteError, parseJsonBody } from "@/server/http";

/**
 * Recebe o payload BRUTO de `{url-da-partida}/1` da Gamers Club (a extensão não
 * normaliza nada) e faz a conversão aqui, através do adapter testado em
 * `src/server/adapters/gamersclub/normalize.test.ts`. Mantém `/api/sync/match`
 * agnóstico de provedor — só este endpoint conhece o formato da GC.
 */
export async function POST(request: Request) {
  try {
    const { payload } = await parseJsonBody(request, syncProviderMatchSchema);

    const normalized = normalizeGamersClubMatch(payload as GamersClubMatchPayload);
    const parsed = syncMatchSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new HttpError(
        422,
        `Payload da Gamers Club não pôde ser normalizado: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }

    const result = await matchService.ingestMatchSync(parsed.data, {
      rawPayload: payload,
      source: "gamersclub",
    });
    return NextResponse.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
