import { useState } from 'react';
import {
  appendix,
  conclusions,
  localFile,
  media,
  narrator,
  riskGroups,
  research,
  summary,
  team,
  venues,
} from './data/content';
import type { Field, MediaCategory, Venue } from './data/content';
import { Avatar, Photo } from './City';
import { Metrics, RawJournal, WaitTable } from './Evidence';
import { chapters, number, timecode } from './story';

export function Fields({ fields }: { fields: Field[] }) {
  return (
    <dl className="fields">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={value ? '' : 'placeholder'}>
            {value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Tabs({
  active,
  onChange,
}: {
  active: Venue;
  onChange: (v: Venue) => void;
}) {
  return (
    <div className="tabs" role="group" aria-label="Заведение">
      {(Object.keys(venues) as Venue[]).map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === active}
          onClick={() => onChange(id)}
        >
          <i style={{ background: venues[id].color }} />
          {venues[id].name}
        </button>
      ))}
    </div>
  );
}

function Toolboard({ items }: { items: Field[] }) {
  const [selected, select] = useState<number | null>(null);
  return (
    <div className="toolboard">
      {items.map((item, index) => (
        <div className="note" key={item.label}>
          <button
            aria-expanded={index === selected}
            onClick={() => select(index === selected ? null : index)}
          >
            <span aria-hidden="true">
              {['◷', '♟', '▤', '▥', '✓', '×'][index]}
            </span>
            <b>{item.label}</b>
            <small aria-hidden="true">{selected === index ? '−' : '+'}</small>
          </button>
          {selected === index && (
            <p className={item.value ? '' : 'placeholder'}>
              {item.value || '—'}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function Team({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  const person = team[selected];
  return (
    <div className="team-layout">
      <div className="team-party" role="group" aria-label="Участники команды">
        {team.map((member, index) => (
          <button
            key={index}
            className={`member member-${index}`}
            aria-pressed={index === selected}
            aria-label={member.name || `Участник ${index + 1}`}
            onClick={() => onSelect(index)}
          >
            <Avatar id={index} action={index === selected ? 'wave' : 'idle'} />
            <span>{member.name.split(' ')[0]}<small>{member.role}</small></span>
          </button>
        ))}
      </div>
      <div className="detail team-detail">
        <h3>{person.name || `[Имя участника ${selected + 1}]`}</h3>
        <TeamTool key={selected} member={selected} />
        <Fields fields={person.fields} />
        {person.photo && (
          <Photo file={person.photo} name={person.name || 'Фото участника'} />
        )}
      </div>
    </div>
  );
}

function TeamTool({ member }: { member: number }) {
  const [count, setCount] = useState(0);
  return (
    <div className="team-tool">
      {member === 0 && <span className="stopwatch" aria-label="Секундомер"><i /></span>}
      {member === 1 && <span className="pixel-notebook">«Оплата картой или наличными?»</span>}
      {member === 2 && <button onClick={() => setCount(count + 1)}>Демо счётчика посетителей <b>{number(count)}</b> +</button>}
      {member === 3 && <span className="flow-demo" aria-label="Маршрут посетителя"><i /> <i /> <i /></span>}
    </div>
  );
}

function Portrait({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const { jobs, portrait } = research[venue];
  const job = jobs[selection];
  return (
    <div className="split">
      <div className="portrait">
        <div className="job-points" role="group" aria-label="Job stories">
          {jobs.map((item, index) => (
            <button aria-pressed={selection === index} key={item.label} onClick={() => select(index)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="detail">
        <div className={`job-stage interior-${venue}`} key={job.label}>
          <div className={`job-prop prop-${job.prop}`} aria-hidden="true" />
          <Avatar id={4 + selection} action="walk" />
          <b>{job.label}</b>
        </div>
        <p><small>Гипотеза клиентской задачи</small></p>
        <p>{job.value}</p>
        <small>{portrait}</small>
      </div>
    </div>
  );
}

function Journey({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const steps = research[venue].journey;
  return (
    <div className="journey">
      <div className={`mini-floor interior-${venue}`}>
        <div className="floor-furniture" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="journey-route" role="group" aria-label="Этапы клиентского пути">
          <div className="journey-customer" style={{ left: `${(selection + .5) / steps.length * 100}%` }}>
            <Avatar id={4} action="walk" />
          </div>
          {steps.map(({ label, critical }, index) => (
            <button aria-pressed={selection === index} key={label} onClick={() => select(index)} data-critical={critical}>
              <i aria-hidden="true">{['▥', '▤', '▦', '◷', '□', '↗'][index]}</i><span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="detail">
        <h3>{steps[selection].label} {steps[selection].critical && <small>· Момент истины</small>}</h3>
        <p>{steps[selection].text}</p>
      </div>
    </div>
  );
}

function Observations({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const items = research[venue].observations;
  const item = items[selection];
  return (
    <div className="split observations">
      <div className="observation-board">
        <div className={`observation-plan interior-${venue}`} aria-label="Схема заведения">
          <div className="floor-furniture" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="observation-narrator" style={{ left: `calc(${item.point.x}% - 30px)`, top: `calc(${item.point.y}% - 30px)` }}>
            <Avatar id={narrator} action="walk" />
          </div>
          {items.map(({ point, title, lines }, index) => (
            <button key={title} aria-label={title + ' на схеме'} aria-pressed={selection === index}
              style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => select(index)}>
              {lines.length ? '···' : '◆'}
            </button>
          ))}
        </div>
        <div className="selectors" role="group" aria-label="Наблюдения">
          {items.map(({ title }, index) => <button key={title} aria-pressed={selection === index} onClick={() => select(index)}>{title}</button>)}
        </div>
      </div>
      <div className="detail observation-detail">
        <h3>{item.title}</h3>
        <p><small>{item.kind}</small></p>
        {item.lines.length > 0 && <ul className="dialogue-lines">{item.lines.map((line) => <li key={line}>{line}</li>)}</ul>}
        <p><b>Заметка команды.</b> {item.note}</p>
      </div>
    </div>
  );
}

function Recommendations({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const items = research[venue].recommendations;
  const [ratings, setRatings] = useState<Partial<Record<number, { effort: number | null; effect: number | null }>>>(() => {
    try { return JSON.parse(localStorage.getItem(`recommendation-ratings-${venue}`) ?? '{}') ?? {}; } catch { return {}; }
  });
  const [after, setAfter] = useState(false);
  const item = items[selection];
  function rate(key: 'effort' | 'effect', value: string) {
    const current = ratings[selection] ?? { effort: item.effort, effect: item.effect };
    const next = { ...ratings, [selection]: { ...current, [key]: value ? Number(value) : null } };
    setRatings(next);
    try { localStorage.setItem(`recommendation-ratings-${venue}`, JSON.stringify(next)); } catch { /* Ratings still work for the current scene. */ }
  }
  const rated = items.map((entry, index) => ({ ...entry, ...ratings[index], index })).filter(
    ({ effort, effect }) =>
      effort !== null &&
      effect !== null &&
      effort >= 1 &&
      effort <= 5 &&
      effect >= 1 &&
      effect <= 5,
  );
  return (
    <div className="split recommendations">
      <div>
        <div className="matrix" aria-label="Матрица Эффект × Сложность">
          <span className="matrix-y">Эффект ↑</span>
          <span className="matrix-x">Сложность →</span>
          <div className="matrix-grid">
            {rated.length === 0 && <small>Оценки пока не выставлены</small>}
            {Array.from({ length: 25 }, (_, cell) => {
              const effect = 5 - Math.floor(cell / 5),
                effort = 1 + (cell % 5);
              return (
                <div key={cell}>
                  {rated
                    .filter(
                      (entry) =>
                        entry.effect === effect && entry.effort === effort,
                    )
                    .map((entry) => {
                      const index = entry.index;
                      return (
                        <button
                          key={index}
                          aria-label={`Рекомендация ${index + 1} в матрице`}
                          aria-pressed={selection === index}
                          onClick={() => select(index)}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="selectors recommendation-list"
          role="group"
          aria-label="Рекомендации"
        >
          {items.map(({ title }, index) => (
            <button
              key={index}
              aria-pressed={selection === index}
              onClick={() => select(index)}
            >
              {title || `[Рекомендация ${index + 1}]`}
            </button>
          ))}
        </div>
      </div>
      <div className="detail">
        <h3>{item.title}</h3>
        <button className="solution-preview" aria-pressed={after} onClick={() => setAfter(!after)}>
          <span aria-hidden="true">{after ? '▦' : '▤'}</span>
          <b>{after ? item.after : item.before}</b>
          <small>{after ? 'Показать проблему' : 'Показать прототип →'}</small>
        </button>
        <div className="rating-controls">
          {(['effect', 'effort'] as const).map((key) => <label key={key}>
            {key === 'effect' ? 'Эффект' : 'Сложность'}
            <select value={ratings[selection]?.[key] ?? item[key] ?? ''} onChange={(event) => rate(key, event.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((score) => <option key={score}>{score}</option>)}
            </select>
          </label>)}
        </div>
        <Fields fields={item.fields} />
      </div>
    </div>
  );
}

function Timeline() {
  const [active, select] = useState<{ venue: Venue; step: number }>({ venue: 'tea', step: 0 });
  const item = research[active.venue].quickWins[active.step];
  return (
    <div className="timeline">
      <div className="time-labels"><span>0 ч</span><span>12 ч</span><span>24 ч</span><span>48 ч</span></div>
      {(['tea', 'burger'] as const).map((venue) => (
        <div className="action-lane" key={venue}>
          <b>{venues[venue].name}</b>
          <div className="timeline-slots" role="group" aria-label={venues[venue].name}>
            {research[venue].quickWins.map((entry, step) => (
              <button key={entry.title} aria-pressed={active.venue === venue && active.step === step} onClick={() => select({ venue, step })}>
                <small>{entry.period}</small>{entry.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="detail"><h3>{item.title} · {item.period}</h3><Fields fields={item.fields} /></div>
    </div>
  );
}

function Risks() {
  const [selected, select] = useState(riskGroups[0].items[0]);
  return (
    <div className="split">
      <div className="risk-map">
        {riskGroups.map(({ title, items }) => (
          <div key={title} role="group" aria-label={title}>
            <h3>{title}</h3>
            {items.map((item) => <button key={item.label} aria-pressed={item === selected} onClick={() => select(item)}>{item.label}</button>)}
          </div>
        ))}
      </div>
      <div className="detail"><Fields fields={[selected]} /></div>
    </div>
  );
}

export function ChapterScene({
  index,
  venue,
  setVenue,
  member,
  setMember,
}: {
  index: number;
  venue: Venue;
  setVenue: (v: Venue) => void;
  member: number;
  setMember: (n: number) => void;
}) {
  const selected = index === 2 ? 'burger' : index === 3 ? 'tea' : venue;
  return (
    <div className={`chapter-inner theme-${selected}`}>
      <div className="chapter-heading">
        <div>
          <p className="eyebrow">
            <span>
              {number(index + 1)} / {number(chapters.length)}
            </span>
            {chapters[index].cue}
          </p>
          <h2 id="scene-title">{chapters[index].title}</h2>
          {index >= 2 && index <= 3 && (
            <p className="venue-address">{venues[selected].address}</p>
          )}
        </div>
        {index >= 4 && index <= 9 && (
          <Tabs active={selected} onChange={setVenue} />
        )}
      </div>
      <div className="chapter-content" key={selected}>
        {index === 1 && <Team selected={member} onSelect={setMember} />}
        {(index === 2 || index === 3) && (
          <div className="split context">
            <Photo
              file={venues[selected].photo}
              name={`Пиксельная иллюстрация · ${venues[selected].name}`}
              tone={selected}
            />
            <div className="detail">
              <Fields fields={research[selected].context} />
            </div>
          </div>
        )}
        {index === 4 && <Toolboard items={research[selected].method} />}
        {index === 5 && <Portrait venue={selected} />}
        {index === 6 && <Journey venue={selected} />}
        {index === 7 && <Metrics venue={selected} />}
        {index === 8 && <Observations venue={selected} />}
        {index === 9 && <Recommendations venue={selected} />}
        {index === 10 && <Timeline />}
        {index === 11 && <Risks />}
        {index === 12 && (
          <div className="conclusions">
            <Fields fields={conclusions} />
            <p>Спасибо за внимание!</p>
          </div>
        )}
      </div>
    </div>
  );
}

const mediaLabels: Record<MediaCategory, string> = {
  burger: 'Burger King',
  tea: 'Молочай',
  team: 'Команда',
  observations: 'Наблюдения',
  screenshots: 'Скриншоты',
  extra: 'Дополнительные материалы',
};
export function Appendix() {
  return (
    <>
      <h2 id="dialog-title">Приложения</h2>
      <div className="appendix-list">
        <details><summary>Полевые записи</summary><RawJournal /></details>
        <details><summary>Таблицы замеров и расчёт</summary><WaitTable /></details>
        <details><summary>Дополнительный график и оценки</summary><Metrics venue="tea" /></details>
        {appendix.map((entry) => (
          <details key={entry.title}>
            <summary>{entry.title}</summary>
            <p>{entry.text || '[Добавить материал]'}</p>
            {localFile(entry.file) && (
              <a href={localFile(entry.file)} download={entry.file.split('/').at(-1)} target="_blank" rel="noreferrer">
                Открыть файл ↗
              </a>
            )}
          </details>
        ))}
      </div>
      <h3>Медиатека</h3>
      <div className="appendix-list">
        {(Object.keys(media) as MediaCategory[]).filter((id) => media[id].length > 0).map((id) => (
          <details key={id}>
            <summary>{mediaLabels[id]}</summary>
            <div className="media-grid">
              {media[id].map((item) => (
                <Photo key={item.file} name={item.alt} file={item.file} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

export function Summary() {
  return (
    <main className="summary-page">
      <nav className="paper-actions">
        <a href={location.pathname}>← К презентации</a>
        <button onClick={() => window.print()}>Печать / PDF</button>
      </nav>
      <p className="eyebrow">Executive summary</p>
      <h1>4 кота — Бизнес-разведка</h1>
      <p>Burger King и «Молочай» · Новосибирск</p>
      <Fields fields={summary} />
      <h2>Три ключевых вывода</h2>
      <Fields fields={conclusions} />
    </main>
  );
}

export type SpeakerState = {
  index: number;
  started: number | null;
  page: number;
};
export const notesKey = 'geting-following-speaker';
export const initialNotes: SpeakerState = { index: 0, started: null, page: 0 };
export function Notes({
  state,
  elapsed,
}: {
  state: SpeakerState;
  elapsed: number;
}) {
  const { index, page } = state;
  const chapter = chapters[index];
  const start = chapters
    .slice(0, index)
    .reduce((total, item) => total + item.seconds, 0);
  return (
    <main className="summary-page notes-page">
      <nav className="paper-actions">
        <a href={location.pathname}>← К презентации</a>
        <strong>{timecode(elapsed)} / 07:00</strong>
      </nav>
      <p className="eyebrow">
        Заметки докладчика · {number(index + 1)} / {number(chapters.length)}
      </p>
      <h1>{chapter.menu}</h1>
      <p>
        По плану {timecode(start)}–{timecode(start + chapter.seconds)} ·{' '}
        {chapter.seconds} с
      </p>
      <p>{chapter.notes || '[Добавить заметки к разделу]'}</p>
      <h2>Текст защиты</h2>
      <p>{chapter.speech}</p>
      <h2>Текущая реплика</h2>
      <p>{chapter.lines[page]?.text || '—'}</p>
      <h2>Следующий раздел</h2>
      <p>{chapters[index + 1]?.menu || '—'}</p>
    </main>
  );
}
