/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
 
  env: {
    NEXT_PUBLIC_API_URL:        process.env.NEXT_PUBLIC_API_URL        || "http://localhost:4000",
    NEXT_PUBLIC_MAP_CENTER_LAT: process.env.NEXT_PUBLIC_MAP_CENTER_LAT || "14.4292",
    NEXT_PUBLIC_MAP_CENTER_LNG: process.env.NEXT_PUBLIC_MAP_CENTER_LNG || "121.0603",
  },
 
  webpack: (config) => {
    // Required for Leaflet (RouteOptimizer) and MapLibre GL (FuelMap)
    config.resolve.fallback = { fs: false };
 
    // maplibre-gl ships its own ESM bundles — let webpack handle them natively.
    // Do NOT add babel-loader here; it re-transpiles the whole library on every
    // dev build and is the primary cause of slow HMR with this package.
 
    return config;
  },
};
 
module.exports = nextConfig;