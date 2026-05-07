import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "../../packages/core/src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/games-primaria/src/**/*.{ts,tsx}",
    "../../packages/games-secundaria/src/**/*.{ts,tsx}",
    "../../packages/games-media/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        fredoka: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        nunito: ["var(--font-nunito)", "system-ui", "sans-serif"],
        orbitron: ["var(--font-orbitron)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
