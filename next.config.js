/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Experimental features for better Docker support
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig