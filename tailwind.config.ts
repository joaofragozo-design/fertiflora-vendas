import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eafbf1',
          100: '#cdf3dc',
          200: '#9de6bd',
          300: '#5fd196',
          400: '#2fbd77',
          500: '#18a558',
          600: '#128948',
          700: '#0d6b3d',
          800: '#0a5230',
          900: '#083f26',
          950: '#042215',
        },
        olive: {
          400: '#7ba851',
          500: '#5c8d3a',
          600: '#496f2e',
        },
        earth: {
          tan: '#a9835f',
          brown: '#6b4f3a',
          dark: '#3e2c1c',
        },
        ink: {
          950: '#070b09',
          900: '#0b120e',
          800: '#121c16',
          700: '#1a2820',
        },
        mist: {
          50: '#f8fafc',
          200: '#e2e8f0',
        },
        slate: {
          800: '#1f2937',
        },
        warning: { 400: '#f3b454', 500: '#e9a23d', 600: '#c9832a' },
        danger: { 400: '#f28b91', 500: '#e5636b', 600: '#c94750' },
      },
      fontFamily: {
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '4px',
      },
      boxShadow: {
        glass: '0 24px 60px -24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
        'glow-brand': '0 10px 28px -6px rgba(24,165,88,0.5)',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(.16,1,.3,1)',
        soft: 'cubic-bezier(.22,1,.36,1)',
      },
      animation: {
        rise: 'rise .7s cubic-bezier(.16,1,.3,1) forwards',
        'fade-in': 'fadeIn .6s ease-out forwards',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
