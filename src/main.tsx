import { narrator, team } from './data/content';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { audio } from './audio';
import { Avatar, City } from './City';
import { localFile } from './data/content';
import type { Venue } from './data/content';
import {
  Appendix,
  ChapterScene,
  initialNotes,
  Notes,
  notesKey,
  Summary,
} from './Scenes';
import type { SpeakerState } from './Scenes';
import { chapters, defenseSeconds, number, timecode } from './story';
import { focus, home, points, wide } from './world';
import type { View } from './world';
import './style.css';

function elapsedSince(started: number | null) {
  return started === null
    ? 0
    : Math.max(0, Math.floor((Date.now() - started) / 1000));
}
function useElapsed(started: number | null) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(started));
  useEffect(() => {
    const refresh = () => setElapsed(elapsedSince(started));
    refresh();
    if (started === null) return;
    const timer = window.setInterval(refresh, 200);
    return () => window.clearInterval(timer);
  }, [started]);
  return elapsed;
}

function Dialog({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-inner">
        <button className="close-dialog" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        {children}
      </div>
    </dialog>
  );
}

function Speech({
  index,
  page,
  setPage,
  muted,
  enabled,
}: {
  index: number;
  page: number;
  setPage: (page: number) => void;
  muted: boolean;
  enabled: boolean;
}) {
  const lines = chapters[index].lines;
  const line = lines[page];
  const [count, setCount] = useState(0);
  const token = useRef(0);
  const recording = useRef<HTMLAudioElement | null>(null);
  const silence = useRef(muted);
  silence.current = muted;
  const chars = Array.from(line?.text ?? '');
  const src = localFile(line?.audio ?? '');
  useEffect(() => {
    token.current = 0;
    setCount(0);
    if (!enabled || !line?.text) return;
    const length = Array.from(line.text).length;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let voice: HTMLAudioElement | undefined;
    let interval = 0;
    const delay = window.setTimeout(() => {
      if (src) {
        voice = new Audio(src);
        voice.muted = silence.current;
        recording.current = voice;
        void voice.play().catch(() => {
          if (recording.current === voice) recording.current = null;
        });
      }
      if (reduce) {
        token.current = length;
        setCount(length);
        if (!src) audio.syllable(0);
        return;
      }
      interval = window.setInterval(() => {
        token.current++;
        setCount(token.current);
        if (!recording.current) audio.syllable(token.current - 1);
        if (token.current >= length) window.clearInterval(interval);
      }, 30);
    }, 320);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
      voice?.pause();
      recording.current = null;
    };
  }, [line, src, enabled]);
  useEffect(() => {
    if (recording.current) recording.current.muted = muted;
  }, [muted]);
  if (!line) return null;

  return (
    <aside className="speech">
      <div className="speaker">
        <Avatar
          id={narrator}
          action={count > 0 && count < chars.length ? 'talk' : 'idle'}
        />
      </div>
      <div className="bubble">
        <div className="speech-copy">
          <small>{team[narrator].name} · рассказчик</small>
          <p aria-hidden="true">
            {chars.slice(0, Math.min(count, chars.length)).join('')}
            {count < chars.length && <i className="caret" />}
          </p>
          <span className="sr-only">{line.text}</span>
        </div>
        {lines.length > 1 && (
          <div className="speech-controls">
            <button
              aria-label="Предыдущая реплика"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <span>
              {page + 1}/{lines.length}
            </span>
            <button
              aria-label="Следующая реплика"
              disabled={page === lines.length - 1}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SpeakerWindow() {
  const read = (): SpeakerState => {
    try {
      const item = JSON.parse(
        localStorage.getItem(notesKey) ?? 'null',
      ) as SpeakerState | null;
      return item && chapters[item.index] && typeof item.page === 'number'
        ? item
        : initialNotes;
    } catch {
      return initialNotes;
    }
  };
  const [state, setState] = useState(read);
  const elapsed = useElapsed(state.started);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === notesKey) setState(read());
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return <Notes state={state} elapsed={elapsed} />;
}

function App() {
  const [index, setIndex] = useState(0);
  const [member, setMember] = useState(narrator);
  const [venue, setVenue] = useState<Venue>('burger');
  const [page, setPage] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const elapsed = useElapsed(started);
  const [muted, setMuted] = useState(false);
  const [cached, setCached] = useState(Boolean(window.presentationMedia));
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState<'chapters' | 'appendix' | null>(null);
  const [instant, setInstant] = useState(false);
  const [transition, setTransition] = useState<
    'out' | 'out-short' | 'in' | 'idle'
  >('idle');
  const leaving = transition === 'out' || transition === 'out-short';
  const [camera, setCamera] = useState<{ view: View; ms: number }>({
    view: wide,
    ms: 0,
  });
  const [cityIntro, setCityIntro] = useState(true);
  const [full, setFull] = useState(false);
  const pending = useRef<number[]>([]);
  const intro = useRef<number[]>([]);
  const busy = useRef(false);
  const mapReturn = useRef(home);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clear = (timers: number[]) =>
    timers.forEach((timer) => window.clearTimeout(timer));

  useEffect(() => {
    if (reduce()) {
      setCamera({ view: home, ms: 0 });
      setCityIntro(false);
      return;
    }
    intro.current = [
      window.setTimeout(
        () => setCamera({ view: { x: -17, y: 10, zoom: 1.09 }, ms: 1600 }),
        150,
      ),
      window.setTimeout(() => setCamera({ view: home, ms: 1100 }), 1750),
      window.setTimeout(() => setCityIntro(false), 2300),
    ];
    return () => {
      clear(intro.current);
      clear(pending.current);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        notesKey,
        JSON.stringify({ index, started, page } satisfies SpeakerState),
      );
    } catch {
      /* Speaker window is optional when storage is disabled. */
    }
  }, [index, started, page]);
  useEffect(() => {
    const changed = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || window.presentationMedia) return;
    const workers = navigator.serviceWorker;
    const update = () => setCached(Boolean(workers.controller));
    update();
    workers.addEventListener('controllerchange', update);
    return () => workers.removeEventListener('controllerchange', update);
  }, []);

  function skipIntro() {
    if (!cityIntro) return;
    clear(intro.current);
    setCityIntro(false);
    setCamera({ view: home, ms: 360 });
  }
  function navigate(
    to: number,
    options: { skip?: boolean; person?: number; fromMap?: View } = {},
  ) {
    const returningToCity = to === 0;
    // A revealed chapter is interactive while its entrance fade is still running.
    const returningDuringEntrance =
      returningToCity && index !== 0 && transition === 'in';
    if (
      !chapters[to] ||
      (busy.current && !options.skip && !returningDuringEntrance)
    ) return;
    if (to === index && !busy.current) {
      if (options.person !== undefined) setMember(options.person);
      setMenu(null);
      return;
    }
    clear(intro.current);
    clear(pending.current);
    setCityIntro(false);
    setMenu(null);
    void audio.unlock();
    if (index === 0) mapReturn.current = cityIntro ? home : options.fromMap ?? home;
    const location = to === 2 ? 'burger' : to === 3 ? 'tea' : venue;
    const person = options.person ?? member;
    const noMotion = options.skip || reduce();
    const shot =
      to === 0
        ? mapReturn.current
        : to === 12
          ? focus(points.campus, 1.32)
          : focus(
              to === 1 ? points.team[person] : points[location],
              to <= 3 ? 1.65 : 1.22,
            );

    function reveal() {
      if (to === 2 || to === 3) setVenue(location);
      if (to === 1) setMember(person);
      setPage(0);
      setIndex(to);
    }
    if (noMotion) {
      busy.current = false;
      setCamera({ view: to === 12 ? wide : shot, ms: 0 });
      reveal();
      setTransition('idle');
      return;
    }
    busy.current = true;
    const cameraTravelMs = 820;
    const revealDelay = returningToCity ? 320 : 690;
    setTransition(returningToCity ? 'out-short' : 'out');
    audio.travel();
    if (!returningToCity) setCamera({ view: shot, ms: cameraTravelMs });
    pending.current = [
      window.setTimeout(
        () => {
          reveal();
          setTransition('in');
          if (returningToCity) setCamera({ view: shot, ms: cameraTravelMs });
          if (to === 12)
            setCamera({ view: { x: -48, y: -17, zoom: 0.68 }, ms: 2400 });
          audio.land();
        },
        revealDelay,
      ),
      window.setTimeout(
        () => {
          setTransition('idle');
          busy.current = false;
        },
        returningToCity ? revealDelay + cameraTravelMs : 1110,
      ),
    ];
  }
  function defense() {
    if (started !== null) {
      setStarted(null);
      setHidden(false);
      return;
    }
    void audio.unlock();
    setStarted(Date.now());
    navigate(0, { skip: busy.current });
    skipIntro();
  }
  function toggleSound() {
    if (muted) void audio.unlock();
    audio.setMuted(!muted);
    setMuted(!muted);
  }
  function fullscreen() {
    const app = document.querySelector('.app');
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else if (app?.requestFullscreen)
      void app.requestFullscreen().catch(() => setFull(false));
  }
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || menu) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (started === null) return;
        event.preventDefault();
        navigate(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
      if (event.key === 'Escape' && hidden) setHidden(false);
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });

  const isMap = index === 0;
  return (
    <div
      className={`app ${hidden ? 'clean' : ''}`}
      onPointerDownCapture={() => {
        void audio.unlock();
      }}
    >
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => navigate(0)}
          aria-label="Карта исследования"
        >
          <span className="brand-icon">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>4 КОТА</b>
            <small>БИЗНЕС-РАЗВЕДКА</small>
          </span>
        </button>
        <div className="top-actions">
          {cached && <span className="offline-ready" role="status">Готово офлайн</span>}
          <button
            className="mode-label"
            onClick={() => setMenu('chapters')}
            aria-label="Открыть разделы"
          >
            {started === null ? 'Исследование города' : 'Режим защиты'}
          </button>
          <button
            className="icon-button sound-button"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            onClick={toggleSound}
          >
            <span aria-hidden="true">{muted ? '♪×' : '♪'}</span>
          </button>
          <button
            className="icon-button"
            title={
              full ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'
            }
            aria-label={
              full ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'
            }
            onClick={fullscreen}
          >
            ⛶
          </button>
          <button className="primary" onClick={defense}>
            {started === null ? (
              <>
                <i aria-hidden="true" className="play-shape" /> Начать защиту
              </>
            ) : (
              'Завершить защиту'
            )}
          </button>
        </div>
      </header>

      <main
        className={`stage ${isMap ? 'map-mode' : 'chapter-mode'} ${index === 12 ? 'finale' : ''}`}
        aria-label={isMap ? 'Карта исследования' : chapters[index].title}
        onPointerDownCapture={skipIntro}
      >
        <City
          target={camera.view}
          duration={camera.ms}
          disabled={!isMap || transition !== 'idle'}
          showUI={isMap || index === 12}
          onVenue={(v, fromMap) => navigate(v === 'burger' ? 2 : 3, { fromMap })}
          onPerson={(person, fromMap) => navigate(1, { person, fromMap })}
          onCampus={(fromMap) => navigate(1, { fromMap })}
        />
        {isMap && (
          <div className="map-hud">
            <div className="map-title">
              <p className="eyebrow">
                <i /> Новосибирск · м. Студенческая
              </p>
              <h1>
                4 кота
                <br />
                Бизнес-разведка<span aria-hidden="true">.</span>
              </h1>
              <p className="subtitle">Клиентский опыт Burger King и «Молочая»</p>
            </div>
            <div className="map-guide">
              <span>
                <i className="legend-venue" />
                Заведения
              </span>
              <span>
                <i className="legend-team" />
                Команда
              </span>
            </div>
            <div className="compass">
              <b>С</b>
              <i />
              <span>54°59′ с. ш.</span>
            </div>
          </div>
        )}
        {!isMap && (
          <section
            className={`chapter chapter-${index}`}
            key={index}
            aria-labelledby="scene-title"
            inert={leaving}
          >
            <div className="chapter-nav">
              <button className="back" onClick={() => navigate(0)}>
                ← Назад в город
              </button>
            </div>
            <ChapterScene
              index={index}
              venue={venue}
              setVenue={setVenue}
              member={member}
              setMember={setMember}
            />
            <Speech
              key={`${index}-${page}`}
              index={index}
              page={page}
              setPage={setPage}
              muted={muted}
              enabled={!leaving}
            />
          </section>
        )}
        <div className={`curtain ${transition}`} aria-hidden="true" />
      </main>

      <footer className="footer">
        <div className="footer-start">
          <button className="sections" onClick={() => setMenu('chapters')}>
            <span aria-hidden="true">▤</span>
            <b>Разделы</b>
          </button>
          <button className="text-button" onClick={() => setMenu('appendix')}>
            Приложения
          </button>
        </div>
        <div
          className="section-progress"
          aria-label={`Раздел ${index + 1} из ${chapters.length}`}
        >
          <span>
            {number(index + 1)} / {number(chapters.length)}
          </span>
          <div className="segments">
            {chapters.map((chapter, step) => (
              <button
                key={step}
                title={chapter.menu}
                aria-label={`Раздел ${step + 1}. ${chapter.menu}`}
                aria-current={step === index ? 'step' : undefined}
                className={step <= index ? 'filled' : ''}
                onClick={() => navigate(step)}
              />
            ))}
          </div>
        </div>
        <div className="footer-end">
          {started !== null && (
            <>
              <time
                className={elapsed >= defenseSeconds ? 'overtime' : ''}
                aria-label="Таймер защиты"
              >
                {timecode(elapsed)} / {timecode(defenseSeconds)}
              </time>
              <a
                className="text-button"
                href="?mode=notes"
                target="geting-following-notes"
                rel="noopener"
              >
                Заметки
              </a>
              <button
                className="icon-button hide-control"
                title="Скрыть панель"
                aria-label="Скрыть панель"
                onClick={() => setHidden(true)}
              >
                ◫
              </button>
            </>
          )}
          <button
            className="icon-button nav-arrow"
            aria-label="Предыдущая сцена"
            disabled={index === 0}
            onClick={() => navigate(index - 1)}
          >
            ←
          </button>
          <button
            className="icon-button nav-arrow"
            aria-label="Следующая сцена"
            disabled={index === chapters.length - 1}
            onClick={() => navigate(index + 1)}
          >
            →
          </button>
        </div>
      </footer>
      {hidden && (
        <button
          className="restore"
          aria-label="Показать панель"
          title="Показать панель"
          onClick={() => setHidden(false)}
        >
          ◫
        </button>
      )}
      {menu === 'chapters' && (
        <Dialog onClose={() => setMenu(null)} label="Разделы исследования">
          <h2>Разделы исследования</h2>
          <label className="instant">
            <input
              type="checkbox"
              checked={instant}
              onChange={(event) => setInstant(event.target.checked)}
            />{' '}
            Перейти без анимации
          </label>
          <ol className="chapter-list">
            {chapters.map((chapter, i) => (
              <li key={i}>
                <button
                  aria-current={index === i ? 'step' : undefined}
                  onClick={() => navigate(i, { skip: instant })}
                >
                  <span>{number(i + 1)}</span>
                  <b>{chapter.menu}</b>
                  <small>{timecode(chapter.seconds)}</small>
                </button>
              </li>
            ))}
          </ol>
          <a
            className="paper-link"
            href="?mode=summary"
            target="_blank"
            rel="noopener"
          >
            Executive summary · печать и PDF ↗
          </a>
        </Dialog>
      )}
      {menu === 'appendix' && (
        <Dialog onClose={() => setMenu(null)} label="Приложения">
          <Appendix />
        </Dialog>
      )}
    </div>
  );
}

const mode = new URLSearchParams(location.search).get('mode');
if (import.meta.env.PROD && location.protocol !== 'file:' && !window.presentationMedia && 'serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () =>
      void navigator.serviceWorker
        .register(import.meta.env.BASE_URL + 'sw.js')
        .catch(() => {
          // Local HTTP hosting remains usable without a service worker.
        }),
  );
}
createRoot(document.getElementById('root')!).render(
  mode === 'summary' ? (
    <Summary />
  ) : mode === 'notes' ? (
    <SpeakerWindow />
  ) : (
    <App />
  ),
);
