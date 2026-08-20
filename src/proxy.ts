import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/admin/session";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { timingSafeEqualStrings } from "@/lib/sync-auth";

/**
 * Combined Proxy and Middleware logic for Next.js 16.
 * Manages CORS headers for GC Companion /api/sync/** and authentication for /admin/** and /api/admin/**.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. CORS for /api/sync/** — calls from GC Companion content script on gamersclub.com.br
  if (pathname.startsWith("/api/sync")) {
    const response =
      request.method === "OPTIONS"
        ? new NextResponse(null, { status: 204 })
        : NextResponse.next();

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  }

  // 2. Admin Authentication (/admin/** and /api/admin/**)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Exclude public login route
    if (pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const secret = process.env.ADMIN_PASSWORD || "";
    const isValidSession = sessionCookie ? await verifySession(sessionCookie, secret) : false;

    // Check Bearer token alternative for API routes (e.g. ADMIN_SYNC_TOKEN or SYNC_SERVICE_TOKEN)
    let isValidBearer = false;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const adminSyncToken = process.env.ADMIN_SYNC_TOKEN || process.env.SYNC_SERVICE_TOKEN;
      if (adminSyncToken && timingSafeEqualStrings(token, adminSyncToken)) {
        isValidBearer = true;
      }
    }

    const isAuthenticated = isValidSession || isValidBearer;

    if (pathname.startsWith("/api/admin")) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { success: false, message: "Acesso administrativo negado. Sessão ou token inválido." },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }

    // UI pages (/admin, /admin/dashboard, etc.)
    if (pathname === "/admin") {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/sync/:path*", "/admin/:path*", "/api/admin/:path*"],
};

