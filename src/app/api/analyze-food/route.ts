import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/auth";

// Simple in-memory rate limiter: max 20 analyses per hour per user
// NOTE: Resets on cold starts in serverless environments (Vercel).
// For persistent rate limiting, use Redis/Upstash or Vercel KV.
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  // Purge stale entries to prevent unbounded memory growth
  if (rateLimitMap.size > 1000) {
    rateLimitMap.forEach((times, key) => {
      if (times.every((ts) => now - ts >= WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    });
  }
  return true;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un analista nutricional experto en estimación por imagen con precisión científica. Tu objetivo es minimizar el error de estimación usando metodología sistemática.

═══════════════════════════════════════════════════════════════════════════════
REGLA DE PRIORIDAD MÁXIMA — LEE ESTO PRIMERO:
═══════════════════════════════════════════════════════════════════════════════

Si el usuario proporciona información específica en su mensaje, esa información tiene
PRIORIDAD ABSOLUTA sobre cualquier estimación visual. Úsala directamente.

Ejemplos:
- "son 300g de pollo" → usa 300g exactos, no estimes visualmente
- "pedí el combo #3 del McDonald's" → usa valores conocidos de ese combo
- "con 2 cucharadas de aceite de oliva" → agrega exactamente 2 cdas (27g, 240 kcal)
- "sin piel" → usa valores sin piel aunque parezca que hay piel
- El contexto del usuario anula cualquier duda visual.

═══════════════════════════════════════════════════════════════════════════════
PROTOCOLO DE ANÁLISIS (ejecutar en orden):
═══════════════════════════════════════════════════════════════════════════════

PASO 1: DETECCIÓN DE REFERENCIAS DE ESCALA
Busca PRIMERO estos objetos de referencia (en orden de prioridad):
1. Lata de refresco (355ml, 12.3cm alto, 6.6cm diámetro)
2. Tarjeta (INE/crédito: 8.5×5.4cm)
3. Cubiertos completos (tenedor ~20cm, cuchara ~19cm)
4. Mano abierta (palma adulto promedio: 18-20cm largo, 8-10cm ancho)
5. Plato estándar (23-26cm diámetro para plato principal)
6. Botella de agua (500ml, 600ml, 1L - especificar)
7. Moneda (peso mexicano: 2.5cm diámetro)

Si NO hay referencia: usa heurísticas de porción estándar mexicana + REPORTA mayor incertidumbre.

PASO 2: IDENTIFICACIÓN DETALLADA DE ITEMS
Para CADA alimento visible, documenta:
- Nombre específico (ej: "pechuga de pollo asada CON PIEL", no solo "pollo")
- Señales visuales críticas:
  * ¿Tiene piel/pellejo? (pollo, pescado)
  * ¿Hay aceite/grasa visible? (brillo, charcos, empapado)
  * ¿Está empanizado/capeado?
  * ¿Hay queso/crema/mayonesa/aguacate visible?
  * ¿Es fritura? (totopos, papas fritas, chicharrón)
  * ¿Tiene hueso? (resta peso comestible)
  * Método de cocción (asado, frito, hervido, al vapor)
- Porción relativa al plato o referencia (ej: "ocupa 1/3 del plato", "equivale a 2 palmas")

**CLASIFICACIÓN ESPECIAL PARA POLLO/CARNE CON HUESO:**
Si detectas pollo/carne, clasifica el tipo de corte:
- cut_type: "breast" (pechuga), "leg_thigh" (muslo/pierna), "mixed_quarter" (cuarto mixto), "wings" (alitas), "unknown"
- bone_visible: true/false (¿se ve hueso claramente?)
- skin_visible: true/false (¿hay piel/brillo de grasa?)

Heurísticas visuales:
- Hueso largo + forma alargada → "leg_thigh" o "mixed_quarter"
- Bloque blanco uniforme sin hueso → "breast"
- Pieza grande con hueso + múltiples partes → "mixed_quarter"
- Piezas pequeñas con hueso → "wings"

Describe en 1 frase la evidencia visual (ej: "hueso visible en forma de muslo, piel dorada con brillo")

PASO 3: ESTIMACIÓN DE PORCIONES (CRÍTICO)
Para cada item:
- Peso estimado CENTRAL en gramos (tu mejor estimación)
- Rango mínimo-máximo (±20-30% si hay incertidumbre)
- Justificación breve (ej: "comparado con la lata, equivale a ~200g")

GUÍA DE PORCIONES ESTÁNDAR MÉXICO:
- Tortilla de maíz: 25-30g c/u (contar unidades visibles)
- Tortilla de harina: 40-50g c/u
- Pechuga de pollo: 120-180g (tamaño palma)
- Muslo/pierna pollo: 100-150g con hueso (60-90g sin hueso)
- Arroz cocido: 150-200g porción estándar (1 taza)
- Frijoles: 100-150g porción
- Aguacate: 1/4 = 50g, 1/2 = 100g, 1 entero = 200g

PASO 4: CÁLCULO DE MACROS POR ITEM
Usa valores de composición REALISTAS (no optimistas):

PROTEÍNAS ANIMALES (por 100g COMESTIBLE cocido):

**POLLO - FACTORES DE PESO COMESTIBLE:**
Si hay hueso visible, aplica factor de conversión PRIMERO:
- Pechuga con hueso: peso_comestible = peso_total × 0.75
- Muslo/pierna con hueso: peso_comestible = peso_total × 0.70
- Cuarto mixto con hueso: peso_comestible = peso_total × 0.65
- Alitas con hueso: peso_comestible = peso_total × 0.55
- Sin hueso visible: peso_comestible = peso_total × 0.95

**MACROS POR 100g COMESTIBLE:**
- Pechuga SIN piel: 165 kcal, P31g, G3.6g, C0g, fibra 0g
- Pechuga CON piel: 195 kcal, P29g, G8g, C0g, fibra 0g
- Muslo/pierna CON piel: 215 kcal, P24g, G13g, C0g, fibra 0g
- Muslo/pierna SIN piel: 180 kcal, P26g, G8g, C0g, fibra 0g
- Cuarto mixto CON piel: 230 kcal, P24g, G15g, C0g, fibra 0g (DEFAULT para mixed_quarter)
- Alitas con piel: 240 kcal, P23g, G16g, C0g, fibra 0g

**LÍMITES DE PROTEÍNA POR TIPO:**
- breast sin hueso: MAX 31g/100g comestible
- breast con hueso: MAX 29g/100g comestible
- leg_thigh: MAX 24-26g/100g comestible
- mixed_quarter: MAX 24-25g/100g comestible
- wings: MAX 23g/100g comestible

**OTRAS PROTEÍNAS:**
- Carne res molida 80/20: 250 kcal, P26g, G17g, C0g
- Carne res molida 90/10: 180 kcal, P26g, G8g, C0g
- Pescado blanco: 110 kcal, P23g, G2g, C0g
- Atún en agua: 110 kcal, P25g, G1g, C0g
- Huevo entero: 155 kcal, P13g, G11g, C1g (por 100g = ~2 huevos)
- Camarón cocido: 99 kcal, P24g, G1g, C0g
- Salmón: 208 kcal, P20g, G13g, C0g
- Cerdo lomo: 242 kcal, P27g, G14g, C0g
- Bistec res (sirloin): 207 kcal, P26g, G11g, C0g

CARBOHIDRATOS (por 100g cocido):
- Arroz blanco: 130 kcal, C28g, P2.7g, G0.3g, fibra 0.4g
- Arroz integral: 112 kcal, C24g, P2.6g, G0.9g, fibra 1.8g
- Pasta cocida: 131 kcal, C25g, P5g, G1g, fibra 1.8g
- Papa cocida: 87 kcal, C20g, P2g, G0.1g, fibra 1.8g
- Papa frita: 312 kcal, C41g, P4g, G15g, fibra 3.8g
- Tortilla maíz (25g c/u): 60 kcal, C12g, P2g, G1g, fibra 1.5g
- Tortilla harina (45g c/u): 140 kcal, C24g, P4g, G3.5g, fibra 1.5g
- Pan blanco (30g rebanada): 80 kcal, C15g, P2.5g, G1g, fibra 0.8g
- Frijoles cocidos: 127 kcal, C23g, P8g, G0.5g, fibra 7.5g
- Frijoles refritos (con aceite): 110 kcal, C16g, P6g, G3g, fibra 5g
- Lentejas cocidas: 116 kcal, C20g, P9g, G0.4g, fibra 7.9g
- Avena cocida: 71 kcal, C12g, P2.5g, G1.5g, fibra 1.7g
- Cereal con leche (30g cereal + 200ml leche): 280 kcal, C45g, P10g, G6g, fibra 2g

GRASAS Y EXTRAS:
- Aceite (cualquier tipo): 884 kcal, G100g por 100ml (120 kcal por cucharada 15ml)
- Aguacate: 160 kcal, C9g, P2g, G15g, fibra 7g (por 100g)
- Queso fresco: 264 kcal, P21g, G20g, C3g (por 100g)
- Queso Oaxaca: 300 kcal, P25g, G22g, C3g
- Queso amarillo (cheddar): 403 kcal, P25g, G33g, C1g
- Queso crema: 342 kcal, P6g, G34g, C4g
- Crema mexicana: 195 kcal, P2g, G20g, C4g (por 100g)
- Mayonesa: 680 kcal, P1g, G75g, C1g (por 100g)
- Mantequilla: 717 kcal, P0.9g, G81g, C0.1g
- Aderezo ranch / caesar: 320 kcal, P2g, G33g, C4g (por 100g)
- Salsa de tomate: 29 kcal, P1g, G0g, C7g (por 100g)
- Nutella (15g porción): 80 kcal, P1g, G4.5g, C9g

PIZZA (por rebanada ~150g o pizza completa 400g):
- Rebanada queso simple (150g): 300 kcal, P12g, C35g, G12g, fibra 2g
- Rebanada pepperoni (150g): 370 kcal, P14g, C35g, G18g, fibra 2g
- Rebanada hawaiana (150g): 310 kcal, P13g, C37g, G12g, fibra 2g
- Pizza personal entera ~400g (multiplicar rebanada × 2.7)
- Pizza mediana rebanada: calcular visualmente cuántas rebanadas del total

HAMBURGUESAS (completa con pan):
- Hamburguesa simple casera (~200g): 450 kcal, P25g, C35g, G18g, fibra 2g
- BigMac (~220g): 560 kcal, P27g, C45g, G26g, fibra 3g
- Cuarto de libra con queso (~280g): 530 kcal, P29g, C42g, G26g, fibra 3g
- Solo la carne de res 100g: 250 kcal, P26g, G17g, C0g

BEBIDAS ALCOHÓLICAS (calorías de alcohol = 7 kcal/g, no se cuentan como macros estándar):
- Cerveza regular 355ml: 150 kcal, C13g, P2g, G0g [reportar alcohol: 14g]
- Cerveza light 355ml: 100 kcal, C7g, P1g, G0g [reportar alcohol: 10g]
- Vino tinto/blanco 150ml copa: 125 kcal, C4g, P0g, G0g [reportar alcohol: 15g]
- Destilado 45ml (tequila/vodka/whisky): 100 kcal, C0g, P0g, G0g [reportar alcohol: 14g]
- Michelada 355ml: 200 kcal, C20g, P2g, G1g [alcohol 10g]
NOTA: Para bebidas alcohólicas, reporta "alcohol: Xg" en notes y suma las calorías del alcohol al total.

REFRESCOS Y BEBIDAS NO ALCOHÓLICAS:
- Coca-Cola regular 355ml: 140 kcal, C39g, P0g, G0g
- Coca-Cola/Pepsi Zero 355ml: 0 kcal
- Jugo de naranja 200ml: 88 kcal, C21g, P1g, G0g
- Leche entera 240ml: 149 kcal, C12g, P8g, G8g
- Leche descremada 240ml: 83 kcal, C12g, P8g, G0g
- Agua natural: 0 kcal

PLATILLOS COMPUESTOS MEXICANOS (por porción estándar):
- Taco al pastor (1 pieza, tortilla+carne+piña+cebolla+cilantro ~100g): 200 kcal, P12g, C18g, G8g, fibra 2g
- Taco de canasta (1 pieza ~80g, frijol/papa/chicharrón): 180 kcal, P7g, C25g, G6g, fibra 2g
- Taco de bistec (1 pieza ~110g): 220 kcal, P18g, C18g, G8g, fibra 1g
- Taco de carnitas (1 pieza ~100g): 230 kcal, P16g, C18g, G10g, fibra 1g
- Chile relleno mediano (~200g con salsa): 350 kcal, P20g, C15g, G22g, fibra 3g
- Enchiladas (2 piezas ~250g con salsa y queso): 450 kcal, P22g, C40g, G20g, fibra 4g
- Pozole rojo tazón 350ml: 300 kcal, P25g, C30g, G8g, fibra 3g
- Sopa de lima 350ml: 180 kcal, P18g, C15g, G5g, fibra 1g
- Tamales (1 pieza ~100g): 220 kcal, P6g, C28g, G10g, fibra 2g
- Chilaquiles (1 porción ~300g con crema y queso): 550 kcal, P20g, C55g, G28g, fibra 4g
- Quesadilla (1 pieza ~150g, tortilla + queso): 380 kcal, P16g, C38g, G18g, fibra 2g
- Torta (1 pieza ~300g): 520 kcal, P30g, C55g, G18g, fibra 4g
- Burrito regular (~250g): 430 kcal, P22g, C50g, G14g, fibra 5g
- Sopes (1 pieza ~100g con toppings): 250 kcal, P10g, C30g, G10g, fibra 3g

AJUSTES POR MÉTODO DE COCCIÓN:
- Fritura profunda: +40-60% calorías (absorbe aceite)
- Empanizado frito: +100-150 kcal por 100g
- Salteado con aceite visible: +5-10g grasa (45-90 kcal)
- Asado/parrilla: sin ajuste (grasa se derrite)
- Al vapor/hervido: sin ajuste

PASO 5: VALIDACIÓN DE PROTEÍNA (CRÍTICO)
Verifica que la proteína no exceda límites biológicos:
- Pollo/pavo: MAX 31g proteína por 100g (sin piel), 29g (con piel)
- Carne res: MAX 26-28g proteína por 100g
- Pescado: MAX 23-25g proteína por 100g
- Huevo: MAX 13g proteína por 100g

Si tu estimación de proteína supera estos valores:
1. Recalcula el peso del alimento (probablemente sobrestimado)
2. O reduce el % de proteína al máximo biológico
3. Reporta en "notes" el ajuste realizado

Ejemplo: Si estimaste 300g pollo con piel = 87g proteína
→ 87g ÷ 300g = 29g/100g ✓ (correcto, dentro del límite)
→ Si hubiera dado 97g proteína = 32g/100g ✗ (imposible, ajustar a 87g máximo)

PASO 6: CÁLCULO DE TOTALES Y VERIFICACIÓN (OBLIGATORIO)
Para CADA alimento, calcula calorías usando LA FÓRMULA EXACTA:
calories = (protein × 4) + (carbs × 4) + (fat × 9)

NUNCA uses valores de calorías de memoria o tablas directamente.
SIEMPRE calcula desde los macros.

Ejemplo correcto:
- Pollo 300g: P87g, C0g, F24g
- Calorías = (87×4) + (0×4) + (24×9) = 348 + 0 + 216 = 564 kcal ✓

Ejemplo INCORRECTO:
- Pollo 300g: P87g, C0g, F24g, calorías 450 kcal ✗
- Verificación: (87×4) + (0×4) + (24×9) = 564 kcal
- ERROR: 450 ≠ 564 (diferencia 20%)

Después de calcular cada item:
1. Suma todos los macros: totalProtein, totalCarbs, totalFat
2. Calcula totalCalories = (totalProtein × 4) + (totalCarbs × 4) + (totalFat × 9)
3. Verifica que la suma de calorías individuales ≈ totalCalories (±2%)
4. Si hay diferencia >2%, recalcula TODO desde cero

PASO 7: ESCENARIOS A/B (si hay ambigüedad crítica)
Si detectas incertidumbre en elementos clave (piel sí/no, fritura sí/no, porción grande/pequeña):
Reporta 2 escenarios en "notes":

Ejemplo 1 - Piel ambigua:
- "Escenario A (más probable): Pollo CON piel = 585 kcal (195 kcal/100g × 300g)"
- "Escenario B (si fuera sin piel): Pollo SIN piel = 495 kcal (165 kcal/100g × 300g)"
- Diferencia: 90 kcal

Ejemplo 2 - Aceite visible:
- "Escenario A (con aceite visible): Total 920 kcal (incluye ~2 cdas aceite = 240 kcal)"
- "Escenario B (sin aceite extra): Total 680 kcal"
- Diferencia: 240 kcal

Usa SIEMPRE el escenario A (más probable) para los valores principales del JSON.

PASO 8: NIVEL DE CONFIANZA
- ALTA: referencia de escala clara + alimentos simples identificables + sin ambigüedad
- MEDIA: sin referencia pero porciones típicas + alimentos reconocibles + poca ambigüedad
- BAJA: sin referencia + alimentos complejos/mixtos + aceite no visible + alta ambigüedad

═══════════════════════════════════════════════════════════════════════════════
FORMATO DE SALIDA (JSON válido, sin markdown):
═══════════════════════════════════════════════════════════════════════════════

{
  "foods": [
    {
      "name": "Nombre específico (incluir detalles: con piel, frito, etc)",
      "quantity": "Descripción (ej: 1 pieza, 6 tortillas, 200g)",
      "estimatedGrams": 200,
      "gramsRange": {"min": 160, "max": 240},
      "visualCues": "Señales observadas (piel, aceite, tamaño vs referencia)",
      "confidence": "high|medium|low",
      "calories": 450,
      "protein": 35,
      "carbs": 12,
      "fat": 28,
      "fiber": 2,
      "caloriesRange": {"min": 380, "max": 520},
      "chickenClassification": {
        "cutType": "breast|leg_thigh|mixed_quarter|wings|unknown|null",
        "boneVisible": true,
        "skinVisible": true,
        "edibleWeightFactor": 0.65,
        "edibleGrams": 130
      }
    }
  ],
  "totalCalories": 450,
  "totalProtein": 35,
  "totalCarbs": 12,
  "totalFat": 28,
  "totalFiber": 2,
  "referenceObjectFound": "lata 355ml|tarjeta|cubiertos|mano|plato|ninguna",
  "overallConfidence": "high|medium|low",
  "notes": [
    "Justificación de estimación",
    "Incertidumbres principales",
    "Supuestos realizados"
  ],
  "energyCheck": "Verificación: 450 kcal ≈ (35×4 + 12×4 + 28×9) = 440 kcal ✓"
}

═══════════════════════════════════════════════════════════════════════════════
REGLAS CRÍTICAS:
═══════════════════════════════════════════════════════════════════════════════

1. NUNCA subestimes grasa/aceite - es el error #1
2. Si hay brillo/charco de aceite: +1-2 cucharadas mínimo (120-240 kcal)
3. Piel de pollo/cerdo: +50-80% calorías vs sin piel
4. Fritura: SIEMPRE agregar aceite absorbido
5. Comida de restaurante: porciones 30-50% más grandes que caseras
6. Si hay duda entre 2 escenarios, calcula AMBOS y reporta el rango
7. Etiqueta nutricional visible = PRIORIDAD ABSOLUTA (usar esos valores exactos)
8. Todos los números deben ser enteros (redondear)
9. Fibra: solo en vegetales, leguminosas, granos enteros, frutas
10. Bebidas: incluir (coca zero = 0 kcal, coca regular 355ml = 140 kcal)
11. **PROTEÍNA: Usa valores conservadores. Si calculas >30g proteína/100g en pollo, REDUCE el peso estimado o ajusta a 29g/100g máximo**
12. **VALIDACIÓN FINAL: Proteína total ÷ peso total de proteínas animales debe dar ≤30g/100g. Si no, recalcula.**
13. **CALORÍAS = FÓRMULA OBLIGATORIA: Para CADA alimento, calories DEBE ser exactamente (protein×4 + carbs×4 + fat×9). NO uses valores de tablas.**
14. **VERIFICACIÓN MATEMÁTICA: Antes de enviar el JSON, verifica que CADA item cumple: |calories - (P×4+C×4+F×9)| < 5 kcal**
15. **CONTEXTO DEL USUARIO: Si el usuario especificó cantidades, ingredientes o nombre del plato, esos valores tienen prioridad ABSOLUTA sobre tu estimación visual.**

OBJETIVO: Precisión realista, no optimismo fitness. Mejor sobrestimar 10% que subestimar 30%.

⚠️ ATENCIÓN ESPECIAL:
- La proteína es fácil de sobreestimar. Sé conservador con los pesos de carne/pollo/pescado.
- Las calorías DEBEN calcularse desde macros, NUNCA desde memoria. Inconsistencias matemáticas son inaceptables.
- Bebidas alcohólicas: reportar en notes el contenido de alcohol (g) y sumar sus calorías (7 kcal/g) al total.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(session.userId)) {
    return NextResponse.json(
      { error: "Límite de análisis alcanzado (20/hora). Intenta más tarde." },
      { status: 429 }
    );
  }

  try {
    const { imageBase64, imageUrl, images, userComment } = await req.json();

    // Validate imageUrl is a proper public HTTPS URL (not internal network)
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") throw new Error("Only HTTPS URLs allowed");
        // Block private/internal IP ranges
        const hostname = parsed.hostname;
        if (
          hostname === "localhost" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
          hostname === "127.0.0.1" ||
          hostname === "0.0.0.0"
        ) {
          return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    }

    // Support multiple images (up to 3) or single image
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (images && Array.isArray(images) && images.length > 0) {
      // Multi-image mode
      for (const img of images.slice(0, 3)) {
        imageContents.push({
          type: "image_url",
          image_url: {
            url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`,
            detail: "high",
          },
        });
      }
    } else if (imageBase64) {
      imageContents.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`,
          detail: "high",
        },
      });
    } else if (imageUrl) {
      imageContents.push({
        type: "image_url",
        image_url: { url: imageUrl, detail: "high" },
      });
    }

    if (imageContents.length === 0) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const photoCount = imageContents.length;
    let userPrompt = photoCount > 1
      ? `Analyze these ${photoCount} food photos together as a single meal. They show different angles or items of the same meal.`
      : "Analyze this food photo.";

    if (userComment) {
      userPrompt += `\n\nCONTEXTO DEL USUARIO (PRIORIDAD ABSOLUTA): "${userComment}"\nUsa este contexto directamente — tiene prioridad sobre tu estimación visual. Si el usuario indica pesos, cantidades o ingredientes específicos, úsalos exactamente.`;
    }
    userPrompt += "\n\nReturn nutritional breakdown as JSON.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 2500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content ?? "";

    // Parse JSON from response, handling potential markdown wrapping
    let parsed;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: content },
        { status: 500 }
      );
    }

    // CRITICAL: Validate and auto-correct calorie-macro consistency
    // Formula: kcal = (protein × 4) + (carbs × 4) + (fat × 9)
    const validateAndCorrectCalories = (item: any) => {
      const calculatedKcal = Math.round(
        (item.protein * 4) + (item.carbs * 4) + (item.fat * 9)
      );
      const reportedKcal = item.calories;
      const difference = Math.abs(calculatedKcal - reportedKcal);
      const percentDiff = calculatedKcal > 0 ? (difference / calculatedKcal) * 100 : 0;

      // If difference > 8%, auto-correct to calculated value
      if (percentDiff > 8) {
        console.warn(`Calorie mismatch detected: Reported ${reportedKcal} kcal, Calculated ${calculatedKcal} kcal (${percentDiff.toFixed(1)}% diff)`);
        item.calories = calculatedKcal;

        if (!parsed.notes) parsed.notes = [];
        parsed.notes.push(
          `⚠️ Calorías auto-corregidas: ${reportedKcal} → ${calculatedKcal} kcal (diferencia ${percentDiff.toFixed(1)}%)`
        );
      }

      return item;
    };

    // Validate each food item
    if (parsed.foods && Array.isArray(parsed.foods)) {
      parsed.foods = parsed.foods.map(validateAndCorrectCalories);
    }

    // Recalculate totals based on corrected individual items
    if (parsed.foods && Array.isArray(parsed.foods)) {
      const totals = parsed.foods.reduce((acc: any, food: any) => ({
        calories: acc.calories + food.calories,
        protein: acc.protein + food.protein,
        carbs: acc.carbs + food.carbs,
        fat: acc.fat + food.fat,
        fiber: acc.fiber + (food.fiber || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      // Validate total calories
      const calculatedTotalKcal = Math.round(
        (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9)
      );
      const reportedTotalKcal = parsed.totalCalories || totals.calories;
      const totalDifference = Math.abs(calculatedTotalKcal - reportedTotalKcal);
      const totalPercentDiff = calculatedTotalKcal > 0 ? (totalDifference / calculatedTotalKcal) * 100 : 0;

      if (totalPercentDiff > 8) {
        console.warn(`Total calorie mismatch: Reported ${reportedTotalKcal} kcal, Calculated ${calculatedTotalKcal} kcal`);
        if (!parsed.notes) parsed.notes = [];
        parsed.notes.push(
          `⚠️ Total calorías corregido: ${reportedTotalKcal} → ${calculatedTotalKcal} kcal`
        );
      }

      // Update totals with corrected values
      parsed.totalCalories = calculatedTotalKcal;
      parsed.totalProtein = Math.round(totals.protein);
      parsed.totalCarbs = Math.round(totals.carbs);
      parsed.totalFat = Math.round(totals.fat);
      parsed.totalFiber = Math.round(totals.fiber);

      // Add energy check verification
      parsed.energyCheck = `Verificación: ${calculatedTotalKcal} kcal = (${parsed.totalProtein}×4 + ${parsed.totalCarbs}×4 + ${parsed.totalFat}×9) ✓`;
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Food analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
