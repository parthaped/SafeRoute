import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: [
        'SF Pro Display',
        'SF Pro Text',
        '-apple-system',
        'BlinkMacSystemFont',
        'Inter',
        'system-ui',
        'sans-serif',
      ],
      mono: ['SF Mono', 'Menlo', 'Consolas', 'monospace'],
    },
    extend: {
      colors: {
        surface: {
          base: 'rgb(var(--surface-base) / <alpha-value>)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          glass: 'var(--surface-glass)',
          border: 'var(--surface-border)',
          'border-light': 'var(--surface-border-light)',
          hover: 'var(--surface-hover)',
          card: 'var(--surface-card)',
          'card-border': 'var(--surface-card-border)',
          sidebar: 'var(--surface-sidebar)',
          topbar: 'var(--surface-topbar)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
        },
        accent: {
          red: '#E10600',
          'red-muted': 'rgba(225, 6, 0, 0.75)',
          'red-subtle': 'rgba(225, 6, 0, 0.15)',
          'red-glow': 'rgba(225, 6, 0, 0.25)',
          blue: '#007AFF',
          'blue-subtle': 'rgba(0, 122, 255, 0.15)',
          green: '#2ECC71',
          'green-subtle': 'rgba(46, 204, 113, 0.15)',
        },
        risk: {
          low: '#2ECC71',
          'low-bg': 'rgba(46, 204, 113, 0.12)',
          medium: '#FFD60A',
          'medium-bg': 'rgba(255, 214, 10, 0.12)',
          high: '#E10600',
          'high-bg': 'rgba(225, 6, 0, 0.12)',
          critical: '#FF3B30',
          'critical-bg': 'rgba(255, 59, 48, 0.15)',
        },
        status: {
          online: '#2ECC71',
          degraded: '#FFD60A',
          offline: '#E10600',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
      },
      backdropBlur: {
        xs: '8px',
        panel: '40px',
        heavy: '80px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 250ms ease-out',
        'slide-up': 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
