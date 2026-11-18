import { after, all, bind, clamp, drag, el, frame, reducedMotion, scene } from './common';

export type Shares = [number, number, number];

export function redistribute(previous: Shares, index: number, requested: number): Shares {
  const value = clamp(Math.round(requested), 0, 100);
  const remaining = 100 - value;
  const other = [0, 1, 2].filter((i) => i !== index);
  const subtotal = previous[other[0]] + previous[other[1]];
  const first = Math.round(remaining * (subtotal === 0 ? .5 : previous[other[0]] / subtotal));
  const next: Shares = [0, 0, 0];
  next[index] = value;
  next[other[0]] = first;
  next[other[1]] = remaining - first;
  return next;
}

const names = ['Текст', 'Графика', 'Свободное пространство'];
const glyphs = [
  '<path d="M5 7h14M5 12h10M5 17h14"/>',
  '<path d="M4 19h16M6 16l5-7 4 4 4-8"/><circle cx="19" cy="5" r="1.5"/>',
  '<path d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/>',
];

export const layout = scene(() => ({ shares: [35, 40, 25] as Shares, headline: 46 }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'layout', label: '03 / 08 · Понимание', title: 'Площадь <em>одна на всех</em>',
    copy: 'Тяните любую колонку. Сумма долей всегда остаётся 100%.',
    body: `<div class="layout-experiment">
      <div class="column-lab" data-break="ready">
        <div class="ceiling" aria-hidden="true"><div></div><div class="wall-debris">${Array.from({length: 9}, (_, i) => `<i class="wall-chip" style="--i:${i};--dx:${i * 19 - 78}px;--dy:${-20 - i * 7 % 42}px;--rot:${i * 17 - 70}deg"></i>`).join('')}</div><svg viewBox="0 0 90 42"><path d="m44 3-9 13 10 8-6 11m7-11 20 3 12 11M35 16l-18-2-12 8m39-19 18 9"/></svg></div>
        <div class="columns">
          <svg class="tethers" aria-hidden="true"><path/><path/></svg>
          ${names.map((name, i) => `<div class="column">
            <div class="column-track"><button type="button" class="column-bar bar-${i}" role="slider" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-orientation="vertical" data-col="${i}"><span class="column-number"></span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${glyphs[i]}</svg></button></div>
            <span class="column-name">${name}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="layout-preview">
        <p class="micro-label">Макет экрана</p>
        <div class="slide-mock" aria-label="Пропорциональный макет">
          <div class="mock-text"><strong>Главная мысль</strong><i></i><i></i><i></i></div>
          <div class="mock-image"><svg viewBox="0 0 90 100" preserveAspectRatio="none" aria-hidden="true"><circle cx="64" cy="30" r="13"/><path d="m0 95 30-51 20 25 15-14 25 40z"/></svg></div>
          <div class="mock-space"></div>
        </div>
        <div class="layout-total"><span>Всего</span><output data-total>100%</output></div>
        <label class="micro-range">Размер заголовка <input type="range" min="24" max="82" aria-label="Размер заголовка"></label><p class="data-note">Условная модель экрана.</p>
      </div>
    </div>`,
    actions: '<button class="soft" type="button" data-ceiling>Поднять правую колонку до потолка</button><button class="primary" type="button" data-break-wall hidden>Пройти сквозь потолок</button><span class="wall-status" aria-live="polite"></span>',
  });
  const bars = all<HTMLButtonElement>(stage, '[data-col]');
  const lab = el(stage, '.column-lab');
  const slide = el(stage, '.slide-mock');
  const ceiling = el<HTMLButtonElement>(stage, '[data-ceiling]');
  const breakWall = el<HTMLButtonElement>(stage, '[data-break-wall]');
  const tracks = bars.map((bar) => bar.parentElement!);
  const paths = all<SVGPathElement>(stage, '.tethers path');
  const plot = el(stage, '.columns');
  const headline = el<HTMLInputElement>(stage, 'input[type=range]');
  const wallStatus = el(stage, '.wall-status');
  let leaving = false;
  let activeColumn = -1;
  let armed = false;
  let tension = 0;
  let frameId = 0;
  let lastFrame = 0;
  let tracksGeometry: { x: number; bottom: number; h: number }[] = [];
  const heights = [...state.shares];
  const velocity = [0, 0, 0];

  function readPlot() {
    const bounds = plot.getBoundingClientRect();
    tracksGeometry = tracks.map((track) => {
      const rect = track.getBoundingClientRect();
      return { x: rect.left - bounds.left + rect.width / 2, bottom: rect.bottom - bounds.top, h: rect.height };
    });
    drawShape();
  }
  function drawShape() {
    const points = tracksGeometry.map(({ x, bottom, h }, i) => {
      bars[i].style.setProperty('--share', `${heights[i]}%`);
      return { x, y: bottom - Math.max(42, h * heights[i] / 100) + 5 - (i === 2 ? tension * 29 : 0) };
    });
    paths.forEach((path, i) => {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) return;
      const middle = (a.x + b.x) / 2;
      const slack = activeColumn < 0 ? 12 : 6;
      path.setAttribute('d', `M${a.x} ${a.y}C${middle} ${a.y + slack} ${middle} ${b.y + slack} ${b.x} ${b.y}`);
    });
  }
  function tick(now: number) {
    const dt = Math.min(1.5, (now - lastFrame) / 16.7 || 1);
    lastFrame = now;
    let unsettled = false;
    for (const [i, target] of state.shares.entries()) {
      const distance = target - heights[i];
      velocity[i] = (velocity[i] + distance * (i === activeColumn ? .33 : .19) * dt) * Math.pow(.65, dt);
      if (Math.abs(distance) + Math.abs(velocity[i]) > .16) {
        heights[i] = clamp(heights[i] + velocity[i] * dt, 0, 100);
        unsettled = true;
      } else { heights[i] = target; velocity[i] = 0; }
    }
    drawShape();
    frameId = unsettled && !signal.aborted ? requestAnimationFrame(tick) : 0;
  }
  function updateShape() {
    if (reducedMotion()) {
      state.shares.forEach((share, i) => { heights[i] = share; });
      drawShape();
    } else if (!frameId) {
      lastFrame = performance.now();
      frameId = requestAnimationFrame(tick);
    }
  }
  const observer = new ResizeObserver(readPlot);
  observer.observe(plot);
  signal.addEventListener('abort', () => { observer.disconnect(); cancelAnimationFrame(frameId); }, { once: true });
  headline.value = String(state.headline);
  const setHeadline = () => slide.style.setProperty('--headline', `${state.headline / 46}`);
  headline.addEventListener('input', () => { state.headline = headline.valueAsNumber; setHeadline(); }, { signal });
  setHeadline();

  function render(over = 0) {
    for (const [index, bar] of bars.entries()) {
      const share = state.shares[index];

      el(bar, '.column-number').textContent = `${share}%`;
      bar.setAttribute('aria-valuenow', String(share));
      bar.setAttribute('aria-valuetext', `${share} процентов`);
      slide.style.setProperty(`--share-${index}`, `${share}%`);
    }
    const atCeiling = state.shares[2] === 100;
    tension = clamp(over / 24);
    lab.style.setProperty('--strain', String(tension));
    lab.classList.toggle('wall-stressed', atCeiling || over > 0);
    lab.classList.toggle('wall-cracked', over >= 7 || armed);
    lab.classList.toggle('wall-armed', armed);
    wallStatus.textContent = armed ? 'Отпустите колонку для перехода.' : over > 0 ? 'Потолок сопротивляется.' : '';
    updateShape();
    ceiling.hidden = atCeiling;
    breakWall.hidden = !atCeiling;
  }
  function breakThrough() {
    if (leaving || state.shares[2] !== 100) return;
    leaving = true;
    lab.dataset.break = 'broken';
    stage.classList.add('wall-break');
    sound('complete');
    wallStatus.textContent = '';
    after(signal, next, 260);
  }
  for (const [index, bar] of bars.entries()) {
    let startValue = 0;
    let startY = 0;
    let source = state.shares;
    let span = 1;
    drag(bar, signal, {
      start(event) {
        if (leaving || activeColumn >= 0) return;
        activeColumn = index;
        source = [...state.shares];
        startValue = source[index];
        startY = event.clientY;
        span = bar.parentElement!.getBoundingClientRect().height;
        lab.classList.add('dragging');
      },
      move(event) {
        if (leaving || activeColumn !== index) return;
        const requested = startValue + (startY - event.clientY) * 100 / span;
        const excess = index === 2 ? Math.max(0, requested - 100) : 0;
        state.shares = redistribute(source, index, requested);
        armed = excess >= 21;
        render(excess);
      },
      end(_event, cancelled) {
        if (activeColumn !== index) return;
        const releaseThroughWall = !cancelled && armed;
        activeColumn = -1;
        armed = false;
        lab.classList.remove('dragging');
        if (releaseThroughWall) breakThrough();
        else if (!leaving) render();
      },
    });
    bar.addEventListener('keydown', (event) => {
      if (leaving) return;
      const value = state.shares[index];
      const proposed: Record<string, number> = { ArrowUp: value + 2, ArrowDown: value - 2, ArrowLeft: value - 2, ArrowRight: value + 2, Home: 0, End: 100 };
      if (!(event.key in proposed)) return;
      event.preventDefault();
      state.shares = redistribute(state.shares, index, proposed[event.key]);
      render();
    }, { signal });
  }
  ceiling.addEventListener('click', () => {
    state.shares = redistribute(state.shares, 2, 100);
    sound();
    render(10);
    breakWall.focus();
  }, { signal });
  bind(stage, '[data-break-wall]', breakThrough, signal);
  readPlot();
  render();
});
