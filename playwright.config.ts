import { defineConfig, devices } from '@playwright/test';

// Uses the locally installed Chrome; no browser download is needed on this machine.
// Set PLAYWRIGHT_CHANNEL=msedge for Edge, or install Chromium and use an empty value.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: [
    {
      command: 'npm run test:browser-server --workspace server',
      url: 'http://127.0.0.1:5101/api/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev --workspace client -- --port 5175',
      url: 'http://127.0.0.1:5175',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:5101/api/v1' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
