import { all, bind, clamp, drag, el, frame, point, scene } from './common';

const fragments = [
  { at: [52, 77], to: [159, 139], angle: -11, markup: '<text class="fragment-number">72.8</text>' },
  { at: [222, 46], to: [305, 78], angle: 16, markup: '<text>масштаб</text>' },
  { at: [370, 77], to: [430, 119], angle: -8, markup: '<path d="M-22 12V-12M-22 12h64m-60-3 17-15 12 7 18-22"/>' },
  { at: [495, 138], to: [452, 194], angle: 13, markup: '<text class="fragment-number">4/8</text>' },
  { at: [160, 125], to: [162, 203], angle: -7, markup: '<path d="M-21 7h43m-43 7h32m-32 7h49"/><text x="-21">сравнение</text>' },
  { at: [354, 128], to: [305, 129], angle: 28, markup: '<path d="M-25 5h15m-4-8 12 8-12 8M14-10v32M2 5h27"/>' },
  { at: [77, 187], to: [129, 270], angle: 12, markup: '<text class="fragment-number">Δ</text>' },
  { at: [171, 218], to: [176, 315], angle: -18, markup: '<path d="M-23 19v-30m12 30V0m12 19v-36m12 36V-7m12 26v-42" stroke-width="5"/>' },
  { at: [415, 215], to: [439, 261], angle: -13, markup: '<path d="M-35-10h65m-56 14h23m-30 15h65"/><circle cx="26" cy="4" r="4"/>' },
  { at: [539, 231], to: [450, 311], angle: 15, markup: '<text>отклонение</text>' },
  { at: [90, 298], to: [241, 362], angle: -13, markup: '<text>наблюдение</text>' },
  { at: [255, 309], to: [345, 362], angle: 12, markup: '<path d="M-25 6 0-7l25 13m-25-13v25"/><circle r="5" cy="-7"/>' },
  { at: [475, 348], to: [392, 330], angle: -24, markup: '<text class="fragment-number">100</text>' },
  { at: [540, 320], to: [451, 355], angle: 17, markup: '<circle r="15" stroke-dasharray="2 4"/><path d="M-6 0H6M0-6V6"/>' },
  { at: [231, 382], to: [282, 310], angle: -9, markup: '<text>фокус</text>' },
  { at: [554, 50], to: [489, 241], angle: 22, markup: '<path d="M-20 0h40m-6-7 6 7-6 7"/>' },
];

export const opening = scene(() => ({ organized: false }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'opening', label: '01 / 08 · Вступление',
    title: 'Информации<br>становится больше.<br><em>Понимать её легче?</em>',
    copy: 'Перетащите слово «Смысл» в центр схемы.',
    body: `<div class="chaos-board">
      <svg viewBox="0 0 600 430" preserveAspectRatio="none" aria-hidden="true">
        <defs><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".85" fill="#217b80" opacity=".28"/></pattern></defs>
        <rect width="600" height="430" fill="url(#grid)"/>
        <g class="chaos-threads"><path d="M32 32 552 280M108 395 544 50M29 253 557 141M59 356 385 53M275 28 78 346M115 55 491 380" /></g>
        <g class="ordered-links">${fragments.map(({ to }) => `<path d="M300 215Q${(to[0] + 300) / 2} ${to[1] + 12} ${to[0]} ${to[1]}"/>`).join('')}</g>
        ${fragments.map(({ at, angle, markup }, i) => `<g class="fragment fragment-${i % 3}" style="transform:translate(${at[0]}px,${at[1]}px) rotate(${angle}deg)">${markup}</g>`).join('')}
      </svg>
      <span class="chaos-target" aria-hidden="true"><i></i></span>
      <button type="button" class="sense-token" aria-label="Смысл">СМЫСЛ</button>
    </div>`,
    actions: '<button type="button" class="soft" data-organize>Собрать в центре</button><button type="button" class="primary" data-continue hidden>Открыть сеть</button>',
  });
  const board = el(stage, '.chaos-board');
  const token = el<HTMLButtonElement>(board, '.sense-token');
  const pieces = all<SVGGElement>(board, '.fragment');
  function place(x: number, y: number) {
    token.style.left = `${100 * x}%`;
    token.style.top = `${100 * y}%`;
  }
  function organize(play: boolean) {
    state.organized = true;
    stage.classList.add('organized');
    token.disabled = true;
    place(.5, .5);
    pieces.forEach((piece, i) => {
      const [x, y] = fragments[i].to;
      piece.style.transform = `translate(${x}px,${y}px)`;
    });
    el(stage, 'h1').innerHTML = 'Сила инфографики<br><em>и презентаций</em>';
    el(stage, '.scene-header p').textContent = 'Визуальная иерархия помогает выделить главное и связать детали.';
    el(stage, '[data-continue]').hidden = false;
    el(stage, '[data-organize]').hidden = true;
    if (play) sound('complete');
  }
  if (state.organized) organize(false);
  drag(token, signal, {
    move(event) {
      const { x, y } = point(event, board);
      const magnet = Math.hypot(x - .5, y - .5) < .13;
      board.classList.toggle('magnet', magnet);
      place(magnet ? .5 : clamp(x, .11, .89), magnet ? .5 : clamp(y, .12, .88));
    },
    end(event, cancelled) {
      const { x, y } = point(event, board);
      if (!cancelled && Math.hypot(x - .5, y - .5) < .16) organize(true);
      else place(.64, .71);
      board.classList.remove('magnet');
    },
  });
  bind(stage, '[data-organize]', () => organize(true), signal);
  bind(stage, '.sense-token', () => organize(true), signal);
  bind(stage, '[data-continue]', next, signal);
});
