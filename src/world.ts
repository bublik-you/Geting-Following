import { localFile, team } from './data/content';
import type { Venue } from './data/content';

type XY = [number, number];
export type View = { x: number; y: number; zoom: number };
type Draw = (ctx: CanvasRenderingContext2D) => void;
type Lot = {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  kind: 'campus' | 'mall' | 'burger' | 'block' | 'metro' | 'stop';
};
export const home: View = { x: -22, y: -23, zoom: 1 };
export const wide: View = { x: -48, y: -19, zoom: 0.8 };

const project = (x: number, y: number, z = 0): XY => [
  x + y * 0.46,
  y * 0.64 - x * 0.12 - z,
];
const rect = (
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
function poly(c: CanvasRenderingContext2D, color: string, points: XY[]) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) =>
    i
      ? c.lineTo(Math.round(x), Math.round(y))
      : c.moveTo(Math.round(x), Math.round(y)),
  );
  c.closePath();
  c.fill();
}
function plane(
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  d: number,
  z = 0,
) {
  poly(c, color, [
    project(x, y, z),
    project(x + w, y, z),
    project(x + w, y + d, z),
    project(x, y + d, z),
  ]);
}
function line(
  c: CanvasRenderingContext2D,
  color: string,
  a: XY,
  b: XY,
  width = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.stroke();
}
function lettering(
  c: CanvasRenderingContext2D,
  text: string,
  color: string,
  x: number,
  y: number,
  size: number,
  width?: number,
) {
  c.fillStyle = color;
  c.font = `bold ${size}px monospace`;
  c.textBaseline = 'top';
  c.fillText(text, Math.round(x), Math.round(y), width);
}

const burger: Lot = { x: 63, y: -79, w: 83, d: 43, h: 34, kind: 'burger' };
const mall: Lot = { x: -197, y: 44, w: 126, d: 53, h: 46, kind: 'mall' };
const campus: Lot = { x: 66, y: 125, w: 129, d: 57, h: 48, kind: 'campus' };
const metro: Lot = { x: -42, y: -66, w: 28, d: 27, h: 14, kind: 'metro' };
const people: XY[] = [
  [55, 139],
  [-45, 82],
  [88, -29],
  [-150, 110],
];
const pin = (lot: Lot) =>
  project(lot.x + lot.w * 0.54, lot.y + lot.d * 0.64, lot.h + 6);

export const points = {
  burger: pin(burger),
  tea: pin(mall),
  campus: pin(campus),
  metro: pin(metro),
  team: people.map(([x, y]) => project(x, y, 22)),
};
export const focus = ([x, y]: XY, zoom = 1.55): View => ({
  x,
  y: y + 18,
  zoom,
});

type Hit = Venue | `team-${number}`;
function contains([x, y]: XY, polygon: XY[]) {
  return polygon.every(([ax, ay], index) => {
    const [bx, by] = polygon[(index + 1) % polygon.length];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0;
  });
}
const footprints = (
  [
    ['burger', burger],
    ['tea', mall],
  ] as const
).map(([id, { x, y, w, d, h }]) => ({
  id,
  polygon: [
    project(x, y, h),
    project(x + w, y, h),
    project(x + w, y + d, h),
    project(x + w, y + d),
    project(x, y + d),
  ],
}));
export function pickCity(at: XY, margin = 0): Hit | null {
  const [x, y] = at;
  const person = people.findIndex(([px, py]) => {
    const [a, b] = project(px, py);
    return (
      Math.abs(x - a) <= 7 + margin && y >= b - 28 - margin && y <= b + margin
    );
  });
  if (person >= 0) return `team-${person}`;
  return footprints.find(({ polygon }) => contains(at, polygon))?.id ?? null;
}

