import os
import json
import httpx
from bs4 import BeautifulSoup
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

EXTRACT_PROMPT = """You are a product analyst. Given the text content of a company website, extract the following fields for a marketing form.

Return ONLY a valid JSON object with these exact keys:
- "product_name": the product or company name (short, 1-4 words)
- "product_description": what the product does (2-3 sentences, clear and specific)
- "niche_category": the market niche (e.g. "Fitness & Dating", "EdTech", "Pet Services")
- "target_audience": who the product is for (e.g. "Gym-goers aged 20-35")
- "keywords": comma-separated relevant marketing keywords (5-8 keywords)

If you can't determine a field, make your best educated guess from context. Never leave a field empty.
No markdown, no backticks, no explanation outside the JSON."""


def fetch_website_text(url: str) -> str:
    """Fetch a URL and return cleaned text content (max ~4000 chars to save tokens)."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LexTrackAI/1.0)"
    }

    with httpx.Client(follow_redirects=True, timeout=15.0) as http:
        resp = http.get(url, headers=headers)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "iframe", "noscript"]):
        tag.decompose()

    # Get text, collapse whitespace
    text = soup.get_text(separator=" ", strip=True)

    # Also grab meta description and og tags for extra signal
    meta_parts = []
    for meta in soup.find_all("meta"):
        name = meta.get("name", "") or meta.get("property", "")
        content = meta.get("content", "")
        if name.lower() in ("description", "og:description", "og:title", "og:site_name") and content:
            meta_parts.append(f"{name}: {content}")

    meta_text = "\n".join(meta_parts)

    # Truncate body text to keep token cost low
    if len(text) > 3500:
        text = text[:3500] + "..."

    return f"{meta_text}\n\n{text}" if meta_text else text


def extract_product_from_url(url: str, api_key: str = "") -> dict:
    """Fetch website, send to Claude Haiku for extraction, return form fields."""
    website_text = fetch_website_text(url)

    client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=EXTRACT_PROMPT,
        messages=[
            {"role": "user", "content": f"Website URL: {url}\n\nWebsite content:\n{website_text}"}
        ]
    )

    raw = response.content[0].text.strip()
    # Clean markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    return json.loads(raw)
