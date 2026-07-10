import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config cho E2E smoke tests.
 *
 * - Headless Chromium only (đủ cho smoke).
 * - `webServer` tự start harness vite (`npm run e2e:serve`) — port 5173,
 *   host 127.0.0.1 (xem `scripts/demo/vite.config.ts`).
 * - Reuse existing server khi chạy local (CI luôn fresh start).
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run e2e:serve',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
