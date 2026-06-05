import type { Config } from "tailwindcss";

/**
 * Design tokens are the contract. Components reference these names, never raw hex.
 * Yellow is an ACCENT only (CTAs, active nav, focus rings) — never a large fill,
 * and never white/light text on yellow (use `wb.yellow.ink`).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wb: {
          yellow: {
            DEFAULT: "var(--wb-yellow)",
            hover: "var(--wb-yellow-hover)",
            ink: "var(--wb-yellow-ink)",
          },
          bg: "var(--wb-bg)",
          surface: {
            DEFAULT: "var(--wb-surface)",
            2: "var(--wb-surface-2)",
          },
          ink: {
            DEFAULT: "var(--wb-ink)",
            muted: "var(--wb-muted)",
            faint: "var(--wb-faint)",
          },
          border: "var(--wb-border)",
          success: {
            DEFAULT: "var(--wb-success)",
            bg: "var(--wb-success-bg)",
          },
          danger: {
            DEFAULT: "var(--wb-danger)",
            bg: "var(--wb-danger-bg)",
          },
        },
      },
      borderColor: { DEFAULT: "var(--wb-border)" },
      ringColor: { DEFAULT: "var(--wb-yellow)" },
    },
  },
  plugins: [],
};

export default config;
