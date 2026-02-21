"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { discoverSubreddits } from "@/lib/api";
import { DiscoverRequest } from "@/lib/types";

const steps = [
  "Enhancing search queries...",
  "Discovering relevant subreddits...",
  "Analyzing community culture...",
  "Generating tailored posts...",
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
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStep(0);
    setError("");

    const interval = setInterval(() => {
      setStep((prev) => Math.min(prev + 1, 3));
    }, 800);

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
      clearInterval(interval);
      router.push("/results");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      clearInterval(interval);
    }
  }

  return (
    <div className="section bg-white min-h-screen">
      <div className="max-w-[640px] mx-auto px-4">
        <h1 className="heading-section text-center mb-8">
          <span className="text-bold">Tell us about your product.</span>{" "}
          <span className="text-muted">We'll find your Reddit audience.</span>
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
            className="btn-primary w-full mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? "Analyzing..." : "🔍 Analyze Reddit →"}
          </button>

          {loading && (
            <div className="mt-6 flex flex-col gap-2">
              {steps.map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">
                    {i < step ? "✅" : i === step ? "⏳" : "⬜"}
                  </span>
                  <span
                    className={
                      i < step
                        ? "text-gray-900"
                        : i === step
                        ? "text-[#E94560] animate-pulse font-medium"
                        : "text-gray-400"
                    }
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}