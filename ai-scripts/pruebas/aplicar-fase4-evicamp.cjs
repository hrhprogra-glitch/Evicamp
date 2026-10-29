// Pase de la fase 4 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
// 1) respaldo pg_dump
// 2) servidor/sql/seguridad-sesion.sql con psql (es repetible: CREATE OR REPLACE / IF NOT EXISTS),
//    con lock_timeout de 5 s para no frenar la caja si una tabla está ocupada
// 3) revisa que todo quedó en la base
// Uso: node aplicar-fase4-evicamp.cjs <carpeta del proyecto>
const path = require('path');
const proyecto = process.argv[2] || 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase4-${marca}.dump`;
    console.log('1. Creando respaldo en Evicamp...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp (postgres)...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase4.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase4.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase4.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Verificando tablas, columnas y funciones...');
    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "select string_agg(column_name, ',') from information_schema.columns where table_name='customers' and column_name in ('ruc','ubicacion','grupo_id','tipo_doc')" -c "select string_agg(column_name, ',') from information_schema.columns where table_name='sales' and column_name in ('customer_id','customer_name')" -c "select count(*) from information_schema.tables where table_name='grupos_clientes'" -c "select proname from pg_proc where proname='fn_registrar_conteo'"`);
    console.log('VERIFICACIÓN:\n' + r.stdout.trim());

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase4.sql');
    console.log('✔ Base de datos de Evicamp actualizada correctamente.');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