const sprites = [
  { hair: '#4c3329', shine: '#895d43', skin: '#e7aa84', coat: '#252a30', light: '#515863', pants: '#25282e' },
  { hair: '#20242a', shine: '#4c5058', skin: '#d7a275', coat: '#202b43', light: '#354765', pants: '#232835' },
  { hair: '#2e211f', shine: '#6f5042', skin: '#edb58f', coat: '#5e4035', light: '#916753', pants: '#302523' },
  { hair: '#392e26', shine: '#6e5241', skin: '#d9a179', coat: '#2e5540', light: '#53765b', pants: '#293931' },
];
const visitors = [
  { hair: '#614232', shine: '#ab7b51', skin: '#ecb980', coat: '#a45c46', light: '#e29d6b', pants: '#39474c' },
  { hair: '#2d303b', shine: '#576068', skin: '#ad765a', coat: '#4a567a', light: '#8795b0', pants: '#333c4c' },
  { hair: '#5a3a2e', shine: '#a2734d', skin: '#e5a57c', coat: '#736346', light: '#bf9d62', pants: '#39463b' },
];
export function drawPerson(
  c: CanvasRenderingContext2D,
  id: number,
  x: number,
  y: number,
  time: number,
  action: 'idle' | 'talk' | 'walk' | 'wave' = 'idle',
  shadow = true,
) {
  const { hair, shine, skin, coat, light, pants } =
    sprites[id] ?? visitors[(id - sprites.length) % visitors.length];
  const phase = Math.floor(time / (action === 'idle' ? 300 : 135)) + id * 13;
  const arm = action === 'wave' ? -2 - phase % 2 : action === 'talk' ? (phase % 3) - 1 : 0;
  const step = action === 'walk' ? (phase % 3) - 1 : 0;
  const bob = phase % 6 === 0 ? 1 : 0;
  if (shadow) rect(c, '#172f3066', x - 7, y - 2, 15, 4);
  const pixel = (color: string, dx: number, dy: number, w: number, h: number) =>
    rect(c, color, x + dx, y + dy, w, h);
  pixel('#182429', -6, -16 + bob, 12, 12);
  pixel(pants, -4, -7, 3, 5 + step);
  pixel(pants, 1, -7, 3, 5 - step);
  pixel('#171e23', -5, -2 + step, 4, 2);
  pixel('#171e23', 1, -2 - step, 4, 2);
  pixel(coat, -5, -15 + bob, 10, 8);
  pixel(light, -4, -14 + bob, 3, 2);
  pixel(coat, 5, -14 + arm + bob, 2, 5);
  pixel(skin, 5, -10 + arm + bob, 2, 2);
  pixel(skin, -7, -11 - step + bob, 2, 3);
  if (id === 0) {
    pixel(hair, -6, -24 + bob, 12, 17);
    pixel(shine, -5, -19 + bob, 1, 11);
    pixel(shine, 4, -20 + bob, 1, 10);
    pixel('#c4b298', 0, -14 + bob, 1, 7);
    pixel('#bd9d64', -7, -10 - step + bob, 2, 1);
  }
  if (id === 2) {
    pixel('#eee9dd', -2, -15 + bob, 5, 7);
    pixel(light, -3, -15 + bob, 1, 4);
    pixel(light, 3, -15 + bob, 1, 4);
    pixel('#3d9d9d', 0, -12 + bob, 1, 6);
    pixel('#56b6b0', 0, -8 + bob, 3, 2);
  }
  pixel(hair, -5, -25 + bob, 10, 9);
  pixel(shine, -4, -24 + bob, 7, 2);
  pixel(skin, -4, -22 + bob, 8, 7);
  pixel(hair, -5, -23 + bob, 2, 4);
  if (id === 0) {
    pixel(hair, 2, -24 + bob, 3, 5);
    pixel(shine, -2, -24 + bob, 1, 1);
  }
  if (id === 1) {
    pixel(hair, -5, -27 + bob, 9, 4);
    pixel(shine, -4, -26 + bob, 6, 1);
    pixel('#171b20', -6, -24 + bob, 13, 2);
    pixel('#42633f', 2, -24 + bob, 2, 1);
    pixel('#444954', -5, -20 + bob, 10, 1);
    pixel('#444954', -5, -19 + bob, 1, 2);
    pixel('#444954', 4, -19 + bob, 1, 2);
    pixel('#b4b7c0', -3, -18 + bob, 2, 1);
    pixel('#b4b7c0', 2, -18 + bob, 2, 1);
  }
  if (id === 2) {
    pixel(hair, -4, -26 + bob, 8, 3);
    pixel(shine, -3, -25 + bob, 6, 1);
    pixel(hair, 1, -23 + bob, 4, 3);
    pixel(shine, 2, -23 + bob, 2, 1);
  }
  if (id === 3) {
    pixel(hair, -6, -25 + bob, 12, 3);
    for (const dx of [-5, -1, 3]) {
      pixel(hair, dx, -27 + bob, 3, 2);
      pixel(shine, dx, -25 + bob, 2, 1);
    }
    pixel(hair, 3, -23 + bob, 2, 2);
  }
  if (phase % 17 !== 12) {
    pixel('#283031', -2, -19 + bob, 1, 1);
    pixel('#283031', 2, -19 + bob, 1, 1);
  }
  if (action === 'talk' && phase % 2)
    pixel('#8d5149', -1, -17 + bob, 3, 1);
}

