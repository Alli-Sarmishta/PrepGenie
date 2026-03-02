/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          150: '#eaeff5',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,.4), 0 4px 16px 0 rgba(0,0,0,.3)',
        'card-md': '0 4px 24px 0 rgba(0,0,0,.5), 0 1px 4px 0 rgba(0,0,0,.4)',
        'card-lg': '0 8px 40px 0 rgba(0,0,0,.6), 0 2px 8px  0 rgba(0,0,0,.5)',
        'glow': '0 0 32px rgba(99,102,241,.5)',
        'glow-sm': '0 0 16px rgba(99,102,241,.35)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(139,92,246,.12) 100%)',
        'hero-mesh': 'radial-gradient(ellipse at 15% 40%, rgba(99,102,241,.09) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(139,92,246,.08) 0%, transparent 50%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '.7' },
          '50%': { transform: 'scale(1.08)', opacity: '.4' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s ease-out both',
        'scale-in': 'scale-in .3s ease-out both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
