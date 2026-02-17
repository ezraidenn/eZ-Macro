import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a professional nutritionist AI. Based on the user's remaining macros and the suggested meal type, recommend 3-5 specific food options they can eat.

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "mealType": "snack",
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

Rules:
- Recommend realistic, common foods that are easy to prepare or buy
- Each recommendation should help fill the remaining macro gaps
- Prioritize the most deficient macro
- If protein is low, suggest high-protein options
- If calories are very low remaining, suggest light snacks
- Keep portions realistic
- Use common Latin American and international foods
- All nutritional values must be numbers`;

export async function POST(req: NextRequest) {
  try {
    const { remaining, mealsEaten, locale } = await req.json();

    if (!remaining) {
      return NextResponse.json({ error: "Missing remaining macros" }, { status: 400 });
    }

    // Determine suggested meal type based on meals already eaten and time of day
    const hour = new Date().getHours();
    let suggestedMeal = "snack";
    
    const mealTypes = (mealsEaten || []).map((m: any) => m.type);
    if (!mealTypes.includes("breakfast") && hour < 11) {
      suggestedMeal = "breakfast";
    } else if (!mealTypes.includes("lunch") && hour >= 11 && hour < 16) {
      suggestedMeal = "lunch";
    } else if (!mealTypes.includes("dinner") && hour >= 16 && hour < 22) {
      suggestedMeal = "dinner";
    } else {
      suggestedMeal = "snack";
    }

    const lang = locale === "es" ? "Spanish" : "English";

    const userPrompt = `The user has these remaining macros for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

They have already eaten: ${mealsEaten?.length || 0} meals today (${mealTypes.join(", ") || "none"}).
Current time: ${hour}:00.
Suggested meal type: ${suggestedMeal}.

Recommend 4 specific food options for their ${suggestedMeal} that help them reach their remaining macros.
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