function rng(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function tree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  size: number,
) {
  const random = rng(seed);
  const greens = [
    '#204d41',
    '#29674e',
    '#398362',
    '#53996a',
    '#72a671',
    '#aac183',
  ];
  rect(c, '#24493c55', x - 4, y - 3, Math.round(size * 1.9), 5);
  rect(c, '#4c4b35', x - 1, y - size, 3, size);
  const pixels: [number, number, number, number][] = [];
  for (let i = 0; i < 55; i++) {
    const px = (random() * 2 - 1) * size,
      py = (random() * 2 - 1) * size;
    if (px * px + py * py > size * size) continue;
    const light = Math.max(
      0,
      Math.min(5, Math.floor(3.5 - px / size - py / size + random() * 2 - 1)),
    );
    pixels.push([
      x + px - 2,
      y - size * 0.98 + py * 0.72 - 8,
      light,
      2 + Math.floor(random() * 5),
    ]);
  }
  const t = y - size - 8;
  poly(c, greens[0], [
    [x - size, t - 4],
    [x - size * 0.6, t - size * 0.62],
    [x + size * 0.18, t - size * 0.75],
    [x + size * 0.8, t - size * 0.45],
    [x + size, t + 2],
    [x + size * 0.6, t + size * 0.56],
    [x - size * 0.45, t + size * 0.6],
    [x - size, t + 4],
  ]);
  pixels
    .sort((a, b) => a[1] - b[1])
    .forEach(([px, py, l, s]) =>
      rect(c, greens[l], px, py, s, Math.max(2, s - 1)),
    );
}

const palettes = {
  campus: ['#c9896b', '#87574e', '#ad6650', '#f0c39b', '#77473e', '#fde4a5'],
  mall: ['#bb99a2', '#665666', '#956f84', '#e3bdc1', '#534f60', '#f8daa6'],
  burger: ['#d39475', '#784938', '#9d5439', '#eebda0', '#61372d', '#ffe1a4'],
  block: ['#b5af92', '#686d61', '#a09a82', '#dbd2aa', '#5b635b', '#f9dfa3'],
  metro: ['#96aa8c', '#4d7566', '#6c8a7a', '#d9d9ae', '#3b625d', '#fce1aa'],
  stop: ['#94ab9b', '#52756d', '#6c9589', '#ccd5b1', '#41665f', '#f4dfa1'],
};

