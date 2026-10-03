/** @type {import('jest').Config} */
const baseConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  clearMocks: true,
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript" },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

module.exports = {
  projects: [
    {
      ...baseConfig,
      displayName: "unit",
      testMatch: ["**/*.test.ts"],
      testPathIgnorePatterns: [
        ".*\\.int\\.test\\.ts$",
        ".*\\.api\\.test\\.ts$",
      ],
      setupFiles: ["<rootDir>/src/test/setupEnv.ts"],
      setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
    },
    {
      ...baseConfig,
      displayName: "integration",
      testMatch: ["**/*.int.test.ts", "**/*.api.test.ts"],
      setupFiles: ["<rootDir>/src/test/setupEnv.ts"],
      globalSetup: "<rootDir>/src/test/globalSetup.ts",
      setupFilesAfterEnv: [
        "<rootDir>/src/test/setup.ts",
        "<rootDir>/src/test/setupIntegration.ts",
      ],
    },
  ],
};
