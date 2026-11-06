import { defineConfig } from '@playwright/test';

const publishedURL = process.env.PLAYWRIGHT_BASE_URL;
const localURL = 'http://127.0.0.1:4173/Geting-Following/';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  webServer: publishedURL ? undefined : {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: localURL,
    reuseExistingServer: false,
    timeout: 30000,
  },
  use: {
    baseURL: publishedURL || localURL,
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/usr/bin/chromium'),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    viewport: { width: 1440, height: 900 },
  },
  reporter: 'list',
});
