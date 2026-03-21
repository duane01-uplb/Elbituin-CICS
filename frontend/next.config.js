/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA-ready configuration
  reactStrictMode: true,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    NEXT_PUBLIC_MAP_CENTER_LAT: process.env.NEXT_PUBLIC_MAP_CENTER_LAT || "14.4292",
    NEXT_PUBLIC_MAP_CENTER_LNG: process.env.NEXT_PUBLIC_MAP_CENTER_LNG || "121.0603",
  },

  // Required for Leaflet SSR compatibility
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
