/**
 * Service worker d'Edge.
 *
 * Deux régimes distincts, parce que les données n'ont pas la même durée de vie :
 * — les ressources de build (JS, CSS, polices, icônes) sont immuables, donc
 *   servies depuis le cache sans jamais interroger le réseau ;
 * — les pages sont servies par le réseau quand il répond, avec repli sur la
 *   dernière version en cache. Une prédiction périmée reste lisible hors ligne,
 *   mais on préfère toujours la fraîche quand elle est disponible.
 *
 * Les requêtes POST vers /api ne sont jamais mises en cache : une prédiction ou
 * un système réducteur doit être recalculé, pas rejoué.
 */

const VERSION = "edge-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/hors-ligne";

const PRECACHE = ["/", "/loto", "/sports", "/budget", OFFLINE, "/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/_next/image") ||
  /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE)) ?? Response.error()),
    );
  }
});
