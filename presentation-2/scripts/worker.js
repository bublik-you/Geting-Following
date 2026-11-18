const scope = new URL(self.registration.scope);
const prefix = `geting-following-presentation-2:${scope.href}:`;
const cacheName = prefix + VERSION;
const assets = new Set(FILES.map((file) => new URL(file, scope).href));
const index = new URL('index.html', scope);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assets].map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName)
      .map((key) => caches.delete(key)));
  })());
});

async function serveCached(request, key) {
  const response = await caches.match(key, { cacheName });
  if (!response) return fetch(request);

  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('Range') ?? '');
  if (!range) return response;

  const media = await response.blob();
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), media.size - 1) : media.size - 1;
  if (start > end)
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${media.size}` } });

  return new Response(media.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': media.type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${media.size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(scope.href)) return;

  url.search = '';
  const key = url.pathname === scope.pathname ? index.href : url.href;
  if (assets.has(key)) event.respondWith(serveCached(request, key));
});