function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  colors: string[],
  base = 0,
) {
  const a = project(x, y, h + base),
    b = project(x + w, y, h + base),
    f = project(x + w, y + d, h + base),
    e = project(x, y + d, h + base);
  poly(c, colors[1], [
    b,
    f,
    project(x + w, y + d, base),
    project(x + w, y, base),
  ]);
  poly(c, colors[2], [
    e,
    f,
    project(x + w, y + d, base),
    project(x, y + d, base),
  ]);
  poly(c, colors[0], [a, b, f, e]);
  line(c, colors[3], a, e);
  line(c, colors[3], e, f);
}
function building(c: CanvasRenderingContext2D, lot: Lot) {
  const { x, y, w, d, h, kind } = lot;
  const p = palettes[kind];
  plane(c, '#253a4160', x + 8, y + 7, w + 14, d + 14);
  plane(c, '#aeb694', x - 5, y - 4, w + 10, d + 12);
  box(c, x, y, w, d, h, p);
  const roof =
    kind === 'mall' ? '#b38994' : kind === 'campus' ? '#b77d64' : '#a1a18a';
  plane(c, roof, x + 3, y + 3, w - 6, d - 6, h + 0.4);
  for (let k = 0; k < d - 5; k += 5) {
    line(
      c,
      p[3] + '70',
      project(x + 3, y + k + 3, h + 0.5),
      project(x + w - 3, y + k + 3, h + 0.5),
      0.55,
    );
  }
  if (h > 25) {
    box(
      c,
      x + w * 0.6,
      y + 8,
      w * 0.22,
      d * 0.34,
      5,
      ['#b4b6a3', '#697b76', '#90988b', '#d7d5b4'],
      h,
    );
    box(
      c,
      x + 9,
      y + d * 0.4,
      12,
      8,
      3,
      ['#c4bea5', '#74776b', '#999a82', '#e2d5b4'],
      h,
    );
    box(
      c,
      x + w * 0.65,
      y + 11,
      6,
      5,
      3,
      ['#c3c3a9', '#626f65', '#878b77', '#e6ddba'],
      h + 5,
    );
  }
  const darkGlass = kind === 'mall' ? '#453e55' : '#313f43';
  function sideWindow(
    dy: number,
    z: number,
    depth: number,
    height: number,
    color: string,
  ) {
    poly(c, color, [
      project(x + w, y + dy, z + height),
      project(x + w, y + dy + depth, z + height),
      project(x + w, y + dy + depth, z),
      project(x + w, y + dy, z),
    ]);
  }
  for (let z = 7; z < h - 6; z += 11) {
    line(
      c,
      p[4] + '92',
      project(x, y + d, z - 2),
      project(x + w, y + d, z - 2),
      0.75,
    );
    for (let dx = 5; dx < w - 5; dx += 10) {
      const a = project(x + dx, y + d, z),
        glass = (dx + z) % 7 < 3 ? p[5] : '#82a59c';
      rect(c, p[4], a[0] - 1, a[1] - 7, 8, 8);
      rect(c, darkGlass, a[0], a[1] - 6, 6, 6);
      rect(c, glass, a[0] + 1, a[1] - 5, 4, 3);
      rect(c, p[3], a[0] - 1, a[1], 8, 1);
    }
    for (let dy = 4; dy < d - 8; dy += 11) {
      sideWindow(dy, z, 7, 6, darkGlass);
      sideWindow(dy + 1, z + 2, 4, 3, (dy + z) % 9 < 5 ? '#86a39a' : p[5]);
    }
  }
  if (kind === 'block') return;
  const [fx, fy] = project(x + w * 0.5, y + d, h * 0.56);
  if (kind === 'campus') {
    for (const z of [12, h - 5]) {
      line(c, '#f0cfab', project(x, y + d, z), project(x + w, y + d, z), 2);
      line(c, '#dbc0a3', project(x + w, y, z), project(x + w, y + d, z), 2);
    }
    const steps = project(x + w * 0.5 - 17, y + d + 1);
    for (let i = 0; i < 4; i++)
      rect(
        c,
        i % 2 ? '#a28c72' : '#cfc1a0',
        steps[0] - i * 2,
        steps[1] + i * 2,
        32 + i * 5,
        2,
      );
    box(c, x + w * 0.5 - 18, y + d - 13, 38, 16, 32, [
      '#d5ab83',
      '#9b6758',
      '#c18a67',
      '#f3d4aa',
    ]);
    rect(c, '#3b5656', steps[0] + 6, steps[1] - 16, 22, 16);
    for (let i = 0; i < 4; i++)
      rect(c, '#edc196', steps[0] + i * 9, steps[1] - 17, 3, 18);
    rect(c, '#693d39', fx - 17, fy - 5, 35, 12);
    lettering(c, 'НГТУ', '#fff0cb', fx - 12, fy - 4, 10);
  } else if (kind === 'burger' || kind === 'mall') {
    if (kind === 'mall') {
      const a = project(x + 14, y + d - 17, h + 5),
        b = project(x + w - 14, y + d - 17, h + 5);
      const e = project(x + 14, y + d, h - 16),
        f = project(x + w - 14, y + d, h - 16);
      poly(c, '#608887', [a, b, f, e]);
      for (let u = 16; u < w - 14; u += 5)
        line(
          c,
          u % 2 ? '#aac3a5' : '#567770',
          project(x + u, y + d - 17, h + 5),
          project(x + u, y + d, h - 16),
          1,
        );
      line(c, '#d6c6ae', a, b, 2);
      line(c, '#aab8a5', e, f, 2);
    }
    const sign = kind === 'burger' ? '#9f362c' : '#5f405d';
    const label = kind === 'burger' ? 'BURGER KING' : 'АМСТЕРДАМ';
    rect(c, sign, fx - 36, fy - 8, 72, 14);
    rect(c, kind === 'burger' ? '#efb46a' : '#d5a2b5', fx - 36, fy - 8, 72, 1);
    lettering(
      c,
      label,
      '#fff0ce',
      fx - (kind === 'burger' ? 32 : 28),
      fy - 6,
      9,
    );
    const [dx, dy] = project(x + w * 0.53, y + d);
    if (kind === 'burger') {
      rect(c, '#3e4d46', dx - 32, dy - 14, 21, 11);
      rect(c, '#aab9a1', dx - 30, dy - 12, 17, 7);
      rect(c, '#665346', dx - 24, dy - 12, 2, 7);
    }
    rect(c, '#354b50', dx - 12, dy - 12, 27, 12);
    rect(c, '#a2b1a3', dx - 9, dy - 11, 9, 10);
    rect(c, '#6f9792', dx + 2, dy - 11, 10, 10);
    rect(c, '#f7d8a7', dx - 12, dy - 13, 27, 2);
    if (kind === 'mall') {
      rect(c, '#527554', dx - 16, dy - 23, 34, 8);
      lettering(c, '−1 ↓', '#fff0ce', dx - 7, dy - 22, 7);
    }
  } else {
    rect(c, '#244b49', fx - 9, fy - 5, 20, 11);
    lettering(c, kind === 'metro' ? 'М' : '▤', '#e9e5b2', fx - 4, fy - 4, 9);
  }
}

