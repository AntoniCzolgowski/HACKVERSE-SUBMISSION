# RedditReach - LexTrack AI

**Company Track:** Lextrack AI
**Team Name:** RedditReach
**Team Members:** Antoni Czolgowski, Nivid Banker, Zach Rosenof

---

## 1. Problem Statement

**Company problem chosen:** Lextrack AI — Automate Reddit community discovery and outreach for product marketing.

Startups and growth teams need to reach their target audience on Reddit, but the process is entirely manual: searching for relevant subreddits, reading community rules, understanding tone, and crafting posts that don't get flagged as spam. This takes hours per campaign, requires deep Reddit knowledge, and one misstep (violating a subreddit's self-promotion rules) can get a brand permanently banned.

**End user:** Growth marketers, indie hackers, startup founders, and marketing teams who want to promote products on Reddit without getting banned or ignored.

**Why this matters:** Reddit has 1.7B monthly active users across 100K+ active communities. It's the most authentic marketing channel — but also the hardest to use correctly. Brands waste hours on manual research or get banned by posting generic content that violates community norms.

---

## 2. Why We Chose This Problem

- **Real pain point:** Every startup founder has struggled with Reddit outreach. The gap between "Reddit is great for marketing" and "how do I actually do it without getting banned" is massive.
- **AI-native solution:** This problem requires understanding community culture, rules, and tone — exactly what LLMs excel at. Traditional keyword matching can't capture whether a subreddit tolerates self-promotion or what writing style resonates.
- **Technical depth:** The problem combines web scraping, semantic similarity, LLM reasoning with extended thinking, real-time streaming, and multi-factor ranking — a rich engineering challenge.
- **Measurable impact:** Success is quantifiable: time saved (hours → seconds), post quality (confidence scores), and compliance (rule adherence).

---

## 3. Solution Overview

**RedditReach** is an AI-powered Reddit outreach platform that automates the entire community discovery and content creation pipeline.

- **Input:** Product name, description, niche, target audience, and keywords (or just a website URL for auto-extraction).
- **Output:** A ranked list of the 5 best subreddits with live data (subscribers, rules, recent posts), a multi-factor compatibility score, and 3 tailored post drafts per subreddit (15 total) — each written to match the community's exact tone, rules, and culture. After publishing, a full analytics dashboard shows simulated engagement, AI-generated persona comments, sentiment analysis, and AI recommendations.
- **What makes it unique:** Unlike generic "find subreddits" tools, RedditReach scores communities on three dimensions (semantic relevance, self-promotion tolerance, and activity level), then generates posts that are indistinguishable from native community content. Every draft includes a strategy explanation and confidence score. After publishing, the platform simulates realistic community reactions using persona-based AI comments and provides a full analytics dashboard with sentiment breakdowns and strategic recommendations.

---

## 4. Architecture & System Design

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16 / React 19)                 │
│     Landing  →  Discover Form  →  Results Page  →  Dashboard         │
│                  (SSE progress)   (Post drafts)   (Analytics)        │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  REST + SSE
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI / Python)                      │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │ /api/autofill  │  │ /api/discover │  │ /api/scrape-stream     │   │
│  │ Website → AI   │  │ Claude Sonnet │  │ Public Reddit API      │   │
│  │ extraction     │  │ finds 5 subs  │  │ + multi-factor ranking │   │
│  └───────────────┘  └───────────────┘  └────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      /api/generate                           │   │
│  │    Claude Haiku generates 3 drafts/sub (parallel threads)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 /api/campaigns/publish                        │   │
│  │  Persona comment generation → Sentiment analysis → Storage   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                /api/campaigns/latest                          │   │
│  │           Retrieve campaign analytics for dashboard           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────┬────────────────────────────┘
           │                              │
           ▼                              ▼
  ┌─────────────────┐          ┌────────────────────┐
  │  Anthropic API   │          │  Reddit Public API  │
  │                  │          │                     │
  │  Claude Sonnet   │          │  /r/{sub}/about     │
  │  (discovery,     │          │  /r/{sub}/rules     │
  │   extraction,    │          │  /r/{sub}/hot       │
  │   sentiment,     │          │                     │
  │   personas)      │          └────────────────────┘
  │                  │
  │  Claude Haiku    │          ┌────────────────────┐
  │  (post gen +     │          │ sentence-transformers│
  │   tolerance)     │          │ (all-MiniLM-L6-v2)  │
  └─────────────────┘          │ Semantic similarity  │
                                └────────────────────┘
