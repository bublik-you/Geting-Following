import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const url = pathToFileURL(resolve('offline/infographics.html')).href;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/usr/bin/chromium'),
});

try {
  const context = await browser.newContext({
    offline: true, reducedMotion: 'reduce', viewport: { width: 1100, height: 720 },
    hasTouch: true, isMobile: true,
  });
  const errors = [];
  const external = [];
  context.on('request', (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await expect(page.getByText('Автономный файл')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Информации');
  await page.getByRole('button', { name: 'Собрать в центре' }).tap();
  await page.getByRole('button', { name: 'Открыть сеть' }).tap();
  await expect(page.getByRole('heading', { name: 'Найти связь' })).toBeVisible();

  for (let index = 0; index < 8; index++) {
    await page.locator('#progress button').nth(index).tap();
    await expect(page.locator('#scene')).toHaveAttribute('data-index', String(index + 1));
  }
  await page.getByRole('button', { name: 'Сметать по строкам' }).tap();
  await expect(page.getByText('Спасибо за внимание!')).toBeVisible();

  const notes = await context.newPage();
  await notes.goto(url + '?mode=notes');
  await expect(notes.getByRole('heading', { name: 'Финал с веником и песком' })).toBeVisible();
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log('Standalone HTML opens on file:// offline. All eight scenes, sand, and notes pass.');
} finally {
  await browser.close();
}
