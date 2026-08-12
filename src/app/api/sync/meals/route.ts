import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The client can send foods in two formats:
// 1. Flat: { name, servingSize, servingUnit, servings, calories, protein, carbs, fat, fiber }
// 2. Nested: { food: { name, servingSize, servingUnit }, servings, calories, protein, carbs, fat, fiber }
const foodEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string().max(200).optional(),
  servingSize: z.number().optional(),
  servingUnit: z.string().max(20).optional(),
  servings: z.number().positive().optional(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  food: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      servingSize: z.number().optional(),
      servingUnit: z.string().optional(),
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
      fiber: z.number().optional(),
    })
    .optional(),
});

const mealSchema = z.object({
  // ID generado por el cliente (uuid). Permite deduplicar por identidad en vez
  // de por contenido: un POST repetido con el mismo id no crea duplicados.
  id: z.string().min(8).max(64).optional(),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  photoUrl: z.string().max(2097152).nullable().optional(), // 2MB base64 cap (~1.5MB image)
  aiAnalyzed: z.boolean().optional(),
  verified: z.boolean().optional(),
  foods: z.array(foodEntrySchema).min(1),
});

const saveMealSchema = z.object({
  meal: mealSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateMealSchema = z.object({
  mealId: z.string().min(1),
  meal: z.object({
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    name: z.string().min(1).max(200).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    verified: z.boolean().optional(),
    foods: z.array(foodEntrySchema).min(1),
  }),
});

const deleteMealSchema = z.object({
  mealId: z.string().min(1),
});

// Las respuestas nunca incluyen photoUrl: los data-URI base64 (hasta 2MB por
// comida) inflan el payload del sync y reventaban la cuota de localStorage.
const MEAL_SELECT = {
  id: true,
  date: true,
  type: true,
  name: true,
  time: true,
  aiAnalyzed: true,
  verified: true,
  deletedAt: true,
  foods: true,
} as const;

function foodCreateData(f: z.infer<typeof foodEntrySchema>) {
  return {
    name: f.food?.name ?? f.name ?? "Alimento",
    servingSize: f.food?.servingSize ?? f.servingSize ?? 100,
    servingUnit: f.food?.servingUnit ?? f.servingUnit ?? "g",
    servings: f.servings ?? 1,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber ?? 0,
  };
}

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

    // Idempotencia por id: si ya existe una comida con este id, no duplicar.
    let clientId = meal.id;
    if (clientId) {
      const existing = await prisma.mealEntry.findUnique({
        where: { id: clientId },
        select: { ...MEAL_SELECT, userId: true },
      });
      if (existing) {
        if (existing.userId === session.userId) {
          const { userId: _userId, ...rest } = existing;
          return NextResponse.json({ success: true, meal: rest, existed: true });
        }
        // Colisión de id con otro usuario (extremadamente improbable con uuid):
        // crear con un id nuevo del servidor.
        clientId = undefined;
      }
    }

    const created = await prisma.mealEntry.create({
      data: {
        ...(clientId ? { id: clientId } : {}),
        userId: session.userId,
        date,
        type: meal.type,
        name: meal.name,
        time: meal.time,
        photoUrl: meal.photoUrl ?? null,
        aiAnalyzed: meal.aiAnalyzed ?? false,
        verified: meal.verified ?? true,
        foods: {
          create: meal.foods.map(foodCreateData),
        },
      },
      select: MEAL_SELECT,
    });

    return NextResponse.json({ success: true, meal: created });
  } catch (error) {
    console.error("[MEALS API] Error creating meal:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateMealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { mealId, meal } = parsed.data;

    const existing = await prisma.mealEntry.findFirst({
      where: { id: mealId, userId: session.userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });
    }

    // Reemplazo atómico de los alimentos + campos editados
    const [, updated] = await prisma.$transaction([
      prisma.foodEntry.deleteMany({ where: { mealId } }),
      prisma.mealEntry.update({
        where: { id: mealId },
        data: {
          ...(meal.type ? { type: meal.type } : {}),
          ...(meal.name ? { name: meal.name } : {}),
          ...(meal.time ? { time: meal.time } : {}),
          ...(meal.verified !== undefined ? { verified: meal.verified } : {}),
          foods: {
            create: meal.foods.map(foodCreateData),
          },
        },
        select: MEAL_SELECT,
      }),
    ]);

    return NextResponse.json({ success: true, meal: updated });
  } catch (error) {
    console.error("[MEALS API] Error updating meal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    // El sync pide también los tombstones (borrados lógicos) para no volver a
    // subir comidas que se eliminaron desde otro dispositivo.
    const includeDeleted = searchParams.get("includeDeleted") === "1";

    const meals = await prisma.mealEntry.findMany({
      where: {
        userId: session.userId,
        ...(date ? { date } : {}),
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      select: MEAL_SELECT,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ meals });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    // Borrado lógico (tombstone): la fila se conserva para que el sync de otros
    // dispositivos sepa que esta comida fue eliminada y no la re-suba.
    await prisma.mealEntry.updateMany({
      where: { id: parsed.data.mealId, userId: session.userId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
