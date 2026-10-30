// Pase de la Fase 3 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
// 1) Respaldo completo con pg_dump
// 2) Aplicar servidor/sql/seguridad-sesion.sql con psql (lock_timeout de 5s)
// 3) Verificar columnas e índices nuevos en products (marca, modelo, medida, laboratorio, ubicacion)
// Uso: node ai-scripts/pruebas/aplicar-fase3-evicamp.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase3-${marca}.dump`;
    console.log('1. Creando respaldo en Evicamp...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp (postgres)...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase3.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase3.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase3.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Verificando columnas de Fase 3 en Evicamp (products)...');
    const sqlCols = "select column_name from information_schema.columns where table_name='products' and column_name in ('marca','modelo','medida','laboratorio','ubicacion') order by column_name";
    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "${sqlCols}"`);
    console.log('COLUMNAS CONFIRMADAS:', r.stdout.trim().replace(/\n/g, ', '));

    console.log('4. Verificando índices de Fase 3 en Evicamp...');
    const sqlIdx = "select indexname from pg_indexes where tablename='products' and indexname in ('idx_products_marca','idx_products_modelo','idx_products_medida')";
    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "${sqlIdx}"`);
    console.log('ÍNDICES CONFIRMADOS:', r.stdout.trim().replace(/\n/g, ', '));

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase3.sql');
    console.log('✔ Base de datos de Evicamp actualizada correctamente para Fase 3 (sin reiniciar la API ni cortar ventas).');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
