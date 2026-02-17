import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meal, date } = await req.json();

  const created = await prisma.mealEntry.create({
    data: {
      userId: session.userId,
      date,
      type: meal.type,
      name: meal.name,
      time: meal.time,
      photoUrl: meal.photoUrl ?? null,
      aiAnalyzed: meal.aiAnalyzed ?? false,
      verified: meal.verified ?? true,
      foods: {
        create: meal.foods.map((f: any) => ({
          name: f.food?.name ?? f.name,
          servingSize: f.food?.servingSize ?? f.servingSize ?? 100,
          servingUnit: f.food?.servingUnit ?? f.servingUnit ?? "g",
          servings: f.servings ?? 1,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber ?? 0,
        })),
      },
    },
    include: { foods: true },
  });

  return NextResponse.json({ success: true, meal: created });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const where: any = { userId: session.userId };
  if (date) where.date = date;

  const meals = await prisma.mealEntry.findMany({
    where,
    include: { foods: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ meals });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mealId } = await req.json();

  await prisma.mealEntry.deleteMany({
    where: { id: mealId, userId: session.userId },
  });

  return NextResponse.json({ success: true });
}
