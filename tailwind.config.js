/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'editor': {
          'bg': '#1e1e1e',
          'text': '#d4d4d4',
          'line': '#2d2d30',
          'selection': '#264f78',
        },
        'diff': {
          'added': '#1e4620',
          'removed': '#4b1113',
          'modified': '#374151',
        }
      }
    },
  },
  plugins: [],
}
