import { defineConfig, devices } from '@playwright/test';

const BASE_URL_PRD = process.env.BASE_URL_PRD ?? 'http://localhost:3000';
const BASE_URL_VENDOR = process.env.BASE_URL_VENDOR ?? 'http://localhost:3001';
const BASE_URL_OPS = process.env.BASE_URL_OPS ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['html']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

export { BASE_URL_PRD, BASE_URL_VENDOR, BASE_URL_OPS };
