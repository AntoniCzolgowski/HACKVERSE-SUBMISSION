"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { discoverSubreddits, autofillFromUrl, scrapeSubredditsStream } from "@/lib/api";
import { DiscoverRequest, ScrapeProgressEvent } from "@/lib/types";
import { Search, Sparkles, Link, Loader2, BarChart3, Globe, Key } from "lucide-react";

const steps = [
  { label: "Discovering subreddits", icon: Search },
  { label: "Scraping live data", icon: Globe },
  { label: "AI scoring & ranking", icon: BarChart3 },
  { label: "Finalizing results", icon: Sparkles },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    product_name: "",
    product_description: "",
    niche_category: "",
    target_audience: "",
    keywords: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autofill state
  const [autofillUrl, setAutofillUrl] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // API key state
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key");
    if (stored) setApiKey(stored);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    if (value) {
      localStorage.setItem("anthropic_api_key", value);
    } else {
      localStorage.removeItem("anthropic_api_key");
    }
  }

  // Map progress to step index
  const currentStep =
    progress < 15 ? 0 : progress < 60 ? 1 : progress < 95 ? 2 : 3;

  async function handleAutofill() {
    if (!autofillUrl.trim()) return;
    setAutofilling(true);
    setAutofillStatus(null);

    try {
      const fields = await autofillFromUrl(autofillUrl.trim(), apiKey);
      setForm({
        product_name: fields.product_name || "",
        product_description: fields.product_description || "",
        niche_category: fields.niche_category || "",
        target_audience: fields.target_audience || "",
        keywords: fields.keywords || "",
      });
      setAutofillStatus({ type: "success", msg: "All fields populated from website" });
    } catch (err) {
      setAutofillStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to extract product info",
      });
    } finally {
      setAutofilling(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setProgressMsg("Starting analysis...");
    setError("");

    try {
      // --- Phase 1: Discover subreddits via Claude (0% → 15%) ---
      setProgressMsg("Discovering subreddits via AI...");
      // Animate progress 0→12 during discovery
      let discoverPct = 0;
      intervalRef.current = setInterval(() => {
        discoverPct += Math.random() * 1.5 + 0.3;
        if (discoverPct > 12) discoverPct = 12;
        setProgress(discoverPct);
      }, 100);

      const request: DiscoverRequest = {
        product_name: form.product_name,
        product_description: form.product_description,
        niche_category: form.niche_category,
        target_audience: form.target_audience,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      const discoverResult = await discoverSubreddits(request, apiKey);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(15);

      // Extract clean subreddit names
      const subNames = discoverResult.subreddits.map((s) =>
        s.name.replace(/^r\//, "")
      );

      // --- Phase 2: Scrape & rank with real progress (15% → 100%) ---
      setProgressMsg("Scraping subreddit data...");

      const scrapeResult = await scrapeSubredditsStream(
        subNames,
        form.product_description,
        (event: ScrapeProgressEvent) => {
          // Map scraper's 0-100 into our 15-100 range
          const mapped = 15 + (event.progress / 100) * 85;
          setProgress(mapped);
          setProgressMsg(event.message);
        },
        apiKey
      );

      // Store combined result for results page
      const analysisResult = {
        product_name: form.product_name,
        product_description: form.product_description,
        niche_category: form.niche_category,
        target_audience: form.target_audience,
        keywords: request.keywords,
        discovered_subreddits: discoverResult.subreddits,
        scrape_results: scrapeResult,
      };
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));

      setProgress(100);
      setProgressMsg("Analysis complete!");
      setTimeout(() => router.push("/results"), 400);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  return (
    <div className="section bg-white min-h-screen">
      <div className="max-w-[640px] mx-auto px-4">
        <h1 className="heading-section text-center mb-8">
          <span className="text-bold">Tell us about your product.</span>{" "}
          <span className="text-muted">We&apos;ll find your Reddit audience.</span>
        </h1>

        {/* Anthropic API Key */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4 text-gray-400" />
            <label className="text-sm font-semibold text-gray-900">Anthropic API Key</label>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            Enter your own API key to power the AI features. Get one at{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
              console.anthropic.com
            </a>
          </p>
          <input
            type="password"
            className="input-field w-full"
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
          />
        </div>

        {/* Autofill from URL */}
        <div
          className={`border-2 border-dashed rounded-2xl p-5 mb-6 transition-colors duration-300 ${
            autofilling ? "border-coral/50 bg-coral/[0.02]" : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Link className="w-4 h-4 text-coral" />
            <span className="text-sm font-semibold text-gray-900">Auto-fill from website</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Paste a company URL and AI will extract all product details automatically
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              className="input-field flex-1"
              placeholder="https://example.com"
              value={autofillUrl}
              onChange={(e) => setAutofillUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAutofill();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAutofill}
              disabled={autofilling || !autofillUrl.trim()}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center gap-2 whitespace-nowrap"
            >
              {autofilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract"
              )}
            </button>
          </div>
          {autofillStatus && (
            <p
              className={`text-xs mt-2 font-medium ${
                autofillStatus.type === "success" ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {autofillStatus.msg}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or fill in manually</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
          <div>
            <label className="input-label">Product Name</label>
            <input
              required
              className="input-field"
              placeholder="e.g. FitMatch"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">Product Description</label>
            <textarea
              required
              className="input-textarea"
              rows={4}
              placeholder="Describe what your product does..."
              value={form.product_description}
              onChange={(e) => setForm({ ...form, product_description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Niche Category</label>
              <input
                required
                className="input-field"
                placeholder="e.g. Fitness & Dating"
                value={form.niche_category}
                onChange={(e) => setForm({ ...form, niche_category: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Target Audience</label>
              <input
                required
                className="input-field"
                placeholder="e.g. Gym-goers aged 20-35"
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Keywords</label>
            <input
              required
              className="input-field"
              placeholder="gym dating, fitness singles (comma-separated)"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </div>

          {error && <div className="text-[#E94560] text-sm font-semibold">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-70 disabled:cursor-not-allowed inline-flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" /> Analyze Reddit
              </>
            )}
          </button>

          {loading && (
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {progressMsg}
                  </span>
                  <span className="text-sm font-mono font-semibold text-coral">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #E94560 0%, #FF6B81 100%)",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  const isDone = i < currentStep;
                  const isActive = i === currentStep;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isDone
                            ? "bg-coral text-white"
                            : isActive
                            ? "bg-coral/10 text-coral ring-2 ring-coral/30"
                            : "bg-gray-100 text-gray-300"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[11px] font-medium transition-colors duration-300 ${
                          isDone || isActive ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        {s.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
