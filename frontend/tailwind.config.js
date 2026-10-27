/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#BAE0FD',
          300: '#7CD0FD',
          400: '#38BDF8',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          azure: '#38BDF8',
        },
        luxury: {
          obsidian: '#080B11',
          dark: '#0A0E17',
          surface: '#0F1523',
          card: '#141C2E',
          cardHover: '#18233A',
          border: 'rgba(255, 255, 255, 0.08)',
          borderLight: 'rgba(255, 255, 255, 0.15)',
          gold: '#D4AF37',
          goldLight: '#F5E6B3',
          goldMuted: '#9B7E36',
          champagne: '#E8D5B5',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        cinzel: ['Cinzel', 'serif'],
      }
    },
  },
  plugins: [],
}
