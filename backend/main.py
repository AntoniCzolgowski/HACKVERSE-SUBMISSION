import json
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from models.schemas import ProductInput
from services.subreddit_discovery import discover_subreddits
from services.website_extract import extract_product_from_url
from services.reddit_scraper import scrape_and_rank, scrape_and_rank_stream

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
