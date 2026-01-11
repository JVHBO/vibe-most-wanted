module.exports = {
  // Silence Turbopack warning
  turbopack: {},
  webpack: (config) => {
    // Fix for MetaMask SDK trying to import React Native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
  async headers() {
    return [
      {
        // Global headers for all routes - enable microphone/camera permissions
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=*, geolocation=()',
          },
        ],
      },
      {
        // Permitir acesso ao manifest do Farcaster
        source: '/.well-known/farcaster.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        // Headers para imagens de preview
        source: '/screenshot.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/splash.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icon.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Allow public access to opengraph images for Farcaster/social media
        source: '/share/:path*/opengraph-image',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate',
          },
        ],
      },
    ];
  },
};