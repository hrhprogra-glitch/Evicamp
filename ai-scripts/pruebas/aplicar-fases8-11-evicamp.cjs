// Pase de las fases 8 a 11 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas).
// Ensayado antes en una copia (ensayo-fases8-11-evicamp.cjs: 0 errores).
// 1) Respaldo completo  2) seguridad-sesion.sql COMPLETO (ON_ERROR_STOP, lock_timeout 5s; repetible)
// 3) Recarga el esquema de la API  4) Verifica. La facturación queda APAGADA.
// Uso: node ai-scripts/pruebas/aplicar-fases8-11-evicamp.cjs
const path = require('path');
const proyecto = path.join(__dirname, '..', '..');
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const pg = (cmd) => s.execCommand(`runuser -u postgres -- ${cmd}`);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-pase-fases8-11-${marca}.dump`;
    console.log('1. Respaldo de Evicamp...');
    let r = await pg(`pg_dump -Fc -d postgres -f ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló (no se aplicó nada): ' + r.stderr);
    console.log('   ', (await s.execCommand(`ls -lh ${respaldo}`)).stdout.trim());

    console.log('2. Aplicando seguridad-sesion.sql en Evicamp...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-pase-evicamp.sql');
    await s.execCommand('chmod 644 /tmp/seguridad-pase-evicamp.sql');
    const t0 = Date.now();
    r = await pg(`psql -d postgres -v ON_ERROR_STOP=1 -c "SET lock_timeout = '5s'" -f /tmp/seguridad-pase-evicamp.sql`);
    console.log(`    código ${r.code} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    const errores = (r.stderr || '').split('\n').filter((l) => /ERROR|FATAL/.test(l));
    console.log('    ERRORES:', errores.length ? '\n      ' + errores.join('\n      ') : '(ninguno)');
    if (r.code !== 0) throw new Error('El SQL se detuvo: el archivo es repetible, se puede volver a correr. Respaldo: ' + respaldo);

    console.log('3. Recargando el esquema de la API...');
    await pg(`psql -d postgres -c "NOTIFY pgrst, 'reload schema';"`);

    console.log('4. Verificando...');
    const checks = {
      'tablas nuevas': "select string_agg(table_name, ', ' order by table_name) from information_schema.tables where table_schema='public' and table_name in ('facturacion_config','cpe_correlativos','notas_credito','cambios_productos')",
      'columnas cpe en sales': "select count(*) from information_schema.columns where table_name='sales' and column_name like 'cpe_%'",
      'funciones': "select string_agg(proname, ', ' order by proname) from pg_proc where proname in ('fn_cambiar_con_nota_credito','fn_devolver_con_nota_credito','fn_catalogo_publico')",
      'facturación': "select case when activo then 'ENCENDIDA' else 'apagada' end || ' (' || modo || ')' from facturacion_config",
      'datos': "select (select count(*) from sales) || ' ventas, ' || (select count(*) from products) || ' productos'",
    };
    for (const [nombre, sql] of Object.entries(checks)) {
      r = await pg(`psql -At -d postgres -c "${sql}"`);
      console.log(`    ${nombre}: ${(r.stdout || r.stderr).trim()}`);
    }
  } finally {
    await s.execCommand('rm -f /tmp/seguridad-pase-evicamp.sql');
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
