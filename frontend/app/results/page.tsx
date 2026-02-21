"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DiscoverResponse, PostDraft } from "@/lib/types";
import { publishPosts } from "@/lib/api";
import ScoreBadge from "@/components/ui/score-badge";
import { User, Building2, MessageCircle, Download, Send } from "lucide-react";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [editedPosts, setEditedPosts] = useState<Record<string, Record<string, PostDraft>>>({});
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("discoverResult");
    if (!stored) {
      router.push("/discover");
      return;
    }
    const parsed: DiscoverResponse = JSON.parse(stored);
    
    // Sort by relevance score descending
    parsed.subreddits.sort((a, b) => b.relevance_score - a.relevance_score);
    setData(parsed);

    const initialTabs: Record<string, string> = {};
    const initialEdits: Record<string, Record<string, PostDraft>> = {};

    parsed.subreddits.forEach((sub) => {
      initialTabs[sub.name] = "organic_user";
      initialEdits[sub.name] = {};
      sub.post_drafts.forEach((draft) => {
        initialEdits[sub.name][draft.type] = { ...draft };
      });
    });

    setActiveTab(initialTabs);
    setEditedPosts(initialEdits);
  }, [router]);

  if (!data) return null; // Or a loading spinner

  const handleSelectAll = () => {
    if (selected.size === data.subreddits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.subreddits.map((s) => s.name)));
    }
  };

  const toggleSelection = (subName: string) => {
    const next = new Set(selected);
    if (next.has(subName)) next.delete(subName);
    else next.add(subName);
    setSelected(next);
  };

  const handleEdit = (subName: string, type: string, field: "title" | "body", value: string) => {
    setEditedPosts((prev) => ({
      ...prev,
      [subName]: {
        ...prev[subName],
        [type]: {
          ...prev[subName][type],
          [field]: value,
        },
      },
    }));
  };

  function downloadJSON() {
    if (!data) return;
    const output = {
      product: data.product_name,
      recommended_subreddits: data.subreddits.map((s) => ({
        name: s.name,
        score: s.relevance_score,
        why: s.reasoning,
        rule_notes: s.rules_summary,
      })),
      post_drafts: data.subreddits.flatMap((s) =>
        s.post_drafts.map((p) => ({
          subreddit: s.name,
          post_type: p.type,
          title: editedPosts[s.name]?.[p.type]?.title ?? p.title,
          body: editedPosts[s.name]?.[p.type]?.body ?? p.body,
        }))
      ),
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lextrack-output.json";
    a.click();
  }

  async function handlePublish() {
    if (!data || selected.size === 0) return;
    setPublishing(true);
    const posts = Array.from(selected).map((subName) => {
      const sub = data.subreddits.find((s) => s.name === subName)!;
      const type = activeTab[subName] || "organic_user";
      const draft = editedPosts[subName]?.[type] || sub.post_drafts.find((p) => p.type === type)!;
      return { subreddit: subName, title: draft.title, body: draft.body, post_type: type };
    });
    
    try {
      const result = await publishPosts({ request_id: data.request_id, posts });
      alert(`Successfully published ${result.results?.length || posts.length} posts!`);
    } catch (e) {
      alert("Error publishing posts. Check console.");
      console.error(e);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="section bg-[#FFF8F0] min-h-screen">
      <div className="section-inner">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="heading-section">
              <span className="text-bold">{data.subreddits.length} communities found.</span>{" "}
              <span className="text-muted">For "{data.product_name}"</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#E94560]"
                checked={selected.size === data.subreddits.length && data.subreddits.length > 0}
                onChange={handleSelectAll}
              />
              Select All
            </label>
            <button
              onClick={handlePublish}
              disabled={selected.size === 0 || publishing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? "Publishing..." : "Publish Selected →"}
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-8">
          {data.subreddits.map((sub) => {
            const currentTab = activeTab[sub.name];
            const draft = editedPosts[sub.name]?.[currentTab];

            return (
              <div key={sub.name} className="card relative">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 mt-1 accent-[#E94560] cursor-pointer"
                      checked={selected.has(sub.name)}
                      onChange={() => toggleSelection(sub.name)}
                    />
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{sub.name}</h2>
                        <ScoreBadge score={sub.relevance_score} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {sub.subscribers?.toLocaleString()} members · {sub.active_users?.toLocaleString()} online
                      </p>
                      <p className="text-sm text-gray-700 italic mt-1">"{sub.community_tone}"</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="card-label">WHY</div>
                    <p className="text-sm text-gray-700">
                      {Array.isArray(sub.reasoning) ? sub.reasoning.join(" · ") : sub.reasoning}
                    </p>
                  </div>
                  <div>
                    <div className="card-label">RULES</div>
                    <p className="text-sm text-gray-700">
                      {Array.isArray(sub.rules_summary)
                        ? sub.rules_summary.join(" · ")
                        : sub.rules_summary}
                    </p>
                  </div>
                </div>

                {/* Editor Tabs */}
                {draft && (
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <div className="relative inline-flex bg-gray-100 rounded-full p-1 mb-6">
                      {sub.post_drafts.map((p) => {
                        const isActive = currentTab === p.type;
                        const Icon = p.type === "organic_user" ? User : p.type === "company_professional" ? Building2 : MessageCircle;
                        return (
                          <button
                            key={p.type}
                            onClick={() =>
                              setActiveTab((prev) => ({ ...prev, [sub.name]: p.type }))
                            }
                            className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? "bg-white text-gray-900 shadow-md"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {p.type
                              .split("_")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ")}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="input-label">TITLE</label>
                        <input
                          className="input-field"
                          value={draft.title}
                          onChange={(e) =>
                            handleEdit(sub.name, currentTab, "title", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">BODY</label>
                        <textarea
                          className="input-textarea"
                          rows={6}
                          value={draft.body}
                          onChange={(e) => handleEdit(sub.name, currentTab, "body", e.target.value)}
                        />
                      </div>
                      <p className="text-xs italic text-gray-400">
                        Strategy: {draft.strategy}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Bar Action */}
        <div className="mt-12 flex justify-end gap-4">
          <button onClick={downloadJSON} className="btn-secondary inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Download JSON
          </button>
          <button
            onClick={handlePublish}
            disabled={selected.size === 0 || publishing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Publish Selected
          </button>
        </div>
      </div>
    </div>
  );
}