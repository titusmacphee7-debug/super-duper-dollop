/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Codex owns lint config; don't fail the backend build on lint during bootstrap.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Heavy scraping deps must stay server-only and external to the bundle.
    serverComponentsExternalPackages: ["playwright", "cheerio", "bullmq", "ioredis"],
  },
};

export default nextConfig;
