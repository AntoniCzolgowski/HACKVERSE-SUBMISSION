import { NextRequest, NextResponse } from "next/server";

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const API_URL = process.env.SENTIMENT_API_URL || "";
const API_KEY = process.env.SENTIMENT_API_KEY || "";
const isAnthropic = API_URL.includes("anthropic.com");

export async function POST(request: NextRequest) {
  try {
    const { postData } = await request.json();

    if (!postData) {
      return NextResponse.json(
        { error: "Post data is required" },
        { status: 400 }
      );
    }

    // Fallback response if no API configured
    if (!API_URL || !API_KEY || API_KEY.includes("your-api-key-here")) {
      return NextResponse.json({
        recommendation: generateFallbackRecommendation(postData),
        fallback: true,
      });
    }

    const systemPrompt = `You are an expert Reddit marketing strategist analyzing post performance data. Your task is to provide ONE specific, actionable marketing recommendation based on the unique characteristics of each post.

Guidelines:
- Analyze engagement metrics (upvotes, comments) relative to the subreddit size and type
- Consider sentiment patterns from top comments to identify audience reception
- Provide tactical, data-driven recommendations that vary based on performance patterns
- Focus on next actions: content optimization, timing, engagement tactics, or strategic pivots
- Keep recommendations professional, concise (max 80 chars), and unique to this specific post's data
- Avoid generic advice; tailor to the specific metrics and subreddit context

Response format: {"recommendation": "your specific recommendation here"}`;

    const engagement = postData.upvotes + postData.comments;
    const engagementLevel = engagement > 150 ? "high" : engagement > 50 ? "moderate" : "low";
    const sentimentLabel = postData.sentiment_score > 0.6 ? "positive" : postData.sentiment_score < 0.3 ? "negative" : "neutral";

    const postSummary = {
      subreddit: postData.subreddit,
      title: postData.title,
      upvotes: postData.upvotes,
      comments: postData.comments,
      total_engagement: engagement,
      engagement_level: engagementLevel,
      sentiment_score: postData.sentiment_score,
      sentiment_label: sentimentLabel,
      top_comment_sentiments: postData.top_comments?.slice(0, 3).map((c: any) => c.sentiment) || [],
      post_type: postData.post_type
    };

    const userPrompt = `Generate a unique marketing recommendation for this specific Reddit post. Consider the engagement level (${engagementLevel}), sentiment (${sentimentLabel}), and subreddit context:\n\n${JSON.stringify(postSummary, null, 2)}`;

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
        max_tokens: 10000,
        temperature: 0.9,
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
        temperature: 0.9,
        max_tokens: 200,
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
        recommendation: generateFallbackRecommendation(postData),
        fallback: true,
      });
    }

    const data = await response.json();
    const content = isAnthropic
      ? data.content[0].text
      : data.choices[0].message.content;

    const result = JSON.parse(content);

    return NextResponse.json({
      recommendation: result.recommendation || generateFallbackRecommendation(postData),
    });
  } catch (error) {
    console.error("Post recommendation error:", error);
    return NextResponse.json({
      recommendation: generateFallbackRecommendation(request.body),
      fallback: true,
    });
  }
}

function generateFallbackRecommendation(postData: any): string {
  const sentiment = postData.sentiment_score || 0.5;
  const engagement = (postData.upvotes || 0) + (postData.comments || 0);
  const upvotes = postData.upvotes || 0;
  const comments = postData.comments || 0;
  const subreddit = postData.subreddit || "";

  // Use a hash of the title to create deterministic but varied recommendations
  const titleHash = (postData.title || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const variation = titleHash % 3;

  // High performer (high engagement + positive sentiment)
  if (sentiment > 0.7 && engagement > 150) {
    const recs = [
      "🔥 Top performer — analyze and replicate this content approach",
      "⭐ Viral potential — consider follow-up post in similar subreddits",
      "🎯 Strong resonance — leverage this format for future campaigns"
    ];
    return recs[variation];
  }

  // Great sentiment but lower engagement
  if (sentiment > 0.7 && engagement <= 150) {
    const recs = [
      "✨ Positive reception — boost with strategic cross-posting",
      "💡 High sentiment score — expand reach through partner subreddits",
      "📣 Good vibes detected — increase visibility with timing optimization"
    ];
    return recs[variation];
  }

  // High engagement but mixed sentiment
  if (engagement > 100 && sentiment < 0.5) {
    const recs = [
      "⚠️ High visibility, mixed reactions — refine messaging tone",
      "🔄 Active discussion — address concerns in comment engagement",
      "📊 Controversial topic — pivot approach or double down strategically"
    ];
    return recs[variation];
  }

  // Low sentiment
  if (sentiment < 0.35) {
    const recs = [
      "🚨 Negative sentiment — reassess product-market fit for this community",
      "⚡ Poor reception — test different value proposition angle",
      "🔍 Community mismatch — consider alternative subreddit targeting"
    ];
    return recs[variation];
  }

  // Comment-heavy (high discussion)
  if (comments > upvotes * 0.8 && comments > 20) {
    const recs = [
      "💬 Discussion-heavy — engage directly to build community trust",
      "🗨️ Active debate — participate to showcase expertise and authenticity",
      "👥 Strong engagement — nurture these conversations for brand building"
    ];
    return recs[variation];
  }

  // Low engagement
  if (engagement < 40) {
    const recs = [
      "📈 Low traction — test posting during peak hours (6-9 PM EST)",
      "🕐 Timing issue — schedule for weekday evenings for better visibility",
      "🎯 Refine targeting — analyze top posts in this subreddit for patterns"
    ];
    return recs[variation];
  }

  // Moderate engagement, neutral sentiment
  if (engagement >= 40 && engagement <= 100) {
    const recs = [
      "📊 Steady performance — A/B test headline formats for optimization",
      "🔧 Room to grow — add compelling call-to-action in comments",
      "💼 Baseline established — experiment with storytelling approach"
    ];
    return recs[variation];
  }

  // Default positive
  return "✅ Solid baseline — maintain consistency and monitor trends";
}
