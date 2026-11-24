/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Game logic routes read env at request time, never at build time, so a build
  // without the Upstash env vars still succeeds. Lint is not a build gate here.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
