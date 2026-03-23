/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        'century-gothic': ['CenturyGothic', 'sans-serif'],
        'century-gothic-bold': ['CenturyGothic-Bold', 'CenturyGothic', 'sans-serif'],
        // Default font olarak Century Gothic kullan
        sans: ['CenturyGothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

