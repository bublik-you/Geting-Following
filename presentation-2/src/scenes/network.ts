import { grouping, groupsMarkup } from './grouping';
import { after, all, bind, clamp, el, frame, scene } from './common';

const branches = [
  { name: 'Внимание', x: 25, y: 30, leaves: ['Контраст', 'Акцент'], copy: 'Контраст и сигналы помогают увидеть, с чего начать чтение.' },
  { name: 'Понимание', x: 76, y: 30, leaves: ['Сравнение', 'Масштаб'], copy: 'Общая шкала и видимые связи помогают сравнить значения.' },
  { name: 'Память', x: 25, y: 72, leaves: ['Связь', 'Узнавание'], copy: 'Связанные подписи и образы дают больше способов вспомнить материал.' },
  { name: 'Суждение', x: 76, y: 72, leaves: ['Контекст', 'Точность'], copy: 'Одна и та же величина может выглядеть иначе при смене масштаба.' },
];
const leafPoints = [[[12, 16], [14, 42]], [[88, 16], [89, 42]], [[13, 59], [12, 86]], [[88, 60], [89, 86]]];

export const network = scene(() => ({ scale: 1, x: 0, y: 0, picked: -1, grouped: new Set<number>() }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'network', label: '02 / 08 · Структура', title: 'Найти <em>связь</em>',
    copy: 'Потяните схему или приблизьте двумя пальцами. Выберите ветвь, чтобы раскрыть детали.',
    body: `<div class="map-board"><div class="map-space"><div class="map-quadrants" aria-hidden="true"></div>
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${branches.map(({ x, y }, i) => `<path class="branch-link line-${i}" d="M50 50Q${x} 50 ${x} ${y}"/>
          ${leafPoints[i].map(([dx, dy]) => `<path class="map-detail" d="M${x} ${y}Q${dx} ${y} ${dx} ${dy}"/>`).join('')}`).join('')}
        <path class="axis-morph" d="M10 16V86H92M24 24V86m25-62v62m25-62v62"/>
      </svg>
      <div class="map-root" style="--x:50%;--y:50%">Визуальная<br>коммуникация</div>
      ${branches.map(({ name, x, y, leaves }, i) => `<button type="button" class="map-node ${i === 1 ? 'understanding' : ''}" data-branch="${i}" style="--x:${x}%;--y:${y}%">${name}</button>
        ${leaves.map((leaf, j) => `<button type="button" class="map-leaf map-detail" data-leaf="${i}" style="--x:${leafPoints[i][j][0]}%;--y:${leafPoints[i][j][1]}%">${leaf}</button>`).join('')}`).join('')}
    </div><div class="map-controls" aria-label="Масштаб схемы"><button data-zoom-in aria-label="Приблизить">+</button><button data-zoom-out aria-label="Отдалить">−</button><button data-reset-map aria-label="Общий вид">⟲</button></div></div>
    <div class="map-caption"><span aria-hidden="true"></span><p aria-live="polite"></p><button class="soft" type="button" data-enter>Увидеть закономерности</button><button class="soft" type="button" data-groups>Группировка</button></div>${groupsMarkup}`,
  });
  const board = el(stage, '.map-board');
  const space = el(board, '.map-space');
  const caption = el(stage, '.map-caption p');
  const pointers = new Map<number, { x: number; y: number }>();
  grouping(stage, signal, state.grouped, sound);
  const links = all<SVGPathElement>(space, '.branch-link');
  let movement = 0;
  let pinching = false;
  let leaving = false;
  function draw() {
    space.style.transform = `translate(${state.x}px,${state.y}px) scale(${state.scale})`;
    space.classList.toggle('show-leaves', state.scale > 1.23);
    caption.textContent = branches[state.picked]?.copy ?? 'Нажмите «Понимание», чтобы увидеть закономерности.';
    for (const [i, button] of all(board, '[data-branch]').entries()) {
      button.setAttribute('aria-pressed', String(i === state.picked));
      const { x, y } = branches[i];
      links[i].setAttribute('d', `M50 50Q${x} ${state.picked === i ? y + 8 : 50} ${x} ${y}`);
    }
  }
  function zoomAt(scale: number, x: number, y: number) {
    const rect = board.getBoundingClientRect();
    const nextScale = clamp(scale, .78, 2.6);
    const proportion = nextScale / state.scale;
    const cx = x - rect.left - rect.width / 2;
    const cy = y - rect.top - rect.height / 2;
    state.x = clamp(cx + (state.x - cx) * proportion, -rect.width * .8, rect.width * .8);
    state.y = clamp(cy + (state.y - cy) * proportion, -rect.height * .85, rect.height * .85);
    state.scale = nextScale;
    draw();
  }
  function zoomBy(factor: number) {
    const rect = board.getBoundingClientRect();
    zoomAt(state.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  function enter() {
    if (leaving) return;
    leaving = true;
    sound('complete');
    stage.classList.add('map-leaving');
    state.picked = 1;
    after(signal, next, 180);
  }
  for (const button of all<HTMLButtonElement>(board, '[data-branch], [data-leaf]')) {
    button.addEventListener('click', () => {
      const branch = Number(button.dataset.branch ?? button.dataset.leaf);
      if (branch === 1 && button.dataset.branch) { enter(); return; }
      state.picked = branch;
      sound();
      draw();
    }, { signal });
  }
  bind(board, '[data-zoom-in]', () => zoomBy(1.2), signal);
  bind(board, '[data-zoom-out]', () => zoomBy(1 / 1.2), signal);
  bind(board, '[data-reset-map]', () => { state.scale = 1; state.x = state.y = 0; draw(); }, signal);
  bind(stage, '[data-enter]', enter, signal);
  board.addEventListener('wheel', (event) => {
    if (leaving) return;
    event.preventDefault();
    zoomAt(state.scale * Math.exp(-event.deltaY * .002), event.clientX, event.clientY);
  }, { signal, passive: false });
  board.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (event.target as Element).closest('.map-controls') || leaving) return;
    if (event.isPrimary || !pointers.size) { pointers.clear(); movement = 0; pinching = false; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) pinching = true;
  }, { signal });
  board.addEventListener('pointermove', (event) => {
    const old = pointers.get(event.pointerId);
    if (!old || leaving) return;
    const updated = { x: event.clientX, y: event.clientY };
    const dx = updated.x - old.x;
    const dy = updated.y - old.y;
    movement += Math.hypot(dx, dy);
    if (movement > 5 || pinching) {
      if (!board.hasPointerCapture(event.pointerId)) board.setPointerCapture(event.pointerId);
      const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.max(15, Math.hypot(old.x - other.x, old.y - other.y));
        const distance = Math.max(15, Math.hypot(updated.x - other.x, updated.y - other.y));
        state.x += dx / 2;
        state.y += dy / 2;
        zoomAt(state.scale * distance / before, (updated.x + other.x) / 2, (updated.y + other.y) / 2);
      } else {
        const rect = board.getBoundingClientRect();
        state.x = clamp(state.x + dx, -rect.width * .8, rect.width * .8);
        state.y = clamp(state.y + dy, -rect.height * .85, rect.height * .85);
        draw();
      }
    }
    pointers.set(event.pointerId, updated);
  }, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'] as const)
    board.addEventListener(name, (event) => {
      if (name === 'lostpointercapture' && event.target !== board) return;
      if (name !== 'pointerleave' || !board.hasPointerCapture(event.pointerId)) pointers.delete(event.pointerId);
    }, { signal });
  board.addEventListener('click', (event) => {
    if (event.detail && (movement > 5 || pinching) && !(event.target as Element).closest('.map-controls')) {
      event.stopImmediatePropagation();
    }
  }, { capture: true, signal });
  draw();
});
