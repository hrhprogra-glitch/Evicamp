// Verificación posterior a la limpieza: sitios arriba, API cerrada y login admin OK.
// Lee las credenciales de .env.vps pero NO las imprime.
const path = require('path');
process.loadEnvFile(path.join(__dirname, '..', '.env.vps'));

const SITIOS = [
  { nombre: 'Nego (siumax)', url: 'https://nego.siumax.duckdns.org', user: process.env.SIUMAX_ADMIN_USUARIO || 'admin@siumax.com', pass: process.env.SIUMAX_ADMIN_CLAVE },
  { nombre: 'Ecosistema (oficial)', url: 'https://ecosistema123.duckdns.org', user: process.env.ECOSISTEMA_ADMIN_USUARIO, pass: process.env.ECOSISTEMA_ADMIN_CLAVE },
];

(async () => {
  for (const s of SITIOS) {
    console.log(`\n=== ${s.nombre} ===`);
    if (!s.user || !s.pass) { console.log('Faltan credenciales en .env.vps'); continue; }
    const raiz = await fetch(s.url);
    console.log(`Sitio: ${raiz.status}`);
    const api = await fetch(`${s.url}/rest/v1/customers?select=id&limit=1`);
    console.log(`API sin sesión (debe ser 401): ${api.status}`);
    const login = await fetch(`${s.url}/rest/v1/rpc/fn_login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: 'public-anon-key' },
      body: JSON.stringify({ p_email: s.user, p_password: s.pass }),
    });
    console.log(`Login administrador: ${login.ok ? 'OK' : `FALLO (${login.status})`}`);
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
