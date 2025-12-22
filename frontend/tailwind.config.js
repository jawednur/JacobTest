/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '915px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: '#8E1F0B', // Rust Red
        secondary: '#B4D5B6', // Sage Green
        tertiary: {
          gold: '#9B784C',
          bronze: '#B18B5B',
          sand: '#D4C9B3',
        },
        background: '#F7F4EE', // Warm Off-White
        'background-alt': '#F7F4EF',
        'background-warm': '#EDE4D1',
        card: '#FFFFFF', // Pure White
        charcoal: '#3F4750', // Dark Charcoal
        'dark-grey': '#353D46', // Body text
        neutral: {
          light: '#DEDDDA',
          pale: '#FEE9E8',
        },
        black: '#000000',
      },
      fontFamily: {
        serif: ['Gelica', 'serif'],
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
