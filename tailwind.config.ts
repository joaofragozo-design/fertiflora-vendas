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
          50: '#f1f8ee',
          100: '#dcedd4',
          200: '#bcdead',
          300: '#a8d672',
          400: '#7cc56e',
          500: '#5faf45',
          600: '#4c8f38',
          700: '#3d722d',
          800: '#325c26',
          900: '#294a20',
          950: '#152710',
        },
        earth: {
          tan: '#d4b483',
          brown: '#7b5e3b',
          dark: '#3d332a',
        },
        ink: {
          950: '#0b100d',
          900: '#0e1512',
          800: '#16211b',
          700: '#1e2d24',
        },
        warning: { 400: '#f3b454', 500: '#e9a23d', 600: '#c9832a' },
        danger: { 400: '#f28b91', 500: '#e5636b', 600: '#c94750' },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      backdropBlur: {
        xs: '4px',
      },
      boxShadow: {
        glass: '0 16px 36px -18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow-brand': '0 10px 24px -6px rgba(95,175,69,0.55)',
      },
      animation: {
        rise: 'rise .6s cubic-bezier(.22,1,.36,1) forwards',
        'fade-in': 'fadeIn .5s ease-out forwards',
        glow: 'glow 3.6s ease-in-out infinite',
        drift: 'drift 7s ease-in-out infinite',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        glow: {
          '0%, 100%': { opacity: '.35', transform: 'scale(0.9)' },
          '50%': { opacity: '.9', transform: 'scale(1.05)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(-10px,10px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
