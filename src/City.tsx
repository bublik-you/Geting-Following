import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointer } from 'react';
import { localFile, venues } from './data/content';
import type { Venue } from './data/content';
import { home, paintCity, paintAvatar, pickCity, points, wide } from './world';
import type { View } from './world';

export function Avatar({
  id,
  action = 'idle',
}: {
  id: number;
  action?: 'idle' | 'talk' | 'wave';
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const frame = () => {
      ctx.clearRect(0, 0, 20, 30);
      ctx.imageSmoothingEnabled = false;
      paintAvatar(ctx, id, 10, 28, performance.now(), action);
    };
    frame();
    const timer = window.setInterval(frame, 100);
    return () => window.clearInterval(timer);
  }, [id, action]);
  return (
    <canvas
      className="avatar"
      ref={ref}
      width="20"
      height="30"
      aria-hidden="true"
    />
  );
}

export function Photo({
  file,
  name,
  tone,
  className = '',
}: {
  file: string;
  name: string;
  tone?: Venue;
  className?: string;
}) {
  const src = localFile(file);
  const [failed, setFailed] = useState('');
  if (src && failed !== src)
    return (
      <img
        className={`photo ${className}`}
        alt={name}
        src={src}
        onError={() => setFailed(src)}
      />
    );
  return (
    <div className={`photo photo-empty ${tone ?? ''} ${className}`}>
      <span aria-hidden="true">▧</span>
      <b>{name}</b>
      <small>[Добавить фото]</small>
    </div>
  );
}

const bounds = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const tween = (a: number, b: number, t: number) => a + (b - a) * t;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
type Marker = {
  id: string;
  at: [number, number];
  label: string;
  short: string;
  kind: 'venue' | 'team' | 'place';
};
const markers: Marker[] = [
  {
    id: 'tea',
    at: points.tea,
    label: 'Молочай',
    short: 'ТЦ «Амстердам» · −1',
    kind: 'venue',
  },
  {
    id: 'burger',
    at: points.burger,
    label: 'Burger King',
    short: 'Геодезическая, 13/13а',
    kind: 'venue',
  },
  {
    id: 'campus',
    at: points.campus,
    label: 'НГТУ НЭТИ',
    short: 'Кампус',
    kind: 'place',
  },
  {
    id: 'metro',
    at: points.metro,
    label: 'Студенческая',
    short: 'Метро',
    kind: 'place',
  },
  ...points.team.map((at, id): Marker => ({
    id: `team-${id}`,
    at,
    label: `Участник ${id + 1}`,
    short: `0${id + 1}`,
    kind: 'team',
  })),
];

