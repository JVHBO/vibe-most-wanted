module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vintage casino theme
        'vintage': {
          black: '#0a0a0a',
          charcoal: '#1a1a1a',
          gold: '#FFD700',
          'gold-dark': '#B8860B',
          silver: '#C0C0C0',
          'neon-blue': '#00C6FF',
          wine: '#4a1a1a',
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
      }
    },
  },
  plugins: [],
};