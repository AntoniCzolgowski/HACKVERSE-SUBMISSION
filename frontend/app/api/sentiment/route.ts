import { NextRequest, NextResponse } from "next/server";

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const API_URL = process.env.SENTIMENT_API_URL || "";
const API_KEY = process.env.SENTIMENT_API_KEY || "";
const isAnthropic = API_URL.includes("anthropic.com");

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Fallback response if no API configured
    if (!API_URL || !API_KEY || API_KEY.includes("your-api-key-here")) {
      return NextResponse.json({
        label: "neutral",
        score: 0,
        confidence: 0.5,
        fallback: true,
      });
    }

    const systemPrompt = "You are a sentiment analysis expert. Analyze the sentiment of Reddit comments and respond with ONLY a JSON object in this exact format: {\"label\": \"positive\" | \"neutral\" | \"negative\", \"score\": number between -1 and 1, \"confidence\": number between 0 and 1}. Be concise.";
    const userPrompt = `Analyze the sentiment of this Reddit comment: "${text.substring(0, 500)}"`;

    let requestBody: any;
    let headers: any;

    if (isAnthropic) {
      headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      };
      requestBody = {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`
          }
        ],
      };
    } else {
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      };
      requestBody = {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return NextResponse.json(
        { error: "API request failed", fallback: true, label: "neutral", score: 0, confidence: 0.5 },
        { status: 200 } // Return 200 to use fallback
      );
    }

    const data = await response.json();
    const content = isAnthropic
      ? data.content[0].text
      : data.choices[0].message.content;

    const result = JSON.parse(content);

    return NextResponse.json({
      label: result.label || "neutral",
      score: result.score || 0,
      confidence: result.confidence || 0.5,
    });
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return NextResponse.json({
      label: "neutral",
      score: 0,
      confidence: 0.5,
      fallback: true,
    });
  }
}
