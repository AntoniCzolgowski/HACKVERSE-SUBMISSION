/**
 * Sentiment Analysis & AI Recommendations API Service
 *
 * This service handles sentiment analysis and generates AI-powered recommendations
 * using external AI APIs (OpenAI or Anthropic Claude).
 */

export interface SentimentResult {
  label: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
}

const API_URL = process.env.NEXT_PUBLIC_SENTIMENT_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_SENTIMENT_API_KEY || "";

// Detect if we're using Anthropic or OpenAI based on URL
const isAnthropic = API_URL.includes("anthropic.com");

/**
 * Analyze sentiment of a text using AI (via backend API route)
 */
export async function analyzeSentimentWithAI(text: string): Promise<SentimentResult> {
  try {
    const response = await fetch('/api/sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.warn("Sentiment API failed, using fallback");
      return basicSentimentAnalysis(text);
    }

    const result = await response.json();

    // If the backend used fallback, log it
    if (result.fallback) {
      console.log("Using fallback sentiment analysis");
    }

    return {
      label: result.label || "neutral",
      score: result.score || 0,
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return basicSentimentAnalysis(text);
  }
}

/**
 * Analyze multiple comments in batch
 */
export async function analyzeBatchSentiment(comments: string[]): Promise<SentimentResult[]> {
  // For performance, we'll analyze in parallel but with a limit
  const batchSize = 5;
  const results: SentimentResult[] = [];

  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(comment => analyzeSentimentWithAI(comment))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Fallback: Basic keyword-based sentiment analysis
 */
function basicSentimentAnalysis(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  // Expanded keyword lists for better accuracy
  const positiveWords = [
    "great", "awesome", "cool", "love", "excellent", "good", "amazing", "helpful",
    "useful", "interesting", "thanks", "perfect", "agree", "yes", "nice", "thank",
    "best", "better", "fantastic", "wonderful", "brilliant", "outstanding", "superb",
    "appreciate", "enjoy", "enjoyed", "recommend", "congrats", "congratulations",
    "success", "successful", "win", "winning", "proud", "motivated", "inspiring",
    "progress", "improvement", "helped", "works", "working", "effective"
  ];

  const negativeWords = [
    "bad", "terrible", "awful", "hate", "stupid", "spam", "ad", "sucks", "worst",
    "scam", "fake", "wrong", "no", "never", "horrible", "useless", "waste",
    "disappointed", "disappointing", "frustrating", "annoying", "annoyed", "angry",
    "fail", "failed", "failure", "problem", "issue", "difficult", "hard", "struggling"
  ];

  let score = 0;
  let wordCount = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score += 0.2 * matches.length;
      wordCount += matches.length;
    }
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score -= 0.2 * matches.length;
      wordCount += matches.length;
    }
  });

  // Normalize score based on text length
  const textLength = text.split(/\s+/).length;
  if (textLength > 0) {
    score = score / Math.sqrt(textLength / 10);
  }

  score = Math.max(-1, Math.min(1, score));

  return {
    label: score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral",
    score,
    confidence: wordCount > 0 ? 0.7 : 0.5, // Higher confidence if we found keywords
  };
}
