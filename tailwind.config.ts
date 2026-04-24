import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        track: "#b45309",
        lane: "#a16207",
      },
    },
  },
  plugins: [],
} satisfies Config;
