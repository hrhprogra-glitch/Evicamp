// ai-scripts/pruebas/limpiar-siumax-total.cjs
// Script para respaldar y vaciar datos operativos en base de pruebas siumax:
// Productos, Recetas, Lotes, Variantes, Kardex, Mermas,
// Ventas, Detalles, Caja, Movimientos, Fiados, Pagos,
// Cotizaciones, Pedidos, Clientes, Grupos,
// Compras, Proveedores.
//
// CONSERVA: empleados, sesiones, empresa_config, categories.
// EVICAMP NO SE TOCA (Regla 4).

const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

process.loadEnvFile(path.resolve(__dirname, '..', '..', '.env.vps'));

async function limpiarSiumax() {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);

  console.log('1. Creando respaldo completo de siumax con pg_dump...');
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `/var/lib/postgresql/respaldo-siumax-antes-limpieza-${fecha}.dump`;
  const dumpRes = await ssh.execCommand(`sudo -u postgres pg_dump -Fc siumax > ${backupFile}`);
  if (dumpRes.code !== 0) {
    console.error('Error creando respaldo:', dumpRes.stderr);
    process.exit(1);
  }
  const sizeRes = await ssh.execCommand(`ls -lh ${backupFile}`);
  console.log(`Respaldo creado: ${sizeRes.stdout.trim()}`);

  console.log('2. Ejecutando limpieza controlada en base siumax...');
  const sqlLimpieza = `
    BEGIN;

    -- Desactivar temporalmente restricciones si fuera necesario
    SET CONSTRAINTS ALL DEFERRED;

    -- 1. Vaciar Ventas, Finanzas y Caja
    TRUNCATE TABLE cambios_productos CASCADE;
    TRUNCATE TABLE sale_details CASCADE;
    TRUNCATE TABLE sales CASCADE;
    TRUNCATE TABLE cash_movements CASCADE;
    TRUNCATE TABLE cash_sessions CASCADE;
    TRUNCATE TABLE debt_payments CASCADE;
    TRUNCATE TABLE fiados CASCADE;
    TRUNCATE TABLE yape_notifications CASCADE;

    -- 2. Vaciar Cotizaciones y Pedidos
    TRUNCATE TABLE cotizacion_detalles CASCADE;
    TRUNCATE TABLE cotizaciones CASCADE;
    TRUNCATE TABLE pedido_detalles CASCADE;
    TRUNCATE TABLE pedidos_clientes CASCADE;

    -- 3. Vaciar Clientes y Grupos
    TRUNCATE TABLE customers CASCADE;
    TRUNCATE TABLE grupos_clientes CASCADE;

    -- 4. Vaciar Compras y Proveedores
    TRUNCATE TABLE compras_historial CASCADE;
    TRUNCATE TABLE compras_detalle CASCADE;
    TRUNCATE TABLE compras CASCADE;
    TRUNCATE TABLE providers CASCADE;

    -- 5. Vaciar Productos, Recetas, Variantes, Lotes y Kardex
    TRUNCATE TABLE product_recipes CASCADE;
    TRUNCATE TABLE product_variants CASCADE;
    TRUNCATE TABLE batches CASCADE;
    TRUNCATE TABLE inventory_movements CASCADE;
    TRUNCATE TABLE waste CASCADE;
    TRUNCATE TABLE products CASCADE;

    -- Reiniciar secuencias comunes a 1
    ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS providers_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS sales_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS batches_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS product_recipes_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS product_variants_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS compras_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS cotizaciones_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS pedidos_clientes_id_seq RESTART WITH 1;

    COMMIT;
  `;

  const cleanRes = await ssh.execCommand(`sudo -u postgres psql -d siumax -c "${sqlLimpieza.replace(/"/g, '\\"')}"`);
  console.log('Resultado de limpieza:');
  console.log(cleanRes.stdout);
  if (cleanRes.stderr) console.error('STDERR:', cleanRes.stderr);

  console.log('3. Recargando esquema de PostgREST...');
  await ssh.execCommand("sudo -u postgres psql -d siumax -c \"NOTIFY pgrst, 'reload schema';\"");

  console.log('4. Verificando conteos en tablas...');
  const verifySql = `
    SELECT 'products' AS t, count(*) FROM products
    UNION ALL SELECT 'batches', count(*) FROM batches
    UNION ALL SELECT 'product_recipes', count(*) FROM product_recipes
    UNION ALL SELECT 'sales', count(*) FROM sales
    UNION ALL SELECT 'cash_sessions', count(*) FROM cash_sessions
    UNION ALL SELECT 'customers', count(*) FROM customers
    UNION ALL SELECT 'providers', count(*) FROM providers
    UNION ALL SELECT 'compras', count(*) FROM compras
    UNION ALL SELECT 'empleados (intacto)', count(*) FROM empleados
    UNION ALL SELECT 'sesiones (intacto)', count(*) FROM sesiones;
  `;
  const countRes = await ssh.execCommand(`sudo -u postgres psql -d siumax -c "${verifySql.replace(/"/g, '\\"')}"`);
  console.log(countRes.stdout);

  ssh.dispose();
  console.log('¡Limpieza de siumax completada con éxito!');
}

limpiarSiumax();
