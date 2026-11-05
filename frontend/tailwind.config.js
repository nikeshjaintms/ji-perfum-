/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Luxury crisp porcelain surface for main view wrappers
        paper: '#F8FAFC',
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Royal Sapphire Brand Blue: centered on rgb(34 68 164) / #2244A4
        // Mapped to existing accent tokens so all buttons, tabs, pills and focus rings adopt this exact blue uniformly
        amber: {
          50: '#F0F4FC',
          100: '#DFE8F8',
          200: '#C3D4F3',
          300: '#9CB9EB',
          400: '#5F8CDC',
          500: '#2244A4', // rgb(34 68 164)
          600: '#1C3786',
          700: '#162C6B',
          800: '#102150',
          900: '#0B1637',
          950: '#060D20',
        },
        // Luxury Champagne Gold accents
        brass: '#D4AF37',
        gold: {
          300: '#F3E5AB',
          400: '#E2B755',
          500: '#D4AF37',
          600: '#C5A059',
          700: '#B08D45',
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      boxShadow: {
        slip: '0 1px 0 rgba(15,23,42,.06), 0 12px 28px -18px rgba(15,23,42,.25)',
      },
    },
  },
  plugins: [],
};
