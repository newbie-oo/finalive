import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "tests/integration/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/*.config.*", "**/*.d.ts", "tests/**", "drizzle/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
