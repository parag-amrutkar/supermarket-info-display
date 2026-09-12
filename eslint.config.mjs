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
    // Not app code: vendored agent skills hydrated from skills-lock.json, and
    // the HyperFrames composition projects. Both are gitignored or self-
    // contained, and flat config does not consult .gitignore.
    ".agents/**",
    ".claude/**",
    "videos/**",
  ]),
]);

export default eslintConfig;
