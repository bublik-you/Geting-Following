import { useState } from 'react';
import {
  appendix,
  conclusions,
  localFile,
  media,
  research,
  summary,
  team,
  venues,
} from './data/content';
import type { Field, MediaCategory, Venue } from './data/content';
import { Avatar, Photo } from './City';
import { chapters, number, timecode } from './story';

export function Fields({ fields }: { fields: Field[] }) {
  return (
    <dl className="fields">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={value ? '' : 'placeholder'}>
            {value || '[Добавить данные]'}
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
              {item.value || '[Добавить данные]'}
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
            <span>{index === 0 ? 'Рассказчик' : `Участник ${index + 1}`}</span>
          </button>
        ))}
      </div>
      <div className="detail team-detail">
        <h3>{person.name || `[Имя участника ${selected + 1}]`}</h3>
        <Fields fields={person.fields} />
        {person.photo && (
          <Photo file={person.photo} name={person.name || 'Фото участника'} />
        )}
      </div>
    </div>
  );
}

function Portrait({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const { jobs, portrait } = research[venue];
  return (
    <div className="split">
      <div className="portrait">
        <Avatar id={2} />
        <div className="job-points" role="group" aria-label="Job stories">
          {jobs.map((job, index) => (
            <button
              aria-pressed={selection === index}
              key={job.label}
              onClick={() => select(index)}
            >
              {job.label}
            </button>
          ))}
        </div>
      </div>
      <div className="detail">
        <Fields fields={[...portrait, jobs[selection]]} />
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
        <div className="floor-furniture" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div
          className="journey-route"
          role="group"
          aria-label="Шаблон этапов пути"
        >
          {steps.map(({ label }, index) => (
            <button
              aria-pressed={selection === index}
              key={index}
              onClick={() => select(index)}
            >
              <i aria-hidden="true">
                {['▥', '▤', '▦', '◷', '□', '↗'][index % 6]}
              </i>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="detail">
        <h3>
          {steps[selection].label} <small>· Момент истины</small>
        </h3>
        <Fields fields={steps[selection].fields} />
      </div>
    </div>
  );
}

function Metrics({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const [compare, setCompare] = useState(false);
  const metrics = research[venue].metrics;
  const ids: Venue[] = compare ? ['burger', 'tea'] : [venue];
  const scale =
    metrics[selection].unit === '%'
      ? 100
      : Math.max(
          1,
          ...ids.map((id) => research[id].metrics[selection].value ?? 0),
        );
  return (
    <div className="split metric-layout">
      <div className="selectors" role="group" aria-label="Метрики">
        {metrics.map((metric, index) => (
          <button
            key={metric.label}
            aria-pressed={selection === index}
            onClick={() => select(index)}
          >
            {metric.label}
          </button>
        ))}
      </div>
      <div className="detail">
        <button
          aria-pressed={compare}
          className="compare"
          onClick={() => setCompare(!compare)}
        >
          Сравнить заведения
        </button>
        <div className="funnel" aria-label="Воронка визитов и покупок">
          {metrics.slice(0, 2).map((metric, index) => {
            const count = metrics[0].value;
            const width =
              metric.value === null || count === null || count <= 0
                ? 0
                : Math.min(100, (100 * metric.value) / count);
            return (
              <button
                key={metric.label}
                aria-pressed={selection === index}
                onClick={() => select(index)}
              >
                <span style={{ width: `${width}%` }} data-filled={width > 0} />
                <b>{index === 0 ? 'Визиты' : 'Покупки'}</b>
                <small>{metric.value ?? '—'}</small>
              </button>
            );
          })}
        </div>
        <h3>{metrics[selection].label}</h3>
        {ids.map((id) => {
          const metric = research[id].metrics[selection];
          const percent =
            metric.value === null
              ? 0
              : Math.min(100, (100 * Math.max(0, metric.value)) / scale);
          return (
            <div className="measure" key={id}>
              <div>
                <b>{venues[id].name}</b>
                <span>
                  {metric.value === null
                    ? 'Данные ожидаются'
                    : `${metric.value.toLocaleString('ru-RU')} ${metric.unit}`}
                </span>
              </div>
              <div aria-hidden="true" className="track">
                <i
                  style={{ width: `${percent}%`, background: venues[id].color }}
                />
              </div>
            </div>
          );
        })}
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
        <div className="observation-plan" aria-label="Схема заведения">
          {items.map(
            (entry, index) =>
              entry.point && (
                <button
                  key={index}
                  aria-label={`Наблюдение ${index + 1} на схеме`}
                  aria-pressed={selection === index}
                  style={{
                    left: `${entry.point.x}%`,
                    top: `${entry.point.y}%`,
                  }}
                  onClick={() => select(index)}
                >
                  {index + 1}
                </button>
              ),
          )}
        </div>
        <div className="selectors" role="group" aria-label="Наблюдения">
          {items.map(({ title }, index) => (
            <button
              key={index}
              aria-pressed={selection === index}
              onClick={() => select(index)}
            >
              {title || `[Наблюдение ${index + 1}]`}
            </button>
          ))}
        </div>
      </div>
      <div className="detail observation-detail">
        <Photo
          name={item.title || `Наблюдение ${selection + 1}`}
          file={item.photo}
          tone={venue}
        />
        <Fields fields={item.fields} />
      </div>
    </div>
  );
}

function Recommendations({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const items = research[venue].recommendations;
  const item = items[selection];
  const rated = items.filter(
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
            {rated.length === 0 && <small>[Добавить оценки 1–5]</small>}
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
                      const index = items.indexOf(entry);
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
        <h3>{item.title || `[Рекомендация ${selection + 1}]`}</h3>
        <Fields fields={item.fields} />
      </div>
    </div>
  );
}

function Timeline({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const entries = research[venue].quickWins;
  const item = entries[selection];
  return (
    <div className="timeline">
      <div className="time-labels">
        <span>0 ч</span>
        <span>24 ч</span>
        <span>48 ч</span>
      </div>
      <div className="time-track">
        {entries.map(
          ({ hour }, index) =>
            hour !== null &&
            hour >= 0 &&
            hour <= 48 && (
              <button
                key={index}
                style={{ left: `${(hour / 48) * 100}%` }}
                aria-label={`Мероприятие ${index + 1}, ${hour} ч`}
                aria-pressed={selection === index}
                onClick={() => select(index)}
              >
                {index + 1}
              </button>
            ),
        )}
      </div>
      <div
        className="selectors timeline-slots"
        role="group"
        aria-label="Мероприятия"
      >
        {entries.map(({ title }, index) => (
          <button
            key={index}
            aria-pressed={selection === index}
            onClick={() => select(index)}
          >
            {title || `[Мероприятие ${index + 1}]`}
          </button>
        ))}
      </div>
      <div className="detail">
        <Fields
          fields={[
            { label: 'Мероприятие', value: item.value },
            {
              label: 'Срок',
              value: item.hour === null ? '' : `${item.hour} ч`,
            },
          ]}
        />
      </div>
    </div>
  );
}

function Risks({ venue }: { venue: Venue }) {
  const [selection, select] = useState(0);
  const items = research[venue].risks;
  return (
    <div className="split">
      <div className="risk-map" role="group" aria-label="Неизвестные участки">
        {items.map(({ label }, index) => (
          <button
            key={label}
            aria-pressed={selection === index}
            onClick={() => select(index)}
          >
            <i aria-hidden="true">?</i>
            {label}
          </button>
        ))}
      </div>
      <div className="detail">
        <Fields fields={[items[selection]]} />
      </div>
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
        {index >= 4 && index <= 11 && (
          <Tabs active={selected} onChange={setVenue} />
        )}
      </div>
      <div className="chapter-content" key={index === 7 ? 'metrics' : selected}>
        {index === 1 && <Team selected={member} onSelect={setMember} />}
        {(index === 2 || index === 3) && (
          <div className="split context">
            <Photo
              file={venues[selected].photo}
              name={venues[selected].name}
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
        {index === 10 && <Timeline venue={selected} />}
        {index === 11 && <Risks venue={selected} />}
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
        {appendix.map((entry) => (
          <details key={entry.title}>
            <summary>{entry.title}</summary>
            <p>{entry.text || '[Добавить материал]'}</p>
            {localFile(entry.file) && (
              <a href={localFile(entry.file)} target="_blank" rel="noreferrer">
                Открыть файл ↗
              </a>
            )}
          </details>
        ))}
      </div>
      <h3>Медиатека</h3>
      <div className="appendix-list">
        {(Object.keys(media) as MediaCategory[]).map((id) => (
          <details key={id}>
            <summary>{mediaLabels[id]}</summary>
            {!media[id].length && <p>[Добавить материалы]</p>}
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
        <a href="./">← К презентации</a>
        <button onClick={() => window.print()}>Печать / PDF</button>
      </nav>
      <p className="eyebrow">Executive summary</p>
      <h1>Исследование клиентского опыта</h1>
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
        <a href="./">← К презентации</a>
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
      <h2>Текущая реплика</h2>
      <p>{chapter.lines[page]?.text || '—'}</p>
      <h2>Следующий раздел</h2>
      <p>{chapters[index + 1]?.menu || '—'}</p>
    </main>
  );
}
