import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#F59E0B',
        success: '#22C55E',
        danger: '#EF4444',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A'
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
