import type { Config } from "tailwindcss";

/**
 * Design tokens are the contract — "Graphite Pro". Components reference these names
 * (or the ported `.wb-*` classes in globals.css), never raw hex. The accent (green)
 * is accent-only: CTAs, active nav, best-deal border/tag, focus rings. Never a large
 * fill, and never light text on the accent (use `wb.accent.ink`).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wb: {
          app: "var(--wb-app)",
          chrome: "var(--wb-chrome)",
          surface: {
            DEFAULT: "var(--wb-surface)",
            raised: "var(--wb-raised)",
            hover: "var(--wb-hover)",
          },
          border: {
            DEFAULT: "var(--wb-border)",
            strong: "var(--wb-border-strong)",
          },
          accent: {
            DEFAULT: "var(--wb-accent)",
            hover: "var(--wb-accent-hover)",
            pressed: "var(--wb-accent-pressed)",
            ink: "var(--wb-on-accent)",
          },
          ink: {
            DEFAULT: "var(--wb-ink)",
            2: "var(--wb-ink-2)",
            3: "var(--wb-ink-3)",
            dis: "var(--wb-ink-dis)",
          },
          green: {
            DEFAULT: "var(--wb-green)",
            bg: "var(--wb-green-bg)",
            bd: "var(--wb-green-bd)",
          },
          red: {
            DEFAULT: "var(--wb-red)",
            bg: "var(--wb-red-bg)",
            bd: "var(--wb-red-bd)",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Archivo", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderColor: { DEFAULT: "var(--wb-border)" },
      ringColor: { DEFAULT: "var(--wb-accent)" },
    },
  },
  plugins: [],
};

export default config;
