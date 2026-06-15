/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fbf4e6',
        ink: '#332c26',
        sumi: '#51483f',
        sakura: '#d98da0',
        sakuraDark: '#b85e78',
        matcha: '#dbe4c5',
        moss: '#6d7b55',
        line: '#eadcc7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jp: ['"Noto Sans JP"', 'Hiragino Sans', 'Yu Gothic', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(69, 52, 36, 0.11)',
      },
    },
  },
  plugins: [],
}
