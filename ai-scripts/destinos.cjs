// Dónde se publica SiuMax. Un solo código y UNA sola compilación (dist/) para todos:
// el sistema usa la API de su propio link, así que no hay que compilar por cliente.
//  - evicamp / siuhub: tienen su propia carpeta web en el VPS.
//  - clientes nuevos (<slug>.comerc.siumax.duckdns.org): comparten /var/www/siuhub-app/html,
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
  siumax: {   // tu sistema de pruebas de Comerc (antes 'siuhub'; la carpeta interna conserva el nombre)
    nombre: 'SiuMax Comerc (pruebas)',
    url: 'https://comerc.siumax.duckdns.org',   // siumax.duckdns.org es el Panel de Control desde el 06/11/2026
    localDir: dist,
    remoteDir: '/var/www/siuhub/html',
  },
  clientes: {
    nombre: 'Clientes SiuMax (copia compartida)',
    localDir: dist,
    remoteDir: '/var/www/siuhub-app/html',
  },
};

// Un cliente creado con `cliente.cjs nuevo`: su instalador de PC va en /var/www/clientes/<slug>/descargas
const cliente = (slug) => ({
  nombre: slug,
  url: `https://${slug}.comerc.siumax.duckdns.org`,
  remoteDir: `/var/www/clientes/${slug}`,
});

// Instalador genérico: pregunta el link al abrirse por primera vez. Se publica en la carpeta
// compartida y el Panel de Control lo copia a cada cliente nuevo.
const GENERICO = { nombre: 'SiuMax', url: null, generico: true, remoteDir: '/var/www/siuhub-app' };

// Nombres aceptados: el anterior (siuhub) y el del link nuevo (comerc)
const ALIAS = { siuhub: 'siumax', comerc: 'siumax' };
const normalizar = (nombre) => ALIAS[nombre] || nombre;

const destino = (nombreOriginal) => { const nombre = normalizar(nombreOriginal); return  nombre === 'generico' ? GENERICO : SITIOS[nombre] || (/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(nombre) ? cliente(nombre) : null); };

module.exports = { SITIOS, destino, normalizar };
