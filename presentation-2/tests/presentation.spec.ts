import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { chapterPlan, totalSeconds } from '../src/content';
import { redistribute, type Shares } from '../src/scenes/layout';

const relativeURL = 'presentation-2/';
const region = (page: Page) => page.locator('#scene');
const coords = (x: number, y: number) => ({ x: Math.round(x), y: Math.round(y) });

async function locationOf(locator: Locator, x = .5, y = .5) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('Expected a visible gesture target');
  return coords(rect.x + rect.width * x, rect.y + rect.height * y);
}

async function mouseDrag(page: Page, source: Locator, target: { x: number; y: number }) {
  const start = await locationOf(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
}

async function touchPath(cdp: CDPSession, points: { x: number; y: number }[]) {
  const frame = () => cdp.send('Runtime.evaluate', { expression: 'new Promise(requestAnimationFrame)', awaitPromise: true });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
  await frame();
  for (const point of points.slice(1)) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    await frame();
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frame();
}

async function atScene(page: Page, index: number) {
  await expect(region(page)).toHaveAttribute('data-index', String(index));
}
async function jump(page: Page, index: number) {
  await page.locator('#progress button').nth(index - 1).click();
  await atScene(page, index);
}

test('timing and integer allocations stay valid at all boundaries', () => {
  expect(chapterPlan).toHaveLength(8);
  expect(totalSeconds).toBe(420);
  for (let a = 0; a <= 100; a += 4) {
    for (let b = 0; b <= 100 - a; b += 4) {
      const shares: Shares = [a, b, 100 - a - b];
      for (let index = 0; index < 3; index++) {
        for (const requested of [-20, 0, 1, 33, 67, 99, 100, 120]) {
          const result = redistribute(shares, index, requested);
          const validTotal = result.reduce((sum, value) => sum + value) === 100;
          const validValue = result[index] === Math.max(0, Math.min(100, requested));
          const validRange = result.every((n) => Number.isInteger(n) && n >= 0 && n <= 100);
          if (!validTotal || !validValue || !validRange)
            throw new Error(`Allocation failed for ${shares} at column ${index}, value ${requested}. Result: ${result}.`);
        }
      }
    }
  }
});

test('eight-scene story is playable by its interactions and remembers progress on return', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(relativeURL);
  await page.getByRole('button', { name: 'Начать выступление' }).click();
  await expect(page.getByLabel('Таймер выступления')).toContainText('/ 7:00');
  await mouseDrag(page, page.getByRole('button', { name: 'Смысл', exact: true }), await locationOf(page.locator('.chaos-board')));
  await expect(region(page).locator('h1')).toContainText('Сила инфографики');
  await page.getByRole('button', { name: 'Открыть сеть' }).click();

  await atScene(page, 2);
  await page.getByRole('button', { name: 'Приблизить' }).click();
  await page.getByRole('button', { name: 'Приблизить' }).click();
  await expect(page.locator('.map-space')).toHaveClass(/show-leaves/);
  await page.getByRole('button', { name: 'Общий вид' }).click();
  await page.getByRole('button', { name: 'Внимание', exact: true }).click();
  await expect(page.locator('.map-caption')).toContainText('Контраст');
  await page.getByRole('button', { name: 'Понимание', exact: true }).click();

  await atScene(page, 3);
  const text = region(page).getByRole('slider', { name: 'Текст' });
  await expect(text).toHaveAttribute('aria-valuenow', '35');
  await text.press('ArrowUp');
  await expect(text).toHaveAttribute('aria-valuenow', '37');
  await page.keyboard.press('ArrowLeft');
  await atScene(page, 3);
  await jump(page, 2);
  await jump(page, 3);
  await expect(region(page).getByRole('slider', { name: 'Текст' })).toHaveAttribute('aria-valuenow', '35');
  await region(page).getByRole('slider', { name: 'Текст' }).press('ArrowUp');
  await page.locator('#home').click();
  await jump(page, 3);
  await expect(region(page).getByRole('slider', { name: 'Текст' })).toHaveAttribute('aria-valuenow', '37');
  await page.getByRole('button', { name: 'Поднять правую колонку до потолка' }).click();
  await expect(region(page).getByRole('slider', { name: 'Свободное пространство' })).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Пройти сквозь потолок' }).click();

  await atScene(page, 4);
  await page.getByRole('button', { name: 'Осветить дерево' }).click();
  await expect(page.locator('.idea-window')).toHaveAttribute('data-step', '3');
  await page.getByRole('button', { name: 'Сохранить образы' }).click();

  await atScene(page, 5);
  await page.getByRole('button', { name: 'Рост' }).click();
  await page.getByRole('button', { name: 'Развилка' }).click();
  await expect(page.locator('[data-pair-feedback]')).toContainText('не образуют пару');
  for (const [word, image] of [['Рост', 'Восходящая линия'], ['Связь', 'Соединённые узлы'], ['Выбор', 'Развилка'], ['Память', 'Сеть связанных образов']]) {
    await page.getByRole('button', { name: word, exact: true }).click();
    await page.getByRole('button', { name: image, exact: true }).click();
  }
  await expect(page.locator('.memory-thread .linked')).toHaveCount(4);
  await page.getByRole('button', { name: 'Вытянуть линию в ось' }).click();

  await atScene(page, 6);
  await expect(page.locator('[data-scale]')).toHaveText('65');
  const before = Number(await page.locator('#plot-right [data-bar="0"]').getAttribute('height'));
  await page.getByRole('button', { name: 'Линза', exact: true }).click();
  await expect(page.locator('.lens-visual')).toBeVisible();
  await page.getByRole('button', { name: 'Начать шкалу с нуля' }).click();
  await expect(page.locator('[data-scale]')).toHaveText('0');
  expect(Number(await page.locator('#plot-right [data-bar="0"]').getAttribute('height'))).toBeGreaterThan(before);
  await expect(page.locator('#plot-right [data-value="0"]')).toHaveText('68');
  await expect(page.locator('#plot-right [data-value="1"]')).toHaveText('74');
  await page.getByRole('button', { name: 'Собрать главную мысль' }).click();

  await atScene(page, 7);
  for (const button of await page.locator('.trace-point').all()) await button.click();
  await page.getByRole('button', { name: 'Следовать за песком' }).click();

  await atScene(page, 8);
  await page.getByRole('button', { name: 'Сметать по строкам' }).click();
  await expect(page.getByText('Спасибо за внимание!')).toBeVisible();
  await page.getByRole('button', { name: 'Повторить финал' }).click();
  await expect(page.getByText('Спасибо за внимание!')).toBeHidden();
  const window = await page.context().newPage();
  await window.goto(relativeURL + '?mode=notes');
  await expect(window.getByRole('heading', { name: 'Финал с веником и песком' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(window.getByRole('heading', { name: 'Сборка главной мысли' })).toBeVisible();
  await window.close();
  await page.keyboard.press('m');
  await expect(page.getByRole('button', { name: 'Выключить звук' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('touch tablet supports pinch, all drags, connecting, and a local sand mask', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 720 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await page.goto(new URL(relativeURL, baseURL).href);
    await page.evaluate(() => document.fonts.ready);
    const cdp = await context.newCDPSession(page);

    await touchPath(cdp, [await locationOf(page.locator('.sense-token')), await locationOf(page.locator('.chaos-board'))]);
    await page.getByRole('button', { name: 'Открыть сеть' }).click();
    await atScene(page, 2);
    const middle = await locationOf(page.locator('.map-board'));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...coords(middle.x - 56, middle.y), id: 1 }, { ...coords(middle.x + 56, middle.y), id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...coords(middle.x - 100, middle.y - 5), id: 1 }, { ...coords(middle.x + 100, middle.y + 5), id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.map-space')).toHaveClass(/show-leaves/);
    await page.getByRole('button', { name: 'Общий вид' }).click();
    await page.getByRole('button', { name: 'Понимание', exact: true }).tap();

    await atScene(page, 3);
    const text = page.getByRole('slider', { name: 'Текст' });
    const from = await locationOf(text);
    await touchPath(cdp, [from, coords(from.x, from.y - 75)]);
    expect(Number(await text.getAttribute('aria-valuenow'))).toBeGreaterThan(35);
    await page.getByRole('button', { name: 'Поднять правую колонку до потолка' }).click();
    await expect(page.getByRole('slider', { name: 'Свободное пространство' })).toHaveAttribute('aria-valuenow', '100');
    const right = await locationOf(page.getByRole('slider', { name: 'Свободное пространство' }));
    await touchPath(cdp, [right, coords(right.x, right.y - 145)]);
    await atScene(page, 4);
    await touchPath(cdp, [await locationOf(page.locator('.spot-handle')), await locationOf(page.locator('[data-light="2"]'))]);
    await expect(page.locator('[data-focus-title]')).toHaveText('Дерево идей');
    await page.getByRole('button', { name: 'Сохранить образы' }).click();

    await atScene(page, 5);
    await touchPath(cdp, [await locationOf(page.locator('[data-word="0"]')), await locationOf(page.locator('[data-image="0"]'))]);
    await expect(page.locator('.memory-thread .linked')).toHaveCount(1);
    for (const i of [1, 2, 3]) {
      await page.locator(`[data-word="${i}"]`).click();
      await page.locator(`[data-image="${i}"]`).click();
    }
    await page.getByRole('button', { name: 'Вытянуть линию в ось' }).click();

    await atScene(page, 6);
    const origin = await locationOf(page.locator('.axis-handle'));
    await touchPath(cdp, [origin, coords(origin.x, origin.y + 95)]);
    await expect(page.locator('[data-scale]')).toHaveText('0');
    await page.getByRole('button', { name: 'Линза', exact: true }).click();
    const plot = page.locator('.chart-adjust .plot-surface');
    await touchPath(cdp, [await locationOf(plot, .4, .4), await locationOf(plot, .7, .62)]);
    expect(Number(await page.locator('[data-lens-rim]').getAttribute('cx'))).toBeGreaterThan(210);
    await page.getByRole('button', { name: 'Собрать главную мысль' }).click();

    await atScene(page, 7);
    const nodes = page.locator('.trace-point');
    await touchPath(cdp, await Promise.all((await nodes.all()).map((node) => locationOf(node))));
    await page.getByRole('button', { name: 'Следовать за песком' }).click();

    await atScene(page, 8);
    const alpha = () => page.locator('.sand-mask').evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d')!;
      return [ctx.getImageData(300, 145, 1, 1).data[3], ctx.getImageData(750, 65, 1, 1).data[3]];
    });
    expect(await alpha()).toEqual([255, 255]);
    const board = page.locator('.sand-board');
    await touchPath(cdp, [await locationOf(page.locator('.broom')), await locationOf(board, .3, .337)]);
    expect(await alpha()).toEqual([0, 255]);
    await jump(page, 7);
    await jump(page, 8);
    expect(await alpha()).toEqual([0, 255]);
    await page.getByRole('button', { name: 'Сметать по строкам' }).click();
    await expect(page.getByText('Спасибо за внимание!')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('the second PWA reopens all eight scenes with resources and notes offline', async ({ page, context, baseURL }) => {
  const url = new URL(relativeURL, baseURL).href;
  await page.goto(url);
  await expect(page.locator('#offline-status')).toHaveText('Готово офлайн');
  await page.close();
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto(url);
  for (let scene = 1; scene <= 8; scene++) await jump(reopened, scene);
  expect(await reopened.evaluate(() => document.fonts.ready.then(() => document.fonts.check('400 24px Prata', 'Смысл')))).toBe(true);
  await reopened.getByRole('button', { name: 'Сметать по строкам' }).click();
  await expect(reopened.getByText('Спасибо за внимание!')).toBeVisible();
  const notes = await context.newPage();
  await notes.goto(url + '?mode=notes');
  await expect(notes.getByRole('heading', { name: 'Финал с веником и песком' })).toBeVisible();
});
