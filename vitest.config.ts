import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/data/**/*.test.ts"],
    passWithNoTests: true,
    // Off: Vitest 5 skips caching a module only when its source contains the literal
    // `import.meta.glob(`, so typed calls like `import.meta.glob<T>(` get cached and keep
    // serving the folder contents from the first run (src/sources/timelines.ts, registry.ts).
    fsModuleCache: false,
  },
});
