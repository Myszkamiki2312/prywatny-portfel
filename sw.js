// Service worker for the app shell.
//
// Deliberately network-first for everything it handles. This is a finance app: serving a stale
// app.js from cache after a deploy would be worse than being briefly offline, so the network
// always wins and the cache is only a fallback for when it is unreachable.
//
// Never touches /api/* or Supabase — quotes, state and auth must not be served from a cache.
// Bump CACHE_VERSION whenever the shell file list changes.

// v4 drops styles-modern.css and styles-xtb.css, which were folded into styles.css. A client
// holding the v3 shell would otherwise keep serving them from cache and keep the old skin.
const CACHE_VERSION = "v4";
const CACHE_NAME = `prywatny-portfel-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./supabase-config.js",
  "./styles.css",
  "./js/charts-pro.js",
  "./frontend/dashboard.js",
  "./frontend/operations.js",
  "./frontend/tools.js",
  "./frontend/reports.js",
  "./frontend/taxes.js",
  "./frontend/charts.js",
  "./frontend/metrics.js",
  "./manifest.json",
  "./icons/icon-192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll fails the whole install if any single asset 404s, so tolerate individual misses.
      await Promise.all(
        SHELL_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("prywatny-portfel-shell-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function isCacheable(request) {
  if (request.method !== "GET") {
    return false;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false; // Supabase, fonts, anything cross-origin: straight to the network.
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/backend/")) {
    return false; // live data must never come from a cache
  }
  return true;
}

self.addEventListener("fetch", (event) => {
  if (!isCacheable(event.request)) {
    return;
  }
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        if (event.request.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) {
            return shell;
          }
        }
        throw error;
      }
    })()
  );
});
