/* Bedlisium V13 — PWA Service Worker v5 (Tam Offline — Sistem Fontları) */
const CACHE = "bdls-v13-cache-v5";
const CORE = ["/", "/manifest.json", "/favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (e.request.method !== "GET") return;
  if (url.includes("/api/download")) return;
  if (url.startsWith("ws://") || url.startsWith("wss://")) return;

  /* API istekleri — önce ağ, hata olursa önbellek */
  if (url.includes("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Dış API'ler (hava, harita) — önce ağ, sonra önbellek */
  if (
    url.includes("open-meteo.com") ||
    url.includes("nominatim.openstreetmap.org") ||
    url.includes("tile.openstreetmap.org")
  ) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Tüm uygulama dosyaları — önce önbellek, arka planda güncelle */
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then(res => {
          if (res && res.status === 200) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);

      /* Önbellekte varsa hemen ver, yoksa ağdan bekle */
      return cached || networkFetch;
    })
  );
});

/* İlk yüklemede tüm sayfaları önbelleğe al */
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "CACHE_ALL") {
    const pages = [
      "/", "/manifest.json", "/favicon.png",
      "/feature/2D-Tarama", "/feature/3D-Tarama", "/feature/4D-Tarama",
      "/feature/Termal-Kamera", "/feature/Manyetometre", "/feature/GPR-Radar",
      "/feature/su-kaynagi", "/feature/Harita", "/feature/Metal-Goruntulem",
      "/feature/Sismik", "/feature/Spektrum", "/feature/Kilavuz",
      "/feature/Arsiv", "/feature/Ozellikler", "/feature/Sistem",
    ];
    caches.open(CACHE).then(c => c.addAll(pages).catch(() => {}));
  }
});
