/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface:       'rgb(var(--surface) / <alpha-value>)',
        card:          'rgb(var(--card) / <alpha-value>)',
        raised:        'rgb(var(--raised) / <alpha-value>)',
        edge:          'rgb(var(--edge) / <alpha-value>)',
        'edge-strong': 'rgb(var(--edge-strong) / <alpha-value>)',
        ink:           'rgb(var(--ink) / <alpha-value>)',
        'ink-2':       'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3':       'rgb(var(--ink-3) / <alpha-value>)',
        'on-gold':     'rgb(var(--on-gold) / <alpha-value>)',
        gold: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
          light:   'rgb(var(--gold-light) / <alpha-value>)',
          muted:   'rgb(var(--gold-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Plus Jakarta Sans — geometric humanist sans-serif, very Apple/SF Pro-like
        display: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // System stack: SF Pro on Apple devices, Inter on everything else
        sans:    ['-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter:  '-0.02em',
        tight:    '-0.015em',
        widest2:  '0.15em',
        widest3:  '0.2em',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        // Apple-style layered shadows — very subtle in light, absent in dark
        'xs':    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card':  '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 16px 0 rgb(0 0 0 / 0.05)',
        'float': '0 2px 8px 0 rgb(0 0 0 / 0.06), 0 12px 40px 0 rgb(0 0 0 / 0.08)',
        'deep':  '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 24px 64px -8px rgb(0 0 0 / 0.12)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s cubic-bezier(0.25,0.46,0.45,0.94)',
        'fade-up':    'fadeUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)',
        'fade-up-sm': 'fadeUpSm 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer':    'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                                to: { opacity: 1 } },
        fadeUp:    { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeUpSm:  { from: { opacity: 0, transform: 'translateY(8px)' },  to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.94)' },      to: { opacity: 1, transform: 'scale(1)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' },             to: { backgroundPosition: '200% 0' } },
      },
      transitionTimingFunction: {
        'spring':    'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'bounce-sm': 'cubic-bezier(0.34, 1.3, 0.64, 1)',
      },
      transitionDuration: {
        '160': '160ms',
        '240': '240ms',
      },
    },
  },
  plugins: [],
};
