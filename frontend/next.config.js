/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow optimized images from local sources
    unoptimized: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
