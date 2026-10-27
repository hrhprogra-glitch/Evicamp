// Pase de la fase 1 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas):
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
    const respaldo = `/var/lib/postgresql/respaldo-evicamp-antes-fase1-${marca}.dump`;
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${respaldo} && ls -la ${respaldo}`);
    if (r.code !== 0) throw new Error('respaldo falló: ' + r.stderr);
    console.log('RESPALDO:', r.stdout.trim());

    await s.putFile(path.join(proyecto, 'servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-sesion-fase1.sql');
    r = await s.execCommand(`chmod 644 /tmp/seguridad-sesion-fase1.sql && runuser -u postgres -- psql -d postgres -c "SET lock_timeout = '5s'" -f /tmp/seguridad-sesion-fase1.sql 2>&1 | grep -E "ERROR|FATAL|lock" ; echo FIN`);
    console.log('ERRORES DEL SQL:', r.stdout.replace('FIN', '').trim() || '(ninguno)');

    r = await s.execCommand(`runuser -u postgres -- psql -At -d postgres -c "select string_agg(table_name||'.'||column_name, ',' order by table_name, column_name) from information_schema.columns where table_schema='public' and ((table_name='sale_details' and column_name in ('precio_lista','precio_cambiado_por','presentacion','presentacion_cantidad')) or (table_name='products' and column_name in ('precios_cantidad','presentaciones')) or (table_name='compras_detalle' and column_name in ('presentacion','presentacion_factor')))" -c "select count(*) from respaldo_fase1_unidades" -c "select sunat_unit_code||'='||count(*) from products group by 1 order by 1" -c "select position('presentaciones' in prosrc) > 0 from pg_proc where proname='fn_proteger_precios'" -c "select tgname from pg_trigger where tgname='tr_waste_reduce'"`);
    console.log('VERIFICACIÓN:\n' + r.stdout.trim());
    await s.execCommand('rm -f /tmp/seguridad-sesion-fase1.sql');
  } finally { s.dispose(); }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
