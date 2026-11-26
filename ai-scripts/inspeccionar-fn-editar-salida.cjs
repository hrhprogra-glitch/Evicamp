// SOLO LECTURA: comprueba si las RPC para editar salida ya existen en siumax (Nego)
// y ecosistema, y si el rol anon/web_anon puede ejecutarlas. lock_timeout=3s.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

async function consultar(ssh, db, sql) {
  const sqlUnaLinea = 'SET lock_timeout = \'3s\'; ' + sql.replace(/\s+/g, ' ');
  const comando = `sudo -u postgres psql -d ${db} -tAc ${JSON.stringify(sqlUnaLinea)}`;
  const res = await ssh.execCommand(comando);
  if (res.code !== 0) throw new Error(`Fallo en ${db}: ${res.stderr || res.stdout}`);
  return res.stdout.split('\n').map((s) => s.trim()).filter((s) => s && s !== 'SET');
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const db of ['siumax', 'ecosistema', 'postgres']) {
      console.log(`\n===== BASE ${db} =====`);
      const funcs = await consultar(ssh, db, `
        SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('fn_editar_salida','fn_quitar_material_salida','fn_descontar_stock_salida','fn_devolver_stock_salida')
        ORDER BY p.proname;`);
      console.log('funciones:', funcs.length ? funcs.join(' | ') : 'NINGUNA');

      const permisos = await consultar(ssh, db, `
        SELECT p.proname || ' => anon=' || has_function_privilege('anon', p.oid, 'EXECUTE') || ', web_anon=' || has_function_privilege('web_anon', p.oid, 'EXECUTE')
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('fn_editar_salida','fn_quitar_material_salida','fn_registrar_salida')
        ORDER BY p.proname;`);
      permisos.forEach((f) => console.log('  ' + f));

      const detalle = await consultar(ssh, db, `
        SELECT 'editar items sin id: ' || CASE WHEN position('v_elem->>''id''' in pg_get_functiondef(p.oid)) > 0 THEN 'SIN id' ELSE 'sin id' END
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='fn_editar_salida' LIMIT 1;`);
      detalle.forEach((f) => console.log('  ' + f));

      const permisoRuta = await consultar(ssh, db, `
        SELECT 'fn_permisos_servicios incluye /rpc/fn_editar_salida: ' ||
          CASE WHEN position('/rpc/fn_editar_salida' in pg_get_functiondef(p.oid)) > 0 THEN 'SI' ELSE 'NO' END
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='fn_permisos_servicios' LIMIT 1;`);
      permisoRuta.forEach((f) => console.log('  ' + f));
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
