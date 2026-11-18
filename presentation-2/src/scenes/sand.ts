import { after, bind, clamp, drag, el, frame, point, reducedMotion, scene } from './common';

const width = 1000;
const height = 430;
const radius = 31;
const maskColumns = 47;
const maskRows = 23;
const inTextArea = (index: number) => {
  const x = (index % maskColumns + .5) / maskColumns;
  const y = (Math.floor(index / maskColumns) + .5) / maskRows;
  return x >= .10 && x <= .90 && y >= .15 && y <= .85;
};
const textAreaSize = Array.from({ length: maskColumns * maskRows }, (_, i) => i).filter(inTextArea).length;
const conclusion = 'Сила инфографики и презентаций — в способности превращать информацию в понимание.';
const rationale = 'Визуальная информация помогает направлять внимание, видеть связи, поддерживать память и формировать суждения. Но её настоящая ценность определяется точностью переданного смысла.';
type Point = { x: number; y: number };
type Stroke = { from: Point; to: Point };
type Grain = { x: number; y: number; vx: number; vy: number; size: number; tone: string; age: number };

let texture: HTMLCanvasElement | undefined;
function sandTexture() {
  if (texture) return texture;
  texture = document.createElement('canvas');
  texture.width = width;
  texture.height = height;
  const context = texture.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, width * .8, height);
  gradient.addColorStop(0, '#ecdfc1');
  gradient.addColorStop(.52, '#dcca9e');
  gradient.addColorStop(1, '#c4a779');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  let seed = 42;
  function rand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const tones = ['#eeddb1', '#ddc490', '#9c8059', '#ede0bb', '#b1996d', '#c0a473'];
  for (let i = 0; i < 24600; i++) {
    context.globalAlpha = .18 + rand() * .51;
    context.fillStyle = tones[i % tones.length];
    const size = .45 + rand() * 2.2;
    context.fillRect(rand() * width, rand() * height, size, size * .74);
  }
  context.globalAlpha = 1;
  return texture;
}
function erase(context: CanvasRenderingContext2D, { from, to }: Stroke) {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.lineCap = 'round';
  context.strokeStyle = '#000';
  context.lineWidth = radius * 1.8;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x + .02, to.y);
  context.stroke();
  context.strokeStyle = 'rgba(0,0,0,.48)';
  context.lineWidth = radius * 2.16;
  context.stroke();
  context.restore();
}

const broom = `<svg viewBox="0 0 112 176" fill="none" aria-hidden="true">
  <defs><linearGradient id="wood" x2="1" y2="0"><stop stop-color="#6d4d34"/><stop offset=".46" stop-color="#c39360"/><stop offset="1" stop-color="#8c6041"/></linearGradient><linearGradient id="bristles" x2=".2" y2="1"><stop stop-color="#9d7043"/><stop offset=".53" stop-color="#d7ab6a"/><stop offset="1" stop-color="#b87d43"/></linearGradient></defs>
  <rect x="52" y="4" width="11" height="111" rx="5" fill="url(#wood)"/>
  <path d="M55 10v88" stroke="#e5bc80" stroke-opacity=".52" stroke-width="1.4"/>
  <g class="brush-bristles"><path d="M40 104h30l18 59c-22 10-45 10-67 0z" fill="url(#bristles)" stroke="#6d4a32" stroke-width="1.1"/>
  ${Array.from({ length: 17 }, (_, i) => `<path d="M${41 + i * 1.72} 111Q${36 + i * 2.45} 131 ${24 + i * 3.66} ${161 + Math.sin(i / 5) * 6}" stroke="${i % 2 ? '#83572f' : '#eed39b'}" stroke-opacity=".72" stroke-width="${i % 2 ? 1 : 1.7}" stroke-linecap="round"/>`).join('')}</g>
  <path d="M40 103q15 5 31-1l2 11q-16 6-36 0z" fill="#217b80" stroke="#28494c"/><path d="M41 108q14 4 28-1" stroke="#a9d0a3" stroke-width="1.1"/>
</svg>`;

