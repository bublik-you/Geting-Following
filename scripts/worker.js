const scope = self.registration.scope;
const prefix = 'geting-following:' + scope;
const cacheName = prefix + VERSION;
const assets = new Set(FILES.map((file) => new URL(file, scope).href));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(
        [...assets].map((url) => new Request(url, { cache: 'reload' })),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(prefix) && name !== cacheName)
          await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

function rangeResponse(request, response) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!match) return response;
  return response.blob().then((blob) => {
    const start = Number(match[1]);
    const end = match[2]
      ? Math.min(Number(match[2]), blob.size - 1)
      : blob.size - 1;
    if (start > end)
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${blob.size}` },
      });
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      headers: {
        'Content-Type': blob.type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${blob.size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  const page =
    request.mode === 'navigate' &&
    (url.href.split('?')[0] === scope || url.pathname.endsWith('/index.html'));
  const key = page ? new URL('index.html', scope).href : url.href;
  if (!assets.has(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const response = await cache.match(key);
      if (!response) return fetch(request);
      return rangeResponse(request, response);
    })(),
  );
});
