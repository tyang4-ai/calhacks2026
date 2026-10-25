import { defineConfig, devices } from "@playwright/test";

// The base URL and the output folder come from scripts/run-playwright.mjs, which starts the
// preview when it's needed. There is no webServer block. Chromium only, from the preflight install.
const baseURL = process.env.CINDIA_BASE_URL ?? "http://localhost:5173";
const outputDir = process.env.CINDIA_OUTPUT_DIR ?? `test-results/run-${process.pid}`;

// One worker per run on the shared cloud VM, where several agents run Playwright at once and the
// load bent the demo's timing checks. CINDIA_PW_WORKERS raises it for a run that has the VM alone.
const workers = Number(process.env.CINDIA_PW_WORKERS ?? 1);

export default defineConfig({
  outputDir,
  workers,
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1600, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "smoke", testDir: "tests/smoke" },
    { name: "features", testDir: "tests/features" },
    { name: "demo", testDir: "tests/demo", timeout: 150_000, fullyParallel: false },
    { name: "offline", testDir: "tests/offline", timeout: 150_000, fullyParallel: false },
  ],
});
