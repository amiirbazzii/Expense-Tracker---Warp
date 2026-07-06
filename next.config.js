/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  importScripts: ['/background-sync-sw.js'],
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  // Enable offline support - cache the start URL
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/dashboard',
  // Use fallbacks for offline pages that haven't been cached yet
  fallbacks: {
    document: '/offline.html',
  },
  // Aggressive caching for offline-first experience
  cacheOnFrontEndNav: true,
  reloadOnOnline: false, // Don't auto-reload when coming back online
  runtimeCaching: [
    // Next.js static chunks - Cache first for offline support
    {
      urlPattern: /^\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-chunks',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Image caching with long expiration
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
    // Static resources with cache first
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // API requests - Network first with offline fallback
    {
      urlPattern: ({ request, url }) => {
        return request.method === 'POST' &&
          (url.pathname.includes('/api/') ||
            url.hostname.includes('convex') ||
            url.pathname.includes('/_convex/'));
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses
              return response.status === 200 ? response : null;
            },
            requestWillFetch: async ({ request }) => {
              // Add offline indicator to requests
              const url = new URL(request.url);
              url.searchParams.set('offline-capable', 'true');
              return new Request(url.toString(), request);
            }
          }
        ]
      },
    },
    // App pages - StaleWhileRevalidate so cached shell is served instantly
    // offline; Next.js client-side router handles the actual page rendering.
    {
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        // All main app pages – must be visited at least once online to be cached
        const appPages = [
          '/dashboard', '/add', '/cards', '/settings', '/onboarding',
          '/loans', '/expenses', '/income',
        ];
        return request.destination === 'document' &&
          appPages.some(page => pathname.startsWith(page));
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'app-pages',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Root and auth pages - StaleWhileRevalidate for instant offline access
    {
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        return request.destination === 'document' &&
          (pathname === '/' || pathname === '/login' || pathname === '/register');
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'auth-pages',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Other navigation requests - StaleWhileRevalidate for instant offline support
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Vercel analytics - Network only, fail silently when offline
    {
      urlPattern: ({ url }) => {
        const pathname = new URL(url).pathname;
        return pathname.includes('/_vercel/');
      },
      handler: 'NetworkOnly',
      options: {
        plugins: [
          {
            handlerDidError: async () => {
              // Fail silently for analytics when offline
              console.log('Vercel analytics unavailable offline');
              return new Response('', { status: 200 });
            }
          }
        ]
      },
    },
    // General resources with cache-first strategy for offline support
    {
      urlPattern: ({ url }) => {
        const pathname = new URL(url).pathname;
        // Cache other resources but exclude problematic routes
        const noCacheRoutes = ['/api/', '/_next/webpack-hmr', '/_vercel/'];
        return !noCacheRoutes.some(route => pathname.includes(route));
      },
      handler: 'CacheFirst',
      options: {
        cacheName: 'general-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
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
