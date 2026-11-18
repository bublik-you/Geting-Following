import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/usr/bin/chromium'),
});
try {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('offline/presentation.html')).href + '?mode=summary');
  await page.getByRole('heading', { name: 'Три ключевых вывода' }).waitFor();
  await page.pdf({ path: 'offline/executive-summary.pdf', preferCSSPageSize: true, printBackground: true });
} finally {
  await browser.close();
}

for (const doc of ['PLAY_OFFLINE.md', 'MONOLOG.md', 'SOURCES.md'])
  copyFileSync(doc, 'offline/' + doc);
rmSync('offline/four-cats-offline.zip', { force: true });
execFileSync('zip', [
  '-q', 'four-cats-offline.zip', 'presentation.html', 'executive-summary.pdf',
  'PLAY_OFFLINE.md', 'MONOLOG.md', 'SOURCES.md',
], { cwd: 'offline' });