const random = rng(790);
const lots: Lot[] = [
  burger,
  mall,
  campus,
  metro,
  { x: 1, y: 75, w: 25, d: 14, h: 9, kind: 'stop' },
  { x: -117, y: -70, w: 28, d: 14, h: 8, kind: 'stop' },
  { x: 67, y: 208, w: 129, d: 45, h: 36, kind: 'campus' },
  { x: 207, y: 103, w: 67, d: 61, h: 45, kind: 'campus' },
  { x: 226, y: 192, w: 91, d: 55, h: 32, kind: 'campus' },
];
for (const x of [-530, -423, -323, -268, -167, -78, 64, 169, 275, 380, 476]) {
  for (const y of [-350, -238, -146, 55, 146, 275]) {
    if (
      (x >= -200 && x <= -70 && y === 55) ||
      (x >= 64 && x <= 275 && y >= 55 && y < 275)
    )
      continue;
    const w = 30 + Math.floor(random() * 43),
      d = 25 + Math.floor(random() * 42),
      h = 20 + Math.floor(random() * 47);
    if (x < 0 && x + w > -44) continue;
    lots.push({ x, y, w, d, h, kind: 'block' });
  }
}

const ground = document.createElement('canvas');
ground.width = 1856;
ground.height = 1100;
const offset: XY = [928, 510];
const g = ground.getContext('2d')!;
g.translate(...offset);
rect(g, '#83947a', -928, -510, 1856, 1100);

