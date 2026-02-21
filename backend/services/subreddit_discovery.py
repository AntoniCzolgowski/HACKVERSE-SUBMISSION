import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv
from models.schemas import ProductInput, SubredditResult, DiscoveryResponse

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an expert Reddit marketing strategist with deep knowledge of Reddit's community ecosystem.

Your task: Given a product description, identify exactly 5 real, active Reddit subreddits where this product's target audience congregates.

RULES:
- Return ONLY real, existing, active subreddits. Never invent subreddit names.
- Prefer subreddits with >10,000 subscribers for meaningful reach.
- Pick communities where the product's VALUE is relevant, not just the product category.
- Consider communities where the target audience discusses PROBLEMS the product solves.
- English-language subreddits only.
- No NSFW subreddits.
- Diversify: don't pick 5 subreddits that are all the same niche. Mix broad + specific.

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly 5 objects. No markdown, no backticks, no explanation outside the JSON.
Each object must have:
- "name": subreddit name without r/ prefix (e.g. "fitness")
- "reason": one sentence explaining why this subreddit is relevant

Example:
[
  {"name": "fitness", "reason": "1.2M+ members actively discussing gym culture and social dynamics"},
  {"name": "dating_advice", "reason": "890K members frequently discuss niche dating preferences and app fatigue"}
]"""


def discover_subreddits(product: ProductInput) -> DiscoveryResponse:
    """
    Takes product input, calls Claude Sonnet 4.6 with adaptive thinking,
    returns 5 subreddit URLs.
    """

    user_prompt = f"""Find 5 relevant Reddit subreddits for this product:

Product Name: {product.product_name}
Description: {product.product_description}
Niche: {product.niche_category}
Target Audience: {product.target_audience}
Keywords: {', '.join(product.keywords)}

Return exactly 5 subreddits as a JSON array."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        thinking={
            "type": "adaptive"
        },
        effort="medium",
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )

    # Extract text from response (skip thinking blocks)
    raw_text = ""
    for block in response.content:
        if block.type == "text":
            raw_text += block.text

    # Clean and parse JSON
    raw_text = raw_text.strip()
    # Remove markdown fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]  # remove first line
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

    parsed = json.loads(raw_text)

    subreddits = []
    for item in parsed[:5]:  # enforce max 5
        name = item["name"].strip().lstrip("r/").lstrip("/r/")
        subreddits.append(SubredditResult(
            name=f"r/{name}",
            url=f"https://www.reddit.com/r/{name}",
            reason=item["reason"]
        ))

    return DiscoveryResponse(
        product_name=product.product_name,
        subreddits=subreddits
    )
