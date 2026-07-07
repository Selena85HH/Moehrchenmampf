const CACHE_NAME = "moehrchenmampf-v29";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css?v=28",
  "./game.js?v=28",
  "./manifest.json",
  "./assets/logo-title.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/favicon.png",
  "./assets/icons/icon-original.png",
  "./assets/icons/icon.svg",
  "./assets/sounds/carrot.wav",
  "./assets/sounds/level-complete.wav",
  "./assets/sounds/game-over.wav",
  "./assets/sounds/countdown.wav",
  "./assets/sounds/click.wav",
  "./assets/sounds/start.wav",
  "./assets/sounds/pause.wav"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
