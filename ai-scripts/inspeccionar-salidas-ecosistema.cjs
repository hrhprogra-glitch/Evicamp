// Inspección SOLO DE LECTURA de la base ecosistema (sitio oficial).
// Busca salidas repetidas y revisa cómo está guardada la dirección del cliente.
// No modifica nada. lock_timeout = 3s para no bloquear la API.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

async function consultar(ssh, sql) {
  const comando = `sudo -u postgres psql -d ecosistema -tAc ${JSON.stringify('SET lock_timeout = \'3s\'; ' + sql)}`;
  const res = await ssh.execCommand(comando);
  if (res.code !== 0) throw new Error(`Fallo en ecosistema: ${res.stderr || res.stdout}`);
  return res.stdout.split('\n').map((s) => s.trim()).filter((s) => s && s !== 'SET');
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    console.log('TOTAL salidas:', (await consultar(ssh, 'SELECT count(*) FROM public.salidas;'))[0]);

    console.log('\nÚLTIMAS SALIDAS (id | codigo | fecha | cliente | direccion | obs | creado):');
    for (const f of await consultar(ssh, `SELECT id || ' | ' || codigo || ' | ' || fecha || ' | ' || customer_id || ' | ' || left(coalesce(direccion,''),90) || ' | ' || left(coalesce(observaciones,''),40) || ' | ' || to_char(created_at,'YYYY-MM-DD HH24:MI') FROM public.salidas ORDER BY id DESC LIMIT 15;`)) console.log('  ' + f);

    console.log('\nGRUPOS REPETIDOS (mismo cliente + fecha + direccion + observaciones):');
    const repetidos = await consultar(ssh, `SELECT customer_id || ' | ' || fecha || ' | ' || left(coalesce(direccion,''),60) || ' | ' || left(coalesce(observaciones,''),40) || ' => ' || count(*) || ' salidas: ' || string_agg(id::text, ',' ORDER BY id) FROM public.salidas GROUP BY customer_id, fecha, direccion, observaciones HAVING count(*) > 1 ORDER BY count(*) DESC, fecha DESC;`);
    if (!repetidos.length) console.log('  ninguno');
    repetidos.forEach((f) => console.log('  ' + f));

    console.log('\nCLIENTES / BIENES / SALIDAS CON EL TEXTO REPORTADO:');
    const lugares = [
      ['clientes', `SELECT id || ' | ' || name || ' | ' || left(coalesce(direccion,''),180) FROM public.customers WHERE direccion ILIKE '%NUEVA GALES%' OR direccion ILIKE '%LT 9%' OR direccion ILIKE '%CIENEGUILLA%' LIMIT 10;`],
      ['bienes', `SELECT id || ' | ' || customer_id || ' | ' || coalesce(nombre,'') || ' | ' || left(coalesce(direccion,''),120) || ' | ' || left(coalesce(ubicacion,''),60) FROM public.bienes_cliente WHERE direccion ILIKE '%NUEVA GALES%' OR direccion ILIKE '%LT 9%' OR ubicacion ILIKE '%CIENEGUILLA%' LIMIT 10;`],
      ['salidas', `SELECT id || ' | ' || codigo || ' | ' || left(coalesce(direccion,''),160) FROM public.salidas WHERE direccion ILIKE '%NUEVA GALES%' OR direccion ILIKE '%LT 9%' OR direccion ILIKE '%zip%' LIMIT 10;`],
    ];
    for (const [nombre, sql] of lugares) {
      const filas = await consultar(ssh, sql);
      console.log(`  ${nombre}: ${filas.length ? '' : 'ninguno'}`);
      filas.forEach((f) => console.log('    ' + f));
    }

    console.log('\nSALIDAS DE HOY CON SUS MATERIALES (para comparar copias):');
    const hoy = await consultar(ssh, `SELECT s.id || ' | ' || s.codigo || ' | ' || s.customer_id || ' | ' || left(coalesce(s.observaciones,''),45) || ' | items: ' || coalesce(string_agg(i.descripcion || 'x' || i.cantidad, ', ' ORDER BY i.id), 'NINGUNO') FROM public.salidas s LEFT JOIN public.salida_items i ON i.salida_id = s.id WHERE s.fecha = CURRENT_DATE GROUP BY s.id, s.codigo, s.customer_id, s.observaciones ORDER BY s.id;`);
    hoy.forEach((f) => console.log('  ' + f));

    console.log('\nSALIDAS DEL CLIENTE 300016 (el de la dirección reportada):');
    const cli = await consultar(ssh, `SELECT id || ' | ' || codigo || ' | ' || fecha || ' | raiz=' || coalesce(salida_raiz_id::text,'-') || ' | ' || left(coalesce(observaciones,''),50) || ' | ' || to_char(created_at,'HH24:MI') FROM public.salidas WHERE customer_id = 300016 ORDER BY id;`);
    cli.forEach((f) => console.log('  ' + f));

    console.log('\nCÓDIGOS RECIENTES (por si falta alguno):');
    const cods = await consultar(ssh, `SELECT codigo || ' | id ' || id || ' | ' || to_char(created_at,'YYYY-MM-DD HH24:MI') FROM public.salidas WHERE codigo >= 'SAL-0019' ORDER BY codigo;`);
    cods.forEach((f) => console.log('  ' + f));

    console.log('\nGRUPOS REPETIDOS POR CLIENTE + FECHA + MATERIALES:');
    const porItems = await consultar(ssh, `WITH x AS (SELECT s.id, s.codigo, s.customer_id, s.fecha, coalesce(string_agg(i.descripcion || 'x' || i.cantidad, ',' ORDER BY i.id),'') AS items FROM public.salidas s LEFT JOIN public.salida_items i ON i.salida_id = s.id GROUP BY s.id) SELECT customer_id || ' | ' || fecha || ' | ' || left(items,70) || ' => ' || count(*) || ': ' || string_agg(codigo || '(id ' || id || ')', ', ' ORDER BY id) FROM x GROUP BY customer_id, fecha, items HAVING count(*) > 1 ORDER BY fecha DESC;`);
    if (!porItems.length) console.log('  ninguno');
    porItems.forEach((f) => console.log('  ' + f));
  } finally {
    ssh.dispose();
  }
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
