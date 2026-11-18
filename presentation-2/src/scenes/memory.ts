import { after, all, bind, drag, el, frame, icons, point, scene } from './common';

const pairs = [
  { word: 'Рост', detail: 'Восходящая линия передаёт изменение во времени.', hint: 'Восходящая линия', icon: icons.line },
  { word: 'Связь', detail: 'Соединение показывает, какие узлы относятся друг к другу.', hint: 'Соединённые узлы', icon: icons.nodes },
  { word: 'Выбор', detail: 'Развилка показывает несколько возможных направлений.', hint: 'Развилка', icon: icons.fork },
  { word: 'Память', detail: 'Сеть образов даёт несколько опор для воспоминания.', hint: 'Сеть связанных образов', icon: icons.memory },
];
const order = [2, 0, 3, 1];

export const memory = scene(() => ({ matched: new Set<number>(), selected: -1 }), (stage, { signal, next, sound }, state) => {
  frame(stage, {
    name: 'memory', label: '05 / 08 · Память', title: 'Связать слово <em>с образом</em>',
    copy: 'Перетащите понятие к рисунку. Можно также нажать на два элемента по очереди.',
    body: `<div class="memory-board">
      <svg class="memory-thread" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="concepts"><span class="micro-label">Понятия</span>${pairs.map(({ word, icon }, i) => `<button type="button" data-word="${i}"><span class="word-mark" aria-hidden="true">${icon}</span>${word}<i></i></button>`).join('')}</div>
      <div class="memory-middle"><span aria-hidden="true">✧</span><p data-pair-feedback aria-live="polite"></p></div>
      <div class="images"><span class="micro-label">Образы</span>${order.map((i) => `<button type="button" data-image="${i}" aria-label="${pairs[i].hint}"><span>${pairs[i].icon}</span><i></i></button>`).join('')}</div>
    </div>
    <p class="memory-thesis">Запомнить изображение — не значит правильно понять информацию.</p>
    <p class="data-note">Это демонстрация связи между словом и образом.</p>`,
    actions: '<button class="soft" type="button" data-pair-hint>Подсказка</button><button class="soft" type="button" data-unlink hidden>Разъединить</button><button class="primary" type="button" data-stretch hidden>Вытянуть линию в ось</button>',
  });
  const board = el(stage, '.memory-board');
  const wires = el<SVGSVGElement>(board, '.memory-thread');
  const feedback = el(board, '[data-pair-feedback]');
  const words = all<HTMLButtonElement>(board, '[data-word]');
  const images = pairs.map((_, i) => el<HTMLButtonElement>(board, `[data-image="${i}"]`));
  let cursor: { x: number; y: number } | undefined;
  let active = -1;
  let leaving = false;
  let released = false;
  let newLink = -1;

  function connection(element: Element, side: number) {
    const rect = element.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    return {
      x: (rect.left + side * rect.width - boardRect.left) * 1000 / boardRect.width,
      y: (rect.top + rect.height / 2 - boardRect.top) * 500 / boardRect.height,
    };
  }
  function path(from: { x: number; y: number }, to: { x: number; y: number }, pending = false, enter = false) {
    const middle = (from.x + to.x) / 2;
    return `<path pathLength="1" class="${enter ? 'new-link ' : ''}${pending ? 'pending' : 'linked'}" d="M${from.x} ${from.y}C${middle} ${from.y} ${middle} ${to.y} ${to.x} ${to.y}"/>`;
  }
  function render() {
    if (released) return;
    for (const [i, word] of words.entries()) {
      const matched = state.matched.has(i);
      word.classList.toggle('matched', matched);
      word.setAttribute('aria-pressed', String(i === state.selected));
      images[i].classList.toggle('matched', matched);
    }
    wires.innerHTML = [...state.matched].map((i) => path(connection(words[i], 1), connection(images[i], 0), false, i === newLink)).join('')
      + (cursor && active >= 0 ? path(connection(words[active], 1), cursor, true) : '');
    el(stage, '[data-stretch]').hidden = state.matched.size < 1;
    el(stage, '[data-unlink]').hidden = state.matched.size < 1;
    el(stage, '[data-pair-hint]').hidden = state.matched.size === pairs.length;
  }
  function chooseWord(index: number) {
    if (state.matched.has(index) || released) return;
    state.selected = index;
    feedback.textContent = `Выберите образ для «${pairs[index].word.toLowerCase()}».`;
    render();
  }
  function join(index: number) {
    if (released) return;
    if (state.selected < 0) { feedback.textContent = 'Сначала выберите понятие слева.'; return; }
    if (state.selected !== index) {
      feedback.textContent = 'Эти элементы не образуют пару. Попробуйте другой рисунок.';
      return;
    }
    state.matched.add(index);
    newLink = index;
    state.selected = -1;
    feedback.textContent = pairs[index].detail;
    sound(state.matched.size === pairs.length ? 'complete' : 'tap');
    render();
    after(signal, () => { newLink = -1; render(); }, 520);
  }
  for (const [i, word] of words.entries()) {
    word.addEventListener('click', () => chooseWord(i), { signal });
    images[i].addEventListener('click', () => join(i), { signal });
    drag(word, signal, {
      start() {
        active = state.matched.has(i) ? -1 : i;
        if (active >= 0) chooseWord(i);
      },
      move(event) {
        if (active < 0) return;
        const { x, y } = point(event, board);
        cursor = { x: x * 1000, y: y * 500 };
        render();
      },
      end(event, cancelled) {
        const target = images.findIndex((image) => {
          const rect = image.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        });
        if (active >= 0 && cursor && !cancelled && target >= 0) join(target);
        active = -1;
        cursor = undefined;
        render();
      },
    });
  }
  bind(stage, '[data-pair-hint]', () => {
    const i = state.selected >= 0 ? state.selected : pairs.findIndex((_, index) => !state.matched.has(index));
    if (i < 0) return;
    state.selected = i;
    feedback.textContent = `«${pairs[i].word}» и ${pairs[i].hint.toLowerCase()}.`;
    render();
  }, signal);
  bind(stage, '[data-unlink]', () => {
    if (released) return;
    released = true;
    state.matched.clear();
    state.selected = -1;
    newLink = -1;
    wires.classList.add('released');
    board.classList.add('unpairing');
    el(stage, '[data-stretch]').hidden = true;
    el(stage, '[data-unlink]').hidden = true;
    feedback.textContent = 'Связи сняты. Понятия и образы снова разрознены.';
    after(signal, () => {
      released = false;
      wires.classList.remove('released');
      board.classList.remove('unpairing');
      render();
    }, 340);
  }, signal);
  bind(stage, '[data-stretch]', () => {
    if (leaving || !state.matched.size) return;
    leaving = true;
    stage.classList.add('thread-stretch');
    sound('complete');
    after(signal, next, 95);
  }, signal);
  const observer = new ResizeObserver(render);
  observer.observe(board);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  if (state.matched.size) feedback.textContent = state.matched.size === pairs.length ? 'Все четыре связи собраны.' : `Собрано ${state.matched.size} из ${pairs.length}.`;
  else feedback.textContent = 'Найдите первую пару.';
  render();
});
