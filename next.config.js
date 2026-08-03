/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  /**
   * Build output dir. Overridable so a second dev server (isolated QA run on another port) can
   * use its own — e.g. `NEXT_DIST_DIR=.next-qa PORT=3001 npm run dev`. Two servers sharing one
   * `.next` corrupt each other's chunks: the running one starts 404ing on
   * `/_next/static/...` the moment the other rebuilds or the dir is cleared.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
