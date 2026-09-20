/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #3b82f6)',
          100: 'var(--brand-100, #2563eb)',
          200: 'var(--brand-200, #1d4ed8)',
          300: 'var(--brand-300, #1e40af)',
          400: 'var(--brand-400, #1e3a8a)',
          500: 'var(--brand-500, #1e3a5f)',
          600: 'var(--brand-600, #1a2f4a)',
          700: 'var(--brand-700, #152338)',
          800: 'var(--brand-800, #0f1a2a)',
          900: 'var(--brand-900, #0a111c)',
        },
        surface: {
          50: 'var(--surface-50, #f8fafc)',
          100: 'var(--surface-100, #f1f5f9)',
          200: 'var(--surface-200, #e2e8f0)',
          300: 'var(--surface-300, #cbd5e1)',
          400: 'var(--surface-400, #94a3b8)',
          500: 'var(--surface-500, #64748b)',
          600: 'var(--surface-600, #475569)',
          700: 'var(--surface-700, #334155)',
          800: 'var(--surface-800, #1e293b)',
          900: 'var(--surface-900, #0f172a)',
          950: 'var(--surface-950, #020617)',
        },
        accent: {
          DEFAULT: 'var(--accent-color, #ffffff)',
          hover: 'var(--accent-hover, #e5e5e5)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
