import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/ops",
  // Allow LAN-IP access in dev so Next doesn't block its own _next/HMR resources
  // as cross-origin (which breaks client hydration when not served from localhost).
  allowedDevOrigins: ["192.168.1.39", "localhost", "127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
