// ENSAYO del pase de las fases 8 a 11 a EVICAMP, sin tocar la base real:
// 1) Respaldo completo de Evicamp (base "postgres") con pg_dump
// 2) Restaura ese respaldo en una base aparte (evicamp_ensayo)
// 3) Aplica servidor/sql/seguridad-sesion.sql COMPLETO a la copia (ON_ERROR_STOP, lock_timeout 5s)
// 4) Muestra errores y revisa tablas/columnas nuevas; borra la copia
// Uso: node ai-scripts/pruebas/ensayo-fases8-11-evicamp.cjs   (deja el respaldo para el pase real)
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
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fases8-11-${marca}.dump`;
    console.log('1. Respaldo de Evicamp...');
    let r = await pg(`pg_dump -Fc -d postgres -f ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('   ', (await s.execCommand(`ls -lh ${respaldo}`)).stdout.trim());

    console.log('2. Restaurando la copia en evicamp_ensayo...');
    await pg('dropdb --if-exists evicamp_ensayo');
    r = await pg('createdb evicamp_ensayo');
    if (r.code !== 0) throw new Error('createdb: ' + r.stderr);
    r = await pg(`pg_restore -d evicamp_ensayo ${respaldo}`);
    console.log('    pg_restore:', r.code === 0 ? 'sin errores' : r.stderr.split('\n').slice(0, 5).join(' | '));

    console.log('3. Aplicando seguridad-sesion.sql a la COPIA...');
    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-ensayo.sql');
    await s.execCommand('chmod 644 /tmp/seguridad-ensayo.sql');
    const t0 = Date.now();
    r = await pg(`psql -d evicamp_ensayo -v ON_ERROR_STOP=1 -c "SET lock_timeout = '5s'" -f /tmp/seguridad-ensayo.sql`);
    console.log(`    terminó con código ${r.code} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    const errores = (r.stderr || '').split('\n').filter((l) => /ERROR|FATAL/.test(l));
    console.log('    ERRORES:', errores.length ? '\n      ' + errores.join('\n      ') : '(ninguno)');

    console.log('4. Revisando la copia...');
    const checks = {
      'tablas nuevas': "select string_agg(table_name, ', ' order by table_name) from information_schema.tables where table_schema='public' and table_name in ('facturacion_config','cpe_correlativos','notas_credito','tiendas','traspasos','recetas','cambios_productos')",
      'columnas en sales': "select count(*) from information_schema.columns where table_name='sales' and column_name like 'cpe_%'",
      'products.tipo_igv': "select count(*) from information_schema.columns where table_name='products' and column_name in ('tipo_igv','es_bolsa','tipo_compuesto')",
      'funciones nuevas': "select string_agg(proname, ', ' order by proname) from pg_proc where proname in ('fn_cambiar_con_nota_credito','fn_devolver_con_nota_credito','fn_anular_venta','fn_catalogo_publico')",
      'facturación apagada': "select activo || ' ' || modo from facturacion_config",
      'ventas y productos intactos': "select (select count(*) from sales) || ' ventas, ' || (select count(*) from products) || ' productos'",
    };
    for (const [nombre, sql] of Object.entries(checks)) {
      r = await pg(`psql -At -d evicamp_ensayo -c "${sql}"`);
      console.log(`    ${nombre}: ${(r.stdout || r.stderr).trim()}`);
    }
    r = await pg(`psql -At -d postgres -c "select (select count(*) from sales) || ' ventas, ' || (select count(*) from products) || ' productos'"`);
    console.log(`    (Evicamp real: ${r.stdout.trim()})`);
  } finally {
    await pg('dropdb --if-exists evicamp_ensayo');
    await s.execCommand('rm -f /tmp/seguridad-ensayo.sql');
    console.log('   copia borrada');
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
