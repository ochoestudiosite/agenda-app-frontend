/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Semantic surface tokens (CSS variable–backed, support opacity modifier) ──
        surface:       'rgb(var(--surface) / <alpha-value>)',
        card:          'rgb(var(--card) / <alpha-value>)',
        raised:        'rgb(var(--raised) / <alpha-value>)',
        edge:          'rgb(var(--edge) / <alpha-value>)',
        'edge-strong': 'rgb(var(--edge-strong) / <alpha-value>)',
        ink:           'rgb(var(--ink) / <alpha-value>)',
        'ink-2':       'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3':       'rgb(var(--ink-3) / <alpha-value>)',
        'on-gold':     'rgb(var(--on-gold) / <alpha-value>)',

        // ── Gold accent ──────────────────────────────────────────────────────────
        gold: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
          light:   'rgb(var(--gold-light) / <alpha-value>)',
          muted:   'rgb(var(--gold-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        float: '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
      animation: {
        'fade-in':  'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                                     to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' },      to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
