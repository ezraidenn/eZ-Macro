import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compareSync, hashSync } from "bcryptjs";
import { createToken, tokenCookieOptions } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { email, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    // Constant-time comparison to prevent timing attacks
    const hashToCompare = user?.password ?? hashSync("dummy", 12);
    const isValid = compareSync(password, hashToCompare);

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
