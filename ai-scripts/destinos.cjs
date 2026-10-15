// Dónde se publica SiuHub. Un solo código y UNA sola compilación (dist/) para todos:
// el sistema usa la API de su propio link, así que no hay que compilar por cliente.
//  - evicamp / siuhub: tienen su propia carpeta web en el VPS.
//  - clientes nuevos (<slug>.siuhub.duckdns.org): comparten /var/www/siuhub-app/html,
//    así que actualizar esa carpeta actualiza a todos de una vez.
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');

const SITIOS = {
  evicamp: {
    nombre: 'Evicamp',
    url: 'https://evicamp.duckdns.org',
    localDir: dist,
    remoteDir: '/var/www/evicamp.duckdns.org/html',
  },
  siuhub: {
    nombre: 'SiuHub',
    url: 'https://siuhub.duckdns.org',
    localDir: dist,
    remoteDir: '/var/www/siuhub/html',
  },
  clientes: {
    nombre: 'Clientes SiuHub (copia compartida)',
    localDir: dist,
    remoteDir: '/var/www/siuhub-app/html',
  },
};

// Un cliente creado con `cliente.cjs nuevo`: su instalador de PC va en /var/www/clientes/<slug>/descargas
const cliente = (slug) => ({
  nombre: slug,
  url: `https://${slug}.siuhub.duckdns.org`,
  remoteDir: `/var/www/clientes/${slug}`,
});

const destino = (nombre) => SITIOS[nombre] || (/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(nombre) ? cliente(nombre) : null);

module.exports = { SITIOS, destino };