```

### Data Flow

1. **Auto-fill (optional):** User pastes a URL → backend scrapes the website with BeautifulSoup → Claude Sonnet extracts product details → form auto-populates
2. **Discovery:** Product info → Claude Sonnet 4.6 with extended thinking (5000 token budget) → returns 5 real, active subreddits with reasoning
3. **Scrape & Rank (SSE streaming):** For each subreddit, the backend hits Reddit's public JSON API to collect subscribers, rules, and 5 hot posts. Progress streams to the frontend in real-time via Server-Sent Events
4. **Scoring:** Each subreddit is ranked by three factors (see Section 6)
5. **Post Generation (parallel):** Claude Haiku generates 3 tailored drafts per subreddit concurrently via ThreadPoolExecutor — all 5 subreddits in parallel
6. **Publish:** User selects 1–5 posts and publishes. The backend generates realistic persona-based comments (2–15 per post), runs sentiment analysis on each comment, computes engagement metrics, and generates AI recommendations
7. **Dashboard:** Campaign analytics page shows total reach, engagement trends, sentiment breakdown (pie chart), per-post metrics with persona comments, AI recommendations, and trending keywords

### Why this architecture?

- **Separation of concerns:** Each service (discovery, scraping, scoring, generation) is isolated, testable, and swappable
- **SSE streaming:** Users see real-time progress instead of staring at a spinner for 30+ seconds
- **Parallel generation:** 5x speedup over sequential API calls (90s → ~20s)
- **No Reddit API key required:** Uses Reddit's public JSON endpoints, eliminating authentication complexity
- **Mock fallbacks:** Frontend works standalone for development without the backend

---

## 5. Data Handling & Preprocessing

### Data Sources

| Source | What we collect | How |
|--------|----------------|-----|
| **Reddit Public API** | Subreddit description, subscriber count, active users, rules, 5 hot posts (title, upvotes, comments, URL) | GET requests to `/r/{sub}/about.json`, `/rules.json`, `/hot.json` |
| **User-provided website** | Product name, description, niche, audience, keywords | BeautifulSoup HTML parsing + Claude extraction |
| **User form input** | Product details | Direct form submission |

### Preprocessing Steps

1. **Website text extraction:** Strip `<script>`, `<style>`, `<nav>`, `<footer>`, `<iframe>` tags. Extract meta tags (og:title, og:description). Truncate to 3,500 chars to stay within token limits
2. **Subreddit context building:** Concatenate subreddit description + recent post titles into a single context string for embedding
3. **Semantic embedding:** Encode product description and subreddit contexts using `all-MiniLM-L6-v2` sentence-transformer (384-dimensional vectors)
4. **Score normalization:** Activity scores are log-normalized (`log(median_upvotes + 1)`) and scaled to 0–1

### Limitations

- Reddit's public API has rate limits (we use 1.5s delays between requests)
- Only the 5 most recent hot posts are analyzed per subreddit
- Website extraction may miss content loaded via JavaScript (SPA sites)

---

## 6. Modeling & AI Strategy

### Models Used

| Model | Purpose | Why chosen |
|-------|---------|-----------|
| **Claude Sonnet 4.6** (with extended thinking) | Subreddit discovery, website extraction | Best reasoning for finding genuinely relevant communities. Extended thinking (5000 token budget) lets the model deliberate before committing to 5 subreddits |
| **Claude Sonnet 4** | Persona comment generation, sentiment analysis, recommendations, keyword extraction | Used in the publish pipeline for generating realistic community reactions and post-campaign analytics |
| **Claude Haiku 4.5** | Post generation (3 drafts/sub), self-promo tolerance scoring | Fast and cost-effective for generating multiple drafts. Each of the 5 subreddits needs its own call with full community context |
| **all-MiniLM-L6-v2** (sentence-transformers) | Semantic similarity scoring | Lightweight, fast embedding model. No GPU required. Excellent for measuring topic overlap between product description and subreddit content |

### Multi-Factor Ranking Algorithm

Each subreddit receives a **final score** composed of three weighted factors:

```
final_score = (semantic × 0.55) + (tolerance × 0.25) + (activity × 0.20)
```

| Factor | Weight | How it's calculated | What it measures |
|--------|--------|-------------------|-----------------|
| **Semantic Relevance** | 55% | Cosine similarity between product description embedding and subreddit context embedding (description + post titles) | How topically aligned the subreddit is |
| **Self-Promo Tolerance** | 25% | Claude Haiku reads the subreddit's description + rules and outputs a 0.0–1.0 score (0 = strictly bans promotion, 1 = encourages it) | How likely promotional content will survive |
| **Activity Level** | 20% | `log(median_upvotes + 1)` of recent hot posts, normalized to 0–1 | How engaged the community is |

### Post Generation Strategy

For each subreddit, the system generates exactly 3 post types:

1. **Question Post** — Frames the product's problem space as a genuine question. May or may not mention the product depending on rules
2. **Discussion Post** — Thought-provoking discussion starter. Zero product mention. Designed to build credibility
3. **Resource Share** — Introduces the product. Adapts strategy based on self-promo tolerance (transparent intro vs. personal discovery framing vs. general discussion)

Each draft includes:
- **Strategy explanation** — Why this specific post works for this specific subreddit
- **Confidence score** (0.0–1.0) — How likely the post is to be well-received
- **Recommended cadence** — Best posting time, frequency, and engagement tips

### Prompt Engineering

- **System prompt** instructs Claude to study recent hot posts and match their exact writing style, sentence length, vocabulary, and formatting
- **User prompt** provides full subreddit context: description, subscriber count, rules, recent posts with engagement metrics, and self-promo tolerance score
- Posts must comply with every subreddit rule — if self-promotion is banned, the resource share is reframed as a personal discovery
- Explicit anti-marketing-speak rules: no "revolutionary", "game-changing", "excited to announce"

### Persona-Based Comment Simulation

After publishing, the system generates realistic Reddit-style comments using a persona library. Each persona has a defined personality (skeptical techie, supportive community member, aggressive marketer critic, etc.) and Claude generates comments in-character. This lets marketers preview how a community might actually react before posting for real.

### Alternatives Considered

- **GPT-4:** Higher latency and cost for equivalent quality on this task. Claude's extended thinking provides better deliberation for discovery
- **Single batched prompt:** Combining all 5 subreddits into one prompt risks quality degradation and token limits. Individual calls with full context produce better results
- **Reddit API (authenticated):** Would require OAuth setup and app registration. Public JSON endpoints provide all needed data without authentication overhead

---

## 7. Evaluation & Metrics

### Evaluation Approach

Since this is a generation system (not classification), we evaluate across multiple dimensions:

### Test Cases

| # | Product | Niche | Expected Behavior | Result |
|---|---------|-------|-------------------|--------|
| 1 | FitMatch (dating app for gym-goers) | Fitness & Dating | Should find fitness + dating subreddits | Found r/fitness, r/dating_advice, r/GymMotivation, r/OnlineDating, r/datingoverthirty |
| 2 | Basketball shoe brand | Sneakers & Sports | Should find sneaker + basketball communities | Found r/Basketball, r/Sneakers, r/FashionReps, r/running, r/xxfitness |
| 3 | AI writing tool | SaaS & Productivity | Should find writing + productivity + AI subs | Found relevant writing and tech communities |
| 4 | Vegan meal kit | Food & Health | Should find vegan + cooking + health subs | Found diet, cooking, and plant-based communities |
| 5 | Indie game | Gaming | Should find gamedev + gaming communities | Found relevant gaming and indie dev subreddits |

### Metrics

| Metric | What it measures | Target | Achieved |
|--------|-----------------|--------|----------|
| **Discovery relevance** | Are the 5 subreddits actually relevant? | All 5 should be real, active, topically aligned | 5/5 in all test cases |
| **Rule compliance** | Do generated posts respect subreddit rules? | 100% compliance | Posts adapt strategy based on rules (verified manually) |
| **Tone matching** | Do posts match community writing style? | Indistinguishable from native content | Claude analyzes recent posts and mirrors style |
| **Generation speed** | Time from request to all 15 drafts | < 30 seconds | ~20s with parallel ThreadPoolExecutor (down from 90s sequential) |
| **Scoring accuracy** | Does the ranking match intuitive relevance? | Top-ranked sub should be most relevant | Semantic + tolerance + activity weighting produces intuitive rankings |

### Scoring Breakdown Visualization

Each subreddit card in the UI displays three color-coded score bars:
- **Semantic Relevance** (red bar) — Topic alignment
- **Self-Promo Tolerance** (indigo bar) — Promotion friendliness
- **Activity Level** (amber bar) — Community engagement

### Limitations

- Evaluation is primarily qualitative (post quality) rather than quantitative (accuracy on a benchmark)
- Confidence scores are model-estimated, not validated against actual Reddit post performance
- No A/B testing of generated posts vs. human-written posts (future work)

---

## 8. Business Impact & Actionability

### How This Helps Decision-Makers

| Without RedditReach | With RedditReach |
|--------------------|-----------------|
| 3-5 hours manually researching subreddits | 60 seconds automated discovery + scoring |
| Risk of getting banned for rule violations | AI-analyzed rule compliance with confidence scores |
| Generic, obvious posts that get downvoted | Community-native content tailored to each subreddit's culture |
| No data on which subreddits are worth targeting | Multi-factor scoring (semantic, tolerance, activity) |
| One-size-fits-all approach | 3 different post strategies per subreddit |

### Actions Users Can Take from Output

1. **Prioritize subreddits** — Use the ranked scores to decide where to invest time
2. **Choose post strategy** — Pick between question, discussion, or resource share based on confidence scores
3. **Copy and post** — One-click copy of title and body, ready to paste into Reddit
4. **Download campaign plan** — Export selected posts as a structured JSON plan for team review
5. **Understand risk** — Confidence scores and strategy explanations help assess whether a post is safe to publish

### Real-World Usability

- Works for any product in any niche — just describe what you're promoting
- Auto-fill from URL eliminates manual data entry
- Mock mode lets marketing teams evaluate the tool without API keys
- Exportable plans integrate into existing marketing workflows

### Limitations

- Does not actually post to Reddit — users copy/paste manually or use the simulated publish flow
- Confidence scores are estimates, not guarantees of post success
- Reddit community dynamics change; results are point-in-time snapshots
- Dashboard engagement data is simulated (persona comments + estimated upvotes), not live Reddit metrics

---

## 9. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 16.1.6 |
| | React | 19.2.3 |
| | TypeScript | 5.9.3 |
| | Tailwind CSS | 3.4.19 |
| | Recharts | 3.7.0 |
| | Lucide React | 0.575.0 |
| **Backend** | FastAPI | latest |
| | Python | 3.12+ |
| | Pydantic | latest |
| | Uvicorn | latest |
| **AI/ML** | Claude Sonnet 4.6 | claude-sonnet-4-6 |
| | Claude Haiku 4.5 | claude-haiku-4-5-20251001 |
| | sentence-transformers | all-MiniLM-L6-v2 |
| | scikit-learn | latest |
| **Scraping** | BeautifulSoup4 | latest |
| | httpx | latest |
| | requests | latest |
| **Streaming** | Server-Sent Events (SSE) | native |

---

## 10. How to Run the Project

### Prerequisites
- Python 3.12+
- Node.js 18+
- An Anthropic API key

### Clone Repository
```bash
git clone https://github.com/AntoniCzolgowski/HACKVERSE-SUBMISSION.git
cd HACKVERSE-SUBMISSION
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the dev server
npm run dev
```

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Health check:** http://localhost:8000/health

---

## 11. Repository Structure

```
HACKVERSE-SUBMISSION/
├── README.md
├── LexTrack_AI_Pitch_1Page.pdf
├── .gitignore
│
├── backend/
│   ├── main.py                    # FastAPI app + all endpoints
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment template
│   ├── models/
│   │   ├── schemas.py             # Pydantic request/response models
│   │   └── published_posts_schemas.py  # Campaign & publish models
│   ├── services/
│   │   ├── subreddit_discovery.py  # Claude-powered subreddit finder
│   │   ├── website_extract.py     # URL → product info extraction
│   │   ├── reddit_scraper.py      # Reddit scraping + multi-factor ranking
│   │   ├── post_generator.py      # Parallel AI post draft generation
│   │   ├── campaign_storage.py    # File-based campaign persistence
│   │   └── persona_comments.py    # AI persona comment generation
│   ├── data/campaigns/            # Stored campaign JSON files
│   └── personas.json              # Persona definitions
│
└── frontend/
    ├── package.json               # Node dependencies
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── app/
    │   ├── page.tsx               # Landing page
    │   ├── layout.tsx             # Root layout (nav + footer)
    │   ├── discover/page.tsx      # Discovery form + progress
    │   ├── results/page.tsx       # Ranked results + post drafts + publish
    │   ├── dashboard/page.tsx     # Campaign analytics dashboard
    │   └── api/
    │       ├── keywords/route.ts      # Keyword extraction API route
    │       ├── sentiment/route.ts     # Sentiment analysis API route
    │       └── post-recommendation/route.ts  # Post recommendation route
    ├── components/
    │   ├── nav.tsx                 # Navigation bar
    │   └── footer.tsx             # Footer
    └── lib/
        ├── api.ts                 # API client functions
        ├── types.ts               # TypeScript interfaces
        ├── mock-data.ts           # Mock data for offline development
        ├── sentiment-api.ts       # Sentiment analysis client
        └── personas.json          # Persona definitions for comments
```

---

## 12. Alignment with HackVerse Rubric

| Criterion | How we address it |
|-----------|------------------|
| **Problem Understanding** | Clear articulation of the Reddit outreach problem, who it affects, and why current approaches fail |
| **Data & System Design** | Clean separation between frontend/backend, well-defined API contracts, SSE streaming for real-time UX |
| **Technical Depth** | Multi-factor ranking (semantic + tolerance + activity), extended thinking for discovery, parallel generation, sentence-transformer embeddings |
| **Modeling Strategy** | Strategic use of two Claude models (Sonnet for reasoning, Haiku for speed), custom scoring algorithm, rule-aware post generation |
| **Evaluation** | 5 test cases across different niches, multiple quality metrics, manual verification of rule compliance |
| **Business Actionability** | Directly usable output (copy-paste posts), exportable plans, confidence scores for risk assessment |
| **Visualization** | Score breakdown bars, real-time progress streaming, ranked card layout with collapsible details |
| **Innovation** | Self-promo tolerance scoring via AI, community-native content generation, parallel API architecture |

---

## Compliance Statement

We confirm that this project was developed during HackVerse 2026.
We used only permitted datasets and tools.
No private code sharing occurred between teams.
All work is original.
