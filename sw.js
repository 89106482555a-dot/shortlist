// EventLab — офлайн-режим. Страница берётся из сети (чтобы обновления приходили сразу),
// а без интернета открывается сохранённая копия. Шрифты и иконки кешируются.
const CACHE = 'shotlist-v8';
const CORE = ['./', 'index.html', 'manifest-v2.webmanifest', 'icons/icon-192-v4.png', 'icons/icon-512-v4.png', 'icons/apple-touch-icon-v4.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'shotlist-cal').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).pathname.endsWith('/cal.html')) return; // страница календаря не должна подменять копию приложения
  if (new URL(req.url).pathname.endsWith('/event.ics')) { // файл календаря готовит cal.html прямо на устройстве
    e.respondWith(caches.open('shotlist-cal').then(c => c.match('event.ics')).then(r => r || new Response('Нет данных календаря', { status: 404 })));
    return;
  }
  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    // сначала сеть, без сети — копия
    e.respondWith(fetch(req, { cache: 'no-store' }).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res;
    }).catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  // остальное: из кеша, в фоне обновляем
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
