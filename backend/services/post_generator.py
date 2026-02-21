"""
AI Post Generator for Reddit Outreach

Uses Claude to generate subreddit-native post drafts by deeply analyzing
each community's rules, tone, recent discussions, and culture — then
crafting posts that feel like they belong.
"""

import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def generate_posts_for_subreddit(product: dict, subreddit: dict) -> list[dict]:
    """
    Generate 3 subreddit-native post drafts for a single subreddit.

    Each draft is deeply tailored to the subreddit's rules, tone, recent
    discussions, and community culture — not generic templates.
    """
    sub_name = subreddit.get("subreddit", "")
    description = subreddit.get("description", "N/A")
    subscribers = subreddit.get("subscribers", 0)
    active_users = subreddit.get("active_users", 0)
    rules = subreddit.get("rules", [])
    recent_posts = subreddit.get("recent_posts", [])

    # Build rich context about recent posts
    posts_analysis = []
    for p in recent_posts:
        title = p.get("title", "")
        upvotes = p.get("upvotes", 0)
        comments = p.get("num_comments", 0)
        posts_analysis.append(
            f'  - "{title}" ({upvotes} upvotes, {comments} comments)'
        )
    posts_text = "\n".join(posts_analysis) if posts_analysis else "  No recent posts available."

    rules_text = "\n".join(f"  {i+1}. {r}" for i, r in enumerate(rules)) if rules else "  No specific rules found."

    system_prompt = """You are an expert Reddit community analyst and growth marketer. Your job is to write posts that are INDISTINGUISHABLE from native community content.

CRITICAL RULES:
1. STUDY the recent hot posts below. Match their EXACT writing style — sentence length, vocabulary, formatting, level of formality, use of paragraphs vs bullet points.
2. RESPECT every subreddit rule. If self-promotion is banned, the resource_share post MUST be reframed as a genuine recommendation or personal discovery, never a company announcement.
3. Each post must reference SPECIFIC topics, pain points, or discussions happening in that community — not generic industry talk.
4. NEVER use marketing language ("revolutionary", "game-changing", "excited to announce"). Write like a real community member.
5. Match the typical post LENGTH of recent posts. If recent posts are short and punchy, keep yours short. If they write long detailed posts, match that.
6. Posts should provide GENUINE VALUE — real insights, real questions, real stories — not thinly veiled promotions.

POST TYPES — generate exactly one of each:

1. "question_post" — A genuine question that invites community expertise.
   - Frame around a real problem the product solves
   - Ask in a way the community naturally discusses
   - Should generate authentic discussion, not just yes/no answers
   - The product may or may not be mentioned depending on subreddit rules

2. "discussion_post" — A thought-provoking discussion starter.
   - Share an insight, observation, or trend related to the product's space
   - Invite community perspectives and debate
   - Should feel like a long-time community member sharing thoughts
   - NO product mention — this is purely about the topic

3. "resource_share" — Introduces the product as a helpful resource.
   - If self-promo is allowed: transparent, humble product introduction asking for feedback
   - If self-promo is restricted: frame as personal discovery ("I found this tool that...")
   - If self-promo is banned: reframe as a general resource discussion without direct promotion
   - ALWAYS adapt to the subreddit's self-promo tolerance

OUTPUT FORMAT — respond with ONLY a JSON array of exactly 3 objects:
[
  {
    "type": "question_post",
    "label": "Question Post",
    "title": "...",
    "body": "...",
    "strategy": "2-3 sentences explaining why this specific post works for this specific subreddit — reference actual rules or community patterns.",
    "confidence_score": 0.0-1.0,
    "recommended_cadence": "Specific posting advice for this subreddit (best time, frequency, engagement tips)"
  },
  {
    "type": "discussion_post",
    "label": "Discussion Post",
    "title": "...",
    "body": "...",
    "strategy": "...",
    "confidence_score": 0.0-1.0,
    "recommended_cadence": "..."
  },
  {
    "type": "resource_share",
    "label": "Resource Share",
    "title": "...",
    "body": "...",
    "strategy": "...",
    "confidence_score": 0.0-1.0,
    "recommended_cadence": "..."
  }
]

CONFIDENCE SCORING GUIDE:
- 0.9-1.0: Post perfectly matches community norms, rules allow this type, high engagement likely
- 0.7-0.89: Good fit, minor risks (e.g., might need flair, could be borderline on a rule)
- 0.5-0.69: Moderate fit, some rules may restrict this approach, needs careful timing
- 0.3-0.49: Risky, subreddit is hostile to this type of content
- 0.0-0.29: Very unlikely to be well-received, rules essentially prohibit it"""

    user_prompt = f"""PRODUCT INFORMATION:
- Product Name: {product.get("product_name", "")}
- What It Does: {product.get("product_description", "")}
- Niche/Category: {product.get("niche_category", "")}
- Target Audience: {product.get("target_audience", "")}
- Keywords: {", ".join(product.get("keywords", []))}

TARGET SUBREDDIT: r/{sub_name}
- Community Description: {description}
- Size: {subscribers:,} subscribers, {active_users:,} currently active
- Self-Promo Tolerance Score: {subreddit.get("breakdown", {}).get("tolerance", "unknown")}

SUBREDDIT RULES (you MUST comply with ALL of these):
{rules_text}

RECENT HOT POSTS (study the writing style, topics, and engagement patterns):
{posts_text}

ANALYSIS INSTRUCTIONS:
1. First, identify the dominant WRITING STYLE from the recent posts (casual/formal, short/long, emotional/analytical)
2. Identify the KEY TOPICS the community is currently discussing
3. Note which rules would affect how you can talk about {product.get("product_name", "the product")}
4. Generate 3 posts that could be posted RIGHT NOW and blend in perfectly

Generate the 3 tailored posts for r/{sub_name}. Return ONLY the JSON array."""

    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        text = response.content[0].text.strip()

        # Strip markdown fences if present
        if text.startswith("```"):
            lines = text.split("\n", 1)
            text = lines[1] if len(lines) > 1 else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        drafts = json.loads(text)

        # Validate and clean
        valid_types = {"question_post", "discussion_post", "resource_share"}
        validated = []
        for d in drafts:
            if isinstance(d, dict) and d.get("type") in valid_types:
                validated.append({
                    "type": d["type"],
                    "label": d.get("label", d["type"].replace("_", " ").title()),
                    "title": d.get("title", ""),
                    "body": d.get("body", ""),
                    "strategy": d.get("strategy", ""),
                    "confidence_score": round(float(d.get("confidence_score", 0.5)), 2),
                    "recommended_cadence": d.get("recommended_cadence", ""),
                })

        if len(validated) == 3:
            return validated
        return _fallback_drafts(product, subreddit)

    except Exception as e:
        print(f"[post_generator] Error generating for r/{sub_name}: {e}")
        return _fallback_drafts(product, subreddit)


