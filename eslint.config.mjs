import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// Flat-config port of the previous .eslintrc.json, which extended
// ["next/core-web-vitals", "next/typescript"]. ESLint 10 removed eslintrc
// support, so the same two rule sets are spread in here directly.
export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "public/**",
      "convex/_generated/**",
      "next-env.d.ts",
      ".claude/**",
      ".claude-flow/**",
      ".swarm/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // eslint-config-next still bundles an eslint-plugin-react whose React
    // version auto-detection calls an API ESLint 10 removed. Pinning the
    // version skips that code path.
    settings: { react: { version: "19.2" } },
    rules: {
      // A leading underscore is the existing convention in this codebase for
      // a binding that is deliberately unused (positional callback args,
      // discarded destructuring slots). Honor it instead of deleting them.
      // Severity stays "warn" to match what eslint-config-next already set;
      // only the ignore patterns are added here.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // next.config.js and the Jest setup/config are CommonJS by necessity —
    // require() is correct there, not a violation.
    files: ["*.config.js", "*.config.mjs", "jest.config.js", "tests/setup.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
