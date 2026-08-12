import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

/** El token se guarda hasheado: si la BD se filtra, los tokens no sirven. */
function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`forgot:${ip}`, MAX_REQUESTS, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomUUID();
      const expiry = new Date(Date.now() + TOKEN_EXPIRY_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashResetToken(token),
          passwordResetExpiry: expiry,
        },
      });

      // Fire and forget — don't expose email errors to the client.
      // El email lleva el token en claro; la BD solo guarda el hash.
      sendPasswordResetEmail(email, token).catch(() => {});
    }

    // Always return 200 — don't reveal whether the email exists
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
