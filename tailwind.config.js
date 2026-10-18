/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,mdx}',
    './components/**/*.{js,jsx,mdx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#070D0A',
        forest: {
          DEFAULT: '#0B1511',
          2: '#14231B',
          3: '#1B3025',
        },
        botanical: '#71866C',
        lime: '#D4FF72',
        ivory: '#F5F5ED',
        paper: '#ECEDE2',
        muted: '#B8C1B3',
        status: {
          cr: '#FF6B5E',
          en: '#FFB04D',
          vu: '#D4FF72',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.22,1,.36,1)',
      },
      maxWidth: {
        wrap: '1320px',
      },
    },
  },
  plugins: [],
};
