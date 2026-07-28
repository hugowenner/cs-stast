import { NextRequest, NextResponse } from "next/server";
import { deleteAdminSessionCookie } from "@/lib/admin/cookies";

export async function POST(request: NextRequest) {
  // Clear the HttpOnly admin session cookie
  await deleteAdminSessionCookie();

  const response = NextResponse.json({ success: true });
  
  // Set Cache-Control headers to ensure the browser does not cache the authenticated state
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
