"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { CampaignData, PostMetrics, CommentData } from "@/lib/types";
import { analyzeSentimentWithAI } from "@/lib/sentiment-api";

// Fetch real Reddit posts from a subreddit
async function fetchSubredditPosts(subreddit: string, limit: number = 5) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LexTrackAI/1.0' }
    });

    if (!res.ok) throw new Error(`Failed to fetch posts`);
    const data = await res.json();

    return data.data.children.map((child: any) => child.data);
  } catch (error) {
    console.error(`Error fetching posts from r/${subreddit}:`, error);
    return [];
  }
}

// Fetch comments for a post
async function fetchPostComments(subreddit: string, postId: string) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LexTrackAI/1.0' }
    });

    if (!res.ok) throw new Error(`Failed to fetch comments`);
    const data = await res.json();

    if (data && data.length >= 2) {
      const commentsData = data[1].data.children;
      return commentsData
        .filter((c: any) => c.kind === 't1' && c.data.body)
        .map((c: any) => c.data);
    }

    return [];
  } catch (error) {
    console.error(`Error fetching comments:`, error);
    return [];
  }
}

// Sentiment badge component
function SentimentBadge({ score }: { score: number }) {
  if (score >= 0.7) {
    return <span className="text-xl">🟢</span>;
  } else if (score >= 0.55) {
    return <span className="text-xl">🟡</span>;
  } else {
    return <span className="text-xl">🔴</span>;
  }
}

// Post type label formatting (simulated for demo)
const postTypes = ["Organic User", "Company Professional", "Subtle Engagement"];

const SENTIMENT_COLORS = ["#10B981", "#9CA3AF", "#EF4444"]; // green, gray, red

// Target subreddits for gym/running/exercise communities
const TARGET_SUBREDDITS = [
  "running",
  "bodybuilding",
  "weightlifting",
  "crossfit",
  "Fitness",
  "GYM",
  "C25K",
  "marathon"
];

