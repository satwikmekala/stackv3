/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#1A1A1A',
        'surface-light': '#2A2A2A',
        primary: '#22C55E',
        'primary-dark': '#16A34A',
        text: '#FAFAFA',
        'text-secondary': '#A1A1A1',
        'text-tertiary': '#525252',
      },
    },
  },
  plugins: [],
}
