/* MyBusiness SW — secure, crash-safe, release-ready */
const VERSION = "v90";
const CACHE = `mybiz-${VERSION}`;
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-144.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon-180.png",
  "/favicon-48.png",
];
/* Build step (scripts/inject-precache.mjs) injects hashed JS/CSS asset URLs here
   so every code-split page works offline, not just ones visited online. */
const PRECACHE_ASSETS = [/* __PRECACHE_ASSETS__ */];
const ALLOWED_ORIGIN = self.location.origin;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled([...PRECACHE, ...PRECACHE_ASSETS].map((url) => c.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isAppAsset(pathname) {
  return pathname.startsWith("/assets/") || pathname.endsWith(".js") || pathname.endsWith(".css");
}

/** Safe cache put — never lets a failed write break respondWith */
function safePut(request, response) {
  return caches.open(CACHE)
    .then((c) => c.put(request, response))
    .catch(() => {});
}

/** Validate a URL is same-origin before we open it (security: push payload) */
function isSameOriginUrl(url) {
  try {
    return new URL(url, ALLOWED_ORIGIN).origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(ALLOWED_ORIGIN)) return;
  const url = new URL(request.url);

  // HTML navigation: network-first, offline fallback to cached shell.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) safePut(request, res.clone());
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // JS/CSS bundles: network-first to avoid stale deploy artefacts.
  if (isAppAsset(url.pathname)) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) safePut(request, res.clone());
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other same-origin resources: stale-while-revalidate.
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) safePut(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ── Push notifications ─────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = { title: "My Business", body: "You have a new alert." };
  if (e.data) {
    try { data = e.data.json(); }
    catch { data.body = e.data.text(); }
  }
  const title = (typeof data.title === "string" && data.title.trim()) ? data.title : "My Business";
  const body  = typeof data.body === "string" ? data.body : "";
  // Security: only allow same-origin notification click URLs.
  const notifUrl = (typeof data.url === "string" && isSameOriginUrl(data.url)) ? data.url : "/";
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: (typeof data.tag === "string" && data.tag) ? data.tag : "mybiz-alert",
      data: { url: notifUrl },
      renotify: true,
    })
  );
});

// ── postMessage: local alert from the app ─────────────────
self.addEventListener("message", (e) => {
  // Security: only trust messages from our own origin.
  if (e.origin && e.origin !== ALLOWED_ORIGIN) return;

  if (e.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (e.data?.type !== "SHOW_NOTIFICATION") return;
  const { title, body, tag } = e.data;
  self.registration
    .showNotification(typeof title === "string" && title ? title : "My Business", {
      body: typeof body === "string" ? body : "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: (typeof tag === "string" && tag) ? tag : "mybiz-alert",
      data: { url: "/" },
      renotify: true,
    })
    .catch(() => {});
});

// ── Notification click: focus or open the app ─────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const rawUrl = e.notification.data?.url;
  // Safety: only open same-origin URLs.
  const targetUrl = (typeof rawUrl === "string" && isSameOriginUrl(rawUrl)) ? rawUrl : "/";
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.startsWith(ALLOWED_ORIGIN));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});






