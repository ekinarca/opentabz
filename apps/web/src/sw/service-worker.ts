/**
 * The service worker (PLAT-001, PLAT-002, PLAT-004, PLAT-045): it keeps every file of the app
 * built (scripts, workers, fonts, the sound bank) so that OpenTabz opens and plays without a
 * network after its first visit; a new version installs beside the running one and takes over
 * only when the page asks (its "Reload" notice); files shared to the installed app arrive here and
 * are handed to the page. It talks to no server but the app's own.
 *
 * Built as a classic script by vite.config.ts (`serviceWorker`), which puts in the files to keep
 * and a version that changes with them. No imports: it runs on its own.
 */

/** Every file to keep, and a version that changes when any of them does (set at build time). */
declare const __PRECACHE__: readonly string[];
declare const __VERSION__: string;

interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

interface MessageEventLike extends ExtendableEventLike {
  readonly data: unknown;
}

interface ServiceWorkerScope {
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  skipWaiting(): Promise<void>;
  readonly clients: { claim(): Promise<void> };
  readonly location: Location;
}

const scope = self as unknown as ServiceWorkerScope;
const PREFIX = 'opentabz-app-';
const CACHE = `${PREFIX}${__VERSION__}`;
/** Files shared to the app, until the page takes them. */
const SHARED = 'opentabz-shared';

scope.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...__PRECACHE__])));
});

scope.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)),
        ),
      )
      .then(() => scope.clients.claim()),
  );
});

// A new version waits until the page asks for it, so that a score open is never cut short.
scope.addEventListener('message', event => {
  if (event.data === 'take-over') event.waitUntil(scope.skipWaiting());
});

/** Files shared to the installed app: kept for the page, which is opened to take them. */
async function share(request: Request): Promise<Response> {
  const form = await request.formData();
  const cache = await caches.open(SHARED);
  let count = 0;
  for (const value of form.getAll('files')) {
    if (typeof value === 'string') continue;
    await cache.put(
      `/shared/${String(count)}`,
      new Response(value, { headers: { 'X-File-Name': encodeURIComponent(value.name) } }),
    );
    count += 1;
  }
  const target = new URL('/', scope.location.origin);
  // No file: a shared link opens like "Open from a link".
  const link = [form.get('url'), form.get('text')].find(
    (value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value.trim()),
  );
  if (count > 0) target.searchParams.set('shared', String(count));
  else if (link !== undefined) target.searchParams.set('url', link.trim());
  return Response.redirect(target.href, 303);
}

/**
 * How kept files are matched: by address only. A server may answer "Vary: Origin", and scripts
 * loaded as modules are asked for with an Origin the files were not kept with.
 */
const MATCH = { cacheName: CACHE, ignoreVary: true } as const;

/** The app's page for every address of the app, from what is kept. */
async function page(request: Request): Promise<Response> {
  const kept = await caches.match('/index.html', MATCH);
  if (kept !== undefined) return kept;
  return fetch(request);
}

/** A file of the app: from what is kept, else from the network. */
async function file(request: Request): Promise<Response> {
  const kept = await caches.match(request, MATCH);
  return kept ?? fetch(request);
}

scope.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== scope.location.origin) return;
  if (request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(share(request));
    return;
  }
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') event.respondWith(page(request));
  else event.respondWith(file(request));
});
