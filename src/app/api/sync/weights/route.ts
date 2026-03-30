import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  weight: z.number().min(20).max(500),
  movingAvg: z.number().min(20).max(500).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = weightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { date, weight, movingAvg } = parsed.data;

    const entry = await prisma.weightEntry.upsert({
      where: { userId_date: { userId: session.userId, date } },
      update: { weight, movingAvg: movingAvg ?? null },
      create: { userId: session.userId, date, weight, movingAvg: movingAvg ?? null },
    });

    return NextResponse.json({ success: true, entry });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weights = await prisma.weightEntry.findMany({
    where: { userId: session.userId },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ weights });
}
