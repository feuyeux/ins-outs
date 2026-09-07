import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const lists = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? files(`${dir}/${e.name}`)
        : Promise.resolve([`${dir}/${e.name}`]),
    ),
  );
  return lists.flat().filter((f) => !f.endsWith("/sw.js"));
}
const paths = await files("dist");
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile(path));
const cacheName = `river-${hash.digest("hex").slice(0, 12)}`;
const urls = ['./', ...paths.map((p) => "./" + p.slice(5))];
const code = `const CACHE = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('river-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/socket.io/') || url.pathname.startsWith('/health')) return;
  event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : Response.error())));
});`;
await writeFile("dist/sw.js", code);
console.log(`Offline cache: ${urls.length} assets, ${cacheName}`);
