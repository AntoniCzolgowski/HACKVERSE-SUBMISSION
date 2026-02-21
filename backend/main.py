from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ProductInput
from services.subreddit_discovery import discover_subreddits

app = FastAPI(title="LexTrack AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")


@app.get("/health")
def health():
    return {"status": "ok"}


# ==========================================
#  TEST PAGE - Remove before production
# ==========================================

@app.get("/test", response_class=HTMLResponse)
async def test_form(request: Request):
    """Show the test form"""
    return templates.TemplateResponse("test.html", {
        "request": request,
        "results": None,
        "error": None,
        "prefill": {
            "product_name": "FitMatch",
            "product_description": "A niche dating app for gym and fitness enthusiasts who want to find partners that share their active lifestyle",
            "niche_category": "Fitness & Dating",
            "target_audience": "Gym-goers aged 20-35 looking for partners who share their fitness lifestyle",
            "keywords": "gym dating, fitness singles, workout partner, gym crush"
        }
    })


@app.post("/test", response_class=HTMLResponse)
async def test_submit(
    request: Request,
    product_name: str = Form(...),
    product_description: str = Form(...),
    niche_category: str = Form(...),
    target_audience: str = Form(...),
    keywords: str = Form(...)
):
    """Process the test form and show results"""
    try:
        product = ProductInput(
            product_name=product_name,
            product_description=product_description,
            niche_category=niche_category,
            target_audience=target_audience,
            keywords=[k.strip() for k in keywords.split(",") if k.strip()]
        )

        result = discover_subreddits(product)

        return templates.TemplateResponse("test.html", {
            "request": request,
            "results": result,
            "error": None,
            "prefill": {
                "product_name": product_name,
                "product_description": product_description,
                "niche_category": niche_category,
                "target_audience": target_audience,
                "keywords": keywords
            }
        })
    except Exception as e:
        return templates.TemplateResponse("test.html", {
            "request": request,
            "results": None,
            "error": str(e),
            "prefill": {
                "product_name": product_name,
                "product_description": product_description,
                "niche_category": niche_category,
                "target_audience": target_audience,
                "keywords": keywords
            }
        })


# ==========================================
#  FUTURE API ENDPOINTS (Nivid plugs in here)
# ==========================================

# from routers import discover, generate, publish, monitor
# app.include_router(discover.router, prefix="/api")
# app.include_router(generate.router, prefix="/api")
# app.include_router(publish.router, prefix="/api")
# app.include_router(monitor.router, prefix="/api")
