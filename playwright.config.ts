import { defineConfig, devices } from "@playwright/test";
import { Config, Effect } from "effect";

const isCi = Effect.runSync(
  Config.boolean("CI").pipe(Config.withDefault(false))
);

export default defineConfig({
  forbidOnly: isCi,
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  reporter: "html",
  retries: isCi ? 2 : 0,
  testDir: "./apps/web/e2e",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun dev",
    reuseExistingServer: !isCi,
    url: "http://localhost:3001",
  },
  workers: isCi ? 1 : undefined,
});
