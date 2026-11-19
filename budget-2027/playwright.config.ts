import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
// In Claude Code cloud the browser is preinstalled at /opt/pw-browsers.
// Locally run `npx playwright install chromium` instead.
const executablePath = process.env.PW_CHROMIUM_PATH;

// Test-only admin secret; real deployments set their own SESSION_SECRET.
const E2E_SECRET = "e2e-only-session-secret-0123456789abcdef";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "bg-BG",
    timezoneId: "Europe/Sofia",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { SESSION_SECRET: E2E_SECRET, INSECURE_COOKIES: "1" },
    timeout: 180_000,
  },
});
