/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
 
  env: {
    NEXT_PUBLIC_API_URL:        process.env.NEXT_PUBLIC_API_URL        || "http://localhost:4000",
    NEXT_PUBLIC_MAP_CENTER_LAT: process.env.NEXT_PUBLIC_MAP_CENTER_LAT || "14.4292",
    NEXT_PUBLIC_MAP_CENTER_LNG: process.env.NEXT_PUBLIC_MAP_CENTER_LNG || "121.0603",
  },
 
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
 
    return config;
  },
};
 
module.exports = nextConfig;