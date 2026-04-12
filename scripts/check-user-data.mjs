import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { prisma } = await import("../src/lib/prisma.js");

async function checkUserData() {
  console.log("=== VERIFICACIÓN DE DATOS POR USUARIO ===\n");

  const email = process.argv[2] || "raulcetinap@gmail.com";

  try {
    // Buscar usuario por email
    console.log(`Buscando usuario: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        mealEntries: {
          include: { foods: true },
          orderBy: { createdAt: "desc" },
        },
        weightEntries: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!user) {
      console.log("❌ Usuario no encontrado");
      return;
    }

    console.log(`\n✓ Usuario encontrado:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Creado: ${user.createdAt}`);
    console.log(`  Perfil: ${user.profile ? "✓ Sí" : "✗ No"}`);

    console.log(`\n📊 Estadísticas:`);
    console.log(`  - Comidas totales: ${user.mealEntries.length}`);
    console.log(`  - Pesos registrados: ${user.weightEntries.length}`);

    if (user.mealEntries.length > 0) {
      console.log(`\n🍽 Últimas 10 comidas:`);
      user.mealEntries.slice(0, 10).forEach((m, i) => {
        console.log(`  ${i + 1}. [${m.date}] ${m.name} (${m.type})`);
        console.log(`     ID: ${m.id}`);
        console.log(`     Alimentos: ${m.foods.length}`);
        console.log(`     Creado: ${m.createdAt}`);
      });
    } else {
      console.log(`\n⚠ Este usuario NO tiene comidas guardadas en la base de datos`);
    }

    // Verificar si hay comidas huérfanas (sin usuario válido)
    console.log(`\n🔍 Verificando comidas huérfanas...`);
    const orphanMeals = await prisma.mealEntry.findMany({
      where: {
        userId: { not: user.id },
      },
      take: 5,
      include: { user: { select: { email: true } } },
    });
    console.log(`  Encontradas ${orphanMeals.length} comidas de otros usuarios en la muestra`);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();