for (let i = 0; i < 5100; i++) {
  const x = random() * 1856 - 928,
    y = random() * 1100 - 510;
  rect(
    g,
    ['#a2ad89', '#6a896f', '#93a184', '#afae88'][i % 4],
    x,
    y,
    1 + Math.floor(random() * 6),
    1 + Math.floor(random() * 3),
  );
}

// Prospekt runs across Geodezicheskaya. Bluchera parallels it on the Amsterdam side.
function roads() {
  for (const [x, y, w, d] of [
    [-42, -650, 83, 1300],
    [-257, -650, 51, 1300],
    [-800, -31, 1600, 63],
    [-800, 259, 1600, 38],
    [-800, -125, 1600, 25],
  ]) {
    plane(g, '#79867a', x - 7, y - 6, w + 14, d + 12);
    plane(g, '#cfc9aa', x - 5, y - 4, w + 10, d + 8);
    plane(g, '#e0d9bd', x, y, w, d);
    for (let k = -600; k < 620; k += 17) {
      if ((w > d && Math.abs(k) < 53) || (d > w && Math.abs(k) < 37)) continue;
      if (w > d) plane(g, '#f5edd2', k, y + d / 2, 8, 1.3);
      else plane(g, '#f5edd2', x + w / 2, k, 1.5, 8);
    }
  }
  for (let i = 0; i < 8; i++) {
    plane(g, '#fcf1d2', -34 + i * 9, 37, 4, 13);
    plane(g, '#fbf1d2', 47, -28 + i * 7, 13, 4);
    plane(g, '#fbf1d2', -64, -28 + i * 7, 13, 4);
    plane(g, '#fbf1d2', -34 + i * 9, -52, 4, 13);
  }
  notches(-33, 54, 64, 223);
  notches(46, 72, 181, 28);
  notches(-200, 39, 135, 70);
  notches(47, -89, 106, 56);
  for (let x = 65; x < 600; x += 34) {
    plane(g, '#a0ac82', x, -5, 26, 8);
    plane(g, '#b7bd94', x, -6, 26, 2);
  }
  for (const x of [-248, -223]) {
    line(g, '#8d8d78', project(x, -510), project(x, 510), 1);
    line(g, '#a1a08b', project(x + 3, -510), project(x + 3, 510), 1);
  }
}
function notches(x: number, y: number, w: number, d: number) {
  plane(g, '#bcba9d', x, y, w, d);
  for (let j = 0; j < d; j += 7)
    line(g, '#abae91', project(x, y + j), project(x + w, y + j), 0.6);
  for (let j = 0; j < w; j += 9)
    line(g, '#c8c6a4', project(x + j, y), project(x + j, y + d), 0.6);
}
roads();
for (const lot of lots) {
  const { x, y, w, d } = lot;
  plane(g, '#aab293', x - 9, y - 7, w + 19, d + 22);
  plane(g, '#c6bea0', x - 6, y + d + 4, w + 12, 12);
}
function streetText(text: string, x: number, y: number, angle: number) {
  g.save();
  g.translate(...project(x, y));
  g.rotate(angle);
  lettering(g, text, '#686f5b', 0, 0, 7);
  g.restore();
}
streetText('УЛ. ГЕОДЕЗИЧЕСКАЯ', -181, 2, -0.119);
streetText('ПР. КАРЛА МАРКСА', 2, 86, 0.946);
streetText('УЛ. БЛЮХЕРА', -231, -25, 0.946);

