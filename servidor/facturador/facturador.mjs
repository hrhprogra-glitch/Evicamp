// SiuMax · Facturador electrónico (fase 11)
// Servicio del VPS (siumax-facturador.service, usuario postgres). Cada pocos segundos, en cada base de
// /opt/siuhub/facturador/bases.json:
//   1. Avisa que está vivo (facturacion_config.facturador_visto_at) y atiende "Probar conexión".
//   2. Toma las ventas con boleta/factura PENDIENTE (o con ERROR, para reintentar), arma el comprobante
//      y lo manda al proveedor (Nubefact) o lo simula (modo SIMULADO), y guarda la respuesta en sales.cpe_*.
//   3. Guarda una copia propia (JSON / PDF / XML / CDR) en /var/lib/siumax-cpe/<base>/<año-mes>/.
// La clave del proveedor está en privado.facturacion_credenciales (la API no la puede leer).
// Como trabaja sobre la base, las ventas hechas sin internet se envían solas cuando llegan al servidor.
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const VERSION = '11.1.1';
const ARCHIVO_BASES = process.env.FACTURADOR_BASES || '/opt/siuhub/facturador/bases.json';
const CARPETA_COPIAS = process.env.FACTURADOR_COPIAS || '/var/lib/siumax-cpe';
const PAUSA_MS = 5000;
const POR_CICLO = 5;

const log = (base, ...txt) => console.log(new Date().toISOString(), base ? `[${base}]` : '', ...txt);
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- comprobante (independiente del proveedor)

const CODIGO_DOC_CLIENTE = { RUC: '6', DNI: '1', CE: '4', SIN: '-' };

/** Fecha de la venta en Perú (UTC-5, sin horario de verano). */
const fechaPeru = (fecha) => new Date(new Date(fecha).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);

/** Arma el comprobante con montos SIN y CON IGV por línea. Los precios de SiuMax ya incluyen el IGV. */
export const armarComprobante = (cfg, venta, detalles) => {
  const tasa = Number(cfg.igv_porcentaje ?? 18) / 100;
  const items = detalles.map((d) => {
    const cantidad = Number(d.quantity) || 0;
    const total = r2(d.subtotal);
    // Fase 11.2 agregará el tipo de IGV por producto; hasta entonces todo es GRAVADO.
    const tipo = (d.tipo_igv || 'GRAVADO').toUpperCase();
    const gravado = tipo === 'GRAVADO';
    const base = gravado ? r2(total / (1 + tasa)) : total;
    const igv = gravado ? r2(total - base) : 0;
    const nombre = [d.product_name || d.p_name || 'PRODUCTO', d.variant_name].filter(Boolean).join(' ');
    return {
      codigo: String(d.code || d.barcode || d.product_id || ''),
      descripcion: nombre.slice(0, 250),
      unidad: d.sunat_unit_code || (String(d.unit || '').toUpperCase() === 'KG' ? 'KGM' : 'NIU'),
      cantidad,
      valor_unitario: cantidad ? base / cantidad : 0,
      precio_unitario: cantidad ? total / cantidad : 0,
      subtotal: base,
      igv,
      total,
      tipo,
    };
  });
  const suma = (k, filtro = () => true) => r2(items.filter(filtro).reduce((t, it) => t + it[k], 0));
  const total = suma('total');
  const igv = suma('igv');
  const exonerada = suma('subtotal', (it) => it.tipo === 'EXONERADO');
  const inafecta = suma('subtotal', (it) => it.tipo === 'INAFECTO');
  const tipoCliente = venta.cpe_cliente_tipo_doc || 'SIN';
  return {
    tipo: Number(venta.doc_type),                 // 1 factura, 3 boleta
    serie: venta.doc_serial,
    numero: Number(venta.doc_number),
    fecha: fechaPeru(venta.created_at),
    emisor: { ruc: cfg.ruc, razon_social: cfg.razon_social },
    cliente: {
      tipo: tipoCliente,
      numero: venta.cpe_cliente_num_doc || '',
      nombre: venta.cpe_cliente_nombre || venta.customer_name || 'CLIENTES VARIOS',
      direccion: venta.cpe_cliente_direccion || '',
    },
    igv_porcentaje: Number(cfg.igv_porcentaje ?? 18),
    totales: { gravada: r2(total - igv - exonerada - inafecta), exonerada, inafecta, igv, total },
    items,
  };
};

