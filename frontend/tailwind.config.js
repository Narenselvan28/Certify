/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: '#F7F7F5',
        surface: '#FFFFFF',
        primary: '#171717',
        muted: '#6B6B6B',
        border: '#E5E5E5',
        'border-strong': '#D4D4D4',
        accent: { DEFAULT: '#4F46E5', hover: '#4338CA' },
        success: '#16A34A',
        error: '#DC2626',
      },
    },
  },
  plugins: [],
};
