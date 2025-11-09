/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  env: {
    // Use https for production, http for development
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://localhost:443' : 'http://localhost:8000'),
  },
  serverRuntimeConfig: {
    // Server-side config - supports both http and https
    apiUrl: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://localhost:443' : 'http://localhost:8000'),
  },
  publicRuntimeConfig: {
    // Public config - accessible in browser
    apiUrl: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://localhost:443' : 'http://localhost:8000'),
  },
  // Enable compression
  compress: true,
  // Configure image optimization
  images: {
    unoptimized: true, // Disable for Now.js deployments
  },
}

module.exports = nextConfig
