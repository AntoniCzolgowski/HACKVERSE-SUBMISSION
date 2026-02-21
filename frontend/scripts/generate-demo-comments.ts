import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

// Load personas
const personasPath = path.join(__dirname, '..', 'lib', 'personas.json');
const personasData = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
const personas = personasData.personas;

// API Configuration
const API_URL = process.env.SENTIMENT_API_URL || "https://api.anthropic.com/v1/messages";
const API_KEY = process.env.SENTIMENT_API_KEY || "";

interface RedditPost {
  subreddit: string;
  title: string;
  body: string;
  post_type: string;
  permalink?: string;
  score?: number;
}

interface PostPlanInput {
  product?: {
    name: string;
    description: string;
  };
  post_plan?: RedditPost[];
  posts?: RedditPost[];
}

interface GeneratedComment {
  author: string;
  body: string;
  score: number;
  created_utc: number;
  persona_id: number;
}

interface PostWithComments {
  post: RedditPost;
  comments: GeneratedComment[];
}

/**
 * Randomly select a number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Randomly select N unique personas
 */
function selectRandomPersonas(count: number): any[] {
  const shuffled = [...personas].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, personas.length));
}

/**
 * Generate comment score based on sentiment and randomness
 */
function generateCommentScore(sentiment: string): number {
  let baseScore = randomBetween(1, 50);

  if (sentiment === 'positive') {
    baseScore = randomBetween(5, 100);
  } else if (sentiment === 'negative') {
    baseScore = randomBetween(0, 20);
  } else {
    baseScore = randomBetween(2, 40);
  }

  return baseScore;
}

/**
 * Generate a realistic Reddit username based on persona
 */
function generateUsername(persona: any): string {
  const styles = [
    `${persona.name.split(' ')[0]}${randomBetween(100, 9999)}`,
    `${persona.interests[0].replace(/ /g, '_')}_${persona.age}`,
    `${persona.occupation.replace(/ /g, '').toLowerCase()}_user`,
    `reddit_${persona.name.split(' ')[0].toLowerCase()}`,
    `${persona.interests[0].replace(/ /g, '').toLowerCase()}${randomBetween(10, 99)}`
  ];

  return styles[randomBetween(0, styles.length - 1)];
}

/**
 * Call Anthropic API to generate a comment
 */
async function generateCommentWithAI(
  post: RedditPost,
  persona: any
): Promise<{ comment: string; sentiment: string }> {
  const systemPrompt = `You are simulating a Reddit comment from a specific persona. Generate a realistic, authentic Reddit comment that matches the persona's characteristics.

IMPORTANT RULES:
1. Write ONLY the comment text - no meta-commentary, no explanations
2. Match the persona's communication style, vocabulary, and tone exactly
3. React to the Reddit post naturally based on the persona's attitudes and interests
4. Keep comments between 1-4 sentences (Reddit-realistic length)
5. Use natural Reddit language (casual, sometimes with typos, varied punctuation)
6. DO NOT use emojis unless the persona is very young/casual
7. Stay in character completely

Respond with JSON only: {"comment": "the comment text here", "sentiment": "positive/neutral/negative"}`;

  const userPrompt = `Reddit Post Context:
Subreddit: ${post.subreddit}
Title: ${post.title}
Body: ${post.body}
Post Type: ${post.post_type}

Persona Details:
Name: ${persona.name}
Age: ${persona.age}
Occupation: ${persona.occupation}
Attitude: ${persona.attitude_towards_products}
Communication Style: ${persona.communication_style}
Typical Sentiment: ${persona.typical_sentiment}
Reddit Behavior: ${persona.reddit_behavior}

Generate ONE authentic Reddit comment from this persona responding to the post above.`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        temperature: 0.9,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.content[0].text;

    // Remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const result = JSON.parse(content);

    return {
      comment: result.comment,
      sentiment: result.sentiment || 'neutral'
    };
  } catch (error) {
    console.error("Error generating comment:", error);
    // Fallback comment
    return {
      comment: "Interesting post, thanks for sharing!",
      sentiment: "neutral"
    };
  }
}

