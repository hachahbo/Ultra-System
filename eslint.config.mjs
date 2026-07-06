import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Day-boundary math must go through src/lib/time.ts (Casablanca-local),
    // never date-fns' UTC-relative helpers directly — see src/lib/time.ts.
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/lib/time.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "date-fns",
              importNames: ["startOfToday", "startOfWeek"],
              message: "Use the Casablanca-local helpers in src/lib/time.ts instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
