import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        // Vendor portal - static assets
        {
          source: "/vendor/_next/:path*",
          destination: "http://localhost:3001/vendor/_next/:path*",
          basePath: false,
        },
        // Vendor portal - pages
        {
          source: "/vendor",
          destination: "http://localhost:3001/vendor",
          basePath: false,
        },
        {
          source: "/vendor/:path*",
          destination: "http://localhost:3001/vendor/:path*",
          basePath: false,
        },
        // Ops portal - static assets
        {
          source: "/ops/_next/:path*",
          destination: "http://localhost:3002/ops/_next/:path*",
          basePath: false,
        },
        // Ops portal - pages
        {
          source: "/ops",
          destination: "http://localhost:3002/ops",
          basePath: false,
        },
        {
          source: "/ops/:path*",
          destination: "http://localhost:3002/ops/:path*",
          basePath: false,
        },
      ],
    };
  },
};

export default config;
