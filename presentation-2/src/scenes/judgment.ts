import { after, all, bind, clamp, drag, el, frame, point, scene } from './common';

const values = [68, 74];
const max = 80;

function plot(id: string, adjustable: boolean) {
  return `<div class="plot-wrap">
    <div class="plot-surface">
      <svg class="plot-svg" viewBox="0 0 350 235" aria-hidden="true">
        ${adjustable ? '<defs><clipPath id="lens-clip"><circle data-lens-cut cx="180" cy="100" r="35"/></clipPath></defs>' : ''}
        <g id="${id}" class="plot-content"><g data-grid></g><path class="plot-axis" d="M49 26v172h278"/>
          ${values.map((value, i) => `<rect class="plot-bar plot-${i}" data-bar="${i}" x="${91 + 112 * i}" width="68" rx="5"/>
            <text class="plot-value" data-value="${i}" x="${125 + 112 * i}">${value}</text>
            <text class="plot-name" x="${125 + 112 * i}" y="220">${i ? 'Б' : 'А'}</text>`).join('')}
          ${adjustable ? '<g class="overlay-bars" hidden></g>' : ''}
          <text class="plot-unit" x="50" y="17">усл. ед.</text><text class="plot-unit" x="327" y="17" text-anchor="end">Условные данные</text>
        </g>
        ${adjustable ? '<g class="lens-visual" hidden><g clip-path="url(#lens-clip)"><rect width="350" height="235" fill="#f7f4ec"/><use href="#plot-right" data-lens-use/></g><circle data-lens-rim cx="180" cy="100" r="35"/></g>' : ''}
      </svg>
    </div>
    ${adjustable ? '<button class="axis-handle" type="button" aria-label="Перетащить начало шкалы"><span aria-hidden="true">↕</span> <b data-bound></b></button>' : ''}
  </div>`;
}
export const judgment = scene(() => ({ min: 65, mode: 'cut', lens: false, x: 180, y: 94 }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'judgment', label: '06 / 08 · Суждение', title: 'Одни и те же <em>данные</em>',
    copy: 'Сравните столбцы. Потяните начало правой шкалы вниз и проверьте, что изменилось.',
    body: `<div class="comparison">
      <figure class="chart-figure"><figcaption><b>От нуля</b><span>А = 68 · Б = 74</span></figcaption>${plot('plot-left', false)}</figure>
      <figure class="chart-figure chart-adjust"><figcaption><b><span data-scale-title>Начало шкалы</span> <output data-scale></output></b><span>А = 68 · Б = 74</span></figcaption>${plot('plot-right', true)}</figure>
    </div>
    <div class="axis-tools">
      <div class="scale-modes" role="group" aria-label="Представление шкалы">
        <button type="button" data-mode="zero">От нуля</button>
        <button type="button" data-mode="cut">Обрезанная</button>
        <button type="button" data-mode="overlay">Наложение</button>
      </div>
      <label>Начало правой шкалы <input type="range" min="0" max="65" data-axis-slider></label>
      <button type="button" class="soft" data-lens aria-pressed="false">Линза</button>
      <p class="data-note">Условные данные · единицы указаны на осях</p>
    </div>
    <p class="axis-insight" aria-live="polite">Разница между А и Б составляет 6 условных единиц.</p>`,
    actions: '<button type="button" class="soft" data-zero>Начать шкалу с нуля</button><button type="button" class="primary" data-collect hidden>Собрать главную мысль</button>',
  });
  const right = el(stage, '.chart-adjust');
  const slider = el<HTMLInputElement>(stage, '[data-axis-slider]');
  const chart = el(right, '.plot-surface');
  const lens = el<SVGGElement>(right, '.lens-visual');
  const lensToggle = el(stage, '[data-lens]');
  const handle = el<HTMLButtonElement>(right, '.axis-handle');
  let originY = 0;
  let originMin = state.min;

  function drawChart(container: Element, min: number) {
    const y = (value: number) => 198 - (value - min) * 172 / (max - min);
    const ticks = [min, ...[10, 20, 30, 40, 50, 60, 70, 80].filter((value) => value > min + 3)];
    el(container, '[data-grid]').innerHTML = ticks.map((value) =>
      `<path d="M49 ${y(value)}h278"/><text x="39" y="${y(value) + 4}">${value}</text>`,
    ).join('');
    for (const [index, value] of values.entries()) {
      const top = y(value);
      const bar = el(container, `[data-bar="${index}"]`);
      bar.setAttribute('y', String(top));
      bar.setAttribute('height', String(198 - top));
      el(container, `[data-value="${index}"]`).setAttribute('y', String(top - 8));
    }
  }
  function drawLens() {
    lens.style.display = state.lens ? '' : 'none';
    lensToggle.setAttribute('aria-pressed', String(state.lens));
    chart.classList.toggle('lens-on', state.lens);
    for (const selector of ['[data-lens-cut]', '[data-lens-rim]']) {
      const circle = el(right, selector);
      circle.setAttribute('cx', String(state.x));
      circle.setAttribute('cy', String(state.y));
    }
    el(right, '[data-lens-use]').setAttribute('transform', `translate(${state.x} ${state.y}) scale(1.4) translate(${-state.x} ${-state.y})`);
  }
  function render() {
    slider.value = String(state.min);
    el(right, '[data-bound]').textContent = String(state.min);
    el(right, '[data-scale]').textContent = String(state.min);
    el(right, '[data-scale-title]').textContent = state.mode === 'overlay' ? 'Наложение · начало' : 'Начало шкалы';
    const overlay = el(right, '.overlay-bars');
    if (state.mode === 'overlay') {
      overlay.removeAttribute('hidden');
      overlay.innerHTML = values.map((value, i) => {
        const height = (value - 65) * 172 / (80 - 65);
        return `<rect x="${86 + 112 * i}" y="${198 - height}" width="78" height="${height}" rx="4"/>`;
      }).join('');
    } else overlay.setAttribute('hidden', '');
    for (const button of all(stage, '[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    el(stage, '.axis-insight').textContent = state.min === 0 ? (state.mode === 'overlay' ? 'Одна информация. Разное впечатление. Контур показывает высоту при обрезанной шкале.' : 'Одна информация. Разное впечатление.') : 'Разница между А и Б составляет 6 условных единиц.';
    el(stage, '[data-zero]').hidden = state.min === 0;
    el(stage, '[data-collect]').hidden = state.min !== 0;
    drawChart(right, state.min);
  }
  function setMin(value: number, mode?: string) {
    const previous = state.min;
    state.min = clamp(Math.round(value), 0, 65);
    state.mode = mode ?? (state.min === 0 ? 'zero' : 'cut');
    if (state.min === 0 && previous !== 0) sound('complete');
    render();
  }
  drag(handle, signal, {
    start(event) { originY = event.clientY; originMin = state.min; },
    move(event) { setMin(originMin - (event.clientY - originY) * 65 / Math.max(55, chart.clientHeight * .31)); },
  });
  handle.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setMin(event.key === 'Home' ? 0 : event.key === 'End' ? 65 : state.min + (event.key === 'ArrowDown' ? -5 : 5));
  }, { signal });
  slider.addEventListener('input', () => setMin(slider.valueAsNumber), { signal });
  function moveLens(event: PointerEvent) {
    if (!state.lens) return;
    const { x, y } = point(event, chart);
    state.x = clamp(x, .06, .94) * 350;
    state.y = clamp(y, .06, .94) * 235;
    drawLens();
  }
  drag(chart, signal, { start: moveLens, move: moveLens });
  chart.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') moveLens(event); }, { signal });
  lens.removeAttribute('hidden');
  bind(stage, '[data-lens]', () => { state.lens = !state.lens; drawLens(); }, signal);
  for (const button of all(stage, '[data-mode]')) button.addEventListener('click', () => setMin(button.dataset.mode === 'cut' ? 65 : 0, button.dataset.mode), { signal });
  bind(stage, '[data-zero]', () => setMin(0), signal);
  bind(stage, '[data-collect]', () => {
    if (stage.classList.contains('axis-leaving')) return;
    stage.classList.add('axis-leaving');
    after(signal, next, 80);
  }, signal);
  drawChart(el(stage, '.chart-figure'), 0);
  render();
  drawLens();
});
