/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./constants.ts",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar estrategia de clase para el modo oscuro
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        // --- Colores Semánticos para Theming ---
        'background': 'var(--color-background)',
        'surface': 'var(--color-surface)',
        'surface-secondary': 'var(--color-surface-secondary)',
        'primary': 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-text': 'var(--color-primary-text)',
        'accent': 'var(--color-accent)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'border-color': 'var(--color-border-color)',
        
        // --- Colores de Acento Fijos (para estados, etc.) ---
        'accent-red': '#ef4444', // red-500
        'accent-red-light': '#fee2e2', // red-100
        'accent-green-dark': '#166534', // green-800
        'accent-green': '#22c55e', // green-500
        'accent-green-light': '#dcfce7', // green-100
        'accent-yellow-dark': '#a16207', // yellow-700
        'accent-yellow': '#eab308', // yellow-500
        'accent-yellow-light': '#fef9c3', // yellow-100
        'accent-blue': '#3b82f6', // blue-500
        'accent-blue-light': '#dbeafe', // blue-100
        'accent-teal': '#14b8a6', // teal-500
        'accent-teal-light': '#ccfbf1', // teal-100
      },
      animation: {
        'gradient-x': 'gradient-x 5s ease infinite',
        'float': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-25px)' },
        },
      },
      backgroundSize: {
        '300%': '300% 300%',
      }
    },
  },
  plugins: [],
}