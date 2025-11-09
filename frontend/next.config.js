/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
  },
  serverRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig
