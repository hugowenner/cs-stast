import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
}

/**
 * Extracts client IP from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Checks rate limit for a key (prefix + IP).
 * @param request HTTP Request object
 * @param prefix Category namespace (e.g. "admin-login", "coach-ai", "sync")
 * @param limit Maximum allowed requests within window
 * @param windowMs Window duration in milliseconds
 * @returns 429 NextResponse if limit exceeded, or null if request is permitted
 */
export function checkRateLimit(
  request: Request,
  prefix: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  let entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, entry);
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Muitas requisições. Por favor, aguarde antes de tentar novamente.",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
        },
      }
    );
  }

  return null;
}
