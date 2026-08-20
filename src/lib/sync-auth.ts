import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Safely compares two strings in constant time to prevent timing attacks.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the `Authorization: Bearer <SYNC_SERVICE_TOKEN>` header for sync endpoints.
 * Returns null if authorized, or a 401 NextResponse if unauthorized.
 */
export function requireSyncAuth(request: Request): NextResponse | null {
  const syncToken = process.env.SYNC_SERVICE_TOKEN || process.env.ADMIN_SYNC_TOKEN;

  if (!syncToken) {
    console.warn("[SyncAuth] SYNC_SERVICE_TOKEN não configurado no servidor.");
    return NextResponse.json(
      { error: "Serviço de sincronização temporariamente indisponível (token não configurado)." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Token de autenticação ausente ou malformado." },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7).trim();
  if (!timingSafeEqualStrings(token, syncToken)) {
    return NextResponse.json(
      { error: "Token de autenticação de sincronização inválido." },
      { status: 401 }
    );
  }

  return null;
}
