import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function jump(page: Page, label: string) {
  await page.getByRole('button', { name: 'Разделы', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Разделы исследования' });
  await menu.getByLabel('Перейти без анимации').check();
  await menu.getByRole('button', { name: new RegExp(label) }).click();
}

test('city, team and two venue entrances', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'клиентского опыта',
  );
  await expect(page.locator('.pin.team button')).toHaveCount(4);
  const king = page.getByRole('button', { name: 'Burger King', exact: true });
  await king.hover();
  await expect(
    page.getByRole('button', { name: 'Открыть исследование Burger King' }),
  ).toContainText('[Добавить фото]');
  await page
    .getByRole('button', { name: 'Открыть исследование Burger King' })
    .click();
  await expect(page.locator('.chapter-2')).toBeVisible();
  await expect(page.locator('.speech-copy p')).toContainText('Burger King');
  await page.getByRole('button', { name: 'Следующая реплика' }).click();
  await expect(page.locator('.speech-copy p')).toContainText(
    'Добавить цель и задачи',
  );
  await page.getByRole('button', { name: 'Назад в город' }).click();
  await page.getByRole('button', { name: 'Участник 4', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '[Имя участника 4]' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Участник 1', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '[Имя участника 1]' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Назад в город' }).click();
  await page.getByRole('button', { name: 'Молочай', exact: true }).hover();
  await page
    .getByRole('button', { name: 'Открыть исследование Молочай' })
    .click();
  await expect(page.locator('.chapter-3')).toContainText(
    'ТЦ «Амстердам», этаж −1',
  );
  expect(errors).toEqual([]);
});

test('all thirteen sections and venue-scoped interactive templates', async ({
  page,
}) => {
  await page.goto('./');
  await jump(page, 'Метод');
  await page.getByRole('button', { name: /Измеряемые метрики/ }).click();
  await expect(page.locator('.note p')).toHaveText('[Добавить данные]');
  const teaTab = page
    .getByRole('group', { name: 'Заведение' })
    .getByRole('button', { name: 'Молочай', exact: true });
  await teaTab.click();
  await expect(teaTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.note p')).toHaveCount(0);
  await jump(page, 'Портрет');
  await page.getByRole('button', { name: 'Job story 4' }).click();
  await expect(page.locator('.detail')).toContainText('Job story 4');
  await jump(page, 'Путь клиента');
  await page.getByRole('button', { name: 'Получение' }).click();
  await expect(page.getByRole('heading', { name: /Получение/ })).toBeVisible();
  await jump(page, 'Метрики');
  await page.getByRole('button', { name: 'Сравнить заведения' }).click();
  await page
    .getByRole('button', { name: 'Время обслуживания', exact: true })
    .click();
  await expect(page.getByText('Данные ожидаются')).toHaveCount(2);
  await expect(page.locator('.track i').first()).toHaveCSS('width', '0px');
  await jump(page, 'Наблюдения');
  await page.getByRole('button', { name: '[Наблюдение 4]' }).click();
  await expect(page.locator('.observation-detail')).toContainText(
    'Наблюдение 4',
  );
  await jump(page, 'Рекомендации');
  await expect(page.locator('.matrix-grid button')).toHaveCount(0);
  await page.getByRole('button', { name: '[Рекомендация 6]' }).click();
  await expect(
    page.getByRole('heading', { name: '[Рекомендация 6]' }),
  ).toBeVisible();
  await jump(page, '48 часов');
  await expect(
    page.getByRole('button', { name: '[Мероприятие 3]' }),
  ).toBeVisible();
  await jump(page, 'Риски');
  await page
    .getByRole('button', { name: 'Непроверенные предположения' })
    .click();
  await expect(page.locator('.detail')).toContainText(
    'Непроверенные предположения',
  );
  await jump(page, 'Итоги');
  await expect(page.locator('.conclusions')).toContainText('Вывод 3');
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
  await expect(
    page
      .getByText('[Добавить материал]', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'клиентского опыта',
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
