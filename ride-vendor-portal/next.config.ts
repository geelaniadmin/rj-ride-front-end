import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/vendor",
  // The API client hits trailing-slash URLs (/api/v1/.../). Without this, Next 308-redirects
  // them to the slashless form before the rewrite runs, breaking the proxied API calls.
  skipTrailingSlashRedirect: true,
  // Accessed over the LAN IP (e.g. http://192.168.1.39:3001) rather than localhost,
  // so Next's dev server treats its own _next/HMR resources as cross-origin and blocks
  // them, which prevents the client bundle from hydrating (login form goes dead / native
  // submit). Allow the LAN host(s) explicitly. Extend this list for other dev hostnames.
  allowedDevOrigins: ["192.168.1.39", "localhost", "127.0.0.1"],
  // /api/* is proxied to Django by middleware.ts (preserves trailing slash); see there.
  // NOTE: react-query must be a single copy shared with @ride/shared or you get
  // "No QueryClient set". That dedupe is done at the package level (ride-shared's
  // @tanstack/react-query is symlinked to this portal's copy) because Turbopack's
  // resolveAlias does not accept absolute paths.
};

export default nextConfig;
