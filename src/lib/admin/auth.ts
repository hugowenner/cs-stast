import { cookies } from "next/headers";
import { verifySession } from "./session";
import { ADMIN_COOKIE_NAME } from "./constants";
import { timingSafeEqualStrings } from "@/lib/sync-auth";

/**
 * Validates the admin password securely on the server side.
 */
export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.warn("ADMIN_PASSWORD environment variable is not defined.");
    return false;
  }
  
  return timingSafeEqualStrings(password, adminPassword);
}

/**
 * Helper to check if the current request is authenticated as admin in Route Handlers.
 */
export async function checkAdminAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!sessionToken) return false;

    const secret = process.env.ADMIN_PASSWORD || "";
    return verifySession(sessionToken, secret);
  } catch (e) {
    return false;
  }
}
