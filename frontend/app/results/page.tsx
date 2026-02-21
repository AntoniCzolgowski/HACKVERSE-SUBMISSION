"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult, ScrapedSubreddit, PostDraft } from "@/lib/types";
import { generatePosts } from "@/lib/api";
import {
  Download, ExternalLink, ChevronDown, ChevronUp,
  Shield, Activity, Brain, Sparkles, Loader2,
  HelpCircle, MessageSquare, Share2, Copy, Check,
  Clock, Target, Send, CheckCircle2,
} from "lucide-react";

/* ── Score bar ──────────────────────────────────────────── */
function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ── Draft meta config ─────────────────────────────────── */
const DRAFT_META: Record<string, { icon: typeof HelpCircle; accent: string; bg: string; border: string }> = {
  question_post:    { icon: HelpCircle,    accent: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
  discussion_post:  { icon: MessageSquare, accent: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200" },
  resource_share:   { icon: Share2,        accent: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200" },
};

/* ── Draft card with checkbox ──────────────────────────── */
function DraftCard({
  draft,
  selected,
  onToggle,
}: {
  draft: PostDraft;
  selected: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState<"title" | "body" | null>(null);
  const meta = DRAFT_META[draft.type] || DRAFT_META.question_post;
  const Icon = meta.icon;

  function copy(field: "title" | "body") {
    navigator.clipboard.writeText(field === "title" ? draft.title : draft.body);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }

  const confPct = Math.round(draft.confidence_score * 100);
  const confColor =
    confPct >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    confPct >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-orange-600 bg-orange-50 border-orange-200";

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
        selected
          ? `${meta.border} ring-2 ring-offset-1 ring-coral/30`
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header with checkbox */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${meta.bg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.accent}`} />
          <span className={`text-sm font-semibold ${meta.accent}`}>{draft.label}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[11px] font-medium text-gray-500">
            {selected ? "Selected" : "Select"}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="sr-only peer"
            />
            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
              selected
                ? "bg-coral border-coral"
                : "bg-white border-gray-300 peer-hover:border-gray-400"
            }`}>
              {selected && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </label>
      </div>

      <div className="p-4 space-y-3">
        {/* Confidence + Cadence row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${confColor}`}>
            <Target className="w-3 h-3" />
            {confPct}% confidence
          </span>
          {draft.recommended_cadence && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Clock className="w-3 h-3" />
              {draft.recommended_cadence}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Title</span>
            <button onClick={() => copy("title")} className="text-gray-400 hover:text-gray-600 transition-colors">
              {copied === "title" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-sm font-semibold text-gray-900">{draft.title}</p>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Body</span>
            <button onClick={() => copy("body")} className="text-gray-400 hover:text-gray-600 transition-colors">
              {copied === "body" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{draft.body}</p>
        </div>

        {/* Strategy — why this post fits this subreddit */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Why this post fits this subreddit</p>
          <p className="text-xs text-gray-600 leading-relaxed">{draft.strategy}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Subreddit card ────────────────────────────────────── */
function SubredditCard({
  sub,
  rank,
  reason,
  drafts,
  selectedKeys,
  onToggleDraft,
}: {
  sub: ScrapedSubreddit;
  rank: number;
  reason: string;
  drafts?: PostDraft[];
  selectedKeys: Set<string>;
  onToggleDraft: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);
  const pct = Math.round(sub.final_score * 100);
  const scoreColor =
    pct >= 70 ? "text-emerald-600 bg-emerald-50" :
    pct >= 40 ? "text-amber-600 bg-amber-50" :
    "text-red-500 bg-red-50";

  const subSelectedCount = drafts
    ? drafts.filter((_, i) => selectedKeys.has(`${sub.subreddit}::${i}`)).length
    : 0;

  return (
    <div className="card relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-coral/10 text-coral flex items-center justify-center text-sm font-bold shrink-0">
            {rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">r/{sub.subreddit}</h2>
              <a
                href={`https://www.reddit.com/r/${sub.subreddit}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral hover:text-coral/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {sub.subscribers?.toLocaleString()} members
              {sub.active_users ? ` · ${sub.active_users.toLocaleString()} online` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {subSelectedCount > 0 && (
            <span className="px-2 py-1 rounded-full text-[11px] font-bold text-coral bg-coral/10">
              {subSelectedCount} selected
            </span>
          )}
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${scoreColor}`}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Why this subreddit was selected */}
      {reason && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Why this subreddit was selected</p>
          <p className="text-xs text-blue-700 leading-relaxed">{reason}</p>
        </div>
      )}

      {/* Description */}
      {sub.description && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{sub.description}</p>
      )}

      {/* Score Breakdown */}
      <div className="space-y-2 mb-4">
        <ScoreBar score={sub.breakdown.semantic} label="Relevance" color="#E94560" />
        <ScoreBar score={sub.breakdown.tolerance} label="Tolerance" color="#6366f1" />
        <ScoreBar score={sub.breakdown.activity} label="Activity" color="#f59e0b" />
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Brain className="w-3 h-3" /> Semantic fit
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="w-3 h-3" /> Self-promo tolerance
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Activity className="w-3 h-3" /> Community activity
        </div>
      </div>

      {/* Post Drafts */}
      {drafts && drafts.length > 0 && (
        <div className="mb-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Generated Post Drafts — select posts to include in your plan
            </h3>
            {showDrafts ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showDrafts && (
            <div className="space-y-4">
              {drafts.map((draft, i) => {
                const key = `${sub.subreddit}::${i}`;
                return (
                  <DraftCard
                    key={key}
                    draft={draft}
                    selected={selectedKeys.has(key)}
                    onToggle={() => onToggleDraft(key)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expand/Collapse details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm font-medium text-coral hover:text-coral/80 transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? "Hide details" : "Show recent posts & rules"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {sub.recent_posts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Recent Hot Posts
              </h3>
              <div className="space-y-2">
                {sub.recent_posts.slice(0, 5).map((post, i) => (
                  <a
                    key={i}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="text-xs font-mono font-semibold text-gray-400 w-12 text-right shrink-0 pt-0.5">
                      {post.upvotes >= 1000
                        ? `${(post.upvotes / 1000).toFixed(1)}k`
                        : post.upvotes}{" "}
                      ↑
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 group-hover:text-coral transition-colors line-clamp-2">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {post.num_comments} comments
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {sub.rules.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Subreddit Rules
              </h3>
              <div className="space-y-1">
                {sub.rules.slice(0, 5).map((rule, i) => (
                  <p key={i} className="text-xs text-gray-500 pl-3 border-l-2 border-gray-200">
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sticky bottom bar ─────────────────────────────────── */
function BottomBar({
  selectedCount,
  onDownload,
  onPublish,
  publishMessage,
}: {
  selectedCount: number;
  onDownload: () => void;
  onPublish: () => void;
  publishMessage: string | null;
}) {
  if (selectedCount === 0 && !publishMessage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-4xl mx-auto px-4 pb-4">
        {/* Publish success message */}
        {publishMessage && (
          <div className="mb-2 bg-emerald-600 text-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium">{publishMessage}</p>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="bg-gray-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl shadow-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-coral flex items-center justify-center text-sm font-bold">
                {selectedCount}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {selectedCount} {selectedCount === 1 ? "post" : "posts"} selected
                </p>
                <p className="text-xs text-gray-400">Ready to publish or export</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownload}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Plan
              </button>
              <button
                onClick={onPublish}
                className="bg-coral hover:bg-coral/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [draftsMap, setDraftsMap] = useState<Record<string, PostDraft[]>>({});
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("analysisResult");
    if (!stored) {
      router.push("/discover");
      return;
    }
    setData(JSON.parse(stored));
  }, [router]);

  if (!data) return null;

  const subs = data.scrape_results.subreddits;
  const hasGenerated = Object.keys(draftsMap).length > 0;

  // Build a map of subreddit name -> discovery reason
  const reasonMap: Record<string, string> = {};
  for (const ds of data.discovered_subreddits) {
    // ds.name is like "r/fitness", strip the prefix for matching
    const clean = ds.name.replace(/^r\//, "");
    reasonMap[clean] = ds.reason;
    reasonMap[clean.toLowerCase()] = ds.reason;
    reasonMap[ds.name] = ds.reason;
  }

  function getReasonForSub(subreddit: string): string {
    return reasonMap[subreddit] || reasonMap[subreddit.toLowerCase()] || "";
  }

  function toggleDraft(key: string) {
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleGenerate() {
    if (!data) return;
    setGenerating(true);
    setGenError("");

    try {
      const result = await generatePosts({
        product_name: data.product_name,
        product_description: data.product_description,
        niche_category: data.niche_category,
        target_audience: data.target_audience,
        keywords: data.keywords,
        subreddits: subs,
      });

      const map: Record<string, PostDraft[]> = {};
      for (const sd of result.subreddit_drafts) {
        map[sd.subreddit] = sd.drafts;
      }
      setDraftsMap(map);
      setSelectedDrafts(new Set());
    } catch {
      setGenError("Failed to generate posts. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function buildSelectedPosts() {
    const posts: Array<{
      subreddit: string;
      post_type: string;
      title: string;
      body: string;
      why_this_post_fits: string;
      confidence_score: number;
      recommended_cadence: string;
      why_subreddit_selected: string;
      subreddit_context: {
        score: number;
        subscribers: number;
        active_users: number;
        rules: string[];
      };
    }> = [];

    for (const key of selectedDrafts) {
      const [subreddit, indexStr] = key.split("::");
      const index = parseInt(indexStr);
      const drafts = draftsMap[subreddit];
      const sub = subs.find((s) => s.subreddit === subreddit);
      if (drafts && drafts[index] && sub) {
        const draft = drafts[index];
        posts.push({
          subreddit: `r/${subreddit}`,
          post_type: draft.type,
          title: draft.title,
          body: draft.body,
          why_this_post_fits: draft.strategy,
          confidence_score: draft.confidence_score,
          recommended_cadence: draft.recommended_cadence,
          why_subreddit_selected: getReasonForSub(subreddit),
          subreddit_context: {
            score: sub.final_score,
            subscribers: sub.subscribers,
            active_users: sub.active_users,
            rules: sub.rules,
          },
        });
      }
    }
    return posts;
  }

  function downloadFullJSON() {
    if (!data) return;
    const output = {
      product: {
        name: data.product_name,
        description: data.product_description,
        niche_category: data.niche_category,
        target_audience: data.target_audience,
        keywords: data.keywords,
      },
      recommended_subreddits: subs.map((s) => ({
        name: `r/${s.subreddit}`,
        url: `https://www.reddit.com/r/${s.subreddit}`,
        score: s.final_score,
        why: getReasonForSub(s.subreddit),
        breakdown: s.breakdown,
        rule_notes: s.rules,
        subscribers: s.subscribers,
        active_users: s.active_users,
        recent_posts: s.recent_posts,
        ...(draftsMap[s.subreddit] ? {
          post_drafts: draftsMap[s.subreddit].map((d) => ({
            post_type: d.type,
            title: d.title,
            body: d.body,
            why_this_post_fits: d.strategy,
            confidence_score: d.confidence_score,
            recommended_cadence: d.recommended_cadence,
          })),
        } : {}),
      })),
      generated_at: new Date().toISOString(),
    };
    downloadFile(output, `lextrack-${data.product_name.toLowerCase().replace(/\s+/g, "-")}-full.json`);
  }

  function downloadPostPlan() {
    if (!data) return;
    const selectedPosts = buildSelectedPosts();
    const postPlan = {
      product: {
        name: data.product_name,
        description: data.product_description,
        niche_category: data.niche_category,
        target_audience: data.target_audience,
        keywords: data.keywords,
      },
      post_plan: selectedPosts,
      total_posts: selectedPosts.length,
      generated_at: new Date().toISOString(),
    };
    downloadFile(postPlan, `lextrack-${data.product_name.toLowerCase().replace(/\s+/g, "-")}-post-plan.json`);
  }

  async function handlePublish() {
    if (!data) return;
    const selectedPosts = buildSelectedPosts();

    // Limit to 1-5 posts as specified
    const postsToPublish = selectedPosts.slice(0, 5);

    if (postsToPublish.length === 0) {
      setPublishMessage("Please select at least one post to publish");
      setTimeout(() => setPublishMessage(null), 3000);
      return;
    }

    // Build the post plan JSON
    const postPlan = {
      product: {
        name: data.product_name,
        description: data.product_description,
        niche_category: data.niche_category,
        target_audience: data.target_audience,
        keywords: data.keywords,
      },
      published_posts: postsToPublish,
      total_posts: postsToPublish.length,
      published_at: new Date().toISOString(),
      status: "published",
    };

    try {
      // Send to backend
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/campaigns/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPlan),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Backend error:", errorData);
        throw new Error(errorData.error || "Failed to publish campaign");
      }

      const result = await response.json();

      // Show success message
      const subCount = new Set(postsToPublish.map((p) => p.subreddit)).size;
      setPublishMessage(
        `Published ${postsToPublish.length} ${postsToPublish.length === 1 ? "post" : "posts"} across ${subCount} ${subCount === 1 ? "subreddit" : "subreddits"}. Redirecting to dashboard...`
      );

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Publish error:", error);
      setPublishMessage("Failed to publish. Please try again.");
      setTimeout(() => setPublishMessage(null), 3000);
    }
  }

  function downloadFile(obj: object, filename: string) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  return (
    <div className={`section bg-[#FFF8F0] min-h-screen ${selectedDrafts.size > 0 ? "pb-28" : ""}`}>
      <div className="section-inner">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="heading-section">
              <span className="text-bold">{subs.length} communities ranked.</span>{" "}
              <span className="text-muted">For &quot;{data.product_name}&quot;</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Scored by semantic relevance, self-promo tolerance, and community activity
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {!hasGenerated ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating drafts...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Posts
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            )}
            <button
              onClick={downloadFullJSON}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Full Report
            </button>
          </div>
        </div>

        {genError && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
            {genError}
          </div>
        )}

        {hasGenerated && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {Object.keys(draftsMap).length} subreddits — 3 tailored drafts each
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Each post is crafted using the subreddit&apos;s rules, recent discussions, and community tone.
                  Select the posts you want, then publish or download your post plan.
                </p>
              </div>
            </div>
          </div>
        )}

        {generating && (
          <div className="mb-6 p-4 rounded-xl bg-coral/5 border border-coral/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-coral animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Generating subreddit-native posts...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Claude is analyzing each subreddit&apos;s rules, tone, and recent discussions to craft unique posts per community.
                  This takes 15-30 seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {subs.map((sub, i) => (
            <SubredditCard
              key={sub.subreddit}
              sub={sub}
              rank={i + 1}
              reason={getReasonForSub(sub.subreddit)}
              drafts={draftsMap[sub.subreddit]}
              selectedKeys={selectedDrafts}
              onToggleDraft={toggleDraft}
            />
          ))}
        </div>

        {/* Bottom action */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={() => router.push("/discover")}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Run another analysis
          </button>
          <button
            onClick={downloadFullJSON}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Full Report
          </button>
        </div>
      </div>

      {/* Sticky bottom bar with publish + download */}
      <BottomBar
        selectedCount={selectedDrafts.size}
        onDownload={downloadPostPlan}
        onPublish={handlePublish}
        publishMessage={publishMessage}
      />
    </div>
  );
}
