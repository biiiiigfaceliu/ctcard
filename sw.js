const CACHE = "citiao-shell-v2-2-20261111";
const FILES = ["./", "./index.html", "./layout.js", "./app.js", "./mobile.css", "./mobile.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
const urls = FILES.map(path => new URL(path, self.registration.scope).href);
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of urls) {
      const response = await fetch(new Request(url, {cache:"reload", credentials:"same-origin"}));
      if (!response.ok || response.redirected) throw new Error("Offline asset unavailable");
      const type = response.headers.get("content-type") || "";
      if (url.endsWith(".js") && !/javascript/.test(type)) throw new Error("Invalid script response");
      if (url.endsWith(".png") && !type.startsWith("image/")) throw new Error("Invalid image response");
      await cache.put(url, response);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith("citiao-shell-") && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Only the app shell is cached, never authentication pages or unrelated requests.
  const navigation = event.request.mode === "navigate" && (url.pathname === new URL("./", self.registration.scope).pathname || url.pathname === new URL("./index.html", self.registration.scope).pathname);
  if (!navigation && !urls.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(navigation ? new URL("./index.html", self.registration.scope).href : event.request);
    return cached || fetch(event.request);
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type !== "CHECK_OFFLINE") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const entries = await Promise.all(urls.map(url => cache.match(url)));
    event.ports[0]?.postMessage({ready:entries.every(Boolean)});
  })());
});
