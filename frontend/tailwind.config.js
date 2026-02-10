/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#475569",
        accent: "#10B981",
        dark: "#1E293B",
        light: "#F1F5F9",
      },
    },
  },
  plugins: [],
}
