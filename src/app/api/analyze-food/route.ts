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
    const { imageBase64, imageUrl, images, userComment } = await req.json();

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
      userPrompt += ` User context: "${userComment}". Use this context to better estimate portions.`;
    }
    userPrompt += " Return nutritional breakdown as JSON.";

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
