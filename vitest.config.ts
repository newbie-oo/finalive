import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		globals: true,
		// Skipped tests are silently green by default; --fail-on-skip flips that
		// so a careless `it.skip` or `describe.skip` causes a CI failure.
		passWithNoTests: false,
		exclude: [
			"**/node_modules/**",
			"**/.next/**",
			"tests/integration/**",
			"tests/e2e/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			// Floors are intentionally a few points below the current numbers so
			// CI fails on regressions rather than every change. Current run:
			// lines 40.15%, branches 80.83%, functions 61.83%, statements 40.15%.
			// Raise these as the codebase grows.
			thresholds: {
				lines: 38,
				functions: 58,
				branches: 78,
				statements: 38,
			},
			// `include` constrains coverage to the project source so the v8
			// provider doesn't try to read source maps for Next.js's .next/dev
			// build artifacts (which it can't always find).
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.config.*",
				"**/*.d.ts",
				"tests/**",
				"drizzle/**",
				".next/**",
				"**/*.test.ts",
				"**/*.test.tsx",
				"src/db/schema/**",
				"src/app/**/page.tsx",
				"src/app/**/layout.tsx",
				"src/app/**/loading.tsx",
				"src/app/**/error.tsx",
				"src/app/**/not-found.tsx",
				"src/app/**/route.ts",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
