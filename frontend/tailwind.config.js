/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paper and ink: the neutrals are tinted toward the aubergine-black of
        // the shop's printed bills instead of the default cold slate.
        paper: '#F2F0EE',
        slate: {
          50: '#F8F7F6',
          100: '#EFEDEB',
          200: '#E2DFDC',
          300: '#CBC7C3',
          400: '#A29D99',
          500: '#77716E',
          600: '#57514F',
          700: '#3F3A3A',
          800: '#2E2830',
          900: '#231C25',
          950: '#170F19',
        },
        // Bottle green. Existing `amber-*` classes now resolve to this, so every
        // screen picks up the accent without touching each class.
        amber: {
          50: '#F1F5F2',
          100: '#E1EBE5',
          200: '#C3D6CB',
          300: '#9DBBAB',
          400: '#5E8D7A',
          500: '#2F5D4E',
          600: '#264C40',
          700: '#1F3E34',
          800: '#18312A',
          900: '#112320',
          950: '#0A1613',
        },
        brass: '#9A7430',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      boxShadow: {
        slip: '0 1px 0 rgba(35,28,37,.06), 0 12px 28px -18px rgba(35,28,37,.35)',
      },
    },
  },
  plugins: [],
};
