import withPWA from 'next-pwa';

const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js config
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProduction,
  runtimeCaching: [
    {
      urlPattern: /\/dashboard/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'dashboard-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/expenses/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'expenses-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      // This captures all Convex API calls
      urlPattern: ({ url }) => url.protocol.startsWith('https') && url.hostname.endsWith('.convex.cloud'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'convex-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
        },
        backgroundSync: {
          name: 'convex-mutations-queue',
          options: {
            maxRetentionTime: 24 * 60, // Retry for up to 24 hours
          },
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Cache static assets with CacheFirst strategy
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
};

export default withPWA(pwaConfig)(nextConfig);
