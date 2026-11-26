import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: 'list',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    headless: true,
    ...(process.env.CI === 'true' ? {} : { channel: 'chrome' }),
  },
});
