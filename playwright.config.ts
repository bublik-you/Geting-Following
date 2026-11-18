import { defineConfig } from '@playwright/test';

const publishedURL = process.env.PLAYWRIGHT_BASE_URL;
const localURL = 'https://127.0.0.1:4173/Geting-Following/';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  webServer: publishedURL ? undefined : {
    command: 'node scripts/preview-https.mjs',
    url: localURL,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    timeout: 30000,
  },
  use: {
    baseURL: publishedURL || localURL,
    ignoreHTTPSErrors: !publishedURL,
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/usr/bin/chromium'),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    viewport: { width: 1440, height: 900 },
  },
  reporter: 'list',
});
