// tailwind.config.js
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        kanit: ["var(--font-kanit)", "sans-serif"],
      },
    },
  },
  content: ["./app/**/*.{ts,tsx,js,jsx}", "./components/**/*.{ts,tsx,js,jsx}"],
};

export default config;
