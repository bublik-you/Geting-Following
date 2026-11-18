export interface SceneContext {
  signal: AbortSignal;
  next(): void;
  restart(): void;
  sound(kind?: 'tap' | 'complete'): void;
}
export interface Scene {
  mount(stage: HTMLElement, context: SceneContext): void;
  reset(): void;
}
export function scene<T>(initial: () => T, mount: (stage: HTMLElement, context: SceneContext, state: T) => void): Scene {
  let state = initial();
  return {
    mount: (stage, context) => mount(stage, context, state),
    reset: () => { state = initial(); },
  };
}

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const el = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector)!;
export const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => Array.from(root.querySelectorAll<T>(selector));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function point(event: PointerEvent, element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}
export function after(signal: AbortSignal, callback: () => void, ms: number) {
  if (signal.aborted) return;
  const cancel = () => clearTimeout(timer);
  const timer = window.setTimeout(() => {
    signal.removeEventListener('abort', cancel);
    callback();
  }, reducedMotion() ? 0 : ms);
  signal.addEventListener('abort', cancel, { once: true });
}
export function drag(
  element: HTMLElement,
  signal: AbortSignal,
  handlers: { start?(event: PointerEvent): void; move(event: PointerEvent): void; end?(event: PointerEvent, cancelled: boolean): void },
) {
  let pointer: number | undefined;
  let moved = false;
  let originX = 0;
  let originY = 0;
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointer !== undefined) return;
    pointer = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    moved = false;
    element.setPointerCapture(pointer);
    handlers.start?.(event);
  }, { signal });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    moved ||= Math.hypot(event.clientX - originX, event.clientY - originY) > 4;
    if (moved) handlers.move(event);
  }, { signal });
  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointer || (event.type === 'lostpointercapture' && event.target !== element)) return;
    pointer = undefined;
    handlers.end?.(event, event.type !== 'pointerup');
  };
  element.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  element.addEventListener('pointerup', finish, { signal });
  element.addEventListener('pointercancel', finish, { signal });
  element.addEventListener('lostpointercapture', finish, { signal });
  element.addEventListener('click', (event) => {
    if (moved && event.detail) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { signal, capture: true });
}

export function frame(stage: HTMLElement, options: {
  name: string; label: string; title: string; copy: string; body: string; dark?: boolean; actions?: string;
}) {
  stage.className = `stage scene-${options.name}${options.dark ? ' stage-dark' : ''}`;
  stage.innerHTML = `
    <div class="scene-label">${options.label}</div>
    <header class="scene-header"><h1>${options.title}</h1><p>${options.copy}</p></header>
    <div class="scene-body">${options.body}</div>
    ${options.actions ? '<div class="scene-actions">' + options.actions + '</div>' : ''}
  `;
}

export function bind(stage: ParentNode, selector: string, callback: () => void, signal: AbortSignal) {
  el(stage, selector).addEventListener('click', callback, { signal });
}

export const icons = {
  line: '<svg viewBox="0 0 120 76" fill="none"><path d="M14 10v51h90" stroke="currentColor" opacity=".32"/><path d="m19 55 24-15 17 5 30-28" stroke="currentColor" stroke-width="4"/><circle cx="90" cy="17" r="5" fill="currentColor"/></svg>',
  nodes: '<svg viewBox="0 0 120 76" fill="none"><path d="M23 38h33m9-2 27-20m-27 25 27 19" stroke="currentColor" stroke-width="2"/><circle cx="23" cy="38" r="7" fill="currentColor"/><circle cx="60" cy="38" r="10" fill="currentColor"/><circle cx="93" cy="14" r="7" fill="currentColor"/><circle cx="93" cy="61" r="7" fill="currentColor"/></svg>',
  fork: '<svg viewBox="0 0 120 76" fill="none"><path d="M19 38h29l28-22h23m-51 22 28 22h23m-12-8 12 8-12 8m0-60 12 8-12 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="38" r="5" fill="currentColor"/></svg>',
  memory: '<svg viewBox="0 0 120 76" fill="none"><path d="M21 18 57 38l38-23M24 58l33-20 40 21M22 18l2 40m71-43 2 44" stroke="currentColor" opacity=".65"/><rect x="13" y="10" width="17" height="16" rx="3" fill="currentColor"/><circle cx="23" cy="59" r="8" fill="currentColor"/><path d="m56 27 12 11-12 12-11-12zM95 6l10 18H85z" fill="currentColor"/><rect x="88" y="51" width="18" height="17" rx="4" fill="currentColor"/></svg>',
};
