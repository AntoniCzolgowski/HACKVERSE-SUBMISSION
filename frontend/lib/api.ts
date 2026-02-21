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
    const results = request.posts.map((p) => ({
      subreddit: p.subreddit,
      status: "simulated" as const,
      reddit_url: `https://reddit.com/${p.subreddit}/comments/sim_${Date.now()}`,
      post_id: `sim_${Date.now()}`,
    }));

    // Store published posts in session storage for monitoring
    sessionStorage.setItem("publishedPosts", JSON.stringify({
      request_id: request.request_id,
      posts: request.posts,
      results: results,
      published_at: new Date().toISOString(),
    }));

    return { results };
  }

  const res = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error(`Publishing failed: ${res.statusText}`);
  const data = await res.json();

  // Store published posts for monitoring
  sessionStorage.setItem("publishedPosts", JSON.stringify({
    request_id: request.request_id,
    posts: request.posts,
    results: data.results,
    published_at: new Date().toISOString(),
  }));

  return data;
}

export async function fetchRedditPost(subreddit: string, postId: string) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LexTrackAI/1.0' }
    });

    if (!res.ok) throw new Error(`Failed to fetch post: ${res.statusText}`);
    const data = await res.json();

    if (data && data.length >= 2) {
      const postData = data[0].data.children[0].data;
      const commentsData = data[1].data.children;

      return {
        post: postData,
        comments: commentsData.filter((c: any) => c.kind !== 'more').map((c: any) => c.data)
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Reddit post:`, error);
    return null;
  }
}
