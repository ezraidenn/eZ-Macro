import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RATE_LIMIT = 30; // recomendaciones por hora por usuario
const WINDOW_MS = 60 * 60 * 1000;

// Texto estructurado sin visión: la variante mini es suficiente y más barata.
// Override por env sin tocar código.
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";

const SYSTEM_PROMPT = `You are a professional nutritionist AI with deep expertise in sports nutrition and evidence-based dietary science. Based on the user's remaining macros, priority selections, and goal context, recommend 4 specific, practical food options.

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "mealType": "breakfast|lunch|dinner|snack",
  "reasoning": "Brief explanation of why these recommendations fit the user's situation",
  "recommendations": [
    {
      "name": "Greek Yogurt with Berries",
      "description": "150g plain Greek yogurt + 50g mixed berries",
      "calories": 180,
      "protein": 15,
      "carbs": 20,
      "fat": 4,
      "fiber": 2,
      "emoji": "🫐"
    }
  ],
  "tip": "A specific, actionable tip based on their EXACT macro situation — never generic hydration advice"
}

PRIORITY SYSTEM:
- HIGH priority macros: Maximize these. If a macro is HIGH priority, each recommendation should provide a substantial portion of the remaining amount.
- MEDIUM priority macros: Include meaningful amounts.
- LOW or unselected macros: Fill minimally.

MACRO CONSTRAINTS — Each recommendation must stay within the calorie budget:
- Never recommend a meal that alone exceeds the remaining calorie budget.
- If remaining calories < 300, suggest small snacks, not full meals.
- Each recommendation's calories must satisfy: calories ≈ (protein×4) + (carbs×4) + (fat×9) ± 5 kcal.

MEAL TYPE GUIDELINES:
- breakfast: Eggs, yogurt, oatmeal, fruit, toast, smoothies, cereal, protein shakes
- lunch: Chicken, rice, beans, salads, sandwiches, pasta, vegetables, soups
- dinner: Lean meats, fish, vegetables, grains, legumes, soups, stir-fries
- snack: Nuts, fruit, protein bars, cottage cheese, jerky, rice cakes, small portions

GOAL-BASED ADJUSTMENTS:
- cut: Prioritize high-volume, low-calorie, satiating foods. Lean proteins, high fiber.
- bulk: Include calorie-dense options. Healthy fats, starchy carbs, higher protein.
- maintain: Balanced, nutrient-dense options.
- recomp: High protein relative to calories. Lean proteins + fibrous vegetables.

TIP RULES — The tip must be SPECIFIC, not generic:
- If protein remaining > 50% of goal and calories < 400 remaining: "You need high-protein, low-calorie foods. Casein protein shake (25g protein, 120 kcal) or 200g cottage cheese (25g protein, 140 kcal) are your best options before hitting your calorie ceiling."
- If fiber remaining > 15g: "You're very low on fiber today. A large salad with legumes or an apple + 30g almonds would add 8-10g fiber without much calorie impact."
- If fat remaining < 5g but calories remain: "You've nearly hit your fat target — focus on carb/protein sources: rice, fruit, lean meats, or fat-free dairy."
- If all macros are low (< 20% remaining): "You're close to your targets. A light snack under 150 kcal is ideal — try 1 apple or a small protein shake."
- NEVER write "Stay hydrated" or "Drink water" as a tip unless water is explicitly the issue.

Rules:
- Recommend realistic, common foods appropriate for the meal type
- Use common Latin American and international foods
- All nutritional values must be numbers (integers or one decimal)
- NEVER recommend breakfast foods for dinner or vice versa
- Each recommendation should be meaningfully different (variety)
- Calories MUST equal (protein×4 + carbs×4 + fat×9) — validate before outputting`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`recommendations:${session.userId}`, RATE_LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Límite de sugerencias alcanzado (30/hora). Intenta más tarde." },
      { status: 429 }
    );
  }

  try {
    const { remaining, mealsEaten, locale, priorities, targets, profile, localHour } = await req.json();

    if (!remaining) {
      return NextResponse.json({ error: "Missing remaining macros" }, { status: 400 });
    }

    // Determine suggested meal type based on meals already eaten and time of day.
    // The server runs in UTC, so the client sends its local hour; fall back to
    // server time only if the client didn't provide one.
    const hour =
      typeof localHour === "number" && localHour >= 0 && localHour <= 23
        ? Math.floor(localHour)
        : new Date().getHours();
    let suggestedMeal = "snack";

    const mealTypes = (mealsEaten || []).map((m: any) => m.type);
    if (!mealTypes.includes("breakfast") && hour >= 6 && hour < 11) {
      suggestedMeal = "breakfast";
    } else if (!mealTypes.includes("lunch") && hour >= 11 && hour < 16) {
      suggestedMeal = "lunch";
    } else if (!mealTypes.includes("dinner") && hour >= 16 && hour < 21) {
      suggestedMeal = "dinner";
    } else {
      suggestedMeal = "snack";
    }

    const lang = locale === "es" ? "Spanish" : "English";

    // Build priority list using RELATIVE % remaining (not absolute grams)
    // This prevents "150g carbs remaining" from always beating "30g protein remaining"
    // even when the user is at 20% protein completion but 80% carbs completion.
    const selectedPriorities: string[] = priorities || ["protein", "carbs", "fat", "calories"];

    interface MacroEntry { name: string; value: number; percentRemaining: number; selected: boolean }
    const macroValues: MacroEntry[] = [
      { name: "protein",  value: remaining.protein,  percentRemaining: targets ? (remaining.protein  / Math.max(targets.protein,  1)) * 100 : remaining.protein,  selected: selectedPriorities.includes("protein")  },
      { name: "carbs",    value: remaining.carbs,    percentRemaining: targets ? (remaining.carbs    / Math.max(targets.carbs,    1)) * 100 : remaining.carbs,    selected: selectedPriorities.includes("carbs")    },
      { name: "fat",      value: remaining.fat,      percentRemaining: targets ? (remaining.fat      / Math.max(targets.fat,      1)) * 100 : remaining.fat,      selected: selectedPriorities.includes("fat")      },
      { name: "fiber",    value: remaining.fiber || 0, percentRemaining: targets ? ((remaining.fiber || 0) / Math.max(targets.fiber || 25, 1)) * 100 : (remaining.fiber || 0), selected: selectedPriorities.includes("fiber") },
    ].filter((m) => m.selected)
     .sort((a, b) => b.percentRemaining - a.percentRemaining);

    const highPriority = macroValues.slice(0, 2).map((m) => m.name);
    const mediumPriority = macroValues.slice(2).map((m) => m.name);

    // Goal context for smarter recommendations
    const goalContext = profile?.goalType
      ? `User goal: ${profile.goalType} (${profile.trainingLevel || "intermediate"} level).`
      : "";

    const userPrompt = `The user has these remaining macros for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g${targets ? ` (${Math.round((remaining.protein / Math.max(targets.protein, 1)) * 100)}% of daily goal remaining)` : ""}
- Carbs: ${remaining.carbs}g${targets ? ` (${Math.round((remaining.carbs / Math.max(targets.carbs, 1)) * 100)}% remaining)` : ""}
- Fat: ${remaining.fat}g${targets ? ` (${Math.round((remaining.fat / Math.max(targets.fat, 1)) * 100)}% remaining)` : ""}
- Fiber: ${remaining.fiber || 0}g${targets ? ` (${Math.round(((remaining.fiber || 0) / Math.max(targets.fiber || 25, 1)) * 100)}% remaining)` : ""}

${goalContext}

PRIORITY SELECTIONS (ranked by % of daily goal still unmet — higher % = more important):
HIGH priority: ${highPriority.join(", ")}
${mediumPriority.length > 0 ? `MEDIUM priority: ${mediumPriority.join(", ")}` : ""}

They have already eaten: ${mealsEaten?.length || 0} meals today (${mealTypes.join(", ") || "none"}).
Current time: ${hour}:00.
Suggested meal type: ${suggestedMeal}.

Recommend 4 specific ${suggestedMeal} options that MAXIMIZE the HIGH priority macros (${highPriority.join(", ")}) while staying within the ${remaining.calories} kcal budget.
${selectedPriorities.includes("fiber") ? "IMPORTANT: Fiber is a priority — include fiber-rich options (vegetables, legumes, whole grains, fruits)." : ""}
${remaining.calories < 300 ? "IMPORTANT: Very few calories remain — recommend only small snacks under 200 kcal each." : ""}
Respond in ${lang}. Food names and descriptions in ${lang}.`;

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      // Holgura para tokens de razonamiento (gpt-5.x) + el JSON de salida
      max_completion_tokens: 4000,
      // gpt-5.x no acepta temperature custom; gpt-4o sí
      ...(TEXT_MODEL.startsWith("gpt-4") ? { temperature: 0.6 } : {}),
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "";

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

    // Validate and auto-correct calorie-macro consistency in each recommendation
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
      parsed.recommendations = parsed.recommendations.map((rec: any) => {
        const p = Number(rec.protein) || 0;
        const c = Number(rec.carbs) || 0;
        const f = Number(rec.fat) || 0;
        const calculatedKcal = Math.round(p * 4 + c * 4 + f * 9);
        const reportedKcal = Number(rec.calories) || 0;
        const diff = calculatedKcal > 0 ? Math.abs(calculatedKcal - reportedKcal) / calculatedKcal : 0;

        if (diff > 0.08) {
          console.warn(`Recommendation calorie mismatch: ${rec.name} — reported ${reportedKcal}, calculated ${calculatedKcal}`);
          rec.calories = calculatedKcal;
        }
        return rec;
      });
    }

    parsed.mealType = suggestedMeal;
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { error: error.message || "Recommendations failed" },
      { status: 500 }
    );
  }
}
