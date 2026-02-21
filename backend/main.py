from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models.schemas import ProductInput
from services.subreddit_discovery import discover_subreddits
from services.website_extract import extract_product_from_url

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
#  FUTURE ENDPOINTS
# ==========================================

# from routers import generate, publish, monitor
# app.include_router(generate.router, prefix="/api")
# app.include_router(publish.router, prefix="/api")
# app.include_router(monitor.router, prefix="/api")
