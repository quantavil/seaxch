/*
 * Service worker: precache the whole shell + seed (cache-first), so every load after the first is instant and
 * works offline. Cross-origin requests (the daily raw.githubusercontent.com check) are never intercepted.
 * Injected at build time: __PRECACHE__ (relative urls), __VERSION__ (content hash of the build).
 */
declare const __PRECACHE__: string[];
declare const __VERSION__: string;

const sw = globalThis as unknown as {
  registration: { scope: string };
  location: Location;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: string, fn: (e: any) => void): void;
};

const CACHE = "fh-" + __VERSION__;
const scope = sw.registration.scope;
const INDEX = new URL("index.html", scope).href;

/**
 * A response that followed a redirect (Pages serves /index.html via a redirect to /) is refused by the browser
 * for a navigation ("redirect mode is not follow"): the tab shows "site can't be reached", which is what a
 * mobile browser homepage hit. Re-wrap it so it is a plain response.
 */
const plain = async (res: Response): Promise<Response> =>
  res.redirected ? new Response(await res.blob(), { status: 200, statusText: res.statusText, headers: res.headers }) : res;

sw.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          __PRECACHE__.map(async (u) => {
            const url = new URL(u, scope).href;
            const res = await fetch(url, { cache: "reload" });
            if (!res.ok) throw new Error(`precache ${u}: ${res.status}`);
            await c.put(url, await plain(res));
          }),
        ),
      )
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fh-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("fetch", (e) => {
  const req: Request = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== sw.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      caches
        .match(INDEX)
        .then((hit) => (hit ? plain(hit) : fetch(req)))
        .catch(() => fetch(req)),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          // lazily fetched, content-hashed files (e.g. the NSFW list) are cached on first use
          if (res.ok) { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        }),
    ),
  );
});
