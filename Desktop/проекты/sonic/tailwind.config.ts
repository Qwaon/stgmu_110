import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#352F73',
          light: '#4a43a0',
          hover: '#3d3680',
        },
        surface: {
          DEFAULT: '#1a1a2e',
          2: '#22223b',
          3: '#2a2a42',
        },
        bg: '#0f0f1a',
        'text-muted': '#8888aa',
      },
    },
  },
  plugins: [],
}
export default config
