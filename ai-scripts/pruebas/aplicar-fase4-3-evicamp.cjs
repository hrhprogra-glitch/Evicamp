// Pase de la fase 4.3 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
// 1) respaldo pg_dump
// 2) servidor/sql/seguridad-sesion.sql con psql (con lock_timeout de 5s)
// 3) revisa que dias_plazo quedó en customers
// Uso: node ai-scripts/pruebas/aplicar-fase4-3-evicamp.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase4-3-${marca}.dump`;
    console.log('1. Creando respaldo en Evicamp...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp (postgres)...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase4-3.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase4-3.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase4-3.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    const errores = r.stdout.replace('FIN', '').trim();
    console.log('ERRORES DEL SQL:', errores || '(ninguno)');

    console.log('3. Verificando columna dias_plazo en customers...');
    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "select column_name, data_type from information_schema.columns where table_name='customers' and column_name='dias_plazo'"`);
    console.log('VERIFICACIÓN:', r.stdout.trim());
    if (!r.stdout.includes('dias_plazo')) {
      throw new Error('No se encontró la columna dias_plazo en customers de Evicamp.');
    }

    await s.execCommand('rm -f /tmp/seguridad-sesion-fase4-3.sql');
    console.log('✔ Base de datos de Evicamp actualizada correctamente con dias_plazo (sin tocar ni reiniciar la API).');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