export default function DashboardPage() {
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostMetrics | null>(null);

  useEffect(() => {
    async function fetchLiveRedditData() {
      try {
        setLoading(true);

        const allPostMetrics: PostMetrics[] = [];
        const startTime = Date.now() / 1000;

        // Fetch posts from each subreddit
        for (const subreddit of TARGET_SUBREDDITS) {
          const posts = await fetchSubredditPosts(subreddit, 25); // Fetch more to find posts with comments

          // Find first post with actual comments
          let selectedPost = null;
          for (const post of posts) {
            if (post.num_comments && post.num_comments > 0) {
              selectedPost = post;
              break;
            }
          }

          // Process the post if found
          if (selectedPost) {
            // Fetch comments for this post
            const comments = await fetchPostComments(subreddit, selectedPost.id);

            // Only process if we actually got comments back
            if (comments.length > 0) {
              // Analyze top comments with AI
              const topComments: CommentData[] = [];
              for (const c of comments.slice(0, 10)) {
                const sentiment = await analyzeSentimentWithAI(c.body || "");
                topComments.push({
                  author: c.author || "[deleted]",
                  body: (c.body || "").substring(0, 300),
                  score: c.score || 0,
                  sentiment: sentiment.label,
                });
              }

              // Calculate overall sentiment
              const allSentiments: number[] = topComments.map(c => {
                // Use cached sentiment from AI analysis
                if (c.sentiment === "positive") return 0.7;
                if (c.sentiment === "negative") return -0.7;
                return 0;
              });
              const avgSentiment = allSentiments.length > 0
                ? allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length
                : 0;

              // Add to metrics
              allPostMetrics.push({
                subreddit: `r/${subreddit}`,
                post_type: postTypes[Math.floor(Math.random() * postTypes.length)],
                title: selectedPost.title,
                upvotes: selectedPost.score || 0,
                comments: selectedPost.num_comments || 0,
                sentiment_score: (avgSentiment + 1) / 2,
                top_comments: topComments,
              });
            }
          }

          // Rate limiting - wait between subreddits
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Calculate aggregate metrics
        const totalReach = allPostMetrics.reduce((sum, p) => sum + p.upvotes * 15, 0);
        const totalEngagement = allPostMetrics.reduce((sum, p) => sum + p.upvotes + p.comments, 0);
        const avgSentiment = allPostMetrics.length > 0
          ? allPostMetrics.reduce((sum, p) => sum + p.sentiment_score, 0) / allPostMetrics.length
          : 0.5;

        // Generate engagement over time (simulated growth based on current metrics)
        const engagementOverTime = Array.from({ length: 6 }, (_, i) => {
          const hourLabel = new Date(Date.now() - (5 - i) * 3600000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true
          });
          const upvotes = Math.floor(totalEngagement * ((i + 1) / 6) * 0.65);
          const comments = Math.floor(totalEngagement * ((i + 1) / 6) * 0.35);
          return { hour: hourLabel, upvotes, comments };
        });

        // Sentiment distribution
        const positiveCount = allPostMetrics.filter(p => p.sentiment_score >= 0.7).length;
        const neutralCount = allPostMetrics.filter(p => p.sentiment_score >= 0.4 && p.sentiment_score < 0.7).length;
        const negativeCount = allPostMetrics.filter(p => p.sentiment_score < 0.4).length;
        const totalPosts = allPostMetrics.length;

        const sentiment = {
          positive: totalPosts > 0 ? Math.round((positiveCount / totalPosts) * 100) : 50,
          neutral: totalPosts > 0 ? Math.round((neutralCount / totalPosts) * 100) : 30,
          negative: totalPosts > 0 ? Math.round((negativeCount / totalPosts) * 100) : 20,
        };

        // Generate AI-powered recommendation and keywords for each post
        await Promise.all(allPostMetrics.map(async (post) => {
          try {
            // Fetch recommendation
            const recResponse = await fetch('/api/post-recommendation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postData: post }),
            });
            const recData = await recResponse.json();
            post.recommendation = recData.recommendation;

            // Fetch keywords
            const keyResponse = await fetch('/api/keywords', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ comments: post.top_comments }),
            });
            const keyData = await keyResponse.json();
            post.keywords = keyData.keywords || [];
          } catch (error) {
            console.error('Error fetching recommendation/keywords for post:', error);
            post.recommendation = "👍 Solid performance — maintain current strategy";
            post.keywords = [];
          }
        }));

        const data: CampaignData = {
          product_name: "FitMatch",
          posted_at: new Date(startTime * 1000).toISOString(),
          overall: {
            total_reach: totalReach,
            total_engagement: totalEngagement,
            positive_sentiment: avgSentiment,
            active_posts: allPostMetrics.length,
            total_posts: allPostMetrics.length,
          },
          engagement_over_time: engagementOverTime,
          sentiment,
          posts: allPostMetrics,
          recommendations: [],
        };

        setCampaignData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching live Reddit data:", err);
        setError("Failed to load live Reddit data");
        setLoading(false);
      }
    }

    fetchLiveRedditData();
  }, []);


  if (loading) {
    return (
      <div className="section bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-coral text-2xl mb-4">Fetching live Reddit data...</div>
          <p className="text-gray-500">Loading real posts from {TARGET_SUBREDDITS.join(", ")}</p>
          <p className="text-gray-400 text-sm mt-2">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  if (error || !campaignData) {
    return (
      <div className="section bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠ {error || "No data available"}</div>
          <p className="text-gray-500">Unable to fetch live Reddit data</p>
        </div>
      </div>
    );
  }

  const { product_name, overall, engagement_over_time, sentiment, posts, recommendations } = campaignData;

  const sentimentData = [
    { name: "Positive", value: sentiment.positive },
    { name: "Neutral", value: sentiment.neutral },
    { name: "Negative", value: sentiment.negative },
  ];

  // If a post is selected, show detailed view
  if (selectedPost) {
    const positiveComments = selectedPost.top_comments.filter(c => c.sentiment === "positive").length;
    const neutralComments = selectedPost.top_comments.filter(c => c.sentiment === "neutral").length;
    const negativeComments = selectedPost.top_comments.filter(c => c.sentiment === "negative").length;

    const commentSentimentData = [
      { name: "Positive", value: positiveComments, color: "#10B981" },
      { name: "Neutral", value: neutralComments, color: "#9CA3AF" },
      { name: "Negative", value: negativeComments, color: "#EF4444" },
    ];

    return (
      <div className="section bg-white min-h-screen">
        <div className="section-inner">
          {/* Back Button */}
          <button
            onClick={() => setSelectedPost(null)}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-coral transition-colors"
          >
            <span>←</span>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          {/* Post Header */}
          <div className="card mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-bold text-xl text-gray-900">{selectedPost.subreddit}</span>
                  <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">{selectedPost.post_type}</span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-3">{selectedPost.title}</h1>
              </div>
              <SentimentBadge score={selectedPost.sentiment_score} />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="card-label">UPVOTES</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">▲{selectedPost.upvotes}</div>
              </div>
              <div>
                <div className="card-label">COMMENTS</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">💬{selectedPost.comments}</div>
              </div>
              <div>
                <div className="card-label">SENTIMENT</div>
                <div className="text-3xl font-bold text-score-high mt-1">
                  {(selectedPost.sentiment_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            {selectedPost.recommendation && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="card-label mb-2">AI RECOMMENDATION</div>
                <div className="text-base text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  {selectedPost.recommendation}
                </div>
              </div>
            )}
          </div>

          {/* Comment Sentiment Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <div className="card-label mb-4">COMMENT SENTIMENT DISTRIBUTION</div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={commentSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                  >
                    {commentSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-label mb-4">ENGAGEMENT BREAKDOWN</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: "Upvotes", value: selectedPost.upvotes, fill: "#E94560" },
                  { name: "Comments", value: selectedPost.comments, fill: "#9CA3AF" },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Keywords Section */}
          {selectedPost.keywords && selectedPost.keywords.length > 0 && (
            <div className="card mb-8">
              <div className="card-label mb-4">TRENDING KEYWORDS IN COMMENTS</div>
              <div className="flex flex-wrap gap-3">
                {selectedPost.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="text-sm bg-coral/10 text-coral px-4 py-2 rounded-full font-semibold border border-coral/20"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top Comments */}
          <div className="card">
            <div className="card-label mb-4">ALL COMMENTS ({selectedPost.top_comments.length})</div>
            <div className="flex flex-col gap-3">
              {selectedPost.top_comments.map((comment, i) => {
                const sentimentEmoji =
                  comment.sentiment === "positive" ? "🟢" :
                  comment.sentiment === "neutral" ? "🟡" : "🔴";

                return (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{comment.author}</span>
                        <span className="text-xl">{sentimentEmoji}</span>
                      </div>
                      <span className="font-medium text-gray-600">+{comment.score}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="section bg-white min-h-screen">
      <div className="section-inner">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-section">
            <span className="text-bold">Campaign results.</span>{" "}
            <span className="text-muted">Real-time monitoring.</span>
          </h1>
          <p className="text-gray-500 mt-2">
            For "{product_name}" · Live data from Reddit
          </p>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-label">REACH</div>
            <div className="text-4xl font-bold text-gray-900 mt-2">
              {overall.total_reach.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 mt-1">Total impressions</p>
          </div>

          <div className="card">
            <div className="card-label">ENGAGEMENT</div>
            <div className="text-4xl font-bold text-gray-900 mt-2">
              {overall.total_engagement}
            </div>
            <p className="text-sm text-gray-500 mt-1">Upvotes + comments</p>
          </div>

          <div className="card">
            <div className="card-label">POSITIVE SENTIMENT</div>
            <div className="text-4xl font-bold text-score-high mt-2">
              {(overall.positive_sentiment * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">Community reception</p>
          </div>

          <div className="card">
            <div className="card-label">ACTIVE POSTS</div>
            <div className="text-4xl font-bold text-gray-900 mt-2">
              {overall.active_posts}/{overall.total_posts}
            </div>
            <p className="text-sm text-gray-500 mt-1">Posts monitored</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Engagement Over Time */}
          <div className="card">
            <div className="card-label mb-4">ENGAGEMENT OVER TIME</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagement_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="upvotes" stroke="#E94560" strokeWidth={2} name="Upvotes" />
                <Line type="monotone" dataKey="comments" stroke="#9CA3AF" strokeWidth={2} name="Comments" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Breakdown */}
          <div className="card">
            <div className="card-label mb-4">OVERALL SENTIMENT</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry: any) => `${entry.name}: ${entry.value}%`}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Post Cards Grid */}
        <div className="mb-8">
          <h2 className="font-mono font-bold text-xl text-gray-900 mb-4">
            Per-Post Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post, i) => (
              <div
                key={i}
                className="card cursor-pointer group"
                onClick={() => setSelectedPost(post)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-gray-900">{post.subreddit}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {post.post_type}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-coral transition-colors">
                      {post.title}
                    </h3>
                  </div>
                  <SentimentBadge score={post.sentiment_score} />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Upvotes</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">▲{post.upvotes}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Comments</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">💬{post.comments}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Sentiment</div>
                    <div className="text-xl font-bold text-score-high mt-1">
                      {(post.sentiment_score * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* AI Recommendation */}
                {post.recommendation && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">AI RECOMMENDATION</div>
                    <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                      {post.recommendation}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {post.keywords && post.keywords.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">TRENDING KEYWORDS</div>
                    <div className="flex flex-wrap gap-2">
                      {post.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{post.top_comments.length} comments analyzed</span>
                    <span className="text-coral font-medium group-hover:underline">
                      View details →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
