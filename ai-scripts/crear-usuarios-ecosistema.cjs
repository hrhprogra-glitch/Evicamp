// Crea billy@ecosistema.com y john@ecosistema.com con la clave acordada (admin123).
// La clave entra por stdin como variable de psql: no queda en archivos ni en el historial.
// Roles heredados de los usuarios originales del ETL: billy Administrador, john Técnico.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const CLAVE = 'admin' + '123';
const sql = `
BEGIN;
SET LOCAL lock_timeout = '5s';
INSERT INTO public.empleados (id, nombre, email, password, password_hash, rol, permisos, estado)
SELECT '0fe71026-440e-45f1-95af-a5b53dbf7667', 'billy', 'billy@ecosistema.com', '',
       crypt(:'clave', gen_salt('bf')), 'Administrador', '{"sistema_acceso_total":true}'::jsonb, 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.empleados WHERE lower(email) = 'billy@ecosistema.com');

INSERT INTO public.empleados (id, nombre, email, password, password_hash, rol, permisos, estado)
SELECT '20f3498f-8254-4dc4-8003-4a6d1601aa72', 'john', 'john@ecosistema.com', '',
       crypt(:'clave', gen_salt('bf')), 'Técnico',
       '{"agenda_ver":true,"contratos_ver":true,"cobros_ver":true,"clientes_ver":true,"almacen_ver_stock":true,"salidas_ver":true,"salidas_crear":true,"herramientas_ver":true,"taller_ver":true,"taller_editar":true}'::jsonb,
       'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.empleados WHERE lower(email) = 'john@ecosistema.com');
COMMIT;
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  try {
    const respaldo = `/root/backups/ecosistema-antes-usuarios-${fecha}.dump`;
    const r0 = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d ecosistema > ${respaldo} && ls -lh ${respaldo}`);
    if (r0.code !== 0) throw new Error(`Fallo el respaldo: ${r0.stderr || r0.stdout}`);
    console.log(`RESPALDO: ${r0.stdout.trim()}`);

    await ssh.execCommand(`cat > /tmp/crear-usuarios-ecosistema.sql && chmod 644 /tmp/crear-usuarios-ecosistema.sql`, { stdin: sql });
    const r = await ssh.execCommand(
      `read -r CLAVE; sudo -u postgres psql -v ON_ERROR_STOP=1 -d ecosistema -v clave="$CLAVE" -f /tmp/crear-usuarios-ecosistema.sql`,
      { stdin: CLAVE + '\n' });
    await ssh.execCommand('rm -f /tmp/crear-usuarios-ecosistema.sql');
    if (r.code !== 0) throw new Error(`Fallo al crear usuarios: ${r.stderr || r.stdout}`);
    console.log(r.stdout.trim().split('\n').filter((l) => /INSERT|COMMIT/.test(l)).join(' | '));

    const verifySql = `SELECT email || ' | ' || rol || ' | clave_ok=' || (password_hash = crypt(:'clave', password_hash)) FROM public.empleados WHERE email IN ('admin@ecosistema.com','billy@ecosistema.com','john@ecosistema.com') ORDER BY email;`;
    await ssh.execCommand(`cat > /tmp/ver-usuarios-ecosistema.sql && chmod 644 /tmp/ver-usuarios-ecosistema.sql`, { stdin: verifySql });
    const v = await ssh.execCommand(
      `read -r CLAVE; sudo -u postgres psql -tA -d ecosistema -v clave="$CLAVE" -f /tmp/ver-usuarios-ecosistema.sql`,
      { stdin: CLAVE + '\n' });
    await ssh.execCommand('rm -f /tmp/ver-usuarios-ecosistema.sql');
    if (v.code !== 0) throw new Error(`Fallo la verificación: ${v.stderr || v.stdout}`);
    console.log('Usuarios:\n' + v.stdout.trim().split('\n').filter(Boolean).join('\n'));
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
