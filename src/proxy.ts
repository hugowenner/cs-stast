import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/admin/session";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

/**
 * Combined Proxy and Middleware logic for Next.js 16.
 * Manages CORS headers for GC Companion /api/sync/** and authentication for /admin/**.
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
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return response;
  }

  // 2. Admin Authentication /admin/**
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const secret = process.env.ADMIN_PASSWORD || "";
    
    const isValid = sessionCookie ? await verifySession(sessionCookie, secret) : false;

    // Case 1: Trying to access the login page (/admin)
    if (pathname === "/admin") {
      if (isValid) {
        // Already logged in, redirect to dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      // Not logged in, let them access the login form
      return NextResponse.next();
    }

    // Case 2: Trying to access protected admin pages (/admin/dashboard, /admin/players, etc.)
    if (!isValid) {
      // No session or invalid session, redirect to login page
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/sync/:path*", "/admin/:path*"],
};
