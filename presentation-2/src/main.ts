import './style.css';
import './scenes.css';
import { registerOffline } from './offline';
import { scenes } from './scenes';
import { chapterPlan, chapterStart, clock, totalSeconds } from './content';
import { all, el, reducedMotion } from './scenes/common';

const notesKey = 'infographics-presentation-2-notes';
type SpeakerState = { index: number; started: number | null };

function speakerWindow() {
  document.body.innerHTML = '<main class="speaker-window"><header><div><p>Заметки докладчика</p><h1></h1></div><output></output></header><p class="speaker-cue"></p><div class="speaker-speech"></div><p class="speaker-next"></p></main>';
  const root = el(document, '.speaker-window');
  function update() {
    let data: SpeakerState = { index: 0, started: null };
    try {
      const value = JSON.parse(localStorage.getItem(notesKey) ?? 'null');
      if (value && chapterPlan[value.index]) data = value;
    } catch { /* Notes remain usable when storage is unavailable. */ }
    const { index, started } = data;
    const chapter = chapterPlan[index];
    el(root, 'h1').textContent = chapter.title;
    el(root, 'output').textContent = `${clock(elapsed(started))} / ${clock(totalSeconds)}`;
    el(root, '.speaker-cue').textContent = `${clock(chapterStart(index))}–${clock(chapterStart(index) + chapter.seconds)} · ${chapter.cue}`;
    el(root, '.speaker-speech').textContent = chapter.speech;
    el(root, '.speaker-next').textContent = chapterPlan[index + 1] ? `Далее · ${chapterPlan[index + 1].title}` : 'Финальная сцена';
  }
  update();
  window.addEventListener('storage', update);
  window.setInterval(update, 500);
}

const elapsed = (started: number | null) => started === null ? 0 : Math.floor(Math.max(0, Date.now() - started) / 1000);

function presentation() {
  const root = el(document, '#presentation-2');
  const stage = el(root, '#scene');
  const menu = el<HTMLDialogElement>(root, '#menu');
  const time = el<HTMLOutputElement>(root, '#clock');
  const start = el<HTMLButtonElement>(root, '#present');
  const skip = el<HTMLButtonElement>(root, '#skip');
  const soundButton = el<HTMLButtonElement>(root, '#sound');
  const progress = el(root, '#progress');
  const list = el(root, '#chapter-list');

  let index = 0;
  let lifetime = new AbortController();
  let started: number | null = null;
  let soundOn = false;
  let audio: AudioContext | undefined;

  function sync() {
    try { localStorage.setItem(notesKey, JSON.stringify({ index, started } satisfies SpeakerState)); } catch { /* Storage is optional. */ }
  }
  function updateClock() {
    const seconds = elapsed(started);
    time.value = `${clock(seconds)} / ${clock(totalSeconds)}`;
    time.classList.toggle('overtime', started !== null && seconds >= totalSeconds);
  }
  function tone(kind: 'tap' | 'complete' = 'tap') {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const ctx = audio;
    for (const [step, pitch] of (kind === 'complete' ? [440, 587, 659] : [330]).entries()) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + step * 0.07;
      oscillator.type = 'sine';
      oscillator.frequency.value = pitch;
      gain.gain.setValueAtTime(.001, at);
      gain.gain.exponentialRampToValueAtTime(.055, at + .025);
      gain.gain.exponentialRampToValueAtTime(.001, at + .17);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + .18);
    }
  }
  function toggleSound() {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
    soundButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z${soundOn ? 'M16 9q4 3 0 6m2-9q7 6 0 12' : 'M17 9l4 6m0-6-4 6'}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (!soundOn) return;
    try {
      audio ??= new AudioContext();
      void audio.resume().then(() => tone()).catch(() => {});
    } catch { /* Presentation remains available without Web Audio. */ }
  }
  function resize() { stage.style.setProperty('--viewport-height', `${innerHeight}px`); }
  function showScene(position: number, reset = false) {
    const current = scenes[position];
    if (!current) return;
    const oldIndex = index;
    lifetime.abort();
    lifetime = new AbortController();
    const { signal } = lifetime;
    index = position;
    if (reset) current.reset();
    stage.replaceChildren();
    stage.setAttribute('aria-label', chapterPlan[index].title);
    stage.dataset.index = String(index + 1);
    current.mount(stage, {
      signal,
      next: () => { if (!signal.aborted) showScene(position + 1); },
      restart: () => { if (!signal.aborted) showScene(position, true); },
      sound: tone,
    });
    if (!reducedMotion()) {
      const direction = position < oldIndex ? -1 : 1;
      const transition = stage.animate(
        [{ opacity: .35, transform: `translateY(${direction * 11}px) scale(.995)` }, { opacity: 1, transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(.2,.75,.24,1)' },
      );
      signal.addEventListener('abort', () => transition.cancel(), { once: true });
    }
    skip.hidden = index === scenes.length - 1;
    for (const button of all<HTMLButtonElement>(root, '[data-chapter]')) {
      if (Number(button.dataset.chapter) === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    sync();
  }
  for (const [i, chapter] of chapterPlan.entries()) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.dataset.chapter = String(i);
    marker.title = chapter.title;
    marker.setAttribute('aria-label', `Сцена ${i + 1} · ${chapter.short}`);
    marker.addEventListener('click', () => showScene(i));
    progress.append(marker);
    const row = document.createElement('li');
    row.innerHTML = `<button data-chapter="${i}"><span>${chapter.title}</span><time>${clock(chapterStart(i))}</time></button>`;
    el(row, 'button').addEventListener('click', () => { menu.close(); showScene(i); });
    list.append(row);
  }
  function fullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void root.requestFullscreen?.().catch(() => {});
  }
  el(root, '#home').addEventListener('click', () => showScene(0));
  el(root, '#scene-list').addEventListener('click', () => menu.showModal());
  el(root, '#fullscreen').addEventListener('click', fullscreen);
  el(root, '#restart').addEventListener('click', () => showScene(index, true));
  skip.addEventListener('click', () => showScene(index + 1));
  soundButton.addEventListener('click', toggleSound);
  start.addEventListener('click', () => {
    if (started !== null) {
      started = null;
      start.textContent = 'Начать выступление';
      start.removeAttribute('aria-pressed');
    } else {
      started = Date.now();
      for (const item of scenes) item.reset();
      showScene(0);
      start.textContent = 'Завершить';
      start.setAttribute('aria-pressed', 'true');
    }
    updateClock();
    sync();
  });
  window.addEventListener('keydown', (event) => {
    if (menu.open || event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable], [role="slider"]')) return;
    switch (event.key.toLowerCase()) {
      case 'arrowright': event.preventDefault(); showScene(index + 1); break;
      case 'arrowleft': event.preventDefault(); showScene(index - 1); break;
      case 'r': case 'к': showScene(index, true); break;
      case 'f': case 'а': fullscreen(); break;
      case 'm': case 'ь': toggleSound(); break;
    }
  });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  window.setInterval(updateClock, 200);
  updateClock();
  showScene(0);
  void registerOffline(el(root, '#offline-status'));
}

if (new URLSearchParams(location.search).get('mode') === 'notes') speakerWindow();
else presentation();
