import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createToken, tokenCookieOptions } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const ip = getClientIp(req);
    if (!checkRateLimit(`register:${ip}`, MAX_REGISTRATIONS, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta conexión. Intenta más tarde." },
        { status: 429 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    const token = await createToken(user.id);
    const res = NextResponse.json({ success: true, userId: user.id });
    res.cookies.set(tokenCookieOptions(token));

    // Fire and forget — don't block registration if email fails
    sendWelcomeEmail(email).catch(() => {});

    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