/** Problemas que harían rechazar el comprobante (se revisan antes de enviarlo). */
export const revisarComprobante = (doc) => {
  if (!doc.emisor.ruc || !doc.emisor.razon_social) return 'Faltan el RUC o la razón social del negocio (Ajustes > Datos de la empresa).';
  if (!doc.items.length) return 'La venta no tiene productos.';
  if (doc.items.some((it) => !(it.cantidad > 0))) return 'Hay un producto con cantidad 0.';
  if (!(doc.totales.total > 0)) return 'El total del comprobante es 0.';
  if (doc.tipo === 1 && (doc.cliente.tipo !== 'RUC' || !/^\d{11}$/.test(doc.cliente.numero))) return 'La factura necesita el RUC del cliente.';
  if (doc.tipo === 3 && doc.totales.total > 700 && doc.cliente.tipo === 'SIN') return 'Boleta de más de S/ 700 sin DNI del cliente.';
  return null;
};

/** Texto del código QR que SUNAT pide en la representación impresa. */
const textoQR = (doc, hash) => [
  doc.emisor.ruc, String(doc.tipo).padStart(2, '0'), doc.serie, doc.numero,
  doc.totales.igv.toFixed(2), doc.totales.total.toFixed(2), doc.fecha,
  CODIGO_DOC_CLIENTE[doc.cliente.tipo] || '-', doc.cliente.numero || '-', hash || '',
].join('|') + '|';

// ---------------------------------------------------------------- proveedores ("enchufes")
// Cada uno responde { estado, mensaje, hash, qr, pdf, xml, cdr }. estado: ACEPTADO, OBSERVADO, RECHAZADO,
// PENDIENTE (generado, esperando a SUNAT: se vuelve a consultar) o ERROR (no se pudo: se reintenta).

const simulado = {
  async emitir(doc) {
    const hash = crypto.createHash('sha1').update(JSON.stringify(doc)).digest('base64').slice(0, 28);
    return { estado: 'ACEPTADO', mensaje: 'SIMULADO: no se envió a SUNAT (modo de práctica).', hash, qr: textoQR(doc, hash) };
  },
  async consultar(doc) { return this.emitir(doc); },
  async probar() { return { ok: true, mensaje: 'Modo simulado listo: los comprobantes NO se envían a SUNAT.' }; },
};

