import { all, clamp } from './scenes/common';

type Point = { x: number; y: number };
type Box = Point & { w: number; h: number };
type Line = [Point, Point, Point];
type Shot = { paper: HTMLElement; origin: Box; objects: Box[]; zone: Box; width: number; height: number };
const palette = ['#217b80', '#f09573', '#8ed9c2', '#e9c58a'];
const sources = [
  ['.sense-token', '.fragment', '.chaos-board'],
  ['.understanding', '.map-node', '.map-board'],
  ['.bar-2', '.wall-chip', '.ceiling'],
  ['.idea-window', '.idea-bud', '.exhibition'],
  ['.memory-thread .linked', '.memory-thread .linked', '.memory-board'],
  ['.chart-adjust', '.plot-bar', '.comparison'],
  ['.trace-board', '.trace-point', '.trace-board'],
];
const destinations = [
  ['.map-root', '.map-node', '.map-board'],
  ['.columns', '.column-bar', '.columns'],
  ['.spot-handle', '.light-object', '.exhibition'],
  ['.memory-board', '[data-image]', '.memory-board'],
  ['.plot-axis', '.plot-axis', '.chart-figure'],
  ['.trace-board', '.trace-point', '.trace-board'],
  ['.sand-board', '.sand-board', '.sand-board'],
];
const node = (name: string) => document.createElementNS('http://www.w3.org/2000/svg', name);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const center = ({ x, y, w, h }: Box) => ({ x: x + w / 2, y: y + h / 2 });
const ease = (t: number) => t * t * (3 - 2 * t);

function bounds(stage: HTMLElement, selectors: string[]) {
  const space = stage.getBoundingClientRect();
  function box(element: Element | null): Box {
    if (!element) return { x: space.width * .5, y: space.height * .46, w: 0, h: 0 };
    const item = element.getBoundingClientRect();
    return { x: item.left - space.left, y: item.top - space.top, w: item.width, h: item.height };
  }
  return {
    origin: box(stage.querySelector(selectors[0])),
    objects: all(stage, selectors[1]).map(box),
    zone: box(stage.querySelector(selectors[2])),
    width: space.width,
    height: space.height,
  };
}

export function capture(stage: HTMLElement, scene: number): Shot {
  const geometry = bounds(stage, sources[scene]);
  const paper = stage.cloneNode(true) as HTMLElement;
  paper.classList.add('previous-stage');
  paper.removeAttribute('id');
  paper.removeAttribute('data-index');
  paper.setAttribute('aria-hidden', 'true');
  paper.inert = true;
  paper.style.width = geometry.width + 'px';
  paper.style.height = geometry.height + 'px';
  const ids = new Set(all(paper, '[id]').map((item) => item.id));
  for (const item of all(paper, '*')) {
    if (item.id) item.id = 'continuity-' + item.id;
    for (const attr of Array.from(item.attributes)) {
      if (attr.name !== 'id')
        attr.value = attr.value.replace(/#([a-z][\w-]*)/gi, (reference, id: string) =>
          ids.has(id) ? '#continuity-' + id : reference,
        );
    }
  }
  return { ...geometry, paper };
}

function curve(a: Point, b: Point): Line {
  return [a, { x: b.x, y: a.y }, b];
}
function axis(zone: Box, i: number): Line {
  const x = zone.x + (i === 0 ? 4 : zone.w * i / 4);
  const y = zone.y + zone.h - 12;
  if (i === 1) return [{ x: zone.x + 4, y }, { x, y }, { x: zone.x + zone.w - 4, y }];
  return [{ x, y: zone.y + 8 }, { x, y: zone.y + zone.h * .5 }, { x, y }];
}

