import { useState } from 'react';
import { venues } from './data/content';
import type { Venue } from './data/content';
import {
  conversion, estimates, formatMean, meanWait, minuteOfDay, pairedOrders, sessions, upsell, waitMinutes,
} from './data/fieldwork';

const venueIds = ['tea', 'burger'] as const;

export function RawJournal() {
  return (
    <div className="journal">
      {sessions.map(({ venue, day, events, declared, note }) => (
        <details key={venue + day}>
          <summary>{day} ноября · {venues[venue].name}</summary>
          <p>По словам команды: {declared}. Диапазон отметок: {events[0][0]}–{events.at(-1)![0]}.</p>
          {note && <p>{note}</p>}
          <table>
            <thead><tr><th scope="col">Время</th><th scope="col">Событие</th></tr></thead>
            <tbody>{events.map(([time, text], i) => (<tr key={i}><td>{time}</td><td>{text}</td></tr>))}</tbody>
          </table>
        </details>
      ))}
    </div>
  );
}

export function WaitTable() {
  return (
    <div className="journal">
      {venueIds.map((venue) => {
        const orders = pairedOrders[venue];
        return (
          <div key={venue}>
            <h3>{venues[venue].name}</h3>
            <table>
              <thead><tr><th>Ноябрь</th><th>Заказ</th><th>Выдача</th><th>Минуты</th></tr></thead>
              <tbody>{orders.map((pair) => (
                <tr key={pair.join('-')}><td>{pair[0]}</td><td>{pair[1]}</td><td>{pair[2]}</td><td>{waitMinutes(pair)}</td></tr>
              ))}</tbody>
            </table>
            <p>({orders.map(waitMinutes).join(' + ')}) / {orders.length} ≈ {formatMean(venue)} мин.</p>
          </div>
        );
      })}
      <p>{sessions.find((s) => s.venue === 'burger' && s.day === 18)?.note}</p>
    </div>
  );
}

function EventTrack({ venue }: { venue: Venue }) {
  const [day, setDay] = useState<15 | 18>(15);
  const [selection, select] = useState(0);
  const session = sessions.find((item) => item.day === day && item.venue === venue)!;
  const { events } = session;
  const start = minuteOfDay(events[0][0]);
  const range = minuteOfDay(events.at(-1)![0]) - start || 1;
  const event = events[selection];
  return (
    <>
      <div className="selectors" role="group" aria-label="Даты">
        {([15, 18] as const).map((date) => (
          <button key={date} aria-pressed={day === date} onClick={() => { setDay(date); select(0); }}>{date} ноября</button>
        ))}
      </div>
      <p>По словам команды: {session.declared}. Диапазон отметок: {events[0][0]}–{events.at(-1)![0]}.</p>
      <div className="event-rail" aria-hidden="true">
        {events.map(([time], i) => <i key={i} className={i === selection ? 'active' : ''} style={{ left: `${100 * (minuteOfDay(time) - start) / range}%` }} />)}
      </div>
      <div className="selectors event-selectors" role="group" aria-label="События журнала">
        {events.map(([time, text], i) => (
          <button key={i} aria-label={`${time} — ${text}`} aria-pressed={i === selection} onClick={() => select(i)}>{time}</button>
        ))}
      </div>
      <p aria-live="polite"><strong>{event[0]}</strong> · {event[1]}</p>
      {session.note && <small>{session.note}</small>}
    </>
  );
}

export function Metrics({ venue }: { venue: Venue }) {
  const [view, setView] = useState('Среднее ожидание');
  const [selection, select] = useState(0);
  const orders = pairedOrders[venue];
  const order = orders[selection];
  const max = Math.max(...venueIds.flatMap((id) => pairedOrders[id].map(waitMinutes)));
  const tabs = ['Среднее ожидание', 'По заказам', 'Шкала событий', 'Этапы', 'Воронка', 'Оценки команды'];
  const burgerNote = sessions.find((s) => s.venue === 'burger' && s.day === 18)?.note;
  return (
    <div className="split metric-layout">
      <div className="selectors" role="group" aria-label="Метрики">
        {tabs.map((label) => (
          <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>
        ))}
      </div>
      <div className="detail metric-detail">
        <h3>{view}</h3>
        {view === tabs[0] && <>
          <div className="mean-chart" aria-label="Сравнение средних значений">
            {venueIds.map((id) => (
              <div className="measure" key={id}>
                <div><b>{venues[id].name}</b><span>{formatMean(id)} мин · n = {pairedOrders[id].length}</span></div>
                <div className="track" aria-hidden="true"><i style={{ width: `${100 * meanWait(id) / max}%`, background: venues[id].color }} /></div>
              </div>
            ))}
          </div>
          <p>От оформления до выдачи. Описательные результаты небольшой выборки.</p>
          <small>{burgerNote}</small>
        </>}
        {view === tabs[1] && <>
          <p>{venues[venue].name} · n = {orders.length}</p>
          <div className="order-chart" role="group" aria-label="Ожидание по заказам">
            {orders.map((pair, i) => (
              <button key={pair.join('-')} aria-pressed={i === selection} onClick={() => select(i)}>
                <span>{pair[1]} · {pair[0]} ноя.</span>
                <span className="order-track" aria-hidden="true"><i style={{ width: `${waitMinutes(pair) / max * 100}%` }} /></span>
                <b>{waitMinutes(pair)} мин</b>
              </button>
            ))}
          </div>
          <p aria-live="polite">{order[0]} ноября · {order[1]} → {order[2]} · {waitMinutes(order)} мин</p>
          {venue === 'burger' && <small>{burgerNote}</small>}
        </>}
        {view === tabs[2] && <EventTrack venue={venue} />}
        {view === tabs[3] && <>
          <ol className="order-stages"><li>Вход</li><li>Выбор</li><li>Оформление</li><li>Ожидание</li><li>Выдача</li></ol>
          <p>Хронометраж ожидания начинается после оформления. Время выбора и оформления измеряется отдельно.</p>
        </>}
        {view === tabs[4] && <>
          <dl className="fields">
            <div><dt>Уникальные визиты</dt><dd>{conversion.visits ?? '—'}</dd></div>
            <div><dt>Покупки</dt><dd>{conversion.purchases ?? '—'}</dd></div>
            <div><dt>Конверсия</dt><dd>{conversion.rate ?? '—'}</dd></div>
            <div><dt>Предложение доптовара</dt><dd>{upsell.offered}</dd></div>
            <div><dt>Принятие</dt><dd>{upsell.accepted}</dd></div>
          </dl>
          <small>{conversion.note}</small>
        </>}
        {view === tabs[5] && <>
          <p>Ориентиры команды по оформлению. Нужны повторные замеры.</p>
          {venueIds.map((id) => <p key={id}><b>{venues[id].name}</b> · {estimates[id].join(' · ')}</p>)}
        </>}
      </div>
    </div>
  );
}
