module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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
      }
    },
  },
  plugins: [],
};