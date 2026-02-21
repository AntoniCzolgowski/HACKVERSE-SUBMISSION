"""
Reddit Subreddit Scraper & Ranker
Adapted from Nivid's final_scrapper_reddit.py

Takes subreddit names (from Claude discovery), scrapes live data,
scores them with semantic similarity + tolerance + activity, returns ranked JSON.
"""

import os
import json
import math
import time
import requests
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

# Lazy-loaded globals
_embed_model = None
_client = None

HEADERS = {"User-Agent": "LexTrackAI_Hackathon_Bot_v1.0 (by /u/lextrack_ai)"}


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _get_client():
    global _client
    if _client is None:
        _client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


# ------------------------------------------------------------------
# Scraping (public Reddit JSON endpoints, no API key needed)
# ------------------------------------------------------------------

def scrape_subreddit_rules(subreddit: str) -> list[str]:
    url = f"https://www.reddit.com/r/{subreddit}/about/rules.json"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        rules = []
        for rule in resp.json().get("rules", []):
            rules.append(rule.get("short_name", "") + ": " + rule.get("description", ""))
        time.sleep(1.5)
        return rules
    except Exception as e:
        print(f"[scraper] Error fetching rules for {subreddit}: {e}")
        return []


def scrape_subreddit_about(subreddit: str) -> dict:
    url = f"https://www.reddit.com/r/{subreddit}/about.json"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return {}
        data = resp.json().get("data", {})
        time.sleep(1.5)
        return {
            "description": data.get("public_description", ""),
            "subscribers": data.get("subscribers", 0),
            "active_users": data.get("accounts_active", 0),
        }
    except Exception as e:
        print(f"[scraper] Error fetching about for {subreddit}: {e}")
        return {}


def scrape_subreddit_posts(subreddit: str, limit: int = 5) -> list[dict]:
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        children = resp.json().get("data", {}).get("children", [])
        posts = []
        for post in children:
            p = post.get("data", {})
            if not p.get("stickied"):
                posts.append({
                    "title": p.get("title", ""),
                    "upvotes": p.get("score", 0),
                    "num_comments": p.get("num_comments", 0),
                    "url": f"https://www.reddit.com{p.get('permalink', '')}",
                })
        time.sleep(1.5)
        return posts
    except Exception as e:
        print(f"[scraper] Error fetching posts for {subreddit}: {e}")
        return []


def gather_live_data(subreddit_names: list[str], on_progress=None) -> dict:
    """Scrape all target subreddits, return structured data.
    on_progress(phase, subreddit, index, total) is called after each subreddit.
    """
    live_data = {}
    total = len(subreddit_names)
    for i, sub in enumerate(subreddit_names):
        print(f"[scraper] Scraping r/{sub}...")
        if on_progress:
            on_progress("scraping", sub, i, total)
        about = scrape_subreddit_about(sub)
        live_data[sub] = {
            "description": about.get("description", ""),
            "subscribers": about.get("subscribers", 0),
            "active_users": about.get("active_users", 0),
            "rules": scrape_subreddit_rules(sub),
            "recent_posts": scrape_subreddit_posts(sub),
        }
    return live_data


# ------------------------------------------------------------------
# AI Scoring & Ranking
# ------------------------------------------------------------------

def _min_max_scale(values: dict) -> dict:
    scores = list(values.values())
    if not scores:
        return {}
    min_val, max_val = min(scores), max(scores)
    if max_val == min_val:
        return {k: 0.5 for k in values}
    return {k: (v - min_val) / (max_val - min_val) for k, v in values.items()}


def _get_tolerance_score(subreddit: str, description: str, rules: list[str]) -> float:
    system_prompt = """You are an AI community guidelines analyzer. Read the provided subreddit description and rules.
Rate the subreddit's tolerance for self-promotion, marketing, or sharing new products on a scale from 0.0 to 1.0.
0.0 = Strictly forbids all self-promotion, marketing, or links. Instant ban risk.
0.5 = Allows it conditionally (e.g., only in specific megathreads, or requires high participation first).
1.0 = Openly encourages sharing projects, self-promotion, or has absolutely no rules against it.

Output STRICTLY as a JSON object with a single key "tolerance_score" containing the float value."""

    content = f"Subreddit: {subreddit}\nDescription: {description}\nRules: {json.dumps(rules)}"

    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            system=system_prompt,
            messages=[
                {"role": "user", "content": content},
                {"role": "assistant", "content": "{"},
            ],
        )
        parsed = json.loads("{" + response.content[0].text)
        return float(parsed.get("tolerance_score", 0.0))
    except Exception as e:
        print(f"[scraper] Error getting tolerance for {subreddit}: {e}")
        return 0.0


