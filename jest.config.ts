import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Replace ESM-only `jose` with a CJS-compatible manual mock for tests
    "^jose$": "<rootDir>/src/__mocks__/jose.ts",
  },
  // Allow Jest to transform ESM packages (jose, next internals)
  transformIgnorePatterns: [
    "/node_modules/(?!(jose|@panva)/)",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2020",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          allowJs: true,
          strict: false,
          paths: { "@/*": ["./src/*"] },
        },
        // Tell ts-jest to treat .js imports from ESM packages as CJS
        diagnostics: false,
      },
    ],
  },
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/app/api/**/*.ts",
    "!src/**/*.d.ts",
  ],
};

export default config;
