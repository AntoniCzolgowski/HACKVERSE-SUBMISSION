"""
Pydantic models for published posts and campaigns
"""
from pydantic import BaseModel
from typing import Optional


class SubredditContext(BaseModel):
    score: float
    subscribers: int
    active_users: int
    rules: list[str]


class PublishedPost(BaseModel):
    subreddit: str
    post_type: str
    title: str
    body: str
    why_this_post_fits: str
    confidence_score: float
    recommended_cadence: str
    why_subreddit_selected: str
    subreddit_context: SubredditContext


class ProductInfo(BaseModel):
    name: str
    description: str
    niche_category: str
    target_audience: str
    keywords: list[str]


class PublishRequest(BaseModel):
    product: ProductInfo
    published_posts: list[PublishedPost]
    total_posts: int
    published_at: str
    status: str = "published"


class CommentData(BaseModel):
    author: str
    body: str
    score: int
    sentiment: Optional[str] = None
    persona_id: Optional[int] = None
    persona_name: Optional[str] = None


class PostMetrics(BaseModel):
    subreddit: str
    post_type: str
    title: str
    body: str
    upvotes: int
    comments: int
    sentiment_score: float
    top_comments: list[CommentData]
    reddit_url: Optional[str] = None
    recommendation: Optional[str] = None
    keywords: Optional[list[str]] = None
    why_this_post_fits: Optional[str] = None
    why_subreddit_selected: Optional[str] = None


class CampaignResponse(BaseModel):
    campaign_id: str
    product_name: str
    posted_at: str
    overall: dict
    engagement_over_time: list[dict]
    sentiment: dict
    posts: list[PostMetrics]
    recommendations: list[str]
