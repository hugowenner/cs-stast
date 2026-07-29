import { NextResponse, after } from "next/server";
import * as matchService from "@/server/services/match.service";
import { syncMatchSchema, syncProviderMatchSchema } from "@/server/dtos/sync.dto";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";
import { HttpError, handleRouteError, parseJsonBody } from "@/server/http";
import { syncMissingAvatars } from "@/server/services/steam-profile.service";
import { isMaintenanceMode } from "@/server/services/season.service";

/**
 * Recebe o payload BRUTO de `{url-da-partida}/1` da Gamers Club (a extensão não
 * normaliza nada) e faz a conversão aqui, através do adapter testado em
 * `src/server/adapters/gamersclub/normalize.test.ts`. Mantém `/api/sync/match`
 * agnóstico de provedor — só este endpoint conhece o formato da GC.
 */
export async function POST(request: Request) {
  try {
    if (await isMaintenanceMode()) {
      return NextResponse.json(
        { error: "O sistema está passando por manutenção para virada de temporada. Por favor, tente novamente mais tarde." },
        { status: 503 }
      );
    }

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

    // Agenda o sync de avatares após a resposta ser enviada.
    // `after()` garante execução pós-resposta sem bloquear o cliente.
    // Só roda em partidas novas; partidas duplicadas já têm jogadores com avatar.
    if (result.status === "created") {
      after(() =>
        syncMissingAvatars().catch((err) =>
          console.error("[steam] syncMissingAvatars falhou:", err instanceof Error ? err.message : err),
        ),
      );
    }

    return NextResponse.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
