process.env.NEXT_PUBLIC_APP_VERSION = require("./package.json").version;

/** @type {import('next').NextConfig} */

const CACHE_VERSION = "v2";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: false,
  clientsClaim: true,
  disable: process.env.NODE_ENV === "development",
  sw: "sw.js",
  importScripts: ["/background-sync-sw.js"],
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
  publicExcludes: ["!robots.txt", "!sitemap.xml", "!background-sync-sw.js"],
  dynamicStartUrl: false,
  dynamicStartUrlRedirect: "/dashboard",
  fallbacks: {
    document: "/",
  },
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,
  runtimeCaching: [
    {
      urlPattern: /^\/_next\/static\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: `next-static-chunks-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif)$/,
      handler: "CacheFirst",
      options: {
        cacheName: `images-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
      handler: "CacheFirst",
      options: {
        cacheName: `static-resources-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: ({ request, url }) => {
        return (
          request.method === "POST" &&
          (url.pathname.includes("/api/") ||
            url.hostname.includes("convex") ||
            url.pathname.includes("/_convex/"))
        );
      },
      handler: "NetworkFirst",
      options: {
        cacheName: `api-cache-${CACHE_VERSION}`,
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response.status === 200 ? response : null;
            },
            requestWillFetch: async ({ request }) => {
              const url = new URL(request.url);
              url.searchParams.set("offline-capable", "true");
              return new Request(url.toString(), request);
            },
          },
        ],
      },
    },
    {
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        const appPages = [
          "/dashboard",
          "/add",
          "/cards",
          "/settings",
          "/onboarding",
          "/loans",
          "/expenses",
          "/income",
        ];
        return (
          request.destination === "document" &&
          appPages.some((page) => pathname.startsWith(page))
        );
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: `app-pages-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        return (
          request.destination === "document" &&
          (pathname === "/" ||
            pathname === "/login" ||
            pathname === "/register")
        );
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: `root-pages-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 14 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === "document",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: `pages-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ url }) => {
        const pathname = new URL(url).pathname;
        return pathname.includes("/_vercel/");
      },
      handler: "NetworkOnly",
      options: {
        plugins: [
          {
            handlerDidError: async () => {
              console.log("Vercel analytics unavailable offline");
              return new Response("", { status: 200 });
            },
          },
        ],
      },
    },
    {
      urlPattern: ({ request, url }) => {
        const pathname = new URL(url).pathname;
        const noCache = [
          "/api/",
          "/_next/webpack-hmr",
          "/_vercel/",
          "/_next/static/",
          "/_convex/",
        ];
        if (noCache.some((route) => pathname.includes(route))) return false;
        if (request.destination === "document") return false;
        if (request.destination === "manifest") return false;
        return true;
      },
      handler: "CacheFirst",
      options: {
        cacheName: `general-cache-${CACHE_VERSION}`,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const path = require("path");

const nextConfig = {
  // ۱. اضافه شدن خروجی مستقل برای سازگاری حداکثری با کلودفلر
  output: "standalone",
  
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(__dirname, "src"),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // ۲. اصلاح وب‌پک: حذف چانک‌بندی دستی زمان بیلد سرور برای جلوگیری از تداخل با وورکرها
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: "vendors",
              chunks: "all",
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },
  compress: true,
};

module.exports = withPWA(nextConfig);