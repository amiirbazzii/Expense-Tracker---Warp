/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      // Avoid caching HTML document navigations to prevent stale app shell issues
      // that can cause unexpected redirects (e.g., to /expenses) on prod.
      // Also exclude specific routes that have been problematic
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        // Never cache these critical navigation pages
        const noCacheRoutes = ['/settings', '/dashboard', '/expenses', '/income', '/cards'];
        return request.destination !== 'document' && !noCacheRoutes.some(route => pathname.startsWith(route));
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const nextConfig = {
  // Skip ESLint checks during production builds (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optionally ignore type errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Compress images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Bundle optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Optimize bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    };
    
    return config;
  },
  // Enable compression
  compress: true,
  // Reduce JavaScript bundle size
  swcMinify: true,
};

module.exports = withPWA(nextConfig);
