import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { createToken, tokenCookieOptions } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = hashSync(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    const token = await createToken(user.id);
    const res = NextResponse.json({ success: true, userId: user.id });
    res.cookies.set(tokenCookieOptions(token));

    // Fire and forget — don't block registration if email fails
    sendWelcomeEmail(email).catch(() => {});

    return res;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