type Layer = {
  x: number;
  y: number;
  depth: number;
  draw: Draw;
  bitmap?: HTMLCanvasElement;
};
const layers: Layer[] = [];
function bake(
  x: number,
  y: number,
  depth: number,
  w: number,
  h: number,
  draw: Draw,
) {
  const bitmap = document.createElement('canvas');
  bitmap.width = w;
  bitmap.height = h;
  const c = bitmap.getContext('2d')!;
  c.translate(-x, -y);
  draw(c);
  layers.push({ x, y, depth, draw, bitmap });
}
for (const lot of lots) {
  const [left, top] = project(lot.x, lot.y, lot.h);
  bake(
    Math.floor(left - 12),
    Math.floor(top - lot.w * 0.12 - 13),
    project(lot.x + lot.w * 0.5, lot.y + lot.d)[1],
    Math.ceil(lot.w + lot.d * 0.46 + 62),
    Math.ceil(lot.h + lot.d * 0.64 + lot.w * 0.12 + 52),
    (c) => building(c, lot),
  );
}
const landscaping: XY[] = [];
for (let i = 0; i < 250; i++) {
  const x = Math.round(random() * 1170 - 545),
    y = Math.round(random() * 800 - 380);
  if (
    Math.abs(x) < 49 ||
    Math.abs(x + 231) < 34 ||
    Math.abs(y) < 36 ||
    Math.abs(y + 112) < 20 ||
    Math.abs(y - 277) < 22
  )
    continue;
  if (
    lots.some(
      (b) =>
        x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 7 && y < b.y + b.d + 9,
    )
  )
    continue;
  if (people.some(([a, b]) => Math.hypot(x - a, y - b) < 24)) continue;
  landscaping.push([x, y]);
}
for (const y of [89, 116, 181, 216, 244]) landscaping.push([46, y]);
for (const x of [79, 115, 153, 189, 227, 264, 297]) landscaping.push([x, 100]);
for (const x of [-209, -180, -145, -113, -78]) landscaping.push([x, 123]);
landscaping.forEach(([x, y], i) => {
  const [a, b] = project(x, y),
    size = 7 + Math.floor(random() * 7);
  bake(
    Math.floor(a - size - 4),
    Math.floor(b - size * 2 - 13),
    b,
    size * 4 + 11,
    size * 2 + 24,
    (c) => tree(c, a, b, i + 32, size),
  );
});

for (const [x, y] of [
  [-48, 74],
  [-48, 125],
  [-49, 191],
  [48, 69],
  [49, 185],
  [49, 231],
  [-153, 37],
  [152, 36],
  [210, 36],
  [118, -33],
  [-167, -35],
  [-71, 118],
  [72, 107],
  [179, 106],
  [-218, 46],
]) {
  const [a, b] = project(x, y);
  bake(Math.floor(a - 5), Math.floor(b - 24), b, 20, 32, (c) => {
    rect(c, '#3b4d4155', a, b, 10, 2);
    rect(c, '#4a5950', a, b - 19, 2, 20);
    rect(c, '#5e6b53', a - 1, b - 19, 7, 2);
    rect(c, '#ffe4a1', a + 3, b - 17, 4, 2);
    if (x % 2 === 0) {
      rect(c, '#4e543f', a + 6, b - 2, 1, 5);
      rect(c, '#4e543f', a + 13, b - 2, 1, 5);
      rect(c, '#86674d', a + 5, b - 5, 10, 4);
      rect(c, '#bf9668', a + 5, b - 5, 10, 1);
    }
  });
}
layers.sort((a, b) => a.depth - b.depth);

const portraits = team.map((member) => {
  const file = localFile(member.avatar);
  if (!file) return null;
  const image = new Image();
  image.src = file;
  return image;
});
export function paintAvatar(
  c: CanvasRenderingContext2D,
  id: number,
  x: number,
  y: number,
  time: number,
  action?: 'idle' | 'talk' | 'walk' | 'wave',
) {
  const image = portraits[id];
  if (image?.complete && image.naturalWidth) {
    const bob = action === 'talk' && Math.floor(time / 155) % 2 ? 1 : 0;
    c.drawImage(image, Math.round(x - 8), Math.round(y - 26 + bob), 16, 26);
  } else drawPerson(c, id, x, y, time, action, false);
}

