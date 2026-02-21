"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { discoverSubreddits } from "@/lib/api";
import { DiscoverRequest } from "@/lib/types";
import { Search, Sparkles, Users, FileText } from "lucide-react";

const steps = [
  { label: "Enhancing search queries", icon: Sparkles },
  { label: "Discovering relevant subreddits", icon: Search },
  { label: "Analyzing community culture", icon: Users },
  { label: "Generating tailored posts", icon: FileText },
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
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentStep = Math.min(Math.floor(progress / 25), 3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setError("");

    // Smooth progress: accelerates to ~90%, then waits for real completion
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += Math.random() * 3 + 0.5;
      if (current > 92) current = 92;
      setProgress(current);
    }, 80);

    try {
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
      const result = await discoverSubreddits(request);
      sessionStorage.setItem("discoverResult", JSON.stringify(result));

      if (intervalRef.current) clearInterval(intervalRef.current);
      // Animate to 100% before navigating
      setProgress(100);
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
              {/* Progress bar */}
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {steps[currentStep].label}...
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

              {/* Step indicators */}
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
