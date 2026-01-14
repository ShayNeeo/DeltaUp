/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable manual dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-highlight": "hsl(var(--surface-highlight))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        '2xl': "1.5rem",
        '3xl': "2rem",
      },
    },
  },
  plugins: [],
}