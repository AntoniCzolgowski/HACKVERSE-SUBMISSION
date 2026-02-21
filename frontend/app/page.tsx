"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  PenTool,
  BarChart3,
  Target,
  Layers,
  Brain,
  Pencil,
  Radio,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const howItWorks = [
  {
    title: "Describe",
    Icon: FileText,
    desc: "Enter your product details, target audience, and relevant keywords",
  },
  {
    title: "Discover",
    Icon: Search,
    desc: "AI finds and ranks the 10 most relevant Reddit communities",
  },
  {
    title: "Publish",
    Icon: PenTool,
    desc: "Review, edit, and post AI-crafted content in 3 variations",
  },
  {
    title: "Monitor",
    Icon: BarChart3,
    desc: "Track engagement, sentiment, and get AI-powered recommendations",
  },
];

const features = [
  {
    label: "TARGETED",
    Icon: Target,
    desc: "AI analyzes 50 recent posts per subreddit to match community tone and culture",
  },
  {
    label: "TAILORED",
    Icon: Layers,
    desc: "3 post types per community: organic user, professional, and subtle engagement",
  },
  {
    label: "EXPLAINABLE",
    Icon: Brain,
    desc: "Every recommendation includes a relevance score and clear reasoning",
  },
  {
    label: "EDITABLE",
    Icon: Pencil,
    desc: "Full editorial control — review and modify every post before publishing",
  },
  {
    label: "ONE-CLICK",
    Icon: Radio,
    desc: "Publish to multiple subreddits simultaneously via Reddit API",
  },
  {
    label: "MONITOR",
    Icon: TrendingUp,
    desc: "Track upvotes, comments, and sentiment analysis in real time",
  },
];

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full">
      {/* 1. Hero */}
      <section className="section pt-24 pb-20 bg-white">
        <div className="section-inner text-center flex flex-col items-center">
          <h1 className="heading-hero animate-on-scroll animate-fade-up opacity-0 stagger-1">
            <span className="text-bold">Find your audience.</span>{" "}
            <span className="text-muted">Let AI do the outreach.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mt-6 animate-on-scroll animate-fade-up opacity-0 stagger-2">
            AI-powered Reddit community discovery and tailored post generation for niche products.
          </p>
          <div className="flex gap-4 mt-8 animate-on-scroll animate-fade-up opacity-0 stagger-3">
            <Link href="/discover" className="btn-primary inline-flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* 2. How It Works */}
      <section id="how-it-works" className="section bg-white">
        <div className="section-inner">
          <h2 className="heading-section text-center mb-12 animate-on-scroll animate-fade-up opacity-0">
            <span className="text-bold">How it works.</span>{" "}
            <span className="text-muted">Four steps to Reddit growth.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div
                key={i}
                className={`card animate-on-scroll animate-fade-up opacity-0 stagger-${i + 1}`}
              >
                <div className="w-10 h-10 bg-coral text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mt-4">
                  <step.Icon className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-gray-900 mt-3">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Features */}
      <section className="section bg-white">
        <div className="section-inner">
          <h2 className="heading-section text-center mb-12 animate-on-scroll animate-fade-up opacity-0">
            <span className="text-bold">Smart outreach.</span>{" "}
            <span className="text-muted">Not spam.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div
                key={i}
                className={`card animate-on-scroll animate-fade-up opacity-0 stagger-${(i % 3) + 1}`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                  <feat.Icon className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <div className="card-label">{feat.label}</div>
                <p className="text-sm text-gray-500 mt-2">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTA Section */}
      <section className="section section-warm">
        <div className="section-inner text-center">
          <h2 className="heading-section mb-8 animate-on-scroll animate-fade-up opacity-0">
            <span className="text-bold">Ready to find your Reddit audience?</span>
          </h2>
          <div className="animate-on-scroll animate-fade-up opacity-0 stagger-1">
            <Link href="/discover" className="btn-primary inline-flex items-center gap-2">
              Start Discovering <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
