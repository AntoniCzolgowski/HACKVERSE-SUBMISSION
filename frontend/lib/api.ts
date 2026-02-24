import { DiscoverRequest, DiscoverResponse, GenerateRequest, GenerateResponse, PublishRequest, PublishResponse, ScrapeProgressEvent, ScrapeResponse } from "./types";
import { mockDiscoverResponse } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Anthropic-Key"] = apiKey;
  return headers;
}

export interface AutofillResult {
  product_name: string;
  product_description: string;
  niche_category: string;
  target_audience: string;
  keywords: string;
}

export async function autofillFromUrl(url: string, apiKey?: string): Promise<AutofillResult> {
  if (!API_URL) {
    // Mock fallback for dev without backend
    await new Promise((r) => setTimeout(r, 2000));
    return {
      product_name: "Example Product",
      product_description: "An AI-powered tool extracted from the provided website.",
      niche_category: "Technology",
      target_audience: "Tech-savvy professionals aged 25-45",
      keywords: "ai, saas, productivity, automation",
    };
  }

  const res = await fetch(`${API_URL}/api/autofill`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Autofill failed");
  return data.fields;
}

export async function discoverSubreddits(input: DiscoverRequest, apiKey?: string): Promise<DiscoverResponse> {
  if (!API_URL) {
    await new Promise((r) => setTimeout(r, 3000));
    return mockDiscoverResponse(input.product_name);
  }

  const res = await fetch(`${API_URL}/api/discover`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new Error(`Discovery failed: ${res.statusText}`);
  return res.json();
}

export async function scrapeSubredditsStream(
  subredditNames: string[],
  productDescription: string,
  onProgress: (event: ScrapeProgressEvent) => void,
  apiKey?: string
): Promise<ScrapeResponse> {
  if (!API_URL) {
    // Mock fallback: simulate scraping progress
    const mockSubs = subredditNames;
    for (let i = 0; i < mockSubs.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      onProgress({
        phase: "scraping",
        subreddit: mockSubs[i],
        progress: Math.round((i / mockSubs.length) * 60),
        message: `Scraping r/${mockSubs[i]}... (${i + 1}/${mockSubs.length})`,
      });
    }
    for (let i = 0; i < mockSubs.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      onProgress({
        phase: "scoring",
        subreddit: mockSubs[i],
        progress: 60 + Math.round((i / mockSubs.length) * 35),
        message: `Scoring r/${mockSubs[i]}... (${i + 1}/${mockSubs.length})`,
      });
    }
    // Return mock scrape data
    const mockResult: ScrapeResponse = {
      total: mockSubs.length,
      subreddits: mockSubs.map((name, i) => ({
        subreddit: name,
        final_score: Math.round((0.9 - i * 0.05) * 1000) / 1000,
        breakdown: { semantic: 0.8, tolerance: 0.6, activity: 0.7 },
        subscribers: 500000 - i * 80000,
        active_users: 2000 - i * 300,
        description: `A community for ${name} discussions`,
        recent_posts: [
          { title: "Sample hot post", upvotes: 1200, num_comments: 89, url: `https://reddit.com/r/${name}` },
        ],
        rules: ["Be respectful", "No spam"],
      })),
    };
    onProgress({ phase: "done", progress: 100, message: "Analysis complete", result: mockResult });
    return mockResult;
  }

  const res = await fetch(`${API_URL}/api/scrape-stream`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ subreddit_names: subredditNames, product_description: productDescription }),
  });

  if (!res.ok) throw new Error(`Scraping failed: ${res.statusText}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ScrapeResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const event: ScrapeProgressEvent = JSON.parse(line.slice(6));
        onProgress(event);
        if (event.phase === "done" && event.result) {
          finalResult = event.result;
        }
        if (event.phase === "error") {
          throw new Error(event.message);
        }
      }
    }
  }

  if (!finalResult) throw new Error("Stream ended without results");
  return finalResult;
}

export async function generatePosts(request: GenerateRequest, apiKey?: string): Promise<GenerateResponse> {
  if (!API_URL) {
    // Mock fallback: generate fake drafts after a delay
    await new Promise((r) => setTimeout(r, 2000));
    return {
      product_name: request.product_name,
      subreddit_drafts: request.subreddits.map((s) => ({
        subreddit: s.subreddit,
        drafts: [
          {
            type: "question_post" as const,
            label: "Question Post",
            title: `Has anyone here tried solutions for ${request.niche_category}?`,
            body: `I've been looking into ${request.product_description} and wanted to hear what r/${s.subreddit} thinks. What's worked for you?`,
            strategy: "Authentic discussion starter framed as personal experience.",
            confidence_score: 0.7,
            recommended_cadence: "Post during peak hours for this subreddit.",
          },
          {
            type: "discussion_post" as const,
            label: "Discussion Post",
            title: `What's your biggest challenge with ${request.niche_category}?`,
            body: `Curious what pain points people face in this space. What tools or approaches have you tried?`,
            strategy: "Open question surfacing the problem without product mention.",
            confidence_score: 0.8,
            recommended_cadence: "Best posted mid-week for discussion engagement.",
          },
          {
            type: "resource_share" as const,
            label: "Resource Share",
            title: `We built ${request.product_name} — looking for feedback`,
            body: `Hi r/${s.subreddit}! We built ${request.product_name}: ${request.product_description}. We'd love honest feedback from this community.`,
            strategy: "Transparent brand introduction with feedback request.",
            confidence_score: 0.55,
            recommended_cadence: "Check subreddit self-promo rules before posting.",
          },
        ],
      })),
    };
  }

  const res = await fetch(`${API_URL}/api/generate`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error(`Generation failed: ${res.statusText}`);
  return res.json();
}

export async function publishPosts(request: PublishRequest, apiKey?: string): Promise<PublishResponse> {
  if (!API_URL) {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      results: request.posts.map((p) => ({
        subreddit: p.subreddit,
        status: "simulated" as const,
        reddit_url: `https://reddit.com/${p.subreddit}/comments/sim_${Date.now()}`,
        post_id: `sim_${Date.now()}`,
      })),
    };
  }

  const res = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error(`Publishing failed: ${res.statusText}`);
  return res.json();
}
