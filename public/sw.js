// Service worker de SiuMax: hace que la app sea instalable SIN guardar copias del sistema.
// Todo se pide siempre al servidor, así cada actualización llega al instante.
// Solo si no hay internet al abrir la app se muestra una pantalla de "Sin conexión".
const CACHE = 'siuhub-offline-v1';
const PAGINA_OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGINA_OFFLINE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo las páginas; los datos (/rest/v1/) y archivos van directo a la red sin intervenir
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(PAGINA_OFFLINE))
  );
});
