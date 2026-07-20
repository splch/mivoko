/* mivoko service worker — app-shell cache for offline use.
 * Cache-first for same-origin static assets. Cross-origin calls (LLM APIs,
 * InstantDB sync) bypass the cache and simply fail offline, which the app
 * already handles with status messages. */
'use strict';

// Bump the cache name on EVERY deploy that changes any precached asset —
// installed clients keep their old precache until this string changes.
const CACHE = 'mivoko-v10';
const ASSETS = [
  './',
  'index.html',
  'js/app.js', 'js/data.js', 'js/fsrs7.js', 'js/sync.js',
  'vendor/alpine.min.js', 'vendor/tailwind.js',
  'lists/en.txt', 'lists/zh.txt', 'lists/hi.txt', 'lists/es.txt', 'lists/ar.txt', 'lists/fr.txt',
  'lists/ja.txt', 'lists/ko.txt', 'lists/de.txt', 'lists/it.txt', 'lists/pt.txt',
  'icon.svg', 'manifest.webmanifest'
];

self.addEventListener('install', e => {
  // allSettled: one missing asset must not abort the whole install
  // (a single 404 during precache previously left devices with no cache at all)
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
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
