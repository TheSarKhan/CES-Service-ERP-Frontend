/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ces.sarkhan.online',
      },
      {
        protocol: 'https',
        hostname: 'service.sarkhan.az',
      },
    ],
  },
};

module.exports = nextConfig;
