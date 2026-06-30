import type { Config } from 'tailwindcss';

/**
 * Tailwind config mapped to the CES ERP UI Kit (styles/ui-kit.css).
 * Color tokens reference the kit's CSS variables via var() so Tailwind
 * utilities stay in sync with the kit theme files (light / dark).
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Kit brand
        graphite: {
          DEFAULT: 'var(--graphite)',
          900: 'var(--graphite-900)',
          100: 'var(--graphite-100)',
          50: 'var(--graphite-50)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          700: 'var(--gold-700)',
          100: 'var(--gold-100)',
          50: 'var(--gold-50)',
        },
        ink: 'var(--ink)',
        line: 'var(--line)',
        // Semantic
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        alt: 'var(--alt)',
        // Tailwind-facing aliases (mapped to kit surfaces in globals.css)
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        surface: 'var(--surface)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
