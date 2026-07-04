/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.css",
    "./*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./services/**/*.{js,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        popIn: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        slideUp: 'slideUp 0.5s ease-out forwards',
        modalScale: 'modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        heartbeat: 'heartbeat 1.3s infinite',
        draw: 'draw 2s linear infinite',
        slideUpFade: 'slideUpFade 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.15)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.15)' },
          '70%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1)' },
        },
        draw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        slideUpFade: {
           '0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
           '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        }
      }
    }
  },
  plugins: [],
}
