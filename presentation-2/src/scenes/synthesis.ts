import { all, bind, clamp, drag, el, frame, point, scene } from './common';

const concepts = [
  { word: 'Внимание', x: 19, y: 38, verb: 'заметить' },
  { word: 'Понимание', x: 40, y: 70, verb: 'связать' },
  { word: 'Память', x: 63, y: 30, verb: 'вспомнить' },
  { word: 'Суждение', x: 82, y: 61, verb: 'оценить' },
];

const grains = Array.from({ length: 42 }, (_, i) => ({
  x: 39 + ((i * 13.31) % 23),
  y: 23 + ((i * 9.7) % 51),
  delay: (i % 14) * 42,
  drift: (i % 5 - 2) * 42,
  size: 2 + i % 4,
}));

export const synthesis = scene(() => ({ visited: [] as number[], track: [] as { x: number; y: number }[] }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'synthesis', label: '07 / 08 · Связи', title: 'Соберите <em>главную мысль</em>',
    copy: 'Проведите через четыре понятия. Можно также нажать на каждое по очереди.',
    body: `<div class="trace-board">
      <svg class="trace-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true"><path class="trace-guide" d="M190 163 400 301 630 129 820 262"/><polyline class="trace-user"/><polyline class="trace-linked"/></svg>
      ${concepts.map(({ word, x, y, verb }, index) => `<button type="button" class="trace-point" data-concept="${index}" style="--x:${x}%;--y:${y}%;--merge:${16 + index * 22.7}%"><i></i><b>${word}</b><small>${verb}</small></button>`).join('')}
      <div class="idea-dust" aria-hidden="true">${grains.map(({ x, y, delay, drift, size }) => `<i style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;--delay:${delay}ms;--drift:${drift}px"></i>`).join('')}</div>
    </div><p class="trace-status" aria-live="polite"></p>`,
    actions: '<button type="button" class="primary" data-sand-next hidden>Следовать за песком</button>',
  });
  const board = el(stage, '.trace-board');
  const nodes = all<HTMLButtonElement>(board, '.trace-point');
  const linked = el(board, '.trace-linked');
  const trail = el(board, '.trace-user');
  const status = el(stage, '.trace-status');
  let last: { x: number; y: number } | undefined;

  function render() {
    nodes.forEach((node, i) => node.setAttribute('aria-pressed', String(state.visited.includes(i))));
    linked.setAttribute('points', state.visited.map((i) => `${10 * concepts[i].x},${4.3 * concepts[i].y}`).join(' '));
    trail.setAttribute('points', state.track.map(({ x, y }) => `${x * 1000},${y * 430}`).join(' '));
    const done = state.visited.length === concepts.length;
    board.classList.toggle('connected', done);
    el(stage, '[data-sand-next]').hidden = !done;
    status.textContent = done ? 'Четыре понятия связаны.' : `Соединено ${state.visited.length} из четырёх`;
  }
  function visit(i: number) {
    if (i < 0 || state.visited.includes(i)) return;
    state.visited.push(i);
    sound(state.visited.length === concepts.length ? 'complete' : 'tap');
    render();
  }
  function trace(event: PointerEvent) {
    if (state.visited.length === concepts.length) return;
    const { x, y } = point(event, board);
    const p = { x: clamp(x), y: clamp(y) };
    state.track.push(p);
    if (state.track.length > 180) state.track.shift();
    const from = last ?? p;
    const distance = Math.hypot(p.x - from.x, p.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / .025));
    for (let step = 1; step <= steps; step++) {
      const px = from.x + (p.x - from.x) * step / steps;
      const py = from.y + (p.y - from.y) * step / steps;
      visit(concepts.findIndex(({ x, y }) => Math.abs(x / 100 - px) < .089 && Math.abs(y / 100 - py) < .13));
    }
    last = p;
    render();
  }
  drag(board, signal, {
    start(event) {
      if (state.visited.length === concepts.length) return;
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-concept]');
      if (button) visit(Number(button.dataset.concept));
      state.track = [];
      last = undefined;
      trace(event);
    },
    move: trace,
    end() { last = undefined; },
  });
  for (const [i, node] of nodes.entries()) node.addEventListener('click', () => visit(i), { signal });
  bind(stage, '[data-sand-next]', next, signal);
  render();
});
