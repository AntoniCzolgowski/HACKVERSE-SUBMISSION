import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: "#E94560",
          hover: "#D63851",
          light: "#FEE2E8",
        },
        warm: {
          50: "#FFF8F0",
          100: "#FFF1E0",
        },
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#1A1A1A",
        },
        score: {
          high: "#10B981",
          mid: "#F59E0B",
          low: "#EF4444",
        },
      },
      fontFamily: {
        mono: ['"Space Mono"', '"Courier New"', "monospace"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "hero-lg": ["64px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "hero-md": ["48px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "hero-sm": ["36px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "section-lg": ["48px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "section-md": ["36px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "label-sm": ["12px", { lineHeight: "1.5", letterSpacing: "0.08em" }],
        "label-md": ["14px", { lineHeight: "1.5", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      maxWidth: {
        content: "1200px",
        form: "640px",
      },
      spacing: {
        section: "80px",
        "section-sm": "48px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
