const CACHE_NAME = 'galaxy-calc-v9';
const URLS_TO_CACHE = [
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icon.png'
];

// インストール：必要なファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// フェッチ：Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // POSTなどはスキップ
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      // キャッシュがあればすぐ返しつつ、バックグラウンドで更新
      if (cachedResponse) {
        fetchPromise; // バックグラウンド更新
        return cachedResponse;
      }

      // キャッシュなし → ネットワーク優先、失敗時にオフラインフォールバック
      const networkResponse = await fetchPromise;
      if (networkResponse) return networkResponse;

      // 完全オフライン時：index.htmlを返す
      return cache.match('./index.html');
    })
  );
});
