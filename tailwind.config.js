/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        maca: {
          green: "#1e6b45",
          greenMid: "#2e8b57",
          greenPale: "#a8d5ba",
          greenUltra: "#e8f5e9",
          blue: "#1976d2",
          red: "#d32f2f",
          textDark: "#111c15",
          background: "#F0F4F1",
          panelBg: "#F5FAF7",
          border: "#dee2e6",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