// Nubefact (API JSON). Formato según su manual de integración; confirmar con la cuenta de prueba.
const nubefact = {
  async llamar(cred, cuerpo) {
    const res = await fetch(cred.ruta, {
      method: 'POST',
      headers: { Authorization: `Token token="${cred.token}"`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(30000),
    });
    let datos = {};
    try { datos = await res.json(); } catch { /* respuesta sin JSON */ }
    return { http: res.status, datos };
  },
  cuerpo(doc) {
    const sinDoc = doc.cliente.tipo === 'SIN';
    return {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: doc.tipo === 1 ? 1 : 2,
      serie: doc.serie,
      numero: doc.numero,
      sunat_transaction: 1,
      cliente_tipo_de_documento: CODIGO_DOC_CLIENTE[doc.cliente.tipo] || '-',
      cliente_numero_de_documento: sinDoc ? '-' : doc.cliente.numero,
      cliente_denominacion: sinDoc ? 'CLIENTES VARIOS' : doc.cliente.nombre,
      cliente_direccion: doc.cliente.direccion || '',
      cliente_email: '',
      fecha_de_emision: doc.fecha.split('-').reverse().join('-'), // dd-mm-aaaa
      moneda: 1,
      porcentaje_de_igv: doc.igv_porcentaje.toFixed(2),
      total_gravada: doc.totales.gravada || '',
      total_exonerada: doc.totales.exonerada || '',
      total_inafecta: doc.totales.inafecta || '',
      total_igv: doc.totales.igv,
      total: doc.totales.total,
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: false,
      items: doc.items.map((it) => ({
        unidad_de_medida: it.unidad,
        codigo: it.codigo,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        valor_unitario: Number(it.valor_unitario.toFixed(10)),
        precio_unitario: Number(it.precio_unitario.toFixed(10)),
        subtotal: it.subtotal,
        tipo_de_igv: it.tipo === 'GRAVADO' ? 1 : it.tipo === 'EXONERADO' ? 8 : 9,
        igv: it.igv,
        total: it.total,
        anticipo_regularizacion: false,
      })),
    };
  },
  leer(datos, doc) {
    const codigo = Number(datos.sunat_responsecode ?? NaN);
    const mensaje = [datos.sunat_description, datos.sunat_note, datos.sunat_soap_error].filter(Boolean).join(' · ') || null;
    const base = {
      hash: datos.codigo_hash || null,
      qr: datos.cadena_para_codigo_qr || textoQR(doc, datos.codigo_hash),
      pdf: datos.enlace_del_pdf || null,
      xml: datos.enlace_del_xml || null,
      cdr: datos.enlace_del_cdr || null,
    };
    if (datos.aceptada_por_sunat === true) {
      return { ...base, estado: codigo >= 4000 ? 'OBSERVADO' : 'ACEPTADO', mensaje: mensaje || 'Aceptada por SUNAT' };
    }
    if (Number.isFinite(codigo) && codigo >= 2000 && codigo < 4000) return { ...base, estado: 'RECHAZADO', mensaje: mensaje || `Rechazada por SUNAT (${codigo})` };
    // Generado por Nubefact, pero SUNAT todavía no responde (las boletas van en resumen diario)
    return { ...base, estado: 'PENDIENTE', mensaje: mensaje || 'Generado; esperando la respuesta de SUNAT.' };
  },
  error(http, datos) {
    const texto = String(datos.errors || datos.error || `HTTP ${http}`);
    if (http === 401 || http === 403 || /token|autoriz/i.test(texto)) return { estado: 'ERROR', mensaje: 'La clave (token) del proveedor no es válida: revísala en Ajustes > Facturación.' };
    return { estado: 'ERROR', mensaje: `Proveedor: ${texto}` };
  },
  async emitir(doc, cred) {
    const { http, datos } = await this.llamar(cred, this.cuerpo(doc));
    if (datos.errors) {
      // Ya se había generado (por ejemplo, se cortó la conexión antes de recibir la respuesta): se consulta
      if (/existe/i.test(String(datos.errors))) return this.consultar(doc, cred);
      return this.error(http, datos);
    }
    if (http >= 400) return this.error(http, datos);
    return this.leer(datos, doc);
  },
  async consultar(doc, cred) {
    const { http, datos } = await this.llamar(cred, {
      operacion: 'consultar_comprobante', tipo_de_comprobante: doc.tipo === 1 ? 1 : 2, serie: doc.serie, numero: doc.numero,
    });
    if (datos.errors || http >= 400) return this.error(http, datos);
    return this.leer(datos, doc);
  },
  async probar(cred, cfg) {
    const { http, datos } = await this.llamar(cred, {
      operacion: 'consultar_comprobante', tipo_de_comprobante: 1, serie: cfg.serie_factura, numero: 99999999,
    });
    const texto = String(datos.errors || '');
    if (http === 401 || http === 403 || /token|autoriz/i.test(texto)) return { ok: false, mensaje: 'Nubefact rechazó la clave (token). Revisa la ruta y el token.' };
    if (http >= 500) return { ok: false, mensaje: `Nubefact no responde bien (HTTP ${http}). Intenta más tarde.` };
    return { ok: true, mensaje: 'Conexión correcta con Nubefact.' };
  },
};

const proveedorDe = (cfg) => (cfg.modo === 'SIMULADO' ? simulado : nubefact);

// ---------------------------------------------------------------- copias propias

const guardarCopias = async (base, doc, resultado) => {
  const carpeta = path.join(CARPETA_COPIAS, base, doc.fecha.slice(0, 7));
  const nombre = `${doc.emisor.ruc}-${String(doc.tipo).padStart(2, '0')}-${doc.serie}-${doc.numero}`;
  await fs.mkdir(carpeta, { recursive: true });
  await fs.writeFile(path.join(carpeta, `${nombre}.json`), JSON.stringify({ doc, resultado }, null, 2));
  for (const [clave, ext] of [['pdf', 'pdf'], ['xml', 'xml'], ['cdr', 'cdr.zip']]) {
    if (!resultado[clave]) continue;
    try {
      const res = await fetch(resultado[clave], { signal: AbortSignal.timeout(30000) });
      if (res.ok) await fs.writeFile(path.join(carpeta, `${nombre}.${ext}`), Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      log(base, `no se pudo bajar ${clave} de ${nombre}:`, e.message);
    }
  }
};

// ---------------------------------------------------------------- ciclo por base

const pools = new Map();
const poolDe = (base) => {
  if (!pools.has(base)) pools.set(base, new pg.Pool({ host: '/var/run/postgresql', user: 'postgres', database: base, max: 2 }));
  return pools.get(base);
};

const espera = (intentos) => Math.min(15 * 2 ** Math.max(0, intentos - 1), 3600); // segundos: 15, 30, 60... hasta 1 h

const procesarVenta = async (db, base, cfg, cred, venta) => {
  const { rows: detalles } = await db.query(
    `SELECT d.*, p.name AS p_name, p.code, p.barcode, p.sunat_unit_code, p.unit
       FROM public.sale_details d LEFT JOIN public.products p ON p.id = d.product_id
      WHERE d.sale_id = $1 ORDER BY d.id`, [venta.id]);

  // La Caja guarda los productos justo después de la venta: si todavía no llegan, se espera sin gastar intento
  if (!detalles.length && Date.now() - new Date(venta.created_at).getTime() < 120000) {
    await db.query(`UPDATE public.sales SET cpe_estado = 'PENDIENTE', cpe_intentos = greatest(cpe_intentos - 1, 0),
      cpe_proximo_intento = now() + interval '5 seconds' WHERE id = $1`, [venta.id]);
    return;
  }

  const doc = armarComprobante(cfg, venta, detalles);
  let resultado = null;
  const problema = revisarComprobante(doc);
  if (problema) resultado = { estado: 'ERROR', mensaje: problema };
  else if (cfg.modo !== 'SIMULADO' && !cred) resultado = { estado: 'ERROR', mensaje: 'Falta guardar la ruta y la clave del proveedor (Ajustes > Facturación).' };
  else {
    const proveedor = proveedorDe(cfg);
    try {
      // Si ya se generó antes (tiene PDF o hash) solo se consulta cómo va en SUNAT
      resultado = venta.cpe_pdf || venta.sunat_hash ? await proveedor.consultar(doc, cred) : await proveedor.emitir(doc, cred);
    } catch (e) {
      resultado = { estado: 'ERROR', mensaje: `Sin conexión con el proveedor: ${e.message}` };
    }
  }

  const reintentar = resultado.estado === 'ERROR' || resultado.estado === 'PENDIENTE';
  const segundos = resultado.estado === 'PENDIENTE' ? 600 : espera(venta.cpe_intentos);
  await db.query(
    `UPDATE public.sales SET cpe_estado = $2, cpe_mensaje = $3, sunat_hash = coalesce($4, sunat_hash), cpe_qr = coalesce($5, cpe_qr),
       cpe_pdf = coalesce($6, cpe_pdf), cpe_xml = coalesce($7, cpe_xml), cpe_cdr = coalesce($8, cpe_cdr),
       cpe_enviado_at = CASE WHEN $2 <> 'ERROR' THEN now() ELSE cpe_enviado_at END,
       cpe_proximo_intento = CASE WHEN $9 THEN now() + make_interval(secs => $10) ELSE NULL END
     WHERE id = $1`,
    [venta.id, resultado.estado, resultado.mensaje || null, resultado.hash || null, resultado.qr || null,
      resultado.pdf || null, resultado.xml || null, resultado.cdr || null, reintentar, segundos]);
  log(base, `${doc.serie}-${doc.numero} → ${resultado.estado}${resultado.mensaje ? ` (${resultado.mensaje})` : ''}`);

  if (resultado.estado !== 'ERROR') {
    try { await guardarCopias(base, doc, resultado); } catch (e) { log(base, 'copia no guardada:', e.message); }
  }
};

const avisados = new Set();
const ciclo = async (base) => {
  const db = poolDe(base);
  let cfg;
  try {
    ({ rows: [cfg] } = await db.query(
      `UPDATE public.facturacion_config SET facturador_visto_at = now(), facturador_version = $1 WHERE id = 1 RETURNING *`, [VERSION]));
  } catch (e) {
    if (!avisados.has(base)) { log(base, 'sin facturación instalada:', e.message); avisados.add(base); }
    return;
  }
  avisados.delete(base);
  if (!cfg) return;
  // Los datos del negocio (RUC, razón social, dirección) están en Ajustes > Datos de la empresa
  const { rows: [empresa] } = await db.query(
    `SELECT ruc, coalesce(nullif(trim(razon_social), ''), nombre_empresa) AS razon_social, nombre_empresa, direccion, ubigeo, regimen
       FROM public.empresa_config ORDER BY id LIMIT 1`);
  cfg = { ...cfg, ...(empresa || {}) };

  const { rows: [cred] } = await db.query('SELECT ruta, token FROM privado.facturacion_credenciales WHERE id = 1');

  // "Probar conexión" pedido desde Ajustes
  if (cfg.prueba_pedida_at && (!cfg.prueba_at || new Date(cfg.prueba_pedida_at) > new Date(cfg.prueba_at))) {
    let r;
    if (cfg.modo !== 'SIMULADO' && !cred) r = { ok: false, mensaje: 'Primero guarda la ruta y la clave del proveedor.' };
    else {
      try { r = await proveedorDe(cfg).probar(cred, cfg); } catch (e) { r = { ok: false, mensaje: `Sin conexión: ${e.message}` }; }
    }
    await db.query('UPDATE public.facturacion_config SET prueba_at = now(), prueba_ok = $1, prueba_mensaje = $2 WHERE id = 1', [r.ok, r.mensaje]);
    log(base, 'prueba de conexión:', r.ok ? 'OK' : 'FALLA', r.mensaje);
  }

  if (!cfg.activo) return;

  // Si el servicio se cortó a mitad de un envío, esa venta vuelve a la cola
  await db.query(`UPDATE public.sales SET cpe_estado = 'PENDIENTE' WHERE cpe_estado = 'ENVIANDO' AND cpe_proximo_intento < now()`);

  const { rows: ventas } = await db.query(
    `UPDATE public.sales SET cpe_estado = 'ENVIANDO', cpe_intentos = cpe_intentos + 1, cpe_proximo_intento = now() + interval '2 minutes'
      WHERE id IN (SELECT id FROM public.sales
                    WHERE cpe_estado IN ('PENDIENTE', 'ERROR') AND coalesce(cpe_proximo_intento, created_at) <= now()
                    ORDER BY created_at LIMIT ${POR_CICLO} FOR UPDATE SKIP LOCKED)
      RETURNING *`);
  for (const venta of ventas) {
    try { await procesarVenta(db, base, cfg, cred, venta); } catch (e) { log(base, `venta ${venta.id}:`, e.message); }
  }
};

let seguir = true;
for (const senal of ['SIGTERM', 'SIGINT']) process.on(senal, () => { seguir = false; });

const leerBases = async () => {
  try {
    const lista = JSON.parse(await fs.readFile(ARCHIVO_BASES, 'utf8'));
    return Array.isArray(lista) ? lista.filter((b) => /^[a-z0-9_]+$/.test(b)) : [];
  } catch (e) {
    log('', `no se pudo leer ${ARCHIVO_BASES}:`, e.message);
    return [];
  }
};

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  log('', `facturador ${VERSION} iniciado`);
  while (seguir) {
    for (const base of await leerBases()) {
      try { await ciclo(base); } catch (e) { log(base, 'error en el ciclo:', e.message); }
    }
    await dormir(PAUSA_MS);
  }
  for (const p of pools.values()) await p.end();
  log('', 'facturador detenido');
}
