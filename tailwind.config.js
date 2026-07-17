/** @type {import('tailwindcss').Config} */
// Color + font values mirror constants/theme.ts — keep the two in sync.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: '#100E0C',
        surface: '#1C1815',
        'surface-raised': '#262019',
        accent: '#4C6FFF',
        bone: '#F3EDE4',
        ash: '#A39C8F',
        'ash-dim': '#6B6459',
      },
      fontFamily: {
        heading: ['Switzer-Semibold'],
        'heading-bold': ['Switzer-Bold'],
        body: ['Switzer-Regular'],
        'body-medium': ['Switzer-Medium'],
        'body-semibold': ['Switzer-Semibold'],
        mono: ['SpaceMono_400Regular'],
        'mono-bold': ['SpaceMono_700Bold'],
      },
    },
  },
  plugins: [],
}
