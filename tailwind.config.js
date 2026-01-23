/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#4CAF50',
          light: '#81C784',
          dark: '#388E3C',
        },
        secondary: {
          main: '#2196F3',
          light: '#64B5F6',
          dark: '#1976D2',
        },
        accent: {
          main: '#FF9800',
          light: '#FFB74D',
          dark: '#F57C00',
        },
        danger: {
          main: '#F44336',
          light: '#E57373',
          dark: '#D32F2F',
        },
        success: '#8BC34A',
        warning: '#FFC107',
        info: '#03A9F4',
        neutral: '#607D8B',
        background: {
          default: '#FAFAFA',
          paper: '#FFFFFF',
          dark: '#121212',
        },
        text: {
          primary: '#212121',
          secondary: '#757575',
          disabled: '#BDBDBD',
          inverse: '#FFFFFF',
        }
      },
      fontFamily: {
        header: ['"Poppins"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
    },
    screens: {
      'mobile': '375px',
      'mobile-lg': '425px',
      'tablet': '768px',
      'tablet-lg': '1024px',
      'desktop': '1280px',
      'desktop-lg': '1920px',
    },
  },
  plugins: [],
}