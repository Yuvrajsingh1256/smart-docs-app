export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#14181F',
        inkDeep: '#0E1116',
        panel: '#1C2129',
        panelLight: '#232A34',
        edge: '#2A313C',
        moss: '#4C8577',
        mossLight: '#63A392',
        paper: '#EDEBE3',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(76,133,119,0.12), 0 12px 28px -12px rgba(0,0,0,0.65)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 14px -6px rgba(0,0,0,0.5)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bounce1: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        bounce1: 'bounce1 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};