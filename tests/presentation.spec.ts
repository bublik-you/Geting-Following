import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function jump(page: Page, label: string) {
  await page.getByRole('button', { name: 'Разделы', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Разделы исследования' });
  await menu.getByLabel('Перейти без анимации').check();
  await menu.getByRole('button', { name: new RegExp(label) }).click();
}

async function expectCityRestored(page: Page) {
  const city = page.getByRole('main', { name: 'Карта исследования' });
  await expect(
    city.getByRole('button', { name: 'Burger King', exact: true }),
  ).toBeInViewport();
  await expect(
    city.getByRole('button', { name: 'Молочай', exact: true }),
  ).toBeInViewport();
  await expect(
    city.locator('.pin.team button'),
  ).toHaveCount(4);
}

test('city, team and two venue entrances', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Бизнес-разведка',
  );
  await expect(page.locator('.pin.team button')).toHaveCount(4);
  const king = page.getByRole('button', { name: 'Burger King', exact: true });
  await king.hover();
  await expect(
    page.getByRole('button', { name: 'Открыть исследование Burger King' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Открыть исследование Burger King' })
    .click();
  await expect(page.locator('.chapter-2')).toBeVisible();
  await expect(page.locator('.speech-copy p')).toContainText('Burger King');
  await page.getByRole('button', { name: 'Следующая реплика' }).click();
  await expect(page.locator('.speech-copy p')).toContainText(
    'Отдельно измерим оформление',
  );
  await page.getByRole('button', { name: 'Назад в город' }).click();
  await expectCityRestored(page);

  // Keep the team scene in its fade-in phase so the immediate return is reproducible.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500);
  await page.getByRole('button', { name: 'Максим Середкин', exact: true }).click();
  await page.clock.runFor(700);
  await expect(page.locator('.curtain')).toHaveClass('curtain in');
  await expect(
    page.getByRole('heading', { name: 'Максим Середкин' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Анжелина Дитятьева', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Анжелина Дитятьева' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Назад в город' }).click();
  await expect(page.locator('.curtain')).toHaveClass('curtain out-short');
  await page.clock.runFor(430);
  await expect(page.locator('.curtain')).toHaveClass('curtain in');
  await page.clock.resume();
  await expectCityRestored(page);

  await page.getByRole('button', { name: 'Молочай', exact: true }).hover();
  await page
    .getByRole('button', { name: 'Открыть исследование Молочай' })
    .click();
  await expect(page.locator('.chapter-3')).toContainText(
    'ТЦ «Амстердам», нижний уровень',
  );
  await page.getByRole('button', { name: 'Назад в город' }).click();
  await expectCityRestored(page);
  expect(errors).toEqual([]);
});

test('research interactions use the field data', async ({ page }) => {
  await page.goto('./');
  await jump(page, 'Метод');
  await page.getByRole('button', { name: /Два интервала/ }).click();
  await expect(page.locator('.note p')).toContainText('сопоставленным парам');
  const teaTab = page.getByRole('group', { name: 'Заведение' })
    .getByRole('button', { name: 'Молочай', exact: true });
  await teaTab.click();
  await expect(teaTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.note p')).toHaveCount(0);
  await jump(page, 'Портрет');
  await page.getByRole('button', { name: 'Место для работы' }).click();
  await expect(page.locator('.detail')).toContainText('поработать вне дома');
  await jump(page, 'Путь клиента');
  await page.getByRole('button', { name: 'Получение' }).click();
  await expect(page.getByRole('heading', { name: /Получение.*Момент истины/ })).toBeVisible();
  await jump(page, 'Наблюдения');
  await page.getByRole('button', { name: '«Красный лис» на схеме' }).click();
  await expect(page.locator('.dialogue-lines')).toContainText('Лис 54');
  await expect(page.locator('.observation-detail')).toContainText('ошибка расшифровки');
  await jump(page, 'Рекомендации');
  await expect(page.locator('.matrix-grid button')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Эффект', exact: true }).selectOption('4');
  await page.getByRole('combobox', { name: 'Сложность', exact: true }).selectOption('2');
  await expect(page.locator('.matrix-grid button')).toHaveCount(1);
  await page.getByRole('button', { name: /Показать прототип/ }).click();
  await expect(page.locator('.solution-preview')).toContainText('сезонное');
  await jump(page, '48 часов');
  await page.getByRole('button', { name: /Контрольные замеры/ }).click();
  await expect(page.locator('.timeline .detail')).toContainText('Таймкипер');
  await jump(page, 'Риски');
  await page.getByRole('button', { name: 'Скорость терминалов' }).click();
  await expect(page.locator('.detail')).toContainText('контрольные замеры');
  await jump(page, 'Итоги');
  await expect(page.locator('.conclusions')).toContainText('Проверить два решения');
  await expect(page.getByText('Спасибо за внимание!')).toBeVisible();
  await expect(page.locator('.segments button')).toHaveCount(13);
});

test('touch: pinch does not open a marker, tap opens and dismisses preview', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 900, height: 600 },
    hasTouch: true,
    isMobile: true,
    ignoreHTTPSErrors: !process.env.PLAYWRIGHT_BASE_URL,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const burger = page.getByRole('button', { name: 'Burger King', exact: true });
  const pin = await burger.boundingBox();
  const canvas = (await page.locator('.city-canvas').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = Math.round(pin!.x + pin!.width / 2);
  const y = Math.round(pin!.y + pin!.height / 2);
  const start = [
    { x, y, id: 1 },
    { x: x + 28, y: y + 55, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: start,
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 9, y: y - 9, id: 1 },
      { x: x + 53, y: y + 82, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(page.locator('.venue-preview')).toHaveCount(0);
  await expect(page.locator('.map-mode')).toBeVisible();
  await page.getByRole('button', { name: 'Вернуть общий план' }).tap();
  await burger.tap();
  await expect(
    page.getByRole('button', { name: 'Открыть исследование Burger King' }),
  ).toBeVisible();
  await page.touchscreen.tap(canvas.x + 12, canvas.y + canvas.height / 2);
  await expect(page.locator('.venue-preview')).toHaveCount(0);
  await burger.tap();
  await page
    .getByRole('button', { name: 'Открыть исследование Burger King' })
    .tap();
  await expect(page.locator('.chapter-2')).toBeVisible();
  await context.close();
});

test('seven-minute manual defense, synced notes, print view and offline reload', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Начать защиту' }).click();
  await expect(page.getByLabel('Таймер защиты')).toContainText('07:00');
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('heading', { name: 'Команда исследования' }),
  ).toBeVisible();
  const notes = await context.newPage();
  await notes.goto('?mode=notes');
  await expect(
    notes.getByRole('heading', { name: 'Команда', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(
    notes.getByRole('heading', { name: 'Карта', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Скрыть панель' }).click();
  await expect(page.getByLabel('Таймер защиты')).toBeHidden();
  await page.getByRole('button', { name: 'Показать панель' }).click();
  await expect(page.getByLabel('Таймер защиты')).toBeVisible();
  await page.getByRole('button', { name: 'Приложения' }).click();
  await page.getByText('Обезличенные цитаты').click();
  await expect(page.getByText(/Реплики и пересказ комбо из полевых записей/)).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Бизнес-разведка',
  );
  await page.goto('?mode=summary');
  await expect(
    page.getByRole('button', { name: 'Печать / PDF' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Три ключевых вывода' }),
  ).toBeVisible();
  await context.setOffline(false);
});


async function observeAudio(context: BrowserContext) {
  await context.addInitScript(() => {
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      if (this.context.state === 'running')
        document.documentElement.dataset.audioStarted = 'yes';
      return original.apply(this, args);
    };
  });
}

async function exerciseOffline(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Бизнес-разведка');
  const names = ['Анжелина Дитятьева', 'Алексей Ваганов', 'Алексей Назаров', 'Максим Середкин'];
  for (const name of names) {
    await page.locator('.city').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-audio-started', 'yes');
    await page.getByRole('button', { name: 'Назад в город' }).click();
  }
  for (const name of ['Burger King', 'Молочай']) {
    await page.locator('.city').getByRole('button', { name, exact: true }).hover();
    await page.getByRole('button', { name: `Открыть исследование ${name}` }).click();
    await expect.poll(() => page.locator('.context img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Назад в город' }).click();
  }
  for (let step = 1; step <= 13; step++) {
    await page.locator('.segments').getByRole('button', { name: new RegExp(`^Раздел ${step}[.]`) }).click();
    await expect(page.locator(step === 1 ? '.map-title' : `.chapter-${step - 1}`)).toBeVisible();
  }

  await jump(page, 'Метрики');
  await expect(page.locator('.mean-chart')).toContainText('4,2 мин · n = 5');
  await expect(page.locator('.mean-chart')).toContainText('5,7 мин · n = 3');
  await page.getByRole('button', { name: 'По заказам', exact: true }).click();
  await page.locator('.order-chart button').last().click();
  await expect(page.locator('.metric-detail [aria-live]')).toContainText('14:44 → 14:48 · 4 мин');
  await page.getByRole('button', { name: 'Шкала событий', exact: true }).click();
  await page.getByRole('button', { name: '18 ноября', exact: true }).click();
  await page.getByRole('button', { name: /^14:48/ }).click();
  await expect(page.locator('.metric-detail [aria-live]')).toContainText('заказы №2 и №3');
  await page.getByRole('button', { name: 'Этапы', exact: true }).click();
  await expect(page.locator('.order-stages li')).toHaveCount(5);
  await page.getByRole('button', { name: 'Воронка', exact: true }).click();
  await expect(page.locator('.metric-detail')).toContainText('Посетитель отказался');
  await page.getByRole('button', { name: 'Оценки команды', exact: true }).click();
  await expect(page.locator('.metric-detail')).toContainText('5–7 минут');
  await page.getByRole('group', { name: 'Заведение' }).getByRole('button', { name: 'Burger King', exact: true }).click();
  await page.getByRole('button', { name: 'По заказам', exact: true }).click();
  await expect(page.locator('.order-chart button')).toHaveCount(3);

  await page.getByRole('button', { name: 'Приложения', exact: true }).click();
  await page.getByText('Полевые записи', { exact: true }).click();
  await page.getByText('15 ноября · Молочай', { exact: true }).click();
  await expect(page.getByText(/покупка в записи не зафиксирована/)).toBeVisible();
  await page.getByText('Источники и сметы', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: /Открыть файл/ }).click();
  expect((await download).suggestedFilename()).toBe('SOURCES.md');
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();

  await page.getByRole('button', { name: 'Начать защиту' }).click();
  await page.keyboard.press('ArrowRight');
  const notesReady = page.context().waitForEvent('page');
  await page.getByRole('link', { name: 'Заметки', exact: true }).click();
  const notes = await notesReady;
  await expect(notes.getByRole('heading', { name: 'Текст защиты' })).toBeVisible();
  await expect(notes.getByRole('heading', { name: 'Команда', exact: true })).toBeVisible();
  await notes.close();
  await expect(page.getByLabel('Таймер защиты')).toContainText('07:00');
}

test('HTTPS PWA cache reopens offline and runs all scenes', async ({ context, page, baseURL }) => {
  expect(new URL(baseURL!).protocol).toBe('https:');
  await observeAudio(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Готово офлайн');
  const paths = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find((key) => key.startsWith('geting-following:'))!);
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(paths).toEqual(expect.arrayContaining([
    expect.stringMatching(/index\.html$/), expect.stringMatching(/manifest\.webmanifest$/),
    expect.stringMatching(/burger\/illustration\.svg$/), expect.stringMatching(/tea\/illustration\.svg$/),
    expect.stringMatching(/SOURCES\.md$/),
  ]));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Готово офлайн');
  await page.close();
  const reopened = await context.newPage();
  await reopened.emulateMedia({ reducedMotion: 'reduce' });
  await reopened.goto(baseURL!);
  await exerciseOffline(reopened);
});

test('standalone file runs all scenes without HTTP requests', async ({ page, context }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'The standalone file is covered by the build job.');
  await observeAudio(context);
  await context.setOffline(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests: string[] = [];
  const errors: string[] = [];
  context.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  const html = pathToFileURL(resolve('offline/presentation.html')).href;
  await page.goto(html);
  await exerciseOffline(page);
  await page.goto(html + '?mode=summary');
  await expect(page.getByRole('heading', { name: 'Три ключевых вывода' })).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
