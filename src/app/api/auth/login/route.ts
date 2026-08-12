import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compare, hashSync } from "bcryptjs";
import { createToken, tokenCookieOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

// Hash dummy precomputado (una vez por cold start) para igualar el tiempo de
// respuesta cuando el email no existe y evitar enumeración por timing.
const DUMMY_HASH = hashSync("dummy-password-for-timing", 12);

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { email, password, rememberMe } = parsed.data;

    const ip = getClientIp(req);
    if (!checkRateLimit(`login:${ip}:${email.toLowerCase()}`, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 15 minutos." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    // Comparar siempre contra un hash (real o dummy) para no filtrar por timing
    const isValid = await compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken(user.id, rememberMe ?? false);
    const res = NextResponse.json({
      success: true,
      userId: user.id,
      hasProfile: !!user.profile,
    });
    res.cookies.set(tokenCookieOptions(token, rememberMe ?? false));
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
