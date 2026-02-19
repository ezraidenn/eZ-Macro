import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a professional nutritionist AI. Based on the user's remaining macros, priority selections, and suggested meal type, recommend 4 specific food options.

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "mealType": "breakfast|lunch|dinner|snack",
  "reasoning": "Brief explanation of why these recommendations (e.g., 'Priorizando carbohidratos (150g) y proteína (60g)')",
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
  "tip": "A short nutritional tip relevant to their situation"
}

PRIORITY SYSTEM:
- HIGH priority macros: User selected these - MAXIMIZE these in recommendations
- MEDIUM priority macros: Fill as much as possible
- LOW priority macros: Fill minimally, just enough to balance

MEAL TYPE GUIDELINES:
- breakfast: Eggs, yogurt, oatmeal, fruit, toast, smoothies, cereal
- lunch: Chicken, rice, beans, salads, sandwiches, pasta, vegetables
- dinner: Meat, fish, vegetables, grains, legumes, soups
- snack: Nuts, fruit, protein bars, cheese, crackers, small portions

Rules:
- Recommend realistic, common foods appropriate for the meal type
- Each recommendation should prioritize HIGH priority macros first
- If protein is HIGH priority, suggest 40-60g protein per recommendation
- If carbs are HIGH priority, suggest 80-120g carbs per recommendation
- If fat is HIGH priority, suggest 20-30g fat per recommendation
- Keep portions realistic and meal-appropriate
- Use common Latin American and international foods
- All nutritional values must be numbers
- NEVER recommend breakfast foods for dinner or vice versa`;

export async function POST(req: NextRequest) {
  try {
    const { remaining, mealsEaten, locale, priorities } = await req.json();

    if (!remaining) {
      return NextResponse.json({ error: "Missing remaining macros" }, { status: 400 });
    }

    // Determine suggested meal type based on meals already eaten and time of day
    const hour = new Date().getHours();
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

    // Build priority description
    const selectedPriorities = priorities || ["protein", "carbs", "fat", "calories"];
    const priorityList = selectedPriorities.map((p: string) => {
      const value = remaining[p as keyof typeof remaining];
      return `${p}: ${value}${p === "calories" ? " kcal" : "g"}`;
    }).join(", ");

    // Determine which macro is most deficient (highest remaining)
    const macroValues = [
      { name: "protein", value: remaining.protein, selected: selectedPriorities.includes("protein") },
      { name: "carbs", value: remaining.carbs, selected: selectedPriorities.includes("carbs") },
      { name: "fat", value: remaining.fat, selected: selectedPriorities.includes("fat") },
      { name: "fiber", value: remaining.fiber || 0, selected: selectedPriorities.includes("fiber") },
    ].filter(m => m.selected).sort((a, b) => b.value - a.value);

    const highPriority = macroValues.slice(0, 2).map(m => m.name);
    const mediumPriority = macroValues.slice(2).map(m => m.name);

    const userPrompt = `The user has these remaining macros for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g
- Fiber: ${remaining.fiber || 0}g

PRIORITY SELECTIONS (user chose these):
HIGH priority: ${highPriority.join(", ")}
${mediumPriority.length > 0 ? `MEDIUM priority: ${mediumPriority.join(", ")}` : ""}

They have already eaten: ${mealsEaten?.length || 0} meals today (${mealTypes.join(", ") || "none"}).
Current time: ${hour}:00.
Suggested meal type: ${suggestedMeal}.

Recommend 4 specific food options for their ${suggestedMeal} that MAXIMIZE the HIGH priority macros (${highPriority.join(", ")}).
Each recommendation should provide substantial amounts of the HIGH priority macros.
${selectedPriorities.includes("fiber") ? "IMPORTANT: Include fiber-rich foods (vegetables, legumes, whole grains, fruits) to help reach fiber goal." : ""}
Respond in ${lang}. Food names and descriptions in ${lang}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
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
