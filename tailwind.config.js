/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'fade-in-out': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '10%, 90%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' }
        }
      },
      animation: {
        'fade-in-out': 'fade-in-out 3s ease-in-out forwards',
      }
    }
  },
  plugins: [],
}