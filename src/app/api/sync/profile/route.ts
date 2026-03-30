import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  gender: z.enum(["male", "female"]),
  age: z.number().int().min(10).max(120),
  height: z.number().min(50).max(300),
  weight: z.number().min(20).max(500),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  trainingLevel: z.enum(["beginner", "intermediate", "advanced"]),
  goalType: z.enum(["cut", "maintenance", "bulk"]),
  locale: z.enum(["es", "en"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const data = parsed.data;

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({ profile });
}
