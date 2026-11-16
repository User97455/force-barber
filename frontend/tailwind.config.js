/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "#0b0f19",
          text: "#f8fafc",
          hint: "#94a3b8",
          link: "#38bdf8",
          button: "#f59e0b",
          buttonText: "#0b0f19",
          secondaryBg: "#161f30",
          headerBg: "#0b0f19",
          accent: "#f59e0b",
        }
      }
    },
  },
  plugins: [],
}