export const sand = scene(() => ({ strokes: [] as Stroke[], clear: new Uint8Array(maskColumns * maskRows), done: false }), (stage, { signal, restart, sound }, state) => {
  frame(stage, {
    name: 'sand', label: '08 / 08 · Финал', title: 'Открыть <em>смысл</em>',
    copy: 'Возьмите веник и сметите песок с центральной области.',
    body: `<div class="sand-board">
      <div class="sand-reveal"><p class="micro-label">Главная мысль</p><blockquote>${conclusion}</blockquote><p>${rationale}</p></div>
      <canvas class="sand-mask" width="${width}" height="${height}" aria-hidden="true"></canvas>
      <canvas class="sand-grains" width="${width}" height="${height}" aria-hidden="true"></canvas>
      <button type="button" class="broom" aria-label="Веник" title="Перетащите веник">${broom}</button>
    </div>`,
    actions: '<button type="button" class="soft" data-sweep>Сметать по строкам</button><span class="sand-progress" aria-live="polite"></span><p class="thanks" hidden>Спасибо за внимание!</p><button type="button" class="primary" data-repeat hidden>Повторить финал</button>',
  });
  const board = el(stage, '.sand-board');
  const maskCanvas = el<HTMLCanvasElement>(board, '.sand-mask');
  const grainCanvas = el<HTMLCanvasElement>(board, '.sand-grains');
  const mask = maskCanvas.getContext('2d')!;
  const dust = grainCanvas.getContext('2d')!;
  const tool = el<HTMLButtonElement>(board, '.broom');
  const status = el(stage, '.sand-progress');
  const pile = new Uint8Array(100);
  const grains: Grain[] = [];
  let playing = false;
  let sweeping = false;
  let frameId = 0;
  let cascadeId = 0;
  let timestamp = 0;
  let last: Point | undefined;
  let coverage = state.clear.reduce((sum, cell, i) => sum + (inTextArea(i) ? cell : 0), 0);
  let shownCoverage = -1;

  function place(p: Point, bend = 0) {
    tool.style.left = `${p.x / width * 100}%`;
    tool.style.top = `${p.y / height * 100}%`;
    tool.style.setProperty('--bend', `${bend}deg`);
    tool.style.setProperty('--bristle', `${bend * .5}deg`);
  }
  function activeFrame(now: number) {
    const timestep = clamp((now - timestamp) / 16.7, .2, 2);
    timestamp = now;
    dust.clearRect(0, 0, width, height);
    for (const [i, count] of pile.entries()) {
      if (!count) continue;
      dust.fillStyle = '#b38d58';
      dust.fillRect(i * 10, height - 5 - count * .38, 9, 1 + count * .38);
    }
    for (let i = grains.length - 1; i >= 0; i--) {
      const grain = grains[i];
      grain.x += grain.vx * timestep;
      grain.y += grain.vy * timestep;
      grain.vx *= Math.pow(.94, timestep);
      grain.vy += .18 * timestep;
      grain.age += timestep;
      const settled = grain.y > height - 6;
      if (settled || grain.age > 105 || grain.x < -8 || grain.x > width + 8) {
        if (settled) {
          const index = Math.floor(clamp(grain.x / width, 0, .999) * pile.length);
          pile[index] = Math.min(27, pile[index] + 1);
        }
        grains[i] = grains[grains.length - 1];
        grains.pop();
        continue;
      }
      dust.fillStyle = grain.tone;
      dust.fillRect(grain.x, grain.y, grain.size, grain.size * .76);
    }
    playing = grains.length > 0;
    if (playing && !signal.aborted) frameId = requestAnimationFrame(activeFrame);
  }
  function scatter(p: Point, dx: number, dy: number, amount: number) {
    if (reducedMotion()) return;
    const velocity = Math.hypot(dx, dy);
    const energy = clamp(velocity / 11, 1.4, 8);
    const direction = Math.atan2(dy, dx);
    for (let i = 0; i < amount && grains.length < 240; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * (state.done ? 130 : radius);
      const kick = direction + (Math.random() - .5) * 1.15;
      grains.push({
        x: p.x + Math.cos(angle) * spread, y: p.y + Math.sin(angle) * spread,
        vx: Math.cos(kick) * energy,
        vy: Math.sin(kick) * energy - Math.random() * 2.8,
        size: 1 + Math.random() * 2.4, age: 0,
        tone: ['#97774a', '#bd955e', '#dec18f'][i % 3],
      });
    }
    if (!playing && grains.length) { playing = true; timestamp = performance.now(); frameId = requestAnimationFrame(activeFrame); }
  }
  function settleRemainingSand() {
    const start = performance.now();
    let lastSprinkle = -1;
    function cascade(now: number) {
      const progress = clamp((now - start) / 940);
      maskCanvas.style.clipPath = `inset(${100 * progress * progress}% 0 0 0)`;
      const section = Math.floor(progress * 9);
      if (section > lastSprinkle) {
        lastSprinkle = section;
        const y = height * progress * progress;
        for (const x of [145, 365, 590, 820]) scatter({ x, y }, 0, 22, 8);
      }
      if (progress < 1 && !signal.aborted) cascadeId = requestAnimationFrame(cascade);
    }
    cascadeId = requestAnimationFrame(cascade);
  }
  function complete(play: boolean) {
    state.done = true;
    board.classList.add('sand-cleared');
    if (play && !reducedMotion()) settleRemainingSand();
    else maskCanvas.style.clipPath = 'inset(100% 0 0 0)';
    el(stage, '[data-sweep]').hidden = true;
    status.hidden = true;
    el(stage, '.thanks').hidden = false;
    el(stage, '[data-repeat]').hidden = false;
    tool.disabled = true;
    place({ x: .87 * width, y: .94 * height }, 50);
    if (play) {
      sound('complete');

    }
  }
  function mark(stroke: Stroke) {
    const { from, to } = stroke;
    let expanded = false;
    const xStep = width / maskColumns;
    const yStep = height / maskRows;
    const left = clamp(Math.floor((Math.min(from.x, to.x) - radius) / xStep), 0, maskColumns - 1);
    const right = clamp(Math.floor((Math.max(from.x, to.x) + radius) / xStep), 0, maskColumns - 1);
    const top = clamp(Math.floor((Math.min(from.y, to.y) - radius) / yStep), 0, maskRows - 1);
    const bottom = clamp(Math.floor((Math.max(from.y, to.y) + radius) / yStep), 0, maskRows - 1);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distanceSquared = dx * dx + dy * dy || 1;
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        const index = row * maskColumns + column;
        if (state.clear[index]) continue;
        const x = (column + .5) * xStep;
        const y = (row + .5) * yStep;
        const factor = clamp(((x - from.x) * dx + (y - from.y) * dy) / distanceSquared);
        if (Math.hypot(x - from.x - factor * dx, y - from.y - factor * dy) < radius * .93) {
          state.clear[index] = 1;
          expanded = true;
          if (inTextArea(index)) coverage++;
        }
      }
    }
    return expanded;
  }
  function brush(p: Point) {
    if (state.done) return;
    const from = last ?? p;
    const stroke = { from, to: p };
    if (mark(stroke)) state.strokes.push(stroke);
    erase(mask, stroke);
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    place(p, clamp(dx * .8, -20, 20));
    scatter(p, dx, dy, Math.min(13, Math.round(3 + Math.hypot(dx, dy) * .3)));
    last = p;
    const share = coverage / textAreaSize;
    const percent = Math.floor(share * 100 / 5) * 5;
    if (shownCoverage !== percent) {
      shownCoverage = percent;
      status.textContent = percent ? `Очищено около ${percent}%` : 'Песок скрывает вывод';
    }
    if (share >= .84) complete(true);
  }
  function brushAt(event: PointerEvent) {
    const { x, y } = point(event, board);
    brush({ x: clamp(x) * width, y: clamp(y) * height });
  }
  function sweepRows() {
    if (sweeping || state.done) return;
    sweeping = true;
    tool.classList.add('sweeping');
    const rows = [63, 107, 151, 195, 239, 283, 327, 371];
    if (reducedMotion()) {
      for (const y of rows) {
        last = { x: 45, y };
        brush({ x: 955, y });
      }
      return;
    }
    for (const [row, y] of rows.entries()) {
      for (let step = 0; step <= 12; step++) {
        after(signal, () => {
          if (step === 0) last = undefined;
          brush({ x: 45 + (row % 2 ? 12 - step : step) * 910 / 12, y });
        }, row * 355 + step * 23);
      }
    }
  }

  mask.drawImage(sandTexture(), 0, 0);
  for (const stroke of state.strokes) erase(mask, stroke);
  if (state.done) complete(false);
  else {
    place({ x: width * .9, y: height * .92 });
    status.textContent = coverage ? `Очищено около ${Math.floor(coverage / textAreaSize * 20) * 5}%` : 'Песок скрывает вывод';
  }
  drag(tool, signal, {
    start() {
      if (sweeping) return;
      tool.classList.add('sweeping');
      last = undefined;
    },
    move(event) { if (!sweeping) brushAt(event); },
    end() { if (!sweeping) { tool.classList.remove('sweeping'); tool.style.setProperty('--bristle', '0deg'); last = undefined; } },
  });
  bind(stage, '[data-sweep]', sweepRows, signal);
  bind(stage, '.broom', sweepRows, signal);
  bind(stage, '[data-repeat]', restart, signal);
  signal.addEventListener('abort', () => { cancelAnimationFrame(frameId); cancelAnimationFrame(cascadeId); }, { once: true });
});
