// Carga de datos reales + generación de datos complementarios (~50 por sesión) en la base de pruebas 'siumax'.
// 1) Respaldo pg_dump de siumax
// 2) Carga de carga-ecosistema.sql en siumax
// 3) Inserción de ~50 registros en taller_ordenes, contratos, pedidos_clientes, vehiculos, waste
// 4) Verificación de conteos
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const SQL_LOCAL = path.join(__dirname, '..', '..', '..', 'migracion-eco', 'carga-ecosistema.sql');

(async () => {
  const sqlBase = fs.readFileSync(SQL_LOCAL, 'utf8').replace(/\r\n/g, '\n');
  if (/clave_usuarios|siumax\.com/.test(sqlBase)) {
    throw new Error('El SQL contiene referencias a usuarios: no se aplica.');
  }

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

  try {
    console.log('1. Sacando respaldo previo de la base siumax...');
    const respaldo = `/root/backups/siumax-antes-carga-datos-${fecha}.dump`;
    const r0 = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d siumax > ${respaldo} && ls -lh ${respaldo}`);
    if (r0.code !== 0) throw new Error(`Fallo el respaldo: ${r0.stderr || r0.stdout}`);
    console.log(`RESPALDO: ${r0.stdout.trim()}`);

    // Comprobamos si los datos base ya estan cargados
    const rCheck = await ssh.execCommand(`sudo -u postgres psql -tA -d siumax -c "SELECT count(*) FROM public.customers"`);
    const countCust = Number(rCheck.stdout.trim()) || 0;
    if (countCust < 100) {
      console.log('2. Aplicando carga-ecosistema.sql en la base siumax...');
      const remotoBase = '/tmp/carga-siumax-base.sql';
      await ssh.execCommand(`cat > ${remotoBase} && chmod 644 ${remotoBase}`, { stdin: sqlBase });
      
      const rBase = await ssh.execCommand(`sudo -u postgres psql -v ON_ERROR_STOP=1 -d siumax -f ${remotoBase}`);
      await ssh.execCommand(`rm -f ${remotoBase}`);
      if (rBase.code !== 0) {
        console.error(rBase.stderr || rBase.stdout);
        throw new Error(`Fallo la carga de datos base: codigo ${rBase.code}`);
      }
      console.log('Datos base de Eco-Sistema aplicados con éxito.');
    } else {
      console.log(`2. Datos base ya cargados previamente (${countCust} clientes). Saltando paso 2.`);
    }

    console.log('3. Generando datos complementarios (Taller, Contratos, Pedidos, Vehículos, Conteos)...');
    
    // Obtenemos IDs de clientes, productos y trabajadores para relacionar
    const rCust = await ssh.execCommand(`sudo -u postgres psql -tA -d siumax -c "SELECT id, name, coalesce(dni, ruc, '') as doc, coalesce(telefono, '') FROM public.customers WHERE id > 0 LIMIT 100"`);
    const customers = rCust.stdout.trim().split('\n').filter(Boolean).map(l => {
      const [id, name, doc, tel] = l.split('|');
      return { id: Number(id), name, doc, tel };
    });

    const rTrab = await ssh.execCommand(`sudo -u postgres psql -tA -d siumax -c "SELECT id, nombre FROM public.trabajadores WHERE id > 0"`);
    const trabajadores = rTrab.stdout.trim().split('\n').filter(Boolean).map(l => {
      const [id, nombre] = l.split('|');
      return { id: Number(id), nombre };
    });

    const rProd = await ssh.execCommand(`sudo -u postgres psql -tA -d siumax -c "SELECT id, name, price, cost_price, quantity FROM public.products WHERE id > 0 LIMIT 100"`);
    const products = rProd.stdout.trim().split('\n').filter(Boolean).map(l => {
      const [id, name, price, cost_price, quantity] = l.split('|');
      return { id: Number(id), name, price: Number(price) || 10, cost_price: Number(cost_price) || 5, quantity: Number(quantity) || 0 };
    });

    console.log(`Encontrados: ${customers.length} clientes, ${trabajadores.length} trabajadores, ${products.length} productos para relacionar.`);

    // 3.1 SQL de Taller (50 ordenes)
    const equiposTaller = [
      'BOMBA CENTRÍFUGA PEDROLLO 2HP', 'ELECTROBOMBA SUMERGIBLE PISCINA 1.5HP', 'TABLERO DE CONTROL AUTOMÁTICO 380V',
      'SOPLADORA PROFESIONAL STIHL BG50', 'GENERADOR ELÉCTRICO HONDA 5.5KVA', 'MOTOBOMBA DE CAUDAL 3 PULGADAS',
      'COMPRESOR DE AIRE INDUSTRIAL 50L', 'FILTRO DE ARENA VULCANO 650MM', 'CLORINADOR AUTOMÁTICO EN LÍNEA',
      'VÁLVULA SOLENOIDE HUNTER 2 PULGADAS', 'TRANSFORMADOR 220V/24V PARA RIEGO', 'MEDIDOR DE PRESIÓN Y CAUDAL DIGITAL',
      'DESBROZADORA HUSQVARNA 143R-II', 'DOSIFICADOR DE QUÍMICOS ELECTRÓNICO', 'BOMBA RECIRCULADORA DE CALOR PISCINA'
    ];
    const fallasTaller = [
      'No enciende tras corte de energía', 'Ruido excesivo en rodamientos del motor', 'Fuga de agua por el sello mecánico',
      'Pérdida súbita de presión en el circuito', 'Recalentamiento del bobinado a los 10 minutos', 'Válvula trabada en posición cerrada',
      'Falso contacto en la bornera de alimentación', 'Impulsor atascado por sedimentos', 'Fuga de aceite en retén principal',
      'Sensor de nivel no envía señal de corte', 'Quemado de condensador de arranque', 'Error de lectura en panel electrónico'
    ];
    const estadosTaller = ['RECIBIDO', 'DIAGNOSTICO', 'PRESUPUESTADO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const prioridadesTaller = ['NORMAL', 'ALTA', 'URGENTE'];

    let sqlTaller = [];
    for (let i = 1; i <= 50; i++) {
      const c = customers[i % customers.length];
      const t = trabajadores.length ? trabajadores[i % trabajadores.length] : null;
      const eq = equiposTaller[i % equiposTaller.length];
      const falla = fallasTaller[i % fallasTaller.length];
      const est = estadosTaller[i % estadosTaller.length];
      const prio = prioridadesTaller[i % prioridadesTaller.length];
      const manoObra = (50 + (i * 7) % 250);
      const repuestos = est === 'RECIBIDO' ? 0 : (30 + (i * 11) % 180);
      const total = manoObra + repuestos;
      const adelanto = est === 'RECIBIDO' ? 0 : Math.round(total * 0.4);
      const saldo = total - adelanto;
      const diaIngreso = String((i % 25) + 1).padStart(2, '0');
      const fIngreso = `2026-11-${diaIngreso} 09:30:00+00`;
      const fPrometida = `2026-11-${String(Math.min(28, Number(diaIngreso) + 3)).padStart(2, '0')}`;
      const fListo = (est === 'LISTO' || est === 'ENTREGADO') ? `'2026-11-${diaIngreso} 17:00:00+00'` : 'NULL';
      const fEntrega = est === 'ENTREGADO' ? `'2026-11-${diaIngreso} 18:30:00+00'` : 'NULL';

      sqlTaller.push(`(${i}, 'OT-${String(i).padStart(4, '0')}', ${c.id}, '${eq.replace(/'/g, "''")}', 'MARCA-${(i%5)+1}', 'MOD-${100+i}', 'SER-${9000+i}', 'Negro/Gris', 'Cables y conectores', '${falla.replace(/'/g, "''")}', 'Revisión técnica completa', 'Reemplazo y ajuste', ${t ? t.id : 'NULL'}, '${est}', '${prio}', ${manoObra}, ${repuestos}, ${total}, ${adelanto}, ${saldo}, '${fIngreso}', '${fPrometida}', ${fListo}, ${fEntrega}, 3, '2026-12-31', 'Atendido por taller', NOW(), NOW())`);
    }

    // 3.2 SQL de Contratos (50 contratos)
    const titulosContrato = [
      'Mantenimiento mensual sistema de riego automatizado',
      'Servicio integral preventivo piscina olímpica',
      'Inspección y calibración periódica de electrobombas',
      'Tratamiento de agua y control de químicos semanal',
      'Supervisión y purga de tableros eléctricos de fuerza',
      'Servicio de mantenimiento áreas verdes y riego por goteo',
      'Control de presión y filtrado continuo de piscina recreativa'
    ];
    const frecuencias = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'BIMESTRAL'];
    const estadosContrato = ['ACTIVO', 'ACTIVO', 'ACTIVO', 'PAUSADO', 'FINALIZADO'];

    let sqlContratos = [];
    for (let i = 1; i <= 50; i++) {
      const c = customers[(i + 5) % customers.length];
      const t = trabajadores.length ? trabajadores[(i + 2) % trabajadores.length] : null;
      const tit = titulosContrato[i % titulosContrato.length];
      const frec = frecuencias[i % frecuencias.length];
      const est = estadosContrato[i % estadosContrato.length];
      const precio = (250 + (i * 35) % 1500);
      const diaInicio = String((i % 25) + 1).padStart(2, '0');
      const fInicio = `2026-08-${diaInicio}`;
      const fFin = est === 'FINALIZADO' ? `'2026-11-${diaInicio}'` : 'NULL';

      sqlContratos.push(`(${i}, 'CTR-${String(i).padStart(4, '0')}', ${c.id}, '${tit.replace(/'/g, "''")}', '${frec}', 15, ${precio}, 'PEN', '${fInicio}', ${fFin}, '${est}', 'Av. Los Ficus ${100+i}, Lima', ${t ? t.id : 'NULL'}, 'Contrato anual regular', NOW(), NOW())`);
    }

    // 3.3 SQL de Pedidos de Clientes (50 pedidos + detalles)
    const estadosPedido = ['PENDIENTE', 'PENDIENTE', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO'];
    let sqlPedidos = [];
    let sqlPedidoDetalles = [];
    let detId = 1;

    for (let i = 1; i <= 50; i++) {
      const c = customers[(i + 10) % customers.length];
      const p1 = products[i % products.length];
      const p2 = products[(i + 3) % products.length];
      const est = estadosPedido[i % estadosPedido.length];
      
      const q1 = (i % 4) + 1;
      const sub1 = q1 * p1.price;
      const q2 = (i % 3) + 1;
      const sub2 = q2 * p2.price;
      const total = sub1 + sub2;
      const adelanto = est === 'ENTREGADO' ? total : Math.round(total * 0.3);
      const saldo = total - adelanto;
      const diaEnt = String((i % 25) + 1).padStart(2, '0');
      const fEntrega = `2026-11-${diaEnt} 18:00:00+00`;

      sqlPedidos.push(`(${i}, 'PED-${String(i).padStart(4, '0')}', '${c.id}', '${c.name.replace(/'/g, "''")}', '${c.doc}', '${c.tel}', '${fEntrega}', '${est}', ${total}, ${adelanto}, ${saldo}, 'EFECTIVO', 'Pedido registrado para obra/taller', 'admin', NOW())`);

      sqlPedidoDetalles.push(`(${detId++}, ${i}, ${p1.id}, '${p1.name.replace(/'/g, "''")}', ${q1}, ${p1.price}, ${sub1}, false)`);
      sqlPedidoDetalles.push(`(${detId++}, ${i}, ${p2.id}, '${p2.name.replace(/'/g, "''")}', ${q2}, ${p2.price}, ${sub2}, false)`);
    }

    // 3.4 SQL de Vehículos (12 vehículos)
    const listaVehiculos = [
      { placa: 'ABC-123', marca: 'TOYOTA', modelo: 'HILUX 4X4', anio: 2021, color: 'Blanco', km: 68500 },
      { placa: 'BCF-456', marca: 'HYUNDAI', modelo: 'H1 PANEL', anio: 2019, color: 'Plata', km: 112000 },
      { placa: 'CFG-789', marca: 'NISSAN', modelo: 'FRONTIER', anio: 2022, color: 'Rojo', km: 45300 },
      { placa: 'DGH-012', marca: 'MITSUBISHI', modelo: 'L200', anio: 2020, color: 'Gris Oscuro', km: 89400 },
      { placa: 'EJK-345', marca: 'CHEVROLET', modelo: 'N300 CARGO', anio: 2018, color: 'Blanco', km: 142100 },
      { placa: 'FKL-678', marca: 'KIA', modelo: 'K2700', anio: 2021, color: 'Azul', km: 58900 },
      { placa: 'GLM-901', marca: 'FOTON', modelo: 'VIEW CS2', anio: 2022, color: 'Blanco', km: 38200 },
      { placa: 'HMN-234', marca: 'RENAULT', modelo: 'MASTER', anio: 2020, color: 'Plata', km: 94700 },
      { placa: 'JNP-567', marca: 'FORD', modelo: 'RANGER XLT', anio: 2023, color: 'Negro', km: 26100 },
      { placa: 'KPQ-890', marca: 'ISUZU', modelo: 'D-MAX', anio: 2019, color: 'Blanco', km: 125300 },
      { placa: 'LRS-123', marca: 'SUZUKI', modelo: 'CARRY', anio: 2020, color: 'Blanco', km: 74200 },
      { placa: 'MST-456', marca: 'VOLKSWAGEN', modelo: 'AMAROK', anio: 2022, color: 'Gris', km: 49800 }
    ];
    let sqlVehiculos = [];
    for (let i = 0; i < listaVehiculos.length; i++) {
      const v = listaVehiculos[i];
      const t = trabajadores.length ? trabajadores[i % trabajadores.length] : null;
      const soat = i % 3 === 0 ? '2026-11-28' : '2027-05-15'; // Algunos por vencer
      const rev = i % 4 === 0 ? '2026-11-30' : '2027-08-20';
      const est = i === 4 ? 'EN_TALLER' : (i === 11 ? 'DE_BAJA' : 'OPERATIVO');

      sqlVehiculos.push(`(${i + 2}, '${v.placa}', '${v.marca}', '${v.modelo}', ${v.anio}, '${v.color}', ${v.km}, '${soat}', '${rev}', ${t ? t.id : 'NULL'}, '${est}', 'Asignado a cuadrilla técnica', NOW(), NOW())`);
    }

    // 3.5 SQL de Waste / Conteos (50 mermas y ajustes)
    const motivosAjuste = ['AJUSTE_INVENTARIO', 'DAÑADO', 'VENCIDO', 'MERMA', 'USO_INTERNO'];
    let sqlWaste = [];
    for (let i = 1; i <= 50; i++) {
      const p = products[i % products.length];
      const cant = (i % 5) + 1;
      const motivo = motivosAjuste[i % motivosAjuste.length];
      const loss = Math.round(cant * p.cost_price * 100) / 100;
      const dia = String((i % 25) + 1).padStart(2, '0');
      const prev = p.quantity + cant;
      const newQ = p.quantity;

      sqlWaste.push(`(${i}, ${p.id}, '${p.name.replace(/'/g, "''")}', ${cant}, ${p.cost_price}, ${loss}, '${motivo}', 'Ajuste de conteo físico regular', 'admin', '2026-11-${dia} 11:00:00+00', 1, ${prev}, ${newQ}, ${prev}, ${newQ})`);
    }

    // Armamos script SQL completo para las tablas complementarias
    const sqlComplementario = `
BEGIN;
SET LOCAL lock_timeout = '30s';

-- Taller
TRUNCATE TABLE public.taller_repuestos, public.taller_ordenes RESTART IDENTITY CASCADE;
INSERT INTO public.taller_ordenes (
  id, codigo, customer_id, tipo_equipo, marca, modelo, serie, color, accesorios,
  falla_reportada, diagnostico, solucion_aplicada, tecnico_id, estado, prioridad,
  costo_mano_obra, costo_repuestos, total, adelanto, saldo, fecha_ingreso,
  fecha_prometida, fecha_listo, fecha_entrega, meses_garantia, garantia_vence, notas,
  created_at, updated_at
) VALUES 
${sqlTaller.join(',\n')};

SELECT setval(pg_get_serial_sequence('public.taller_ordenes', 'id'), COALESCE((SELECT max(id) FROM public.taller_ordenes), 1));

-- Contratos
TRUNCATE TABLE public.contrato_visitas, public.contrato_cobros, public.contratos RESTART IDENTITY CASCADE;
INSERT INTO public.contratos (
  id, codigo, customer_id, titulo, frecuencia, dia_cobro, precio_periodo, moneda,
  fecha_inicio, fecha_fin, estado, direccion, tecnico_principal_id, notas,
  created_at, updated_at
) VALUES
${sqlContratos.join(',\n')};

SELECT setval(pg_get_serial_sequence('public.contratos', 'id'), COALESCE((SELECT max(id) FROM public.contratos), 1));

-- Pedidos
TRUNCATE TABLE public.pedido_detalles, public.pedidos_clientes RESTART IDENTITY CASCADE;
INSERT INTO public.pedidos_clientes (
  id, numero, cliente_id, cliente_nombre, cliente_documento, cliente_telefono,
  fecha_entrega, estado, total, adelanto, saldo_pendiente, metodo_adelanto,
  observaciones, vendedor, created_at
) VALUES
${sqlPedidos.join(',\n')};

INSERT INTO public.pedido_detalles (
  id, pedido_id, product_id, product_name, quantity, price, subtotal, es_mayorista
) VALUES
${sqlPedidoDetalles.join(',\n')};

SELECT setval(pg_get_serial_sequence('public.pedidos_clientes', 'id'), COALESCE((SELECT max(id) FROM public.pedidos_clientes), 1));
SELECT setval(pg_get_serial_sequence('public.pedido_detalles', 'id'), COALESCE((SELECT max(id) FROM public.pedido_detalles), 1));

-- Vehiculos adicionales (manteniendo el que ya existia de Eco)
INSERT INTO public.vehiculos (
  id, placa, marca, modelo, anio, color, kilometraje, vencimiento_soat,
  vencimiento_revision_tecnica, trabajador_asignado_id, estado, observaciones,
  created_at, updated_at
) VALUES
${sqlVehiculos.join(',\n')}
ON CONFLICT (placa) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.vehiculos', 'id'), COALESCE((SELECT max(id) FROM public.vehiculos), 1));

-- Waste / Conteos
TRUNCATE TABLE public.waste RESTART IDENTITY CASCADE;
INSERT INTO public.waste (
  id, product_id, product_name, quantity, cost_unit, total_loss, reason,
  notes, "user", created_at, is_synced, previous_quantity, new_quantity,
  conteo_sistema, conteo_contado
) VALUES
${sqlWaste.join(',\n')};

SELECT setval(pg_get_serial_sequence('public.waste', 'id'), COALESCE((SELECT max(id) FROM public.waste), 1));

COMMIT;
`;

    const remotoComp = '/tmp/carga-siumax-complementos.sql';
    await ssh.execCommand(`cat > ${remotoComp} && chmod 644 ${remotoComp}`, { stdin: sqlComplementario });
    const rComp = await ssh.execCommand(`sudo -u postgres psql -v ON_ERROR_STOP=1 -d siumax -f ${remotoComp}`);
    await ssh.execCommand(`rm -f ${remotoComp}`);
    if (rComp.code !== 0) {
      console.error(rComp.stderr || rComp.stdout);
      throw new Error(`Fallo la carga de complementos: codigo ${rComp.code}`);
    }
    console.log('Datos complementarios aplicados con éxito.');

    console.log('4. Conteos finales en la base siumax:');
    const TABLAS = [
      'customers', 'products', 'batches', 'salidas', 'cotizaciones',
      'herramientas', 'compras', 'taller_ordenes', 'contratos',
      'pedidos_clientes', 'vehiculos', 'waste'
    ];
    const qConteo = TABLAS.map(t => `SELECT '${t}', count(*) FROM public.${t}`).join(' UNION ALL ') + ' ORDER BY 1';
    const rTot = await ssh.execCommand(`sudo -u postgres psql -tA -d siumax -c "${qConteo}"`);
    console.log('--- RESUMEN DE FILAS ---');
    console.log(rTot.stdout.trim().split('\n').join('\n'));

  } finally {
    ssh.dispose();
  }
})().catch(e => {
  console.error('ERROR FATAL:', e);
  process.exit(1);
});
