// Pase de la Fase 7 (Tallas y Colores: Variantes con stock propio + Lotes por variante) a EVICAMP (base "postgres")
// SIN reiniciar la API (cero tiempo de inactividad, no corta ventas):
// 1) Respaldo completo con pg_dump
// 2) Aplicar servidor/sql/seguridad-sesion.sql con psql (lock_timeout de 5s)
// 3) Notificar a PostgREST recarga de esquema (NOTIFY pgrst, 'reload schema')
// 4) Verificar tablas y columnas nuevas en Evicamp
// Uso: node ai-scripts/pruebas/aplicar-fase7-evicamp.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase7-${marca}.dump`;
    console.log('1. Creando respaldo en Evicamp (postgres)...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp (postgres)...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase7-evicamp.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase7-evicamp.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase7-evicamp.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Notificando recarga de esquema a PostgREST en Evicamp...');
    await s.execCommand(`runuser -u postgres -- psql -d postgres -c "NOTIFY pgrst, 'reload schema';"`);

    console.log('4. Verificando tabla product_variants y columnas en Evicamp...');
    const checks = [
      "select table_name from information_schema.tables where table_schema='public' and table_name='product_variants'",
      "select column_name from information_schema.columns where table_name='products' and column_name='tiene_variantes'",
      "select column_name from information_schema.columns where table_name='sale_details' and column_name in ('variant_id','variant_name') order by column_name",
      "select column_name from information_schema.columns where table_name='batches' and column_name in ('variant_id','variant_name') order by column_name",
      "select column_name from information_schema.columns where table_name='inventory_movements' and column_name in ('variant_id','variant_name') order by column_name"
    ];

    for (const sql of checks) {
      r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "${sql}"`);
      console.log('CHECK:', r.stdout.trim().replace(/\n/g, ', '));
    }

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase7-evicamp.sql');
    console.log('✔ Base de datos de Evicamp actualizada correctamente con Fase 7 (sin reiniciar la API).');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
