import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_DURATION_MS } from "./constants";

/**
 * Sets the HttpOnly admin session cookie with configured security flags
 */
export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_MS / 1000,
  });
}

/**
 * Reads the admin session cookie value
 */
export async function getAdminSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value;
}

/**
 * Deletes the admin session cookie by setting its maxAge to 0
 */
export async function deleteAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    maxAge: 0,
    path: "/",
  });
}
