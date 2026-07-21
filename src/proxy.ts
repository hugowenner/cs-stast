import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS para /api/sync/** — essas rotas recebem chamadas do content script do GC
 * Companion, que roda na origem de gamersclub.com.br/cs.gamersclub.gg, não na nossa.
 * A superfície de confiança já é "roda em localhost" (ver docs/COMPANION.md), então
 * liberar qualquer origem aqui não amplia a exposição real.
 */
export function proxy(request: NextRequest) {
  const response =
    request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return response;
}

export const config = {
  matcher: ["/api/sync/:path*"],
};
