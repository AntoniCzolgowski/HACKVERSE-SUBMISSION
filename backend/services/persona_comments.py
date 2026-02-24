"""
Persona Comment Generator
Generates realistic Reddit comments based on user personas
"""
import json
import random
from pathlib import Path
from anthropic import Anthropic, AsyncAnthropic
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()

# Load personas
PERSONAS_PATH = Path(__file__).parent.parent / "personas.json"
with open(PERSONAS_PATH, "r") as f:
    PERSONAS = json.load(f)["personas"]

COMMENT_GENERATION_PROMPT = """You are simulating a Reddit comment from a specific persona responding to a post.

POST DETAILS:
Subreddit: {subreddit}
Post Type: {post_type}
Post Title: {title}
Post Body: {body}

PERSONA PROFILE:
Name: {persona_name}
Age: {age}, Gender: {gender}
Occupation: {occupation}
Wealth Level: {wealth}
Attitude: {attitude}
Communication Style: {communication_style}
Typical Sentiment: {typical_sentiment}
Interests: {interests}
Reddit Behavior: {reddit_behavior}

TASK:
Write a single, authentic Reddit comment from this persona responding to the post above. The comment should:
1. Match the persona's communication style, sentiment tendencies, and interests
2. Feel natural and conversational (50-150 words)
3. Reflect their attitude towards products
4. NOT break character or mention being a persona
5. Be a realistic Reddit comment - it can be supportive, critical, questioning, humorous, etc.

Return ONLY the comment text, no quotes, no labels, no explanation."""


def generate_persona_comment(post_data: dict, persona: dict, api_key: str = "") -> str:
    """
    Generate a comment from a specific persona for a post (synchronous version).
    """
    prompt = COMMENT_GENERATION_PROMPT.format(
        subreddit=post_data.get("subreddit", ""),
        post_type=post_data.get("post_type", ""),
        title=post_data.get("title", ""),
        body=post_data.get("body", ""),
        persona_name=persona["name"],
        age=persona["age"],
        gender=persona["gender"],
        occupation=persona["occupation"],
        wealth=persona["wealth"],
        attitude=persona["attitude_towards_products"],
        communication_style=persona["communication_style"],
        typical_sentiment=persona["typical_sentiment"],
        interests=", ".join(persona["interests"]),
        reddit_behavior=persona["reddit_behavior"]
    )

    _client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text.strip()


async def generate_persona_comment_async(post_data: dict, persona: dict, api_key: str = "") -> str:
    """
    Generate a comment from a specific persona for a post (async version).
    """
    prompt = COMMENT_GENERATION_PROMPT.format(
        subreddit=post_data.get("subreddit", ""),
        post_type=post_data.get("post_type", ""),
        title=post_data.get("title", ""),
        body=post_data.get("body", ""),
        persona_name=persona["name"],
        age=persona["age"],
        gender=persona["gender"],
        occupation=persona["occupation"],
        wealth=persona["wealth"],
        attitude=persona["attitude_towards_products"],
        communication_style=persona["communication_style"],
        typical_sentiment=persona["typical_sentiment"],
        interests=", ".join(persona["interests"]),
        reddit_behavior=persona["reddit_behavior"]
    )

    _async_client = AsyncAnthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
    response = await _async_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text.strip()


def generate_comments_for_post(post_data: dict, num_comments: int = None) -> list[dict]:
    """
    Generate between 2-15 comments for a post using random personas (synchronous version).
    Returns list of comment objects with author, body, score, and persona_id.
    """
    if num_comments is None:
        num_comments = random.randint(2, 15)

    # Randomly select personas (can repeat)
    selected_personas = random.choices(PERSONAS, k=num_comments)

    comments = []
    for persona in selected_personas:
        try:
            comment_text = generate_persona_comment(post_data, persona)

            # Generate realistic upvote score based on persona sentiment
            # Positive personas tend to get more upvotes
            base_score = random.randint(1, 50)
            if "positive" in persona["typical_sentiment"]:
                score = base_score + random.randint(0, 100)
            elif "negative" in persona["typical_sentiment"]:
                score = max(1, base_score - random.randint(0, 30))
            else:
                score = base_score

            comments.append({
                "author": persona["name"].replace(" ", "_").lower(),
                "body": comment_text,
                "score": score,
                "persona_id": persona["id"],
                "persona_name": persona["name"]
            })
        except Exception as e:
            print(f"Error generating comment for persona {persona['name']}: {e}")
            continue

    return comments


async def generate_comments_for_post_async(post_data: dict, num_comments: int = None, api_key: str = "") -> list[dict]:
    """
    Generate between 2-15 comments for a post using random personas (async version).
    Returns list of comment objects with author, body, score, and persona_id.
    Uses parallel API calls for faster generation.
    """
    if num_comments is None:
        num_comments = random.randint(2, 15)

    # Randomly select personas (can repeat)
    selected_personas = random.choices(PERSONAS, k=num_comments)

    # Generate all comments in parallel
    async def generate_single_comment(persona):
        try:
            comment_text = await generate_persona_comment_async(post_data, persona, api_key=api_key)

            # Generate realistic upvote score based on persona sentiment
            base_score = random.randint(1, 50)
            if "positive" in persona["typical_sentiment"]:
                score = base_score + random.randint(0, 100)
            elif "negative" in persona["typical_sentiment"]:
                score = max(1, base_score - random.randint(0, 30))
            else:
                score = base_score

            return {
                "author": persona["name"].replace(" ", "_").lower(),
                "body": comment_text,
                "score": score,
                "persona_id": persona["id"],
                "persona_name": persona["name"]
            }
        except Exception as e:
            print(f"Error generating comment for persona {persona['name']}: {e}")
            return None

    # Run all comment generations in parallel
    comment_results = await asyncio.gather(*[generate_single_comment(p) for p in selected_personas])

    # Filter out None values (failed generations)
    comments = [c for c in comment_results if c is not None]

    return comments
