import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@ride/shared"],
  devIndicators: false,
  webpack(webpackConfig) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@tanstack/react-query": path.resolve(__dirname, "node_modules/@tanstack/react-query"),
    };
    return webpackConfig;
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.API_ORIGIN ?? "http://localhost:8000"}/api/:path*`,
        },
        {
          source: "/vendor/_next/:path*",
          destination: "http://localhost:3001/vendor/_next/:path*",
          basePath: false,
        },
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
        {
          source: "/ops/_next/:path*",
          destination: "http://localhost:3002/ops/_next/:path*",
          basePath: false,
        },
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
