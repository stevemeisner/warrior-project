import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["convex/**"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "convex/_generated/**",
        "convex/test.setup.ts",
        "convex/test.factories.ts",
      ],
      reporter: ["text", "text-summary"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
          setupFiles: ["./convex/test.vitestSetup.ts"],
        },
      },
    ],
  },
});
