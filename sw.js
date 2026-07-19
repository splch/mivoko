/* mivoko service worker — app-shell cache for offline use.
 * Cache-first for same-origin static assets. Cross-origin calls (LLM APIs,
 * InstantDB sync) bypass the cache and simply fail offline, which the app
 * already handles with status messages. */
'use strict';

// Bump the cache name on EVERY deploy that changes any precached asset —
// installed clients keep their old precache until this string changes.
const CACHE = 'mivoko-v3';
const ASSETS = [
  './',
  'index.html',
  'js/app.js', 'js/data.js', 'js/fsrs7.js', 'js/sync.js',
  'vendor/alpine.min.js', 'vendor/tailwind.js',
  'lists/en.txt', 'lists/zh.txt', 'lists/hi.txt', 'lists/es.txt', 'lists/ar.txt', 'lists/fr.txt',
  'icon.svg', 'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())
    )
  );
});
