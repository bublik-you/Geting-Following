import './style.css';
import { registerOffline } from './offline';
import { scenes } from './scenes';

const stage = document.querySelector<HTMLElement>('#scene')!;
const navigation = document.querySelector<HTMLElement>('nav')!;
const previous = document.querySelector<HTMLButtonElement>('#previous')!;
const next = document.querySelector<HTMLButtonElement>('#next')!;
const progress = document.querySelector<HTMLOutputElement>('#progress')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;

if (scenes.length > 0) {
  let index = 0;
  let lifetime: AbortController | undefined;

  function showScene(position: number) {
    const scene = scenes[position];
    if (!scene) return;

    lifetime?.abort();
    lifetime = new AbortController();
    stage.replaceChildren();
    stage.setAttribute('aria-label', scene.title);
    scene.mount(stage, lifetime.signal);

    index = position;
    previous.disabled = index === 0;
    next.disabled = index === scenes.length - 1;
    progress.value = `${index + 1} / ${scenes.length}`;
  }

  emptyState.hidden = true;
  stage.hidden = false;
  navigation.hidden = scenes.length < 2;
  previous.addEventListener('click', () => showScene(index - 1));
  next.addEventListener('click', () => showScene(index + 1));
  showScene(0);
}

void registerOffline(document.querySelector<HTMLElement>('#offline-status')!);
