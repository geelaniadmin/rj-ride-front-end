import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/vendor",
          destination: "http://localhost:3001/vendor",
        },
        {
          source: "/vendor/:path*",
          destination: "http://localhost:3001/vendor/:path*",
        },
        {
          source: "/ops",
          destination: "http://localhost:3002/ops",
        },
        {
          source: "/ops/:path*",
          destination: "http://localhost:3002/ops/:path*",
        },
      ],
    };
  },
};

export default config;