def _fallback_drafts(product: dict, subreddit: dict) -> list[dict]:
    """Minimal fallback if Claude fails."""
    name = product.get("product_name", "our product")
    sub = subreddit.get("subreddit", "this community")
    niche = product.get("niche_category", "this space")
    return [
        {
            "type": "question_post",
            "label": "Question Post",
            "title": f"What tools or approaches do you use for {niche}?",
            "body": f"I've been exploring different solutions in the {niche} space and I'm curious what r/{sub} recommends. What's worked well for you, and what hasn't?",
            "strategy": "Generic question fallback — Claude generation failed.",
            "confidence_score": 0.3,
            "recommended_cadence": "Review subreddit rules before posting.",
        },
        {
            "type": "discussion_post",
            "label": "Discussion Post",
            "title": f"How is {niche} evolving? What trends are you seeing?",
            "body": f"I've been following {niche} closely and I'm noticing some interesting shifts. Curious what this community thinks about where things are headed and what changes you've noticed recently.",
            "strategy": "Generic discussion fallback — Claude generation failed.",
            "confidence_score": 0.3,
            "recommended_cadence": "Review subreddit rules before posting.",
        },
        {
            "type": "resource_share",
            "label": "Resource Share",
            "title": f"Found an interesting tool for {niche} — {name}",
            "body": f"Hey r/{sub}, I came across {name} recently. {product.get('product_description', '')} Has anyone else tried it? Would love to hear thoughts.",
            "strategy": "Generic resource share fallback — Claude generation failed.",
            "confidence_score": 0.3,
            "recommended_cadence": "Review subreddit rules before posting.",
        },
    ]


def generate_all_posts(product: dict, subreddits: list[dict]) -> list[dict]:
    """
    Generate post drafts for all subreddits.
    Each subreddit gets its own Claude call with full community context.
    """
    results = []
    for sub in subreddits:
        print(f"[post_generator] Generating posts for r/{sub.get('subreddit', '?')}...")
        drafts = generate_posts_for_subreddit(product, sub)
        results.append({
            "subreddit": sub.get("subreddit", ""),
            "drafts": drafts,
        })
    return results
