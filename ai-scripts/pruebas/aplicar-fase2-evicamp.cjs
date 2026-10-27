// Pase de la fase 2 + sin internet a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
// 1) respaldo pg_dump  2) servidor/sql/seguridad-sesion.sql con psql (es repetible: CREATE OR REPLACE / IF NOT EXISTS),
//    con lock_timeout de 5 s para no frenar la caja si una tabla está ocupada  3) revisa que todo quedó.
// Uso: node aplicar-fase2-evicamp.cjs <carpeta del proyecto>
const path = require('path');
const proyecto = process.argv[2];
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));
(async () => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase2-${marca}.dump`;
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -la ${respaldo}`);
    if (r.code !== 0) throw new Error('respaldo falló: ' + r.stderr);
    console.log('RESPALDO:', r.stdout.trim());

    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase2.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase2.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase2.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    console.log('ERRORES DEL SQL:', r.stdout.replace('FIN', '').trim() || '(ninguno)');

    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "select string_agg(proname, ',' order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('fn_anular_venta','fn_registrar_conteo','fn_cuadrar_lotes_conteo','fn_editar_conteo','fn_ventas_por_producto','fn_registrar_turno_caja','fn_registrar_autor_inventario','fn_proteger_conteo')" -c "select string_agg(tgname, ',' order by tgname) from pg_trigger where not tgisinternal and tgname in ('trg_autor_movimiento','trg_autor_merma','trg_turno_caja','trg_proteger_conteo')" -c "select string_agg(table_name||'.'||column_name, ',') from information_schema.columns where table_schema='public' and column_name in ('abierta_por','cerrada_por','origen','conteo_sistema','conteo_contado','conteo_editado_por')" -c "select fn_permisos_requeridos('POST', '/rpc/fn_registrar_conteo')::text, fn_permisos_requeridos('POST', '/rpc/fn_anular_venta')::text"`);
    console.log('VERIFICACIÓN:\n' + r.stdout.trim());
    await s.execCommand('rm -f /tmp/seguridad-sesion-fase2.sql');
  } finally { s.dispose(); }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
