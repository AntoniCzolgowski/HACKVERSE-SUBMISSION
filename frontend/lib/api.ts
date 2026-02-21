import { DiscoverRequest, DiscoverResponse, PublishRequest, PublishResponse } from "./types";
import { mockDiscoverResponse } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
