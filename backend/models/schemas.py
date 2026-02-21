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
