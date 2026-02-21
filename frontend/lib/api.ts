import { DiscoverRequest, DiscoverResponse, PublishRequest, PublishResponse } from "./types";
import { mockDiscoverResponse } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface AutofillResult {
  product_name: string;
  product_description: string;
  niche_category: string;
  target_audience: string;
  keywords: string;
}

export async function autofillFromUrl(url: string): Promise<AutofillResult> {
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Autofill failed");
  return data.fields;
}

export async function discoverSubreddits(input: DiscoverRequest): Promise<DiscoverResponse> {
  if (!API_URL) {
    await new Promise((r) => setTimeout(r, 3000));
    return mockDiscoverResponse(input.product_name);
  }

  const res = await fetch(`${API_URL}/api/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new Error(`Discovery failed: ${res.statusText}`);
  return res.json();
}

export async function publishPosts(request: PublishRequest): Promise<PublishResponse> {
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error(`Publishing failed: ${res.statusText}`);
  return res.json();
}
