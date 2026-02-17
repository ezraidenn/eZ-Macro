import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  const profile = await prisma.profile.upsert({
    where: { userId: session.userId },
    update: {
      name: data.name,
      gender: data.gender,
      age: data.age,
      height: data.height,
      weight: data.weight,
      activityLevel: data.activityLevel,
      trainingLevel: data.trainingLevel,
      goalType: data.goalType,
      locale: data.locale ?? "es",
      theme: data.theme ?? "dark",
    },
    create: {
      userId: session.userId,
      name: data.name,
      gender: data.gender ?? "male",
      age: data.age ?? 25,
      height: data.height ?? 175,
      weight: data.weight ?? 75,
      activityLevel: data.activityLevel ?? "moderate",
      trainingLevel: data.trainingLevel ?? "intermediate",
      goalType: data.goalType ?? "cut",
      locale: data.locale ?? "es",
      theme: data.theme ?? "dark",
    },
  });

  return NextResponse.json({ success: true, profile });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({ profile });
}
