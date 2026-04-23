import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        fc: {
          base:          '#F2F7F4',
          surface:       '#EAF0EC',
          'surface-white': '#FFFFFF',
          dark:          '#1A2520',
          sidebar:       '#1A2520',
          'card-dark':   '#243028',
          accent:        '#2E7D52',
          'accent-hover':'#3A9E6A',
          'accent-ghost':'#2E7D5228',
          gold:          '#C69B30',
          premium:       '#C69B30',
          'gold-bg':     '#C69B3018',
          'gold-border': '#C69B3040',
          danger:        '#E84434',
          'danger-bg':   '#E8443418',
          'text-primary':   '#141F19',
          'text-secondary': '#7A9A8A',
          'text-on-dark':   '#F2F7F4',
          'score-mint':     '#5DCAA5',
          'border-light':   '#EAF0EC',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'fc-micro': '9px',
        'fc-xs':    '10px',
        'fc-sm':    '11px',
        'fc-base':  '13px',
        'fc-md':    '14px',
        'fc-lg':    '16px',
        'fc-xl':    '19px',
        'fc-2xl':   '22px',
        'fc-hero':  '38px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'fc-sm':   '6px',
        'fc-md':   '8px',
        'fc-lg':   '12px',
        'fc-xl':   '16px',
        'fc-2xl':  '20px',
        'fc-full': '9999px',
      },
      boxShadow: {
        'fc-card':  '0 1px 3px rgba(20,31,25,0.08), 0 1px 2px rgba(20,31,25,0.04)',
        'fc-modal': '0 20px 60px rgba(0,0,0,0.35)',
        'fc-fab':   '0 4px 16px rgba(46,125,82,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
