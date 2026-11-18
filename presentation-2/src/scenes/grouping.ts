import { all, bind, drag, el } from './common';

export const groupsMarkup = `<dialog class="group-dialog" aria-labelledby="group-title">
  <div class="group-controls"><h2 id="group-title">Соберите группы</h2><form method="dialog"><button class="soft" aria-label="Закрыть группировку">×</button></form></div>
  <p>Перетащите метки или нажмите на метку и затем на область.</p>
  <div class="loose-group"></div>
  <div class="group-targets"><div data-zone="0"><button class="soft" data-group="0">Числа</button><div></div></div><div data-zone="1"><button class="soft" data-group="1">Отношения</button><div></div></div></div>
  <p data-group-status aria-live="polite"></p>
  <button class="soft" type="button" data-reset-groups>Разложить заново</button>
</dialog>`;

export function grouping(stage: HTMLElement, signal: AbortSignal, grouped: Set<number>, sound: () => void) {
  const dialog = el<HTMLDialogElement>(stage, '.group-dialog');
  const zones = all(dialog, '[data-zone]');
  const tray = el(dialog, '.loose-group');
  let selected = -1;
  let message = '';
  const buttons = ['72,8', 'Сравнение', '100', 'Рост'].map((text, i) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'group-chip';
    button.type = 'button';
    button.addEventListener('click', () => { selected = i; render(); }, { signal });
    let origin = { x: 0, y: 0 };
    drag(button, signal, {
      start(event) {
        origin = { x: event.clientX, y: event.clientY };
        selected = i;
        button.classList.add('group-dragging');
        render();
      },
      move(event) {
        button.style.setProperty('--pull-x', (event.clientX - origin.x) + 'px');
        button.style.setProperty('--pull-y', (event.clientY - origin.y) + 'px');
      },
      end(event, cancelled) {
        button.classList.remove('group-dragging');
        button.style.removeProperty('--pull-x');
        button.style.removeProperty('--pull-y');
        if (cancelled) { selected = -1; render(); return; }
        const hit = zones.findIndex((zone) => {
          const rect = zone.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        });
        if (hit >= 0) assign(hit);
      },
    });
    return button;
  });

  function render() {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(selected === i));
      const parent = grouped.has(i) ? el(zones[i % 2], 'div') : tray;
      if (button.parentElement !== parent) parent.append(button);
    });
    zones.forEach((zone, i) => zone.classList.toggle('group-formed', grouped.has(i) && grouped.has(i + 2)));
    el(dialog, '[data-group-status]').textContent = message || (grouped.size === 4 ? 'Две смысловые группы собраны.' : 'Соберите числа отдельно от отношений.');
  }
  function assign(group: number) {
    if (selected < 0) return;
    if (selected % 2 !== group) message = 'Попробуйте соседнюю группу.';
    else { grouped.add(selected); message = ''; sound(); }
    selected = -1;
    render();
  }

  for (const group of all(dialog, '[data-group]')) group.addEventListener('click', () => assign(Number(group.dataset.group)), { signal });
  bind(stage, '[data-groups]', () => { render(); dialog.showModal(); }, signal);
  bind(stage, '[data-reset-groups]', () => { grouped.clear(); selected = -1; message = ''; render(); }, signal);
}
