export async function registerOffline(status: HTMLElement) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const base = new URL(import.meta.env.BASE_URL, location.href);
  const worker = new URL('sw.js', base);
  const registration = navigator.serviceWorker;

  function updateStatus() {
    status.textContent = registration.controller?.scriptURL === worker.href
      ? 'Готово офлайн'
      : 'Подготовка офлайн…';
  }

  status.hidden = false;
  registration.addEventListener('controllerchange', updateStatus);
  updateStatus();

  try {
    await registration.register(worker.href, { scope: base.href });
  } catch {
    if (registration.controller?.scriptURL !== worker.href)
      status.textContent = 'Офлайн-кэш недоступен';
  }
}
