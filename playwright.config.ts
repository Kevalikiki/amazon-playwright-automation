import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', {
      outputFolder: './playwright-report',
      open: 'never',
    }],
  ],

  use: {
    baseURL: 'https://www.amazon.in',

    headless: true,

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
  ],
});
