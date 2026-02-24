import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const proxyApiUrl =
      process.env.PROXY_API_URL ||
      process.env.NEXT_PUBLIC_PROXY_API_URL ||
      "http://localhost:8080/v1/proxy";
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${proxyApiUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
        pathname: '/igdb/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/b/**',
      },
      {
        protocol: 'https',
        hostname: 'flagsapi.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

