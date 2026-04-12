import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";

async function testAPICalls() {
  console.log("=== TEST DE API DE COMIDAS ===\n");

  // Primero, login para obtener cookie de sesión
  console.log("1. Intentando login...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "raulcetinap@gmail.com",
      password: "password123", // Ajusta si es diferente
    }),
  });

  console.log(`   Status login: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log(`   Respuesta:`, JSON.stringify(loginData, null, 2));

  if (!loginRes.ok) {
    console.log("\n❌ Login falló — no se puede probar API de comidas");
    return;
  }

  // Extraer cookies de la respuesta
  const cookies = loginRes.headers.get("set-cookie");
  console.log(`   Cookies:`, cookies ? "✓ Recibidas" : "✗ No hay cookies");

  // Verificar sesión
  console.log("\n2. Verificando sesión /api/auth/me...");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookies },
  });
  console.log(`   Status: ${meRes.status}`);
  const meData = await meRes.json();
  console.log(`   Usuario:`, JSON.stringify(meData, null, 2));

  // Obtener comidas actuales
  console.log("\n3. Obteniendo comidas del usuario...");
  const mealsRes = await fetch(`${BASE_URL}/api/sync/meals`, {
    headers: { Cookie: cookies },
  });
  console.log(`   Status: ${mealsRes.status}`);
  const mealsData = await mealsRes.json();
  console.log(`   Comidas actuales: ${mealsData.meals?.length || 0}`);

  // Intentar crear una comida de prueba
  console.log("\n4. Creando comida de prueba...");
  const testMeal = {
    meal: {
      type: "lunch",
      name: "Comida de Prueba API",
      time: "12:00",
      foods: [
        {
          name: "Pollo",
          servingSize: 100,
          servingUnit: "g",
          servings: 1,
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          fiber: 0,
        },
      ],
      photoUrl: null,
      aiAnalyzed: false,
      verified: true,
    },
    date: new Date().toISOString().split("T")[0],
  };

  const createRes = await fetch(`${BASE_URL}/api/sync/meals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify(testMeal),
  });

  console.log(`   Status: ${createRes.status}`);
  const createData = await createRes.json();
  console.log(`   Respuesta:`, JSON.stringify(createData, null, 2));

  // Verificar comidas después de crear
  console.log("\n5. Verificando comidas después de crear...");
  const mealsAfterRes = await fetch(`${BASE_URL}/api/sync/meals`, {
    headers: { Cookie: cookies },
  });
  const mealsAfterData = await mealsAfterRes.json();
  console.log(`   Comidas ahora: ${mealsAfterData.meals?.length || 0}`);

  console.log("\n=== FIN DEL TEST ===");
}

testAPICalls().catch(console.error);
