import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// react is a peerDependency (provided by the consuming portals), so it isn't installed in
// ride-shared itself. Point the test runner at a sibling app's copy so react-dependent
// modules (e.g. realtime/ws.ts) resolve when running this package's tests in isolation.
const react = fileURLToPath(new URL("../ride_prd/node_modules/react", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { react },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
