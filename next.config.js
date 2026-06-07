/** @type {import('next').NextConfig} */
const nextConfig = {
  // gzip compression for responses
  compress: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  experimental: {
    optimizePackageImports: ["leaflet", "@geoman-io/leaflet-geoman-free"],
  },

  // Strict mode for better dev warnings
  reactStrictMode: true,
};

module.exports = nextConfig;
