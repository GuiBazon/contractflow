const { defineConfig } = require("@playwright/test");
const baseURL = process.env.CF_MOBILE_E2E_URL || "http://127.0.0.1:8084";
module.exports = defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    launchOptions: process.env.PW_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PW_EXECUTABLE_PATH,
          args: ["--no-sandbox"],
        }
      : {},
  },
  webServer: {
    command:
      "npm run build:web && python3 -m http.server 8084 --bind 127.0.0.1 --directory dist",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      EXPO_PUBLIC_API_URL:
        process.env.CF_E2E_API_URL || "http://127.0.0.1:8080/api",
      EXPO_NO_TELEMETRY: "1",
      EXPO_OFFLINE: "1",
    },
  },
});
