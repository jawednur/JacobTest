/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8E1F0B', // Rust Red
        secondary: '#B4D5B6', // Sage Green
        tertiary: {
          gold: '#9B784C',
          bronze: '#B18B5B',
        },
        background: '#F7F4EE', // Warm Off-White
        card: '#FFFFFF', // Pure White
        charcoal: '#3F4750', // Dark Charcoal
        'dark-grey': '#353D46', // Body text
      },
      fontFamily: {
        serif: ['Gelica', 'serif'],
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
