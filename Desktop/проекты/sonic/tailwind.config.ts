import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:            '#0a0a0a',
        'text-muted':  '#666666',
        'status-free':   '#22c55e',
        'status-busy':   '#ef4444',
        'status-booked': '#eab308',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
