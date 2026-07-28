import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/admin/auth";
import { signSession } from "@/lib/admin/session";
import { setAdminSessionCookie } from "@/lib/admin/cookies";
import { ADMIN_SESSION_DURATION_MS } from "@/lib/admin/constants";

// Memory storage for simple rate limiting (runs per server node)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
  const now = Date.now();
  
  // Check if client is currently blocked
  const attempts = loginAttempts.get(ip);
  if (attempts && attempts.blockedUntil > now) {
    const timeLeft = Math.ceil((attempts.blockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Muitas tentativas. Bloqueado por mais ${timeLeft} segundos.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Senha não fornecida." },
        { status: 400 }
      );
    }

    const isValid = validateAdminPassword(password);

    if (isValid) {
      // Clear attempts on successful login
      loginAttempts.delete(ip);

      const expiry = Date.now() + ADMIN_SESSION_DURATION_MS;
      // Use the actual ADMIN_PASSWORD as secret key to sign HMAC
      const secret = process.env.ADMIN_PASSWORD || "";
      const token = await signSession(expiry, secret);
      
      await setAdminSessionCookie(token);

      return NextResponse.json({ success: true });
    } else {
      // Increment failed attempts counter
      const currentAttempts = attempts || { count: 0, blockedUntil: 0 };
      currentAttempts.count += 1;
      
      if (currentAttempts.count >= 5) {
        currentAttempts.blockedUntil = Date.now() + 30000; // Block for 30 seconds
        currentAttempts.count = 0; // Reset counter for after block expires
        loginAttempts.set(ip, currentAttempts);
        
        return NextResponse.json(
          { error: "Senha inválida. Limite de tentativas excedido. Bloqueado por 30 segundos." },
          { status: 401 }
        );
      }
      
      loginAttempts.set(ip, currentAttempts);
      const attemptsLeft = 5 - currentAttempts.count;
      
      return NextResponse.json(
        { error: `Senha inválida. Tentativas restantes: ${attemptsLeft}.` },
        { status: 401 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }
}
