/* Evolução: recursos de interface atualizados com prioridade para a rede. */
const CACHE = 'evolucao-app-v3-20261013';
const FILES = [
  './', './index.html', './styles.css?v=3', './app.js?v=3', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/apple-touch-icon.png', './apple-touch-icon.png', './apple-touch-icon-v2.png', './favicon.ico'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('evolucao-app-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const updatingAsset = request.mode === 'navigate' || /\.(?:js|css)$/.test(url.pathname);
  if (updatingAsset) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, clone)));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
  } else {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
