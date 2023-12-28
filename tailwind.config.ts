import type { Config } from 'tailwindcss'
import { CustomColors } from './src/styles/colors'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: CustomColors.PRIMARY
      }
    }
  },
  plugins: []
} satisfies Config
