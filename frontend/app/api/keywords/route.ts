import { NextRequest, NextResponse } from "next/server";

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const API_URL = process.env.SENTIMENT_API_URL || "";
const API_KEY = process.env.SENTIMENT_API_KEY || "";
const isAnthropic = API_URL.includes("anthropic.com");

export async function POST(request: NextRequest) {
  try {
    const { comments } = await request.json();

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: "Comments array is required" },
        { status: 400 }
      );
    }

    // Fallback response if no API configured
    if (!API_URL || !API_KEY || API_KEY.includes("your-api-key-here")) {
      return NextResponse.json({
        keywords: extractKeywordsFallback(comments),
        fallback: true,
      });
    }

    const systemPrompt = `You are a keyword extraction expert. Analyze Reddit comments and extract 3-5 most commonly discussed keywords or phrases. Focus on nouns, topics, and key concepts (not generic words like "good", "bad", "really"). Respond with JSON: {"keywords": ["keyword1", "keyword2", "keyword3"]}. Keep keywords short (1-2 words each).`;

    const commentsText = comments.map((c: any) => c.body).join("\n\n");
    const userPrompt = `Extract the most common keywords from these Reddit comments:\n\n${commentsText.substring(0, 2000)}`;

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
        max_tokens: 150,
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
      return NextResponse.json({
        keywords: extractKeywordsFallback(comments),
        fallback: true,
      });
    }

    const data = await response.json();
    const content = isAnthropic
      ? data.content[0].text
      : data.choices[0].message.content;

    const result = JSON.parse(content);

    return NextResponse.json({
      keywords: result.keywords || extractKeywordsFallback(comments),
    });
  } catch (error) {
    console.error("Keyword extraction error:", error);
    return NextResponse.json({
      keywords: ["fitness", "training", "workout"],
      fallback: true,
    });
  }
}

function extractKeywordsFallback(comments: any[]): string[] {
  // Simple word frequency analysis
  const wordCount: { [key: string]: number } = {};
  const stopWords = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for",
    "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by",
    "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all",
    "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get",
    "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him",
    "know", "take", "people", "into", "year", "your", "good", "some", "could", "them",
    "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "is",
    "was", "are", "been", "has", "had", "were", "said", "did", "having", "may", "should",
    "really", "very", "too", "much", "more", "dont", "doesnt", "didnt", "isnt", "wasnt",
    "arent", "werent", "cant", "couldnt", "wouldnt", "shouldnt", "im", "ive", "id", "youre",
    "hes", "shes", "its", "were", "theyre", "thats", "whats", "heres", "theres"
  ]);

  comments.forEach((comment: any) => {
    const text = (comment.body || "").toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];

    words.forEach((word: string) => {
      if (!stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  // Sort by frequency and take top 5
  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return sorted.length > 0 ? sorted : ["fitness", "training", "workout"];
}