/**
 * Generate comments for a single Reddit post
 */
async function generateCommentsForPost(
  post: RedditPost,
  commentCount?: number
): Promise<GeneratedComment[]> {
  const numComments = commentCount || randomBetween(2, 15);
  console.log(`\nGenerating ${numComments} comments for post: "${post.title}"`);

  const selectedPersonas = selectRandomPersonas(numComments);
  const comments: GeneratedComment[] = [];

  const baseTimestamp = Math.floor(Date.now() / 1000) - randomBetween(3600, 86400); // 1-24 hours ago

  for (let i = 0; i < numComments; i++) {
    const persona = selectedPersonas[i];
    console.log(`  [${i + 1}/${numComments}] Generating comment from ${persona.name}...`);

    const { comment, sentiment } = await generateCommentWithAI(post, persona);

    comments.push({
      author: generateUsername(persona),
      body: comment,
      score: generateCommentScore(sentiment),
      created_utc: baseTimestamp + (i * randomBetween(300, 3600)), // Comments spread over time
      persona_id: persona.id
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`  ✓ Generated ${comments.length} comments`);
  return comments;
}

/**
 * Process multiple Reddit posts and generate comments for each
 */
async function generateCommentsForPosts(
  posts: RedditPost[],
  outputPath: string
): Promise<void> {
  console.log(`\n🚀 Starting comment generation for ${posts.length} posts...\n`);

  const results: PostWithComments[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n📝 Processing post ${i + 1}/${posts.length}: ${post.subreddit}`);

    const comments = await generateCommentsForPost(post);

    results.push({
      post: post,
      comments: comments
    });
  }

  // Save results to JSON file
  const outputData = {
    generated_at: new Date().toISOString(),
    total_posts: results.length,
    total_comments: results.reduce((sum, r) => sum + r.comments.length, 0),
    posts: results
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n✅ Complete! Generated comments saved to: ${outputPath}`);
  console.log(`   Total posts: ${outputData.total_posts}`);
  console.log(`   Total comments: ${outputData.total_comments}`);
}

/**
 * Main execution
 */
async function main() {
  // Check for API key
  if (!API_KEY || API_KEY === "") {
    console.error("❌ Error: SENTIMENT_API_KEY environment variable not set");
    console.error("   Please set it in your .env.local file");
    process.exit(1);
  }

  // Get input file path from command line arguments
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("❌ Error: Please provide an input JSON file path");
    console.error("   Usage: npx tsx scripts/generate-demo-comments.ts <input-posts.json>");
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Load posts from input file
  const postsData: PostPlanInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Handle different JSON formats:
  // 1. LexTrack format: { post_plan: [...] }
  // 2. Direct array: [...]
  // 3. Simple object: { posts: [...] }
  let posts: RedditPost[] = [];

  if (postsData.post_plan) {
    posts = postsData.post_plan;
    console.log(`📦 Loaded LexTrack post plan for: ${postsData.product?.name || 'product'}`);
  } else if (Array.isArray(postsData)) {
    posts = postsData;
  } else if (postsData.posts) {
    posts = postsData.posts;
  }

  if (posts.length === 0) {
    console.error("❌ Error: No posts found in input file");
    console.error("   Expected format: { post_plan: [...] } or { posts: [...] } or [...]");
    process.exit(1);
  }

  console.log(`📝 Found ${posts.length} post(s) to generate comments for`);

  // Validate posts have required fields
  posts.forEach((post, i) => {
    if (!post.title || !post.body || !post.subreddit) {
      console.error(`❌ Error: Post ${i + 1} missing required fields (title, body, subreddit)`);
      process.exit(1);
    }
  });

  // Generate output file path
  const outputPath = inputPath.replace('.json', '-with-comments.json');

  // Generate comments
  await generateCommentsForPosts(posts, outputPath);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { generateCommentsForPost, generateCommentsForPosts };
