import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const foodEntrySchema = z.object({
  name: z.string().min(1).max(200),
  servingSize: z.number().positive(),
  servingUnit: z.string().max(20).optional(),
  servings: z.number().positive().optional(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  // Allow nested food object (from store format)
  food: z.object({
    name: z.string().optional(),
    servingSize: z.number().optional(),
    servingUnit: z.string().optional(),
  }).optional(),
});

const mealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  photoUrl: z.string().nullable().optional(),
  aiAnalyzed: z.boolean().optional(),
  verified: z.boolean().optional(),
  foods: z.array(foodEntrySchema).min(1),
});

const saveMealSchema = z.object({
  meal: mealSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const deleteMealSchema = z.object({
  mealId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = saveMealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { meal, date } = parsed.data;

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
          create: meal.foods.map((f) => ({
            name: f.food?.name ?? f.name,
            servingSize: f.food?.servingSize ?? f.servingSize,
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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const meals = await prisma.mealEntry.findMany({
    where: { userId: session.userId, ...(date ? { date } : {}) },
    include: { foods: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ meals });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = deleteMealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "mealId requerido" }, { status: 400 });
    }

    await prisma.mealEntry.deleteMany({
      where: { id: parsed.data.mealId, userId: session.userId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
