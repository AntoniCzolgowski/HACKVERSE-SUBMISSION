import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { postData } = await request.json();

    if (!postData) {
      return NextResponse.json(
        { error: "Post data is required" },
        { status: 400 }
      );
    }

    // Generate smart recommendation based on post metrics
    const recommendation = generateSmartRecommendation(postData);

    return NextResponse.json({
      recommendation,
    });
  } catch (error) {
    console.error("Post recommendation error:", error);
    return NextResponse.json({
      recommendation: "Monitor performance and adjust strategy as needed",
    });
  }
}

function generateSmartRecommendation(postData: any): string {
  const sentiment = postData.sentiment_score || 0.5;
  const upvotes = postData.upvotes || 0;
  const comments = postData.comments || 0;
  const engagement = upvotes + comments;

  // Use title hash for deterministic but varied selection within each category
  const titleHash = (postData.title || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const variation = titleHash % 3;

  // CATEGORY 1: Viral Winner (High engagement + Positive sentiment)
  if (sentiment >= 0.7 && engagement > 100) {
    const options = [
      "🚀 Viral success — replicate this approach across similar communities",
      "🏆 Top performer — document this strategy for future campaigns",
      "⭐ Winning formula — scale this content style to related subreddits"
    ];
    return options[variation];
  }

  // CATEGORY 2: Strong Positive Engagement (Positive sentiment + Good comments)
  if (sentiment >= 0.7 && comments >= 15) {
    const options = [
      "💬 Active community love — engage in comments to build brand loyalty",
      "✨ Positive buzz — leverage this momentum with follow-up content",
      "🎯 Community champion — continue this conversation strategy"
    ];
    return options[variation];
  }

  // CATEGORY 3: Quiet Success (Positive sentiment + Low engagement)
  if (sentiment >= 0.7 && engagement < 50) {
    const options = [
      "💡 Quality reception — boost visibility with cross-posting",
      "🌟 Hidden gem — promote during peak traffic hours for wider reach",
      "📣 Great content, low visibility — consider strategic amplification"
    ];
    return options[variation];
  }

  // CATEGORY 4: Discussion Heavy (Many comments relative to upvotes)
  if (comments >= 20 && comments > upvotes * 0.6) {
    const options = [
      "🗨️ Conversation catalyst — participate actively to shape narrative",
      "👥 High engagement — nurture this discussion for community building",
      "💭 Debate driver — use insights to refine messaging approach"
    ];
    return options[variation];
  }

  // CATEGORY 5: Controversial/Mixed (High engagement + Low/neutral sentiment)
  if (engagement > 80 && sentiment < 0.55) {
    const options = [
      "⚡ Polarizing content — address concerns directly in comments",
      "⚖️ Mixed reactions — analyze feedback to refine value proposition",
      "🔄 Active debate — engage authentically to shift perception"
    ];
    return options[variation];
  }

  // CATEGORY 6: Poor Reception (Low sentiment + Multiple comments)
  if (sentiment < 0.4 && comments >= 8) {
    const options = [
      "🚨 Negative feedback — reassess community fit and messaging angle",
      "🔍 Mismatch detected — pivot strategy or explore different subreddits",
      "⚠️ Critical response — learn from objections and adjust approach"
    ];
    return options[variation];
  }

  // CATEGORY 7: Low Traction (Very low engagement)
  if (engagement < 30) {
    const options = [
      "📈 Low visibility — optimize posting time (evenings/weekends)",
      "🕐 Timing issue — test different days and hours for this community",
      "🎯 Missed the mark — study top posts to match community interests"
    ];
    return options[variation];
  }

  // CATEGORY 8: Moderate Performer (Medium engagement, neutral sentiment)
  if (engagement >= 30 && engagement <= 80 && sentiment >= 0.5 && sentiment < 0.7) {
    const options = [
      "📊 Solid baseline — A/B test headlines to boost engagement",
      "🔧 Room to grow — add compelling CTAs in post body and comments",
      "💼 Steady traction — experiment with storytelling to deepen impact"
    ];
    return options[variation];
  }

  // CATEGORY 9: Silent Post (Few/no comments, some upvotes)
  if (upvotes >= 20 && comments < 5) {
    const options = [
      "👀 Passive interest — ask questions in comments to spark discussion",
      "🤔 Viewed but quiet — add conversation starters to drive engagement",
      "💬 Lurker appeal — prompt community interaction with open-ended asks"
    ];
    return options[variation];
  }

  // DEFAULT: General guidance based on sentiment
  if (sentiment >= 0.6) {
    return "✅ Positive reception — maintain consistency and monitor trends";
  } else if (sentiment < 0.5) {
    return "🔄 Review and refine — analyze feedback for strategic adjustments";
  }

  return "📌 Baseline established — continue testing and optimizing";
}
