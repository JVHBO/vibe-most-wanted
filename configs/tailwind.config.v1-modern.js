// VERSÃO 1: MODERNA E MINIMALISTA
// Paleta de cores sofisticada e profissional
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern premium theme - refined and professional
        'modern': {
          // Backgrounds - mais sutis
          black: '#0A0A0A',
          'deep': '#121212',
          'card': '#1A1A1A',
          'elevated': '#222222',

          // Accents - cores principais mais sofisticadas
          'primary': '#E8C547',        // Dourado suave (menos saturado)
          'primary-light': '#F5D76E',  // Dourado claro
          'primary-dark': '#C9A227',   // Dourado escuro

          'accent': '#4FC3F7',         // Azul ciano suave
          'accent-light': '#81D4FA',   // Azul claro
          'accent-dark': '#0288D1',    // Azul escuro

          // Neutrals - cinzas sofisticados
          'gray': {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#EEEEEE',
            300: '#E0E0E0',
            400: '#BDBDBD',
            500: '#9E9E9E',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
          },

          // Status colors
          'success': '#66BB6A',
          'warning': '#FFA726',
          'error': '#EF5350',
          'info': '#42A5F5',

          // Special effects
          'glow': 'rgba(232, 197, 71, 0.15)',
          'highlight': 'rgba(79, 195, 247, 0.1)',
        }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],  // Fonte moderna e limpa
        'heading': ['Poppins', 'sans-serif'],             // Para títulos
        'body': ['Inter', 'system-ui', 'sans-serif'],     // Para corpo de texto
        'mono': ['JetBrains Mono', 'monospace'],          // Para números/stats
      },
      boxShadow: {
        // Sombras sutis e modernas
        'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'glow-soft': '0 0 20px rgba(232, 197, 71, 0.2)',
        'glow-medium': '0 0 30px rgba(232, 197, 71, 0.3)',
        'glow-strong': '0 0 40px rgba(232, 197, 71, 0.4)',
        'accent-glow': '0 0 20px rgba(79, 195, 247, 0.25)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
        'elevation-4': '0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E8C547 0%, #C9A227 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)',
        'gradient-card': 'linear-gradient(145deg, #1A1A1A 0%, #222222 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(232, 197, 71, 0.1) 0%, transparent 50%), radial-gradient(at 80% 0%, rgba(79, 195, 247, 0.08) 0%, transparent 50%), radial-gradient(at 0% 50%, rgba(232, 197, 71, 0.05) 0%, transparent 50%)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      }
    },
  },
  plugins: [],
};