function car(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  vertical: boolean,
  bus: boolean,
) {
  const w = bus ? 23 : 13,
    d = 7;
  const xSize = vertical ? d : w,
    ySize = vertical ? w : d;
  plane(c, '#525d4f65', x + 2, y + 3, xSize, ySize);
  box(c, x, y, xSize, ySize, bus ? 7 : 4, [color, '#525f5a', color, '#e1d7aa']);
  plane(
    c,
    '#415761',
    x + 1,
    y + 1,
    xSize - 2,
    vertical ? 4 : ySize - 2,
    bus ? 7.5 : 4.5,
  );
  plane(c, '#a5b8a5', x + 1, y + 1, vertical ? 2 : 3, 2, bus ? 8 : 5);
}

export function paintCity(
  c: CanvasRenderingContext2D,
  view: View,
  t: number,
  highlight: string | null,
) {
  const { width, height } = c.canvas;
  c.fillStyle = '#84967b';
  c.fillRect(0, 0, width, height);
  c.save();
  c.imageSmoothingEnabled = false;
  c.translate(
    Math.round(width / 2 - view.x * view.zoom),
    Math.round(height / 2 - view.y * view.zoom),
  );
  c.scale(view.zoom, view.zoom);
  c.drawImage(ground, -offset[0], -offset[1]);

  const moving: Layer[] = people.map(([x, y], id) => {
    const [a, b] = project(x, y);
    return {
      x: a,
      y: b,
      depth: b,
      draw: (ctx) => {
        if (highlight === `team-${id}`) {
          rect(ctx, '#f5d38b95', a - 10, b - 2, 21, 3);
          rect(ctx, '#f5d38b75', a - 7, b - 4, 15, 7);
        }
        paintAvatar(
          ctx,
          id,
          a,
          b,
          t,
          highlight === `team-${id}` ? 'wave' : 'idle',
        );
      },
    };
  });
  for (let i = 0; i < 13; i++) {
    const vertical = i % 3 === 0;
    const a =
      ((((t * (i % 2 ? 0.013 : -0.017) + i * 91) % 1000) + 1000) % 1000) - 500;
    const x = vertical ? (i % 2 ? 13 : -18) : a,
      y = vertical ? a : i % 2 ? -18 : 18;
    moving.push({
      x,
      y,
      depth: project(x, y + 4)[1],
      draw: (ctx) =>
        car(
          ctx,
          x,
          y,
          ['#d38862', '#d0c6a1', '#85a9a0', '#ad7362', '#c1ba71'][i % 5],
          vertical,
          i === 6,
        ),
    });
  }
  for (let i = 0; i < 7; i++) {
    const x = i % 2 === 0 ? -47 : 47,
      y = ((t * 0.005 + i * 54) % 430) - 170;
    if (Math.abs(y) < 34) continue;
    const [a, b] = project(x, y);
    moving.push({
      x: a,
      y: b,
      depth: b,
      draw: (ctx) => {
        ctx.save();
        ctx.translate(a, b);
        ctx.scale(0.57, 0.57);
        drawPerson(ctx, (i + 2) % 4, 0, 0, t + i * 89, 'walk');
        ctx.restore();
      },
    });
  }
  moving.sort((a, b) => a.depth - b.depth);
  const visibleLeft = view.x - width / (2 * view.zoom),
    visibleTop = view.y - height / (2 * view.zoom);
  const visibleRight = visibleLeft + width / view.zoom,
    visibleBottom = visibleTop + height / view.zoom;
  let index = 0;
  for (const layer of layers) {
    while (index < moving.length && moving[index].depth < layer.depth)
      moving[index++].draw(c);
    const image = layer.bitmap!;
    if (
      layer.x > visibleRight ||
      layer.y > visibleBottom ||
      layer.x + image.width < visibleLeft ||
      layer.y + image.height < visibleTop
    )
      continue;
    c.drawImage(image, layer.x, layer.y);
  }
  while (index < moving.length) moving[index++].draw(c);
  if (highlight === 'burger' || highlight === 'tea') {
    const { x, y, w, d, h } = highlight === 'burger' ? burger : mall;
    plane(c, '#ffdea43c', x, y, w, d, h);
  }
  c.restore();
}
