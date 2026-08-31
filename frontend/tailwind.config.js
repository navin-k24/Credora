/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          dark: '#0f172a',
          purple: '#7c3aed',
          navy: '#1e293b',
          accent: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
