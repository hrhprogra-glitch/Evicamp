// Datos de conexión al VPS leídos de .env.vps (archivo local, ignorado por git).
// Formato de .env.vps:
//   VPS_HOST=...
//   VPS_USER=...
//   VPS_PASSWORD=...
const path = require('path');

const archivo = path.join(__dirname, '..', '.env.vps');
try {
  process.loadEnvFile(archivo);
} catch {
  console.error(`Falta ${archivo} con VPS_HOST, VPS_USER y VPS_PASSWORD.`);
  process.exit(1);
}

const { VPS_HOST, VPS_USER, VPS_PASSWORD } = process.env;
if (!VPS_HOST || !VPS_USER || !VPS_PASSWORD) {
  console.error('.env.vps debe tener VPS_HOST, VPS_USER y VPS_PASSWORD.');
  process.exit(1);
}

module.exports = {
  conexionVps: { host: VPS_HOST, username: VPS_USER, password: VPS_PASSWORD },
};
