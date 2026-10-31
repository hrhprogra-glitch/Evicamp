// Aplicar Fase 7 (Tallas y Colores - Variantes) a la base de pruebas SIUMAX:
// 1) Respaldo completo de la base "siumax" con pg_dump
// 2) Aplicar servidor/sql/seguridad-sesion.sql con psql
// 3) Verificar tablas y columnas nuevas
// Uso: node ai-scripts/pruebas/aplicar-fase7-siumax.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-siumax-antes-fase7-${marca}.dump`;
    console.log('1. Creando respaldo en siumax...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d siumax -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en siumax...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase7-siumax.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase7-siumax.sql && runuser -u postgres -- psql -d siumax -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase7-siumax.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Verificando tabla product_variants y columnas en siumax...');
    const checks = [
      "select table_name from information_schema.tables where table_schema='public' and table_name='product_variants'",
      "select column_name from information_schema.columns where table_name='products' and column_name='tiene_variantes'",
      "select column_name from information_schema.columns where table_name='sale_details' and column_name in ('variant_id','variant_name') order by column_name",
      "select column_name from information_schema.columns where table_name='inventory_movements' and column_name in ('variant_id','variant_name') order by column_name"
    ];

    for (const sql of checks) {
      r = await s.execCommand(`runuser -u postgres -- psql -At -d siumax -c "${sql}"`);
      console.log('CHECK:', r.stdout.trim().replace(/\n/g, ', '));
    }

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase7-siumax.sql');
    console.log('✔ Base de datos siumax actualizada correctamente con Fase 7.');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
