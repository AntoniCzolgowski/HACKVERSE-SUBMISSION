import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { comments } = await request.json();

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: "Comments array is required" },
        { status: 400 }
      );
    }

    // Use sophisticated frequency-based keyword extraction
    const keywords = extractKeywords(comments);

    return NextResponse.json({
      keywords,
    });
  } catch (error) {
    console.error("Keyword extraction error:", error);
    return NextResponse.json({
      keywords: [],
    });
  }
}

function extractKeywords(comments: any[]): string[] {
  // Sophisticated word frequency analysis with enhanced filtering
  const wordCount: { [key: string]: number } = {};

  // Comprehensive stop words list - common words that aren't meaningful keywords
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
    "hes", "shes", "its", "were", "theyre", "thats", "whats", "heres", "theres",
    // Additional generic words to filter out
    "going", "got", "getting", "still", "yeah", "yes", "thing", "things", "stuff",
    "something", "anything", "everything", "someone", "anyone", "everyone", "maybe",
    "probably", "actually", "basically", "literally", "definitely", "right", "wrong",
    "better", "best", "worse", "worst", "lot", "lots", "bit", "little", "big", "small",
    "great", "nice", "fine", "okay", "sure", "whatever", "though", "however", "whether",
    "seems", "seem", "seemed", "feels", "feel", "felt", "means", "mean", "meant"
  ]);

  // Count word frequencies across all comments
  comments.forEach((comment: any) => {
    const text = (comment.body || "").toLowerCase();
    // Match words with 4+ characters (more meaningful than 3)
    const words = text.match(/\b[a-z]{4,}\b/g) || [];

    words.forEach((word: string) => {
      if (!stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  // Filter out words that appear only once (likely not trending)
  const frequentWords = Object.entries(wordCount)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  // If we have frequent words, return top 3-5 based on how many we found
  if (frequentWords.length > 0) {
    const topCount = Math.min(5, Math.max(3, frequentWords.length));
    return frequentWords
      .slice(0, topCount)
      .map(([word]) => word);
  }

  // If no frequent words, fall back to top unique words (even if they appear once)
  const allWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  return allWords.length > 0 ? allWords : [];
}
