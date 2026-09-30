/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff8ed', 100: '#ffeed3', 200: '#ffd9a5', 300: '#ffbd6d',
          400: '#ff9733', 500: '#fb7a0f', 600: '#ec5e04', 700: '#c44407',
          800: '#9c3710', 900: '#7e3013',
        },
        emerald2: {
          50: '#edfcf0', 100: '#d6f9dc', 200: '#b3f2c0', 300: '#7fe696',
          400: '#44d067', 500: '#1eb549', 600: '#10913a', 700: '#0e7331',
          800: '#105b2b', 900: '#0f4b26',
        },
        rose2: {
          50: '#fff1f4', 100: '#ffe3ea', 200: '#ffc9d8', 300: '#ff9eb9',
          400: '#ff6588', 500: '#f93c6a', 600: '#e01f50', 700: '#bb1642',
          800: '#9c163e', 900: '#84183d',
        },
        sky2: {
          50: '#eef9ff', 100: '#d9f1ff', 200: '#bce6ff', 300: '#8ed6ff',
          400: '#58bffa', 500: '#31a3eb', 600: '#1d83d1', 700: '#1c6aa8',
          800: '#1d5a88', 900: '#1d4d6f',
        },
        amber2: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['"Nunito"', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'pop-in': 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up': 'fadeUp 0.5s ease-out',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
