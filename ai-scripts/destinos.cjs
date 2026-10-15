// Clientes (destinos) donde se publica SiuHub. Un solo código para todos; cada uno con su
// propia carpeta web en el VPS y su propia API/base de datos.
const path = require('path');
const raiz = path.join(__dirname, '..');

module.exports = {
  evicamp: {
    nombre: 'Evicamp',
    url: 'https://evicamp.duckdns.org',
    localDir: path.join(raiz, 'dist'),
    remoteDir: '/var/www/evicamp.duckdns.org/html',
  },
  siuhub: {
    nombre: 'SiuHub',
    url: 'https://siuhub.duckdns.org',
    localDir: path.join(raiz, 'dist-siuhub'),
    remoteDir: '/var/www/siuhub/html',
    // Vite da prioridad a las variables del proceso sobre .env: así el build apunta a la API de SiuHub
    build: 'npx tsc -b && npx vite build --outDir dist-siuhub --emptyOutDir',
    env: { VITE_SUPABASE_URL: 'https://siuhub.duckdns.org' },
  },
};
