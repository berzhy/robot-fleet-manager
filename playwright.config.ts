import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: origin,
    channel: process.env.CI ? undefined : "chrome",
    // Headless unless `npm run test:e2e:browser` sets this. CI never opens a window.
    headless: !!process.env.CI || process.env.PLAYWRIGHT_HEADED !== "1",
    trace: { mode: "retain-on-failure", screenshots: false },
  },
  webServer: {
    command: `export DATABASE_PATH="$(mktemp -d)/fleet.sqlite" && export E2E_DIST_DIR=".next/e2e" && npm run db:setup && exec npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
