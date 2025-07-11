/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint checks during production builds (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optionally ignore type errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