interface CityProps {
  target: View;
  duration: number;
  disabled: boolean;
  showUI: boolean;
  onVenue: (venue: Venue) => void;
  onPerson: (id: number) => void;
  onCampus: () => void;
}
export function City({
  target,
  duration,
  disabled,
  showUI,
  onVenue,
  onPerson,
  onCampus,
}: CityProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, HTMLDivElement>());
  const shot = useRef({
    current: { ...wide },
    goal: { ...wide },
    duration: 0,
    started: 0,
    from: { ...wide },
  });
  const size = useRef({ w: 640, h: 330, cw: 640, ch: 330 });
  const drag = useRef({
    points: new Map<number, { x: number; y: number }>(),
    moved: false,
    start: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    last: 0,
  });
  const hideTimer = useRef(0);
  const suppress = useRef(0);
  const hoverHit = useRef<ReturnType<typeof pickCity>>(null);
  const [preview, setPreview] = useState<Venue | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [showCampus, setShowCampus] = useState(false);
  const highlight = useRef<string | null>(null);
  highlight.current = active ?? preview;
  const reset = () => {
    setPreview(null);
    setActive(null);
    setShowCampus(false);
  };
  useEffect(() => {
    const camera = shot.current;
    camera.from = { ...camera.current };
    camera.goal = { ...target };
    camera.duration = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : duration;
    camera.started = performance.now();
    if (!camera.duration) camera.current = { ...target };
  }, [target, duration]);

  useEffect(() => {
    if (!showUI) {
      reset();
    }
  }, [showUI]);
  useEffect(() => {
    const element = host.current,
      view = canvas.current;
    const ctx = view?.getContext('2d', { alpha: false });
    if (!element || !view || !ctx) return;
    const resize = () => {
      const cw = element.clientWidth,
        ch = element.clientHeight;
      if (!cw || !ch) return;
      view.width = cw < 660 ? 470 : 640;
      view.height = Math.max(240, Math.round((view.width * ch) / cw));
      size.current = { cw, ch, w: view.width, h: view.height };
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let id = 0,
      last = -1000;
    const render = (now: number) => {
      id = requestAnimationFrame(render);
      if (now - last < 28 || document.hidden) return;
      last = now;
      const camera = shot.current;
      const t = camera.duration
        ? bounds((now - camera.started) / camera.duration, 0, 1)
        : 1;
      const eased = t * t * (3 - 2 * t);
      camera.current = {
        x: tween(camera.from.x, camera.goal.x, eased),
        y: tween(camera.from.y, camera.goal.y, eased),
        zoom: tween(camera.from.zoom, camera.goal.zoom, eased),
      };
      const { w, h, cw, ch } = size.current;
      const compact = cw < 660;
      const current = compact
        ? { ...camera.current, zoom: camera.current.zoom * 0.83 }
        : camera.current;
      paintCity(ctx, current, now, highlight.current);
      if (haze.current)
        haze.current.style.transform = `translate(${-current.x * 0.13 + Math.sin(now * 0.00022) * 12}px,${-current.y * 0.09}px)`;
      for (const {
        id: marker,
        at: [x, y],
      } of markers) {
        const pin = positions.current.get(marker);
        if (!pin) continue;
        const left = ((w / 2 + (x - current.x) * current.zoom) * cw) / w;
        const top = ((h / 2 + (y - current.y) * current.zoom) * ch) / h;
        pin.style.transform = `translate(${Math.round(left)}px,${Math.round(top)}px)`;
        pin.style.visibility =
          left < 34 || left > cw - 34 || top < 37 || top > ch - 28
            ? 'hidden'
            : '';
        if (marker === 'tea' || marker === 'burger')
          pin.dataset.side = left > cw * 0.72 ? 'left' : 'right';
      }
    };
    id = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  function moveCamera(view: View, duration = 0) {
    const camera = shot.current;
    camera.from = { ...camera.current };
    camera.goal = {
      x: bounds(view.x, -300, 300),
      y: bounds(view.y, -214, 214),
      zoom: bounds(view.zoom, 0.65, 2.55),
    };
    camera.started = performance.now();
    camera.duration = duration;
    if (!duration) camera.current = { ...camera.goal };
  }
  function zoomAt(factor: number, x?: number, y?: number) {
    const { w, h, cw, ch } = size.current;
    const current = shot.current.current;
    const zoom = bounds(current.zoom * factor, 0.65, 2.55);
    const zx = x === undefined ? 0 : ((x - cw / 2) * w) / cw;
    const zy = y === undefined ? 0 : ((y - ch / 2) * h) / ch;
    const compact = cw < 660 ? 0.83 : 1;
    const diff = (1 / current.zoom - 1 / zoom) / compact;
    moveCamera({ x: current.x + zx * diff, y: current.y + zy * diff, zoom });
  }
  useEffect(() => {
    const area = host.current;
    if (!area) return;
    const wheel = (event: WheelEvent) => {
      if (
        disabled ||
        !showUI ||
        !(event.target instanceof Element) ||
        event.target.closest('button,.venue-preview')
      )
        return;
      event.preventDefault();
      const box = area.getBoundingClientRect();
      zoomAt(
        Math.exp(-event.deltaY * 0.0013),
        event.clientX - box.left,
        event.clientY - box.top,
      );
      reset();
    };
    area.addEventListener('wheel', wheel, { passive: false });
    return () => area.removeEventListener('wheel', wheel);
  }, [disabled, showUI]);

  function press(event: ReactPointer<HTMLDivElement>) {
    if (disabled || !showUI || event.button !== 0) return;
    const state = drag.current;
    const p = { x: event.clientX, y: event.clientY };
    if (!state.points.size) {
      suppress.current = 0;
      state.start = p;
      state.moved = false;
      state.velocity = { x: 0, y: 0 };
    }
    state.last = performance.now();
    state.points.set(event.pointerId, p);
    if (state.points.size > 1) {
      state.moved = true;
      reset();
    }
    // Capture a pointer from the canvas. Buttons retain their normal click sequence.
    if (event.target === canvas.current)
      event.currentTarget.setPointerCapture(event.pointerId);
  }
  function hit(event: ReactPointer<HTMLDivElement>) {
    const area = event.currentTarget.getBoundingClientRect();
    const { w, h, cw, ch } = size.current;
    const { x, y, zoom } = shot.current.current;
    const scale = zoom * (cw < 660 ? 0.83 : 1);
    return pickCity(
      [
        x + (((event.clientX - area.left) * w) / cw - w / 2) / scale,
        y + (((event.clientY - area.top) * h) / ch - h / 2) / scale,
      ],
      event.pointerType === 'mouse' ? 0 : 3,
    );
  }
  function move(event: ReactPointer<HTMLDivElement>) {
    const state = drag.current;
    const old = state.points.get(event.pointerId);
    if (disabled || state.points.size > 2) return;
    if (!old) {
      if (event.pointerType !== 'mouse' || event.target !== canvas.current)
        return;
      const picked = hit(event);
      if (picked === hoverHit.current) return;
      if (picked === 'burger' || picked === 'tea') previewOn(picked);
      else if (hoverHit.current === 'burger' || hoverHit.current === 'tea')
        previewOff();
      hoverHit.current = picked;
      setActive(picked);
      if (canvas.current) canvas.current.style.cursor = picked ? 'pointer' : '';
      return;
    }
    const next = { x: event.clientX, y: event.clientY };
    state.points.set(event.pointerId, next);
    if (state.points.size === 2) {
      const other = [...state.points.entries()].find(
        ([id]) => id !== event.pointerId,
      )?.[1];
      if (!other) return;
      const area = event.currentTarget.getBoundingClientRect();
      zoomAt(
        distance(next, other) / Math.max(10, distance(old, other)),
        (next.x + other.x) / 2 - area.left,
        (next.y + other.y) / 2 - area.top,
      );
      return;
    }
    if (!state.moved && distance(next, state.start) < 6) return;
    state.moved = true;
    reset();
    const { w, h, cw, ch } = size.current;
    const cam = shot.current.current;
    const scale = cam.zoom * (cw < 660 ? 0.83 : 1);
    const dx = ((old.x - next.x) * w) / cw / scale,
      dy = ((old.y - next.y) * h) / ch / scale;
    moveCamera({ ...cam, x: cam.x + dx, y: cam.y + dy });
    const now = performance.now(),
      dt = Math.max(12, now - state.last);
    state.velocity = { x: dx / dt, y: dy / dt };
    state.last = now;
  }
  function release(event: ReactPointer<HTMLDivElement>) {
    const state = drag.current;
    if (!state.points.delete(event.pointerId) || state.points.size) return;
    if (state.moved) {
      suppress.current = performance.now() + 420;
      const cam = shot.current.current;
      if (event.type === 'pointerup' && performance.now() - state.last < 90)
        moveCamera(
          {
            ...cam,
            x: cam.x + bounds(state.velocity.x * 100, -48, 48),
            y: cam.y + bounds(state.velocity.y * 100, -48, 48),
          },
          360,
        );
    } else if (
      event.type === 'pointerup' &&
      (event.target === canvas.current || event.target === host.current)
    ) {
      const picked = hit(event);
      if (picked === 'burger' || picked === 'tea') previewOn(picked);
      else if (picked?.startsWith('team-')) {
        reset();
        onPerson(Number(picked.at(-1)));
      } else reset();
    }
  }
  function previewOn(id: Venue) {
    window.clearTimeout(hideTimer.current);
    setShowCampus(false);
    setPreview(id);
  }
  function previewOff() {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPreview(null), 420);
  }
  function choose(marker: Marker, event: React.MouseEvent<HTMLButtonElement>) {
    if (
      disabled ||
      (event.detail !== 0 && performance.now() < suppress.current)
    )
      return;
    if (marker.kind === 'venue') previewOn(marker.id as Venue);
    else if (marker.kind === 'team') {
      reset();
      onPerson(Number(marker.id.at(-1)));
    } else if (marker.id === 'campus') {
      reset();
      onCampus();
    } else {
      setPreview(null);
      setShowCampus((s) => !s);
    }
  }

  return (
    <div
      className={`city ${disabled ? 'locked' : ''}`}
      ref={host}
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && event.buttons === 0) {
          drag.current.points.delete(event.pointerId);
          setActive(null);
          hoverHit.current = null;
          previewOff();
        }
      }}
    >
      <canvas
        ref={canvas}
        className="city-canvas"
        aria-label="Пиксельная карта района Студенческой"
      />
      <div ref={haze} className="haze" aria-hidden="true" />
      <div className="map-shade" aria-hidden="true" />
      <div
        className={`pins ${showUI ? '' : 'off'}`}
        inert={disabled || !showUI}
        aria-hidden={disabled || !showUI}
      >
        {markers.map((marker) => (
          <div
            className={`pin ${marker.kind} ${marker.id} ${preview === marker.id ? 'open' : ''}`}
            key={marker.id}
            ref={(el) => {
              if (el) positions.current.set(marker.id, el);
              else positions.current.delete(marker.id);
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && marker.kind === 'venue')
                previewOn(marker.id as Venue);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') {
                setActive(null);
                if (marker.kind === 'venue') previewOff();
              }
            }}
          >
            <button
              type="button"
              className="pin-button"
              aria-label={marker.label}
              aria-expanded={
                marker.kind === 'venue'
                  ? preview === marker.id
                  : marker.id === 'metro'
                    ? showCampus
                    : undefined
              }
              onFocus={() => {
                setActive(marker.id);
              }}
              onBlur={() => setActive(null)}
              onPointerEnter={() => setActive(marker.id)}
              onClick={(event) => choose(marker, event)}
            >
              {marker.kind === 'team' ? (
                <>
                  <span className="pin-dot">{marker.short}</span>
                  <span className="person-tooltip">{marker.label} ↗</span>
                </>
              ) : (
                <>
                  <span className="pin-icon" aria-hidden="true">
                    {marker.id === 'burger' || marker.id === 'tea' ? (
                      <i className={`venue-symbol ${marker.id}`} />
                    ) : marker.id === 'metro' ? (
                      'М'
                    ) : (
                      '▥'
                    )}
                  </span>
                  <span>
                    <b>{marker.label}</b>
                    <small>{marker.short}</small>
                  </span>
                </>
              )}
            </button>
            {marker.kind === 'venue' && preview === marker.id && (
              <button
                type="button"
                className="venue-preview"
                aria-label={`Открыть исследование ${marker.label}`}
                onClick={() => {
                  if (performance.now() >= suppress.current) {
                    reset();
                    onVenue(marker.id as Venue);
                  }
                }}
              >
                <Photo
                  file={venues[marker.id as Venue].photo}
                  name={marker.label}
                  tone={marker.id as Venue}
                />
                <strong>{marker.label}</strong>
                <span>
                  Открыть исследование <b aria-hidden="true">↗</b>
                </span>
              </button>
            )}
            {marker.id === 'metro' && showCampus && (
              <div className="station-pop">
                Ленинская линия
                <br />
                пр. Карла Маркса × ул. Геодезическая
              </div>
            )}
          </div>
        ))}
      </div>
      {showUI && !disabled && (
        <div className="zoom" data-map-controls>
          <button
            aria-label="Приблизить карту"
            onClick={() => {
              zoomAt(1.2);
              reset();
            }}
          >
            +
          </button>
          <button
            aria-label="Отдалить карту"
            onClick={() => {
              zoomAt(1 / 1.2);
              reset();
            }}
          >
            −
          </button>
          <button
            aria-label="Вернуть общий план"
            onClick={() => {
              moveCamera(home, 520);
              reset();
            }}
          >
            ⌖
          </button>
        </div>
      )}
    </div>
  );
}
