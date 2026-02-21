export interface DiscoverRequest {
  product_name: string;
  product_description: string;
  niche_category: string;
  target_audience: string;
  keywords: string[];
}

export interface PostDraft {
  type: "organic_user" | "company_professional" | "subtle_engagement";
  label: string;
  title: string;
  body: string;
  strategy: string;
}

export interface SubredditResult {
  name: string;
  display_name: string;
  relevance_score: number;
  reasoning: string[];
  subscribers: number;
  active_users: number;
  rules_summary: string[];
  community_tone: string;
  recent_topics: string[];
  post_drafts: PostDraft[];
}

export interface DiscoverResponse {
  request_id: string;
  product_name: string;
  enhanced_queries: string[];
  subreddits: SubredditResult[];
}

export interface PublishPost {
  subreddit: string;
  title: string;
  body: string;
  post_type: string;
}

export interface PublishRequest {
  request_id: string;
  posts: PublishPost[];
}

export interface PublishResult {
  subreddit: string;
  status: "posted" | "failed" | "simulated";
  reddit_url: string;
  post_id: string;
}

export interface PublishResponse {
  results: PublishResult[];
}

export interface CommentData {
  author: string;
  body: string;
  score: number;
  sentiment: "positive" | "neutral" | "negative";
}

export interface PostMetrics {
  subreddit: string;
  post_type: string;
  title: string;
  upvotes: number;
  comments: number;
  sentiment_score: number;
  top_comments: CommentData[];
}

export interface CampaignData {
  product_name: string;
  posted_at: string;
  overall: {
    total_reach: number;
    total_engagement: number;
    positive_sentiment: number;
    active_posts: number;
    total_posts: number;
  };
  engagement_over_time: { hour: string; upvotes: number; comments: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  posts: PostMetrics[];
  recommendations: string[];
}
