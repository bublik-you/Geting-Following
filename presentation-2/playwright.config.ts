import { defineConfig } from '@playwright/test';

const publishedURL = process.env.PLAYWRIGHT_BASE_URL;
const localURL = 'http://127.0.0.1:4174/Geting-Following/';
const baseURL = (publishedURL || localURL).replace(/\/?$/, '/');

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30_000,
  webServer: publishedURL ? undefined : {
    command: 'npm run preview:pages',
    url: localURL,
    reuseExistingServer: false,
  },
  use: {
    baseURL,
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/usr/bin/chromium'),
      args: ['--disable-dev-shm-usage'],
    },
  },
  reporter: 'list',
});
