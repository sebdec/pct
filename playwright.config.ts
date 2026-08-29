import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4323",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command:
      "pnpm exec cross-env ASTRO_DEV_BACKGROUND=0 PUBLIC_MAP_STYLE_URL=local pnpm dev --ignore-lock --host 127.0.0.1 --port 4323",
    url: "http://127.0.0.1:4323/map",
    reuseExistingServer: !process.env.CI,
  },
});
