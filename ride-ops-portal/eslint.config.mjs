import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const RETIRED_STORES = [
  "useTripStore",
  "useSafetyAlertStore",
  "useTenantStore",
  "useTraccarStore",
  "useVendorStore",
  "useVehicleTypeStore",
  "useCustomerStore",
  "useSessionStore",
  "useAlertStore",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: RETIRED_STORES.map((name) => ({
            name: "@ride/shared",
            importNames: [name],
            message: `'${name}' is retired — use React Query + apiClient instead.`,
          })),
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