def rank_subreddits(scraped_data: dict, product_description: str, on_progress=None) -> list[dict]:
    """Score & rank subreddits using semantic similarity, tolerance, and activity."""
    W_SEMANTIC = 0.55
    W_TOLERANCE = 0.25
    W_ACTIVITY = 0.20

    model = _get_embed_model()
    product_emb = model.encode([product_description])

    raw_semantic = {}
    raw_activity = {}
    tolerance_scores = {}

    subs = list(scraped_data.keys())
    total = len(subs)

    for i, sub in enumerate(subs):
        if on_progress:
            on_progress("scoring", sub, i, total)

        data = scraped_data[sub]
        posts = data.get("recent_posts", [])

        # Activity: log-normalized median upvotes
        upvotes = [p.get("upvotes", 0) for p in posts]
        median_up = float(np.median(upvotes)) if upvotes else 0
        raw_activity[sub] = math.log(median_up + 1)

        # Semantic: cosine similarity between product desc and sub context
        sub_context = data.get("description", "") + " " + " ".join(p.get("title", "") for p in posts)
        sub_emb = model.encode([sub_context])
        raw_semantic[sub] = float(cosine_similarity(product_emb, sub_emb)[0][0])

        # Tolerance: Claude evaluates self-promo friendliness
        tolerance_scores[sub] = _get_tolerance_score(sub, data.get("description", ""), data.get("rules", []))

    scaled_semantic = _min_max_scale(raw_semantic)
    scaled_activity = _min_max_scale(raw_activity)

    rankings = []
    for sub in scraped_data:
        s = scaled_semantic.get(sub, 0)
        t = tolerance_scores.get(sub, 0)
        a = scaled_activity.get(sub, 0)
        final = (s * W_SEMANTIC) + (t * W_TOLERANCE) + (a * W_ACTIVITY)

        rankings.append({
            "subreddit": sub,
            "final_score": round(final, 3),
            "breakdown": {
                "semantic": round(s, 3),
                "tolerance": round(t, 3),
                "activity": round(a, 3),
            },
            "subscribers": scraped_data[sub].get("subscribers", 0),
            "active_users": scraped_data[sub].get("active_users", 0),
            "description": scraped_data[sub].get("description", ""),
            "recent_posts": scraped_data[sub].get("recent_posts", []),
            "rules": scraped_data[sub].get("rules", []),
        })

    rankings.sort(key=lambda x: x["final_score"], reverse=True)
    return rankings


# ------------------------------------------------------------------
# Main entry point for the API
# ------------------------------------------------------------------

def scrape_and_rank(subreddit_names: list[str], product_description: str) -> dict:
    """
    Full pipeline: scrape live data → score → rank → return JSON.
    subreddit_names: list of names without r/ prefix (e.g. ["fitness", "dating_advice"])
    """
    live_data = gather_live_data(subreddit_names)
    rankings = rank_subreddits(live_data, product_description)
    return {
        "subreddits": rankings,
        "total": len(rankings),
    }


def scrape_and_rank_stream(subreddit_names: list[str], product_description: str):
    """
    Generator version that yields SSE progress events.
    Scraping = 0-60%, Scoring = 60-95%, Done = 100%.
    Yields: dict with {phase, subreddit, progress, message}
    Final yield has phase="done" and includes full results.
    """
    total = len(subreddit_names)

    def on_scrape_progress(phase, sub, idx, total_subs):
        pass  # handled inline below

    # --- Phase 1: Scraping (0% to 60%) ---
    live_data = {}
    for i, sub in enumerate(subreddit_names):
        pct = int((i / total) * 60)
        yield {"phase": "scraping", "subreddit": sub, "progress": pct,
               "message": f"Scraping r/{sub}... ({i+1}/{total})"}
        about = scrape_subreddit_about(sub)
        live_data[sub] = {
            "description": about.get("description", ""),
            "subscribers": about.get("subscribers", 0),
            "active_users": about.get("active_users", 0),
            "rules": scrape_subreddit_rules(sub),
            "recent_posts": scrape_subreddit_posts(sub),
        }

    # --- Phase 2: Scoring (60% to 95%) ---
    for i, sub in enumerate(subreddit_names):
        pct = 60 + int((i / total) * 35)
        yield {"phase": "scoring", "subreddit": sub, "progress": pct,
               "message": f"Scoring r/{sub}... ({i+1}/{total})"}

    rankings = rank_subreddits(live_data, product_description)

    # --- Done ---
    result = {"subreddits": rankings, "total": len(rankings)}
    yield {"phase": "done", "progress": 100, "message": "Analysis complete",
           "result": result}
