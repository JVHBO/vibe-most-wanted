module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vintage casino theme - refined
        'vintage': {
          black: '#0C0C0C',
          charcoal: '#1A1A1A',
          'deep-black': '#121212',
          gold: '#FFD700',
          'gold-dark': '#C9A227',
          'gold-metallic': '#B8860B',
          silver: '#C0C0C0',
          'neon-blue': '#00C6FF',
          wine: '#4a1a1a',
          'felt-green': '#0d3d2d',
          purple: '#2d1b4e',
          'burnt-gold': '#8B7355',
          ice: '#F5F5F5',
        }
      },
      fontFamily: {
        'vintage': ['"Cinzel Decorative"', 'serif'],
        'display': ['"Playfair Display SC"', 'serif'],
        'modern': ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(255, 215, 0, 0.5)',
        'gold-lg': '0 0 30px rgba(255, 215, 0, 0.7)',
        'neon': '0 0 20px rgba(0, 198, 255, 0.6)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
          '50%': { boxShadow: '0 0 60px rgba(255, 165, 0, 0.9), 0 0 100px rgba(255, 215, 0, 0.7)' },
        },
        'transform-card': {
          '0%': { transform: 'scale(1) rotateY(0deg)' },
          '50%': { transform: 'scale(1.2) rotateY(180deg)' },
          '100%': { transform: 'scale(1.1) rotateY(360deg)' },
        },
        particle: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-100px) scale(0)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out infinite',
        glow: 'glow 1s ease-in-out infinite',
        'transform-card': 'transform-card 1s ease-in-out forwards',
        particle: 'particle 1s ease-out forwards',
      },
    },
  },
  plugins: [],
};