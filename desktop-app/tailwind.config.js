/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        osmium: '#e8ff47',
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a'
        }
      }
    }
  },
  plugins: []
}
