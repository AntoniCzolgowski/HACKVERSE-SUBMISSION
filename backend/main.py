import json
import random
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from models.schemas import ProductInput, GenerateRequest, GenerateResponse, SubredditDrafts
from models.published_posts_schemas import PublishRequest, CampaignResponse, PostMetrics, CommentData
from services.subreddit_discovery import discover_subreddits
from services.website_extract import extract_product_from_url
from services.reddit_scraper import scrape_and_rank, scrape_and_rank_stream
from services.post_generator import generate_all_posts
from services.campaign_storage import save_campaign, get_latest_campaign
from services.persona_comments import generate_comments_for_post_async
import asyncio

app = FastAPI(title="LexTrack AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# ==========================================
#  /api/discover — subreddit discovery
# ==========================================

@app.post("/api/discover")
async def api_discover(product: ProductInput):
    """Takes product info, returns 5 relevant subreddit URLs via Claude."""
    try:
        result = discover_subreddits(product)
        return result
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==========================================
#  /api/autofill — extract product info from URL
# ==========================================

class AutofillRequest(BaseModel):
    url: str


@app.post("/api/autofill")
async def api_autofill(body: AutofillRequest):
    """Fetch a website URL and extract product info via Claude."""
    try:
        fields = extract_product_from_url(body.url)
        return JSONResponse(content={"ok": True, "fields": fields})
    except Exception as e:
        return JSONResponse(content={"ok": False, "error": str(e)}, status_code=400)


# ==========================================
#  /api/scrape — scrape & rank subreddits
# ==========================================

class ScrapeRequest(BaseModel):
    subreddit_names: list[str]
    product_description: str


@app.post("/api/scrape")
async def api_scrape(body: ScrapeRequest):
    """Takes subreddit names, scrapes live data, scores & ranks them."""
    try:
        result = scrape_and_rank(body.subreddit_names, body.product_description)
        return result
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==========================================
#  /api/scrape-stream — SSE scrape with progress
# ==========================================

@app.post("/api/scrape-stream")
async def api_scrape_stream(body: ScrapeRequest):
    """SSE endpoint: streams progress events during scrape & rank."""
    def event_generator():
        try:
            for event in scrape_and_rank_stream(body.subreddit_names, body.product_description):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'phase': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ==========================================
#  /api/generate — AI post generation
# ==========================================

@app.post("/api/generate")
async def api_generate(body: GenerateRequest):
    """Takes product info + scraped subreddits, generates tailored post drafts."""
    try:
        product = {
            "product_name": body.product_name,
            "product_description": body.product_description,
            "niche_category": body.niche_category,
            "target_audience": body.target_audience,
            "keywords": body.keywords,
        }
        subreddits = [s.model_dump() for s in body.subreddits]
        results = generate_all_posts(product, subreddits)
        return GenerateResponse(
            product_name=body.product_name,
            subreddit_drafts=[SubredditDrafts(**r) for r in results],
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==========================================
#  /api/campaigns/publish — Save & process campaign
# ==========================================

@app.post("/api/campaigns/publish")
async def api_publish_campaign(body: PublishRequest):
    """
    Receives published posts, generates persona comments, analyzes sentiment,
    generates recommendations and keywords, then saves the campaign.
    OPTIMIZED: Uses parallel API calls for faster processing.
    """
    try:
        from anthropic import AsyncAnthropic
        import os
        anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Process each post in parallel
        async def process_single_post(post):
            # Prepare post data for comment generation
            post_data = {
                "subreddit": post.subreddit,
                "post_type": post.post_type,
                "title": post.title,
                "body": post.body
            }

            # Generate 2-15 persona-based comments (parallelized internally)
            num_comments = random.randint(2, 15)
            comments = await generate_comments_for_post_async(post_data, num_comments)

            # Analyze sentiment for all comments in parallel
            async def analyze_sentiment(comment):
                sentiment_prompt = f"Analyze the sentiment of this comment. Reply with ONLY one word: 'positive', 'neutral', or 'negative'.\n\nComment: {comment['body']}"
                sentiment_response = await anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=10,
                    messages=[{"role": "user", "content": sentiment_prompt}]
                )
                sentiment_label = sentiment_response.content[0].text.strip().lower()
                comment["sentiment"] = sentiment_label
                return comment

            # Run all sentiment analyses in parallel
            comments = await asyncio.gather(*[analyze_sentiment(c) for c in comments])

            # Calculate overall sentiment score
            positive_count = sum(1 for c in comments if c.get("sentiment") == "positive")
            negative_count = sum(1 for c in comments if c.get("sentiment") == "negative")
            total = len(comments)
            sentiment_score = (positive_count + (total - positive_count - negative_count) * 0.5) / total if total > 0 else 0.5

            # Generate upvote count (simulated based on sentiment)
            base_upvotes = random.randint(50, 500)
            upvotes = int(base_upvotes * (0.5 + sentiment_score))

            # Create comment data objects
            comment_objects = [
                CommentData(
                    author=c["author"],
                    body=c["body"],
                    score=c["score"],
                    sentiment=c.get("sentiment"),
                    persona_id=c.get("persona_id"),
                    persona_name=c.get("persona_name")
                ) for c in comments
            ]

            # Generate AI recommendation and extract keywords in parallel
            rec_prompt = f"""Based on this Reddit post performance, provide a brief recommendation (1 sentence):
Post: {post.title}
Subreddit: {post.subreddit}
Upvotes: {upvotes}
Comments: {len(comments)}
Sentiment Score: {sentiment_score:.0%}

Reply with a concise recommendation starting with an emoji."""

            all_text = " ".join([c["body"] for c in comments])
            keyword_prompt = f"""Extract 3-5 trending keywords or phrases from these comments. Return ONLY a JSON array of strings.

Comments: {all_text[:1000]}"""

            # Run recommendation and keyword extraction in parallel
            rec_response, keyword_response = await asyncio.gather(
                anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=100,
                    messages=[{"role": "user", "content": rec_prompt}]
                ),
                anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=100,
                    messages=[{"role": "user", "content": keyword_prompt}]
                )
            )

            recommendation = rec_response.content[0].text.strip()
            keywords_text = keyword_response.content[0].text.strip()

            # Parse keywords
            try:
                keywords = json.loads(keywords_text)
            except:
                # Fallback if not valid JSON
                keywords = ["engagement", "community", "discussion"]

            # Build post metrics
            return PostMetrics(
                subreddit=post.subreddit,
                post_type=post.post_type,
                title=post.title,
                body=post.body,
                upvotes=upvotes,
                comments=len(comments),
                sentiment_score=sentiment_score,
                top_comments=comment_objects,
                recommendation=recommendation,
                keywords=keywords,
                why_this_post_fits=post.why_this_post_fits,
                why_subreddit_selected=post.why_subreddit_selected
            )

        # Process all posts in parallel
        processed_posts = await asyncio.gather(*[process_single_post(post) for post in body.published_posts])

        # Calculate overall metrics
        total_reach = sum(p.upvotes * 15 for p in processed_posts)
        total_engagement = sum(p.upvotes + p.comments for p in processed_posts)
        avg_sentiment = sum(p.sentiment_score for p in processed_posts) / len(processed_posts) if processed_posts else 0.5

        # Engagement over time (simulated)
        engagement_over_time = []
        for i in range(6):
            from datetime import datetime, timedelta
            hour_label = (datetime.now() - timedelta(hours=5-i)).strftime("%I%p")
            upvotes = int(total_engagement * ((i + 1) / 6) * 0.65)
            comments_count = int(total_engagement * ((i + 1) / 6) * 0.35)
            engagement_over_time.append({
                "hour": hour_label,
                "upvotes": upvotes,
                "comments": comments_count
            })

        # Sentiment distribution
        positive_posts = sum(1 for p in processed_posts if p.sentiment_score >= 0.7)
        neutral_posts = sum(1 for p in processed_posts if 0.4 <= p.sentiment_score < 0.7)
        negative_posts = sum(1 for p in processed_posts if p.sentiment_score < 0.4)
        total_posts = len(processed_posts)

        sentiment = {
            "positive": int((positive_posts / total_posts) * 100) if total_posts > 0 else 50,
            "neutral": int((neutral_posts / total_posts) * 100) if total_posts > 0 else 30,
            "negative": int((negative_posts / total_posts) * 100) if total_posts > 0 else 20
        }

        # Build campaign data
        campaign_data = {
            "product": body.product.model_dump(),
            "published_posts": [p.model_dump() for p in processed_posts],
            "posted_at": body.published_at,
            "overall": {
                "total_reach": total_reach,
                "total_engagement": total_engagement,
                "positive_sentiment": avg_sentiment,
                "active_posts": len(processed_posts),
                "total_posts": len(processed_posts)
            },
            "engagement_over_time": engagement_over_time,
            "sentiment": sentiment,
            "posts": [p.model_dump() for p in processed_posts],
            "recommendations": []
        }

        # Save campaign
        campaign_id = save_campaign(campaign_data)

        return JSONResponse(content={
            "success": True,
            "campaign_id": campaign_id,
            "message": f"Campaign published with {len(processed_posts)} posts"
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==========================================
#  /api/campaigns/latest — Get latest campaign
# ==========================================

@app.get("/api/campaigns/latest")
async def api_get_latest_campaign():
    """Get the most recently published campaign."""
    try:
        campaign = get_latest_campaign()
        if not campaign:
            return JSONResponse(content={"error": "No campaigns found"}, status_code=404)
        return campaign
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
