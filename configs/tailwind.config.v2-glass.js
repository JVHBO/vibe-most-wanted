// VERSÃO 2: PREMIUM GLASSMORPHISM
// Design ultra-moderno com efeitos de vidro e transparências
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium glass theme - ethereal and sophisticated
        'glass': {
          // Backgrounds - mais escuros para contraste com vidro
          'dark': '#050505',
          'darker': '#0D0D0D',
          'black': '#000000',

          // Glass surfaces
          'surface': 'rgba(255, 255, 255, 0.05)',
          'surface-light': 'rgba(255, 255, 255, 0.08)',
          'surface-lighter': 'rgba(255, 255, 255, 0.12)',

          // Premium gold gradient
          'gold': {
            50: '#FFF9E6',
            100: '#FFF3CC',
            200: '#FFE699',
            300: '#FFD966',
            400: '#FFCC33',
            500: '#FFBF00',    // Base gold
            600: '#CC9900',
            700: '#997300',
            800: '#664D00',
            900: '#332600',
          },

          // Electric blue accent
          'electric': {
            50: '#E0F7FF',
            100: '#B3EBFF',
            200: '#80DEFF',
            300: '#4DD1FF',
            400: '#1AC4FF',
            500: '#00B8FF',    // Base electric
            600: '#0093CC',
            700: '#006E99',
            800: '#004966',
            900: '#002433',
          },

          // Purple accent for premium feel
          'purple': {
            50: '#F3E5F5',
            100: '#E1BEE7',
            200: '#CE93D8',
            300: '#BA68C8',
            400: '#AB47BC',
            500: '#9C27B0',    // Base purple
            600: '#8E24AA',
            700: '#7B1FA2',
            800: '#6A1B9A',
            900: '#4A148C',
          },

          // Modern neutrals
          'gray': {
            50: '#FAFAFA',
            100: '#F0F0F0',
            200: '#E0E0E0',
            300: '#BDBDBD',
            400: '#9E9E9E',
            500: '#757575',
            600: '#616161',
            700: '#424242',
            800: '#303030',
            900: '#1A1A1A',
          },

          // Status with transparency
          'success': 'rgba(76, 175, 80, 0.9)',
          'warning': 'rgba(255, 152, 0, 0.9)',
          'error': 'rgba(244, 67, 54, 0.9)',
          'info': 'rgba(33, 150, 243, 0.9)',
        }
      },
      fontFamily: {
        'display': ['Outfit', 'system-ui', 'sans-serif'],
        'heading': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        // Glass shadows
        'glass-sm': '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-xl': '0 24px 64px rgba(0, 0, 0, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.12)',

        // Glow effects
        'glow-gold': '0 0 32px rgba(255, 191, 0, 0.4)',
        'glow-gold-lg': '0 0 48px rgba(255, 191, 0, 0.5)',
        'glow-electric': '0 0 32px rgba(0, 184, 255, 0.4)',
        'glow-electric-lg': '0 0 48px rgba(0, 184, 255, 0.5)',
        'glow-purple': '0 0 32px rgba(156, 39, 176, 0.4)',

        // Elevation
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.14), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'elevation-4': '0 16px 32px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #FFBF00 0%, #FF8C00 100%)',
        'gradient-electric': 'linear-gradient(135deg, #00B8FF 0%, #0080FF 100%)',
        'gradient-purple': 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)',
        'gradient-rainbow': 'linear-gradient(135deg, #FFBF00 0%, #00B8FF 50%, #9C27B0 100%)',

        // Glass gradients
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'glass-gradient-gold': 'linear-gradient(135deg, rgba(255, 191, 0, 0.15) 0%, rgba(255, 191, 0, 0.05) 100%)',
        'glass-gradient-electric': 'linear-gradient(135deg, rgba(0, 184, 255, 0.15) 0%, rgba(0, 184, 255, 0.05) 100%)',

        // Mesh backgrounds
        'mesh-premium': 'radial-gradient(at 0% 0%, rgba(255, 191, 0, 0.15) 0%, transparent 50%), radial-gradient(at 100% 0%, rgba(0, 184, 255, 0.12) 0%, transparent 50%), radial-gradient(at 100% 100%, rgba(156, 39, 176, 0.1) 0%, transparent 50%), radial-gradient(at 0% 100%, rgba(255, 191, 0, 0.08) 0%, transparent 50%)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      backdropSaturate: {
        180: '1.8',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
