// Carga de los datos reales de Eco-Sistemas en la base oficial ecosistema.
// 1) respaldo pg_dump  2) SQL filtrado (sin usuarios) en una transacción con lock_timeout  3) conteos.
// La clave de los usuarios nuevos NO va aquí: se crean en un paso aparte.
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const SQL_LOCAL = path.join(__dirname, '..', '..', '..', 'migracion-eco', 'carga-ecosistema.sql');
const TABLAS = ['stores', 'categories', 'providers', 'customers', 'empleados', 'trabajadores',
  'products', 'batches', 'compras', 'compras_detalle', 'inventory_movements', 'herramientas',
  'vehiculos', 'vehiculos_mantenimientos', 'herramientas_prestamos', 'salidas', 'salida_items',
  'salida_trabajadores', 'cotizaciones', 'cotizacion_detalles', 'cotizacion_pagos', 'migracion_eco_log'];

(async () => {
  const sql = fs.readFileSync(SQL_LOCAL, 'utf8').replace(/\r\n/g, '\n');
  if (/clave_usuarios|siumax\.com/.test(sql)) throw new Error('El SQL todavía tiene usuarios de siumax: no se aplica.');

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  try {
    const respaldo = `/root/backups/ecosistema-antes-carga-datos-${fecha}.dump`;
    const r0 = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d ecosistema > ${respaldo} && ls -lh ${respaldo}`);
    if (r0.code !== 0) throw new Error(`Fallo el respaldo: ${r0.stderr || r0.stdout}`);
    console.log(`RESPALDO: ${r0.stdout.trim()}`);

    const conteo = async () => {
      const consulta = TABLAS.map((t) => `SELECT '${t}', count(*) FROM public.${t}`).join(' UNION ALL ')
        + " UNION ALL SELECT 'empresa_config', count(*) FROM public.empresa_config ORDER BY 1";
      const b64 = Buffer.from(consulta, 'utf8').toString('base64');
      const r = await ssh.execCommand(`echo ${b64} | base64 -d | sudo -u postgres psql -tA -d ecosistema`);
      if (r.code !== 0) throw new Error(`Fallo el conteo: ${r.stderr || r.stdout}`);
      return r.stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean).join(' | ');
    };
    console.log(`ANTES: ${await conteo()}`);

    const remoto = '/tmp/carga-ecosistema.sql';
    await ssh.execCommand(`cat > ${remoto} && chmod 644 ${remoto}`, { stdin: sql });
    const salida = [];
    const r = await ssh.execCommand(
      `sudo -u postgres psql -v ON_ERROR_STOP=1 -d ecosistema -f ${remoto}`,
      { onStdout: (c) => salida.push(c.toString()), onStderr: (c) => salida.push(c.toString()) });
    await ssh.execCommand(`rm -f ${remoto}`);
    const texto = salida.join('');
    const errores = texto.split('\n').filter((l) => /ERROR|FATAL|ABORT|permission denied/i.test(l));
    if (r.code !== 0 || errores.length) {
      console.log(texto.split('\n').slice(-40).join('\n'));
      throw new Error(`psql terminó con error (código ${r.code}). La transacción se deshizo sola.`);
    }
    console.log(`SQL aplicado: ${texto.split('\n').filter((l) => /^INSERT|^UPDATE|^SELECT|^ALTER|^COMMIT/.test(l.trim())).length} sentencias confirmadas.`);
    console.log(`DESPUÉS: ${await conteo()}`);

    const emp = await ssh.execCommand("sudo -u postgres psql -tA -d ecosistema -c \"SELECT email || ' | ' || rol FROM public.empleados ORDER BY email\"");
    console.log(`Empleados: ${emp.stdout.trim().split('\n').filter(Boolean).join(' | ')}`);
    const cfg = await ssh.execCommand("sudo -u postgres psql -tA -d ecosistema -c \"SELECT nombre_empresa || ' | ' || ruc FROM public.empresa_config LIMIT 1\"");
    console.log(`Empresa: ${cfg.stdout.trim()}`);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
