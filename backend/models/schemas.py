from pydantic import BaseModel


class ProductInput(BaseModel):
    product_name: str
    product_description: str
    niche_category: str
    target_audience: str
    keywords: list[str]


class SubredditResult(BaseModel):
    name: str
    url: str
    reason: str


class DiscoveryResponse(BaseModel):
    product_name: str
    subreddits: list[SubredditResult]


# --- Post Generation ---

class ScrapedPostInput(BaseModel):
    title: str
    upvotes: int = 0
    num_comments: int = 0
    url: str = ""


class ScoreBreakdownInput(BaseModel):
    semantic: float = 0.0
    tolerance: float = 0.0
    activity: float = 0.0


class SubredditInput(BaseModel):
    subreddit: str
    description: str = ""
    subscribers: int = 0
    active_users: int = 0
    rules: list[str] = []
    recent_posts: list[ScrapedPostInput] = []
    final_score: float = 0.0
    breakdown: ScoreBreakdownInput = ScoreBreakdownInput()


class GenerateRequest(BaseModel):
    product_name: str
    product_description: str
    niche_category: str
    target_audience: str
    keywords: list[str]
    subreddits: list[SubredditInput]


class PostDraft(BaseModel):
    type: str
    label: str
    title: str
    body: str
    strategy: str
    confidence_score: float = 0.5
    recommended_cadence: str = ""


class SubredditDrafts(BaseModel):
    subreddit: str
    drafts: list[PostDraft]


class GenerateResponse(BaseModel):
    product_name: str
    subreddit_drafts: list[SubredditDrafts]
