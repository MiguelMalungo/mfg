/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette to match the Wix site
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#f5f5f5',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#000000',
            a: {
              color: '#000000',
              '&:hover': {
                color: '#666666',
              },
            },
            h1: {
              fontWeight: '700',
            },
            h2: {
              fontWeight: '700',
            },
            h3: {
              fontWeight: '700',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
