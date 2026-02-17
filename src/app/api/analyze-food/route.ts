import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a professional nutritionist AI. Analyze the food photo and return ONLY valid JSON (no markdown, no code fences).

Return this exact JSON structure:
{
  "foods": [
    {
      "name": "Food name",
      "quantity": "e.g. 2 units, 150g",
      "estimatedGrams": 150,
      "confidence": "high",
      "calories": 250,
      "protein": 20,
      "carbs": 15,
      "fat": 12,
      "fiber": 3
    }
  ],
  "totalCalories": 250,
  "totalProtein": 20,
  "totalCarbs": 15,
  "totalFat": 12,
  "notes": ["Any relevant observations"]
}

Rules:
- All nutritional values must be numbers (not strings)
- Use USDA standard reference values
- Estimate portions using visual cues (plate size, utensils, hand references)
- confidence: "high" if clearly visible, "medium" if partially visible, "low" if uncertain
- Be precise with grams estimation
- Include ALL visible food items
- Account for cooking methods (fried adds fat, grilled reduces it)
- If you see a nutrition label, extract exact values from it`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl, userComment } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart = imageBase64
      ? {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: "high",
          },
        }
      : {
          type: "image_url",
          image_url: { url: imageUrl, detail: "high" },
        };

    const userPrompt = userComment
      ? `Analyze this food photo. User context: "${userComment}". Use this context to better estimate portions. Return nutritional breakdown as JSON.`
      : "Analyze this food photo. Return nutritional breakdown as JSON.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            imageContent,
          ],
        },
      ],
      max_tokens: 1500,
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

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Food analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
