self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => console.log('User is offline')));
});
