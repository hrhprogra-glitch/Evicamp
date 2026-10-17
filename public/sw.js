// Service worker de SiuMax: modo sin internet (programa de PC y app instalada).
// - Guarda una COPIA COMPLETA del sistema en la PC (la lista y la versión las escribe vite.config.ts al compilar).
// - Con internet: las páginas se piden al servidor (así las actualizaciones llegan al instante).
// - Sin internet o con el servidor caído: se abre la copia guardada. Si el servidor tarda más de
//   4 s en responder, no se espera más (el 17/10/2026 el VPS no respondía y todo se quedaba colgado).
// - Los datos (/rest/v1/) NO pasan por aquí: los maneja el sistema.
const VERSION = '__VERSION__';
const ARCHIVOS = [/*__ARCHIVOS__*/];
const CACHE = `siumax-sistema-${VERSION}`;
const ESPERA_MAXIMA_MS = 4000;

self.addEventListener('install', (event) => {
  // cache: 'reload' para guardar los archivos nuevos del servidor, no los que el navegador ya tenía
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Borra las copias de versiones anteriores (y la del service worker antiguo)
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const conLimite = (promesa, ms) => new Promise((resolver, rechazar) => {
  const t = setTimeout(() => rechazar(new Error('el servidor no respondió a tiempo')), ms);
  promesa.then((r) => { clearTimeout(t); resolver(r); }, (e) => { clearTimeout(t); rechazar(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Datos y archivos que cambian: siempre al servidor, sin copia
  if (/^\/(rest|descargas|actualizaciones)\//.test(url.pathname) || url.pathname === '/suscripcion.json') return;

  // Páginas: primero el servidor (la versión más nueva); si no responde, la copia guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      conLimite(fetch(req), ESPERA_MAXIMA_MS)
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  // Archivos del sistema (JS, CSS, imágenes): la copia guardada; si no está, el servidor
  event.respondWith(caches.match(req).then((guardado) => guardado || fetch(req)));
});
