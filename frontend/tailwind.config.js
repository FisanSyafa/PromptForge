/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pf-blue': '#002d72',
        'pf-green': '#6ed451',
      }
    },
  },
  plugins: [],
}
