/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Herbarium sage palette (light)
        sage: {
          DEFAULT: '#E3E8DF', // page background
          deep: '#D4DCC9', // wells behind glass / puzzle gaps
        },
        leaf: '#F1F3ED', // pale panel base (used translucent for glass)
        ink: {
          DEFAULT: '#26302A', // primary text
          dim: '#5A6358', // muted text
        },
        moss: {
          DEFAULT: '#3F6B4C', // primary accent / CTA
          deep: '#2F5239',
        },
        terra: {
          DEFAULT: '#C56B45', // warm accent / alert
          deep: '#9E4A2E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        panel: '26px',
        chip: '999px',
      },
      letterSpacing: {
        chip: '0.14em',
      },
    },
  },
  plugins: [],
}
