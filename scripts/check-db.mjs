import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Dynamic import after dotenv is configured
const { prisma } = await import("../src/lib/prisma.js");

async function checkDatabase() {
  console.log("=== DIAGNÓSTICO DE BASE DE DATOS NEON ===\n");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Configurada" : "✗ No configurada");
  console.log();

  try {
    // 1. Verificar conexión
    console.log("1. Probando conexión...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ✓ Conexión exitosa a Neon PostgreSQL\n");

    // 2. Contar registros en cada tabla
    console.log("2. Conteo de registros por tabla:");
    const userCount = await prisma.user.count();
    console.log(`   - users: ${userCount}`);

    const profileCount = await prisma.profile.count();
    console.log(`   - profiles: ${profileCount}`);

    const mealCount = await prisma.mealEntry.count();
    console.log(`   - meal_entries: ${mealCount}`);

    const foodCount = await prisma.foodEntry.count();
    console.log(`   - food_entries: ${foodCount}`);

    const weightCount = await prisma.weightEntry.count();
    console.log(`   - weight_entries: ${weightCount}\n`);

    // 3. Mostrar usuarios
    if (userCount > 0) {
      console.log("3. Usuarios en la base de datos:");
      const users = await prisma.user.findMany({
        select: { id: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      users.forEach((u) => {
        console.log(`   - ${u.email} (id: ${u.id}) - creado: ${u.createdAt}`);
      });
      console.log();

      // 4. Mostrar meals por usuario
      console.log("4. Comidas almacenadas por usuario:");
      for (const user of users) {
        const meals = await prisma.mealEntry.count({ where: { userId: user.id } });
        const weights = await prisma.weightEntry.count({ where: { userId: user.id } });
        console.log(`   - ${user.email}: ${meals} comidas, ${weights} pesos`);
      }
      console.log();

      // 5. Mostrar últimas 5 comidas
      if (mealCount > 0) {
        console.log("5. Últimas 5 comidas guardadas:");
        const recentMeals = await prisma.mealEntry.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true } }, foods: true },
        });
        recentMeals.forEach((m) => {
          console.log(`   - [${m.date}] ${m.name} (${m.type}) - usuario: ${m.user?.email || "?"}`);
          console.log(`     Alimentos: ${m.foods.map((f) => f.name).join(", ") || "ninguno"}`);
        });
      }
    } else {
      console.log("⚠ No hay usuarios en la base de datos\n");
    }

    console.log("\n=== FIN DEL DIAGNÓSTICO ===");
  } catch (error) {
    console.error("\n❌ ERROR DE CONEXIÓN:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
