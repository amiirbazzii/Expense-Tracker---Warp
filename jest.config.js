/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/**/*.d.ts"],
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          // TypeScript 6 rejects the inherited `baseUrl` and infers a
          // `rootDir` of ./tests when compiling the suites in isolation.
          ignoreDeprecations: "6.0",
          rootDir: ".",
        },
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(convex)/)"],
};
