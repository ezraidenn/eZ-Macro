import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, weight, movingAvg } = await req.json();

  const entry = await prisma.weightEntry.upsert({
    where: { userId_date: { userId: session.userId, date } },
    update: { weight, movingAvg: movingAvg ?? null },
    create: { userId: session.userId, date, weight, movingAvg: movingAvg ?? null },
  });

  return NextResponse.json({ success: true, entry });
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
