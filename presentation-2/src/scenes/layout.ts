import { after, all, bind, clamp, drag, el, frame, scene } from './common';

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

export const layout = scene(() => ({ shares: [35, 40, 25] as Shares }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'layout', label: '03 / 08 · Понимание', title: 'Площадь <em>одна на всех</em>',
    copy: 'Тяните любую колонку. Сумма долей всегда остаётся 100%.',
    body: `<div class="layout-experiment">
      <div class="column-lab" data-break="ready">
        <div class="ceiling" aria-hidden="true"><div></div><svg viewBox="0 0 90 42"><path d="m44 3-9 13 10 8-6 11m7-11 20 3 12 11M35 16l-18-2-12 8m39-19 18 9"/></svg></div>
        <div class="columns">
          ${names.map((name, i) => `<div class="column">
            <div class="column-track"><button type="button" class="column-bar bar-${i}" role="slider" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-orientation="vertical" data-col="${i}"><span class="column-number"></span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${glyphs[i]}</svg></button></div>
            <span class="column-name">${name}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="layout-preview">
        <p class="micro-label">Макет экрана</p>
        <div class="slide-mock" aria-label="Пропорциональный макет">
          <div class="mock-text"><i></i><i></i><i></i><i></i></div>
          <div class="mock-image"><svg viewBox="0 0 90 100" preserveAspectRatio="none" aria-hidden="true"><circle cx="64" cy="30" r="13"/><path d="m0 95 30-51 20 25 15-14 25 40z"/></svg></div>
          <div class="mock-space"></div>
        </div>
        <div class="layout-total"><span>Всего</span><output data-total>100%</output></div>
        <p class="data-note">Условная модель экрана.</p>
      </div>
    </div>`,
    actions: '<button class="soft" type="button" data-ceiling>Поднять правую колонку до потолка</button><button class="primary" type="button" data-break-wall hidden>Пройти сквозь потолок</button>',
  });
  const bars = all<HTMLButtonElement>(stage, '[data-col]');
  const lab = el(stage, '.column-lab');
  const slide = el(stage, '.slide-mock');
  const ceiling = el<HTMLButtonElement>(stage, '[data-ceiling]');
  const breakWall = el<HTMLButtonElement>(stage, '[data-break-wall]');
  let leaving = false;

  function render(over = 0) {
    for (const [index, bar] of bars.entries()) {
      const share = state.shares[index];
      bar.style.setProperty('--share', `${share}%`);
      el(bar, '.column-number').textContent = `${share}%`;
      bar.setAttribute('aria-valuenow', String(share));
      bar.setAttribute('aria-valuetext', `${share} процентов`);
      slide.style.setProperty(`--share-${index}`, `${share}%`);
    }
    const atCeiling = state.shares[2] === 100;
    lab.style.setProperty('--strain', String(clamp(over / 24)));
    lab.classList.toggle('wall-stressed', atCeiling || over > 0);
    ceiling.hidden = atCeiling;
    breakWall.hidden = !atCeiling;
  }
  function breakThrough() {
    if (leaving || state.shares[2] !== 100) return;
    leaving = true;
    lab.dataset.break = 'broken';
    stage.classList.add('wall-break');
    sound('complete');
    after(signal, next, 900);
  }
  for (const [index, bar] of bars.entries()) {
    let startValue = 0;
    let startY = 0;
    let source = state.shares;
    let span = 1;
    drag(bar, signal, {
      start(event) {
        if (leaving) return;
        source = [...state.shares];
        startValue = source[index];
        startY = event.clientY;
        span = bar.parentElement!.getBoundingClientRect().height;
        lab.classList.add('dragging');
      },
      move(event) {
        if (leaving) return;
        const requested = startValue + (startY - event.clientY) * 100 / span;
        const excess = index === 2 ? Math.max(0, requested - 100) : 0;
        state.shares = redistribute(source, index, requested);
        render(excess);
        if (excess >= 21) breakThrough();
      },
      end() { lab.classList.remove('dragging'); if (!leaving) render(); },
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
  render();
});
