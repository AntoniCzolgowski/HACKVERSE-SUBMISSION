import requests
import time
import json
import math
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import anthropic


def load_env_file(path=".env"):
    """Load simple KEY=VALUE pairs from a local .env file."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

# ==========================================
# 1. INITIALIZATION
# ==========================================
load_env_file()
print("Loading embedding model (this takes a moment on first run)...")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize Claude for the Tolerance Evaluation
# Make sure your ANTHROPIC_API_KEY is set in your environment variables
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ==========================================
# 2. SCRAPING ENGINE (No API Key Required)
# ==========================================
HEADERS = {'User-Agent': 'LexTrackAI_Hackathon_Bot_v1.0 (by /u/your_username)'}

def scrape_subreddit_rules(subreddit):
    """Fetches the official rules of a subreddit."""
    url = f"https://www.reddit.com/r/{subreddit}/about/rules.json"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200: return []
            
        rules_list = []
        for rule in response.json().get('rules', []):
            rules_list.append(rule.get('short_name', '') + ": " + rule.get('description', ''))
            
        time.sleep(2) # Polite delay
        return rules_list
    except Exception as e:
        print(f"Error fetching rules for {subreddit}: {e}")
        return []

def scrape_subreddit_description(subreddit):
    """Fetches the description and metadata of a subreddit."""
    url = f"https://www.reddit.com/r/{subreddit}/about.json"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200: return ""
            
        data = response.json().get('data', {})
        time.sleep(2) # Polite delay
        return data.get('public_description', '')
    except Exception as e:
        print(f"Error fetching description for {subreddit}: {e}")
        return ""

def scrape_subreddit_posts(subreddit, limit=5):
    """Fetches recent posts to calculate Activity and Semantic context."""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200: return []
            
        posts_json = response.json().get('data', {}).get('children', [])
        parsed_posts = []
        for post in posts_json:
            p_data = post.get('data', {})
            if not p_data.get('stickied'): # Skip moderator pins
                parsed_posts.append({
                    'title': p_data.get('title', ''),
                    'upvotes': p_data.get('score', 0)
                })
        time.sleep(2) # Polite delay
        return parsed_posts
    except Exception as e:
        print(f"Error fetching posts for {subreddit}: {e}")
        return []

def gather_live_data(subreddits):
    """Orchestrates the scraping for all target subreddits."""
    live_data = {}
    for sub in subreddits:
        print(f"Scraping live data for r/{sub}...")
        live_data[sub] = {
            "description": scrape_subreddit_description(sub),
            "rules": scrape_subreddit_rules(sub),
            "recent_posts": scrape_subreddit_posts(sub)
        }
    return live_data


# ==========================================
# 3. AI SCORING & RANKING ENGINE
# ==========================================
def min_max_scale(values_dict):
    """Scales a dictionary of {subreddit: raw_score} to a 0.0 - 1.0 range."""
    scores = list(values_dict.values())
    if not scores: return {}
    
    min_val, max_val = min(scores), max(scores)
    
    scaled_dict = {}
    for sub, score in values_dict.items():
        if max_val == min_val:
            scaled_dict[sub] = 0.5
        else:
            scaled_dict[sub] = (score - min_val) / (max_val - min_val)
    return scaled_dict

def get_tolerance_score(subreddit, description, rules):
    """Uses Claude to evaluate self-promo tolerance based on rules and description."""
    system_prompt = """
    You are an AI community guidelines analyzer. Read the provided subreddit description and rules.
    Rate the subreddit's tolerance for self-promotion, marketing, or sharing new products on a scale from 0.0 to 1.0.
    0.0 = Strictly forbids all self-promotion, marketing, or links. Instant ban risk.
    0.5 = Allows it conditionally (e.g., only in specific megathreads, or requires high participation first).
    1.0 = Openly encourages sharing projects, self-promotion, or has absolutely no rules against it.
    
    Output STRICTLY as a JSON object with a single key "tolerance_score" containing the float value.
    """
    
    content = f"Subreddit: {subreddit}\nDescription: {description}\nRules: {json.dumps(rules)}"
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307", 
            max_tokens=150,
            system=system_prompt,
            messages=[
                {"role": "user", "content": content},
                {"role": "assistant", "content": "{"} # Enforce JSON output
            ]
        )
        json_output = json.loads("{" + response.content[0].text)
        return float(json_output.get("tolerance_score", 0.0))
    except Exception as e:
        print(f"Error getting tolerance for {subreddit}: {e}")
        return 0.0

def rank_subreddits(scraped_data, product_description):
    """Executes the 3-part scoring model and ranks the subreddits."""
    print(f"\nAnalyzing fit for product: '{product_description}'...")
    
    W_SEMANTIC = 0.55
    W_TOLERANCE = 0.25
    W_ACTIVITY = 0.20
    
    raw_semantic = {}
    raw_activity = {}
    tolerance_scores = {}
    
    product_emb = embed_model.encode([product_description])

    for sub, data in scraped_data.items():
        recent_posts = data.get('recent_posts', [])
        
        # 1. Activity Score (Log Normalized)
        upvotes = [post.get('upvotes', 0) for post in recent_posts]
        median_upvotes = np.median(upvotes) if upvotes else 0
        raw_activity[sub] = math.log(median_upvotes + 1)
        
        # 2. Semantic Score
        sub_context = data.get('description', '') + " " + " ".join([p.get('title', '') for p in recent_posts])
        sub_emb = embed_model.encode([sub_context])
        raw_semantic[sub] = cosine_similarity(product_emb, sub_emb)[0][0]
        
        # 3. Tolerance Score
        tolerance_scores[sub] = get_tolerance_score(sub, data.get('description', ''), data.get('rules', []))

    # Apply Scaling
    scaled_semantic = min_max_scale(raw_semantic)
    scaled_activity = min_max_scale(raw_activity)

    # Calculate Final Scores
    final_rankings = []
    for sub in scraped_data.keys():
        s_score = scaled_semantic.get(sub, 0)
        t_score = tolerance_scores.get(sub, 0)
        a_score = scaled_activity.get(sub, 0)
        
        final_score = (s_score * W_SEMANTIC) + (t_score * W_TOLERANCE) + (a_score * W_ACTIVITY)
        
        final_rankings.append({
            "subreddit": sub,
            "final_score": round(final_score, 3),
            "breakdown": {
                "semantic": round(s_score, 3),
                "tolerance": round(t_score, 3),
                "activity": round(a_score, 3)
            }
        })
        
    final_rankings.sort(key=lambda x: x['final_score'], reverse=True)
    return final_rankings

# ==========================================
# 4. EXECUTION
# ==========================================
if __name__ == "__main__":
    # Your target subreddits
    targets = ["MachineLearning", "SaaS", "Entrepreneur", "Startups", "SideProject"]
    product_desc = "An AI tool that automates Reddit community discovery and outreach posting."
    
    print("=== Phase 1: Live Scraping ===")
    live_scraped_data = gather_live_data(targets)
    
    print("\n=== Phase 2: AI Scoring & Ranking ===")
    rankings = rank_subreddits(live_scraped_data, product_desc)
    
    print("\n🏆 FINAL SUBREDDIT RANKINGS 🏆")
    print("-" * 50)
    for i, rank in enumerate(rankings, 1):
        print(f"#{i}. r/{rank['subreddit']}")
        print(f"    Total Score: {rank['final_score']}")
        print(f"    [ Semantic: {rank['breakdown']['semantic']} | Tolerance: {rank['breakdown']['tolerance']} | Activity: {rank['breakdown']['activity']} ]\n")
