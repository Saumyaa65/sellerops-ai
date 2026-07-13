import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy /api/* to the FastAPI backend in development
    // In production, NEXT_PUBLIC_API_URL points directly to Render backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Silence hydration warnings from browser extensions
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