export function connect(old: Shot, stage: HTMLElement, scene: number, signal: AbortSignal, done: () => void) {
  const space = stage.parentElement!;
  const next = bounds(stage, destinations[scene]);
  const svg = node('svg');
  svg.classList.add('continuity');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const from = center(old.origin);
  const to = center(next.origin);
  const sourceObjects = old.objects.length ? old.objects : [old.origin];
  const targetObjects = next.objects.length ? next.objects : [next.origin];
  const count = scene === 6 ? 28 : scene === 2 ? 10 : scene === 0 ? 12 : scene === 3 ? 8 : 4;
  const objects = Array.from({ length: count }, (_, i) => {
    const shape = node(scene === 2 ? 'polygon' : 'rect');
    shape.setAttribute('fill', scene === 6 ? '#b18a50' : palette[i % palette.length]);
    svg.append(shape);
    const first = sourceObjects[i % sourceObjects.length];
    const last = targetObjects[i % targetObjects.length];
    return { shape, first, last };
  });
  const linked = scene === 0 || scene === 1 || scene === 4;
  const lines = linked ? objects.slice(0, scene === 4 ? Math.min(sourceObjects.length, 4) : 4).map(({ first, last }, i) => {
    const path = node('path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', scene === 1 && i === 1 ? '#c4735e' : '#337977');
    path.setAttribute('stroke-width', '1.6');
    svg.prepend(path);
    const fromLine: Line = scene === 4 ? [
      { x: first.x, y: first.y }, center(first), { x: first.x + first.w, y: first.y + first.h },
    ] : curve(from, center(first));
    const endLine = scene === 1 ? axis(next.zone, i) : scene === 4 ? axis(next.zone, 1) : curve(to, center(last));
    return { path, fromLine, endLine };
  }) : [];
  space.append(old.paper, svg);

  let frame = 0;
  let finished = false;
  const start = performance.now();
  const duration = scene === 2 ? 940 : scene === 1 ? 880 : 710;
  function finish() {
    if (finished) return;
    finished = true;
    signal.removeEventListener('abort', finish);
    cancelAnimationFrame(frame);
    old.paper.remove();
    svg.remove();
    stage.style.removeProperty('clip-path');
    done();
  }
  signal.addEventListener('abort', finish, { once: true });
  function paint(now: number) {
    const elapsed = clamp((now - start) / duration);
    const travel = ease(elapsed);
    const x = mix(from.x, to.x, travel);
    const y = mix(from.y, to.y, travel);
    const radius = Math.max(old.origin.w, old.origin.h) * .34 + Math.hypot(next.width, next.height) * Math.pow(travel, 1.28);
    if (scene === 6) {
      stage.style.clipPath = `inset(${(1 - travel) * 100}% 0 0 0)`;
      old.paper.style.transform = `translateY(${-travel * next.height}px)`;
    } else {
      stage.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
      old.paper.style.maskImage = `radial-gradient(circle ${Math.max(1, radius)}px at ${x}px ${y}px, transparent 99.4%, black 100%)`;
    }
    for (const { path, fromLine, endLine } of lines) {
      const p = fromLine.map((v, i) => `${mix(v.x, endLine[i].x, travel)} ${mix(v.y, endLine[i].y, travel)}`);
      path.setAttribute('d', `M${p[0]}Q${p[1]} ${p[2]}`);
      path.setAttribute('opacity', String(clamp((1 - elapsed) / .23)));
    }
    objects.forEach(({ shape, first, last }, i) => {
      const a = center(first);
      const b = center(last);
      const spread = i / Math.max(1, count - 1);
      const arc = Math.sin(travel * Math.PI);
      if (scene === 2) {
        const size = mix(12 + i % 3 * 6, 3, travel);
        const sx = mix(a.x, b.x, travel) + (spread - .5) * next.width * .28 * arc;
        const sy = mix(a.y, b.y, travel) - arc * next.height * .26;
        shape.setAttribute('transform', `translate(${sx} ${sy}) rotate(${(i % 2 ? -1 : 1) * travel * 220})`);
        shape.setAttribute('points', `${-size} 0 0 ${-size * .55} ${size} -1 ${size * .44} ${size * .52}`);
      } else {
        const w = scene === 5 ? mix(first.w, travel < .55 ? 2 : 13, clamp(travel / .52))
          : scene === 6 ? 2 + i % 4 : mix(Math.min(first.w, scene === 1 ? 60 : 26), scene === 1 ? Math.min(last.w, 38) : 9, travel);
        const h = scene === 5 ? mix(first.h, 6, travel) : scene === 1 ? mix(10, Math.min(last.h * .5, 96), travel) : w;
        const sx = mix(a.x, scene === 6 ? last.x + last.w * spread : b.x, travel) + (spread - .5) * 66 * arc;
        const sy = scene === 6 ? mix(a.y, last.y + last.h * (.15 + (i % 11) * .072), elapsed * elapsed)
          : mix(a.y, b.y, travel) - arc * (i % 3 - 1) * 30;
        shape.setAttribute('x', String(sx - w / 2));
        shape.setAttribute('y', String(sy - h / 2));
        shape.setAttribute('width', String(w));
        shape.setAttribute('height', String(h));
        shape.setAttribute('rx', String(Math.min(5, w / 2)));
      }
      shape.setAttribute('opacity', String(.85 * clamp((1 - elapsed) / .23)));
    });
    if (elapsed >= 1) finish();
    else frame = requestAnimationFrame(paint);
  }
  paint(start);
  return finish;
}
