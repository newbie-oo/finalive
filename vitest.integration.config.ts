import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.{test,spec}.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    // Integration tests share a single Postgres database and TRUNCATE in beforeEach.
    // Files must run serially or mutual TRUNCATE/insert FK violations occur.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/integration/server-only-stub.ts"),
    },
  },
});
