import { expect, test, type Page } from '@playwright/test';

async function expectPresentation(page: Page, url: URL, second: boolean) {
  await expect(page).toHaveURL(url.href);
  if (second) {
    await expect(page.locator('main#presentation-2')).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Бизнес-разведка');
  }
  await expect(page.getByRole('status')).toHaveText('Готово офлайн');
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toBe(new URL('sw.js', url).href);
}

async function readPresentationCaches(page: Page) {
  return page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith('geting-following:') || name.startsWith('geting-following-presentation-2:'),
    );
    return Promise.all(names.map(async (name) => ({
      name,
      files: (await (await caches.open(name)).keys()).map((request) => request.url),
    })));
  });
}

for (const secondFirst of [false, true]) {
  test(`both presentations reopen offline when visited ${secondFirst ? 'nested first' : 'root first'}`, async ({ context, baseURL }) => {
    const root = new URL(baseURL!);
    const nested = new URL('presentation-2/', root);
    const pages = secondFirst ? [nested, root] : [root, nested];
    const prefixes = {
      root: `geting-following:${root.href}`,
      nested: `geting-following-presentation-2:${nested.href}:`,
    };

    const firstPage = await context.newPage();
    await firstPage.goto(pages[0].href);
    await expectPresentation(firstPage, pages[0], secondFirst);
    const firstCaches = await readPresentationCaches(firstPage);
    expect(firstCaches).toHaveLength(1);

    const oldCache = (secondFirst ? prefixes.root : prefixes.nested) + 'previous-build';
    await firstPage.evaluate((name) => caches.open(name).then(() => undefined), oldCache);
    const secondPage = await context.newPage();
    await secondPage.goto(pages[1].href);
    await expectPresentation(secondPage, pages[1], !secondFirst);
    await expectPresentation(firstPage, pages[0], secondFirst);

    await expect.poll(() => readPresentationCaches(secondPage).then((entries) => entries.map(({ name }) => name)))
      .not.toContain(oldCache);
    const entries = await readPresentationCaches(secondPage);
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual(firstCaches[0]);

    const rootCache = entries.find(({ name }) => name.startsWith(prefixes.root))!;
    const nestedCache = entries.find(({ name }) => name.startsWith(prefixes.nested))!;
    expect(rootCache.files).toContain(new URL('index.html', root).href);
    expect(rootCache.files.every((url) => url.startsWith(root.href) && !url.startsWith(nested.href))).toBe(true);
    expect(nestedCache.files).toContain(new URL('index.html', nested).href);
    expect(nestedCache.files.every((url) => url.startsWith(nested.href))).toBe(true);

    await firstPage.close();
    await secondPage.close();
    await context.setOffline(true);
    for (const url of pages) {
      const page = await context.newPage();
      const response = await page.goto(url.href);
      expect(response?.fromServiceWorker()).toBe(true);
      await expectPresentation(page, url, url === nested);
      if (url === nested) {
        const manifest = await page.evaluate(async () => {
          const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!;
          const response = await fetch(link.href);
          const data = await response.json();
          return {
            id: data.id,
            start: new URL(data.start_url, link.href).href,
            scope: new URL(data.scope, link.href).href,
          };
        });
        expect(manifest).toEqual({ id: nested.pathname, start: nested.href, scope: nested.href });
      }
      await page.close();
    }
  });
}
