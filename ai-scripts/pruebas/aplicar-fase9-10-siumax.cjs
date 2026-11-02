// Aplicar Fase 9 y 10 en siumax (pruebas)
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

async function main() {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    console.log('1. Subiendo servidor/sql/seguridad-sesion.sql al VPS...');
    const localSql = path.join(__dirname, '../../servidor/sql/seguridad-sesion.sql');
    await s.putFile(localSql, '/tmp/seguridad-sesion-fase9-10-siumax.sql');

    console.log('2. Aplicando SQL en base "siumax"...');
    let r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase9-10-siumax.sql && runuser -u postgres -- psql -d siumax -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase9-10-siumax.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    console.log('Resultado psql:', r.stdout);

    console.log('3. Recargando schema de PostgREST...');
    await s.execCommand(`runuser -u postgres -- psql -d siumax -c "NOTIFY pgrst, 'reload schema';"`);

    console.log('4. Verificando tablas y funciones creadas...');
    const verifySql = `
      SELECT 'stores: ' || count(*) FROM public.stores;
      SELECT 'store_transfers: ' || count(*) FROM public.store_transfers;
      SELECT 'fn_catalogo_publico: ' || count(*) FROM pg_proc WHERE proname='fn_catalogo_publico';
      SELECT 'fn_crear_pedido_web: ' || count(*) FROM pg_proc WHERE proname='fn_crear_pedido_web';
      SELECT 'fn_crear_traspaso: ' || count(*) FROM pg_proc WHERE proname='fn_crear_traspaso';
    `;
    r = await s.execCommand(`runuser -u postgres -- psql -At -d siumax -c "${verifySql.replace(/\n/g, ' ')}"`);
    console.log(r.stdout);

    console.log('Completado con éxito.');
  } finally {
    s.dispose();
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
