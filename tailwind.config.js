/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4dcb0',
          300: '#ecc47f',
          400: '#e3a54d',
          500: '#db8c2a',
          600: '#cc7520',
          700: '#aa5d1c',
          800: '#884a1e',
          900: '#6e3d1c',
          950: '#3b1e0d',
        },
        brand: {
          primary: '#6b3a2a',
          secondary: '#c9813a',
          dark: '#1c1917',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
