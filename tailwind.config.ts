import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  // Portal theme toggle sets `class="dark"` on <html>.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Single accent: deep navy. Used across marketing + portal.
        navy: {
          50: "#eef2f7",
          100: "#dbe3ef",
          200: "#b8c7df",
          300: "#8ea5c9",
          400: "#5f7fae",
          500: "#3d5f92",
          600: "#2f4b78",
          700: "#0f2748", // primary brand navy
          800: "#0b1e39",
          900: "#08152a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
