// Service worker – caches the app shell and chapter data for offline use
const CACHE_NAME = 'ad-guide-v3';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  (event as any).waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event) => {
  (event as any).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  (self as any).clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = (event as FetchEvent).request;
  const url = new URL(req.url);

  // Network-first for navigation
  if (req.mode === 'navigate') {
    (event as any).respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for chapter data chunks and assets
  // Chapters are code-split by Vite as /assets/chapter-*.js
  const isChapterData = url.pathname.includes('/assets/');
  if (isChapterData) {
    (event as any).respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default: cache-first for other assets
  (event as any).respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
