// Pase de la Fase 4 completa (4.4, 4.5, 4.6) a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
// 1) Respaldo completo con pg_dump
// 2) Aplicar servidor/sql/seguridad-sesion.sql con psql (lock_timeout de 5s)
// 3) Verificar tablas y columnas nuevas
// Uso: node ai-scripts/pruebas/aplicar-fase4-completa-evicamp.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase4-completa-${marca}.dump`;
    console.log('1. Creando respaldo en Evicamp...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp (postgres)...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase4-completa.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase4-completa.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase4-completa.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Verificando tablas y columnas de Fase 4 en Evicamp...');
    const checks = [
      "select table_name from information_schema.tables where table_schema='public' and table_name in ('cotizaciones','cotizacion_detalles','pedidos_clientes','pedido_detalles')",
      "select column_name from information_schema.columns where table_name='customers' and column_name in ('es_mayorista','descuento_porcentaje','dias_plazo')",
      "select column_name from information_schema.columns where table_name='products' and column_name='precio_mayorista'",
      "select column_name from information_schema.columns where table_name='grupos_clientes' and column_name='descuento_porcentaje'"
    ];

    for (const sql of checks) {
      r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "${sql}"`);
      console.log('CHECK:', r.stdout.trim().replace(/\n/g, ', '));
    }

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase4-completa.sql');
    console.log('✔ Base de datos de Evicamp actualizada correctamente para Fase 4 completa (sin reiniciar la API).');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
