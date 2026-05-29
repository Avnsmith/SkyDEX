import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agenthub/config', '@agenthub/types'],
}

export default nextConfig
