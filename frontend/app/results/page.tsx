"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult, ScrapedSubreddit } from "@/lib/types";
import { Download, ExternalLink, ChevronDown, ChevronUp, Shield, Activity, Brain } from "lucide-react";

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

function SubredditCard({ sub, rank }: { sub: ScrapedSubreddit; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(sub.final_score * 100);
  const scoreColor =
    pct >= 70 ? "text-emerald-600 bg-emerald-50" :
    pct >= 40 ? "text-amber-600 bg-amber-50" :
    "text-red-500 bg-red-50";

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
        <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${scoreColor}`}>
          {pct}%
        </div>
      </div>

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

      {/* Score legend */}
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

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm font-medium text-coral hover:text-coral/80 transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? "Hide details" : "Show recent posts & rules"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Recent Posts */}
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

          {/* Rules */}
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

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);

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

  function downloadJSON() {
    if (!data) return;
    const output = {
      product: {
        name: data.product_name,
        description: data.product_description,
        niche_category: data.niche_category,
        target_audience: data.target_audience,
        keywords: data.keywords,
      },
      subreddits: subs.map((s) => ({
        name: s.subreddit,
        url: `https://www.reddit.com/r/${s.subreddit}`,
        final_score: s.final_score,
        breakdown: s.breakdown,
        subscribers: s.subscribers,
        active_users: s.active_users,
        description: s.description,
        rules: s.rules,
        recent_posts: s.recent_posts,
      })),
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lextrack-${data.product_name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
  }

  return (
    <div className="section bg-[#FFF8F0] min-h-screen">
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
          <button
            onClick={downloadJSON}
            className="btn-secondary inline-flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" /> Download JSON
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {subs.map((sub, i) => (
            <SubredditCard key={sub.subreddit} sub={sub} rank={i + 1} />
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
            onClick={downloadJSON}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
