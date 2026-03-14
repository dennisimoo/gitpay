import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "monospace"],
        rajdhani: ["var(--font-rajdhani)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "slide-in": "slideIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
        "bar-fill": "barFill 1.2s cubic-bezier(0.22,1,0.36,1) forwards",
        "glow-white": "glowWhite 2.5s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(-16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        barFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--fill-pct)" },
        },
        glowWhite: {
          "0%,100%": { boxShadow: "0 0 15px rgba(255,255,255,0.15)" },
          "50%": { boxShadow: "0 0 35px rgba(255,255,255,0.35)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
