import { after, all, bind, clamp, drag, el, frame, point, scene } from './common';

const objects = [
  { title: 'Заголовок', note: 'Заголовок задаёт вопрос, с которым зритель читает остальное.', art: '<strong>Как растёт идея?</strong>' },
  { title: 'Текст', note: 'Короткое пояснение уточняет связь и даёт зрителю время её прочитать.', art: '<div class="light-text">От одного наблюдения к нескольким выводам.<i></i><i></i></div>' },
  { title: 'Дерево идей', note: 'Порядок появления ветвей превращает схему в небольшой рассказ.', art: '<svg viewBox="0 0 124 75" aria-hidden="true"><path d="M62 62V34m0 8L31 21m31 16L95 14" fill="none" stroke="#8ed9c2" stroke-width="3"/><rect x="52" y="52" width="20" height="14" rx="3" fill="#e9c58a"/><circle cx="31" cy="21" r="9" fill="#8ed9c2"/><circle cx="95" cy="14" r="8" fill="#f09573"/></svg>' },
  { title: 'Диаграмма', note: 'Если сначала выделить диаграмму, сравнение становится текущей задачей зрителя.', art: '<div class="light-chart" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' },
  { title: 'Вывод', note: 'Последний акцент связывает увиденное с основной мыслью выступления.', art: '<strong>Связи важнее деталей.</strong>' },
];
const route = [[140, 108], [96, 65], [180, 43], [226, 75]];

export const attention = scene(() => ({ selected: -1, x: .49, y: .14, played: false, step: 0 }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'attention', label: '04 / 08 · Внимание', title: 'Куда направить <em>свет?</em>',
    copy: 'Передвигайте прожектор или нажимайте на объекты. Осветите дерево, чтобы увидеть мини-презентацию.', dark: true,
    body: `<div class="exhibition" data-lit="false">
      <div class="light-haze" aria-hidden="true"></div>
      <div class="light-objects">${objects.map(({ title, art }, i) => `<button class="light-object light-${i}" data-light="${i}" type="button"><span>${title}</span>${art}</button>`).join('')}</div>
      <button type="button" class="spot-handle" aria-label="Прожектор" title="Перетащите прожектор"><span aria-hidden="true">✧</span></button>
    </div>
    <div class="attention-detail">
      <div><span class="micro-label">В фокусе</span><h2 data-focus-title>Весь зал</h2><p data-focus-copy aria-live="polite">Пять объектов одновременно претендуют на внимание.</p></div>
      <div class="idea-window" hidden>
        <svg viewBox="0 0 280 138" aria-label="Пиксельный персонаж следует между ветвями">
          <path class="idea-land" d="M0 117h280v21H0zM2 116l19-18 16 10 20-13 15 21zm192 0 29-12 13 8 13-7 19 11z"/>
          <g class="idea-camera">
            <path class="idea-route" d="M140 108V87L96 65m44 22 40-44m-40 44 86-12"/>
            <g class="idea-bud bud-1"><rect x="78" y="55" width="34" height="19" rx="5"/><text x="95" y="68">Факт</text></g>
            <g class="idea-bud bud-2"><rect x="157" y="32" width="47" height="19" rx="5"/><text x="180" y="45">Связь</text></g>
            <g class="idea-bud bud-3"><rect x="201" y="67" width="52" height="19" rx="5"/><text x="227" y="80">Вывод</text></g>
            <g class="idea-avatar" shape-rendering="crispEdges">
              <path fill="#121f2f" d="M-9-26H9v10h3v12h-5v5h-6v-4h-3v4h-6v-5h-5v-12h4z"/>
              <path fill="#e9c58a" d="M-7-25H7v12H-7z"/><path fill="#f7f4ec" d="M-6-20H6v7H-6z"/>
              <path fill="#217b80" d="M-8-12H8v9H-8z"/><path fill="#8ed9c2" d="M2-9h4v3H2z"/>
              <path fill="#172333" d="M-4-18h2v2h-2zm6 0h2v2H2z"/>
            </g>
          </g>
        </svg>
        <button type="button" data-play-story>Повторить маршрут</button>
      </div>
    </div>`,
    actions: '<button type="button" class="soft" data-tree>Осветить дерево</button><button type="button" class="primary" data-dissolve hidden>Сохранить образы</button>',
  });
  const board = el(stage, '.exhibition');
  const lamp = el<HTMLButtonElement>(board, '.spot-handle');
  const items = all<HTMLButtonElement>(board, '[data-light]');
  const narrative = el(stage, '.idea-window');
  const avatar = el<SVGGElement>(narrative, '.idea-avatar');
  let run = 0;

  function plotStep(step: number) {
    state.step = step;
    const [x, y] = route[step];
    narrative.dataset.step = String(step);
    avatar.style.transform = `translate(${x}px,${y}px)`;
  }
  function play() {
    const playId = ++run;
    plotStep(0);
    for (const [step, delay] of [0, 670, 1400, 2200].entries()) {
      if (!step) continue;
      after(signal, () => { if (run === playId) plotStep(step); }, delay);
    }
    state.played = true;
  }
  function place(x: number, y: number) {
    state.x = clamp(x, .04, .96);
    state.y = clamp(y, .07, .94);
    board.style.setProperty('--beam-x', `${100 * state.x}%`);
    board.style.setProperty('--beam-y', `${100 * state.y}%`);
  }
  function select(index: number, moveLamp = true, playSound = true) {
    const previous = state.selected;
    state.selected = index;
    board.dataset.lit = 'true';
    items.forEach((item, i) => { item.setAttribute('aria-pressed', String(index === i)); });
    const object = objects[index];
    el(stage, '[data-focus-title]').textContent = object.title;
    el(stage, '[data-focus-copy]').textContent = object.note;
    if (moveLamp) {
      const rect = board.getBoundingClientRect();
      const target = items[index].getBoundingClientRect();
      place((target.left - rect.left + target.width / 2) / rect.width, (target.top - rect.top + target.height / 2) / rect.height);
    }
    if (index === 2) {
      narrative.hidden = false;
      el(stage, '[data-dissolve]').hidden = false;
      if (playSound && (!state.played || previous !== index)) play();
    }
    if (playSound && previous !== index) sound();
  }

  for (const [i, item] of items.entries()) item.addEventListener('click', () => select(i), { signal });
  drag(lamp, signal, {
    move(event) {
      const { x, y } = point(event, board);
      place(x, y);
      const hit = items.findIndex((item) => {
        const rect = item.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (hit >= 0 && hit !== state.selected) select(hit, false);
    },
  });
  lamp.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    select((Math.max(0, state.selected) + direction + items.length) % items.length);
  }, { signal });
  bind(stage, '[data-tree]', () => select(2), signal);
  bind(stage, '[data-play-story]', play, signal);
  bind(stage, '[data-dissolve]', () => {
    if (stage.classList.contains('dissolving')) return;
    stage.classList.add('dissolving');
    sound('complete');
    after(signal, next, 640);
  }, signal);
  place(state.x, state.y);
  plotStep(state.step);
  if (state.played) { narrative.hidden = false; el(stage, '[data-dissolve]').hidden = false; }
  if (state.selected >= 0) select(state.selected, false, false);
});
