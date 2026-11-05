// Boletas y facturas electrónicas en la Caja y en el ticket (fase 11.3).
// Los montos se calculan IGUAL que el facturador del servidor (servidor/facturador/facturador.mjs,
// armarComprobante): así el ticket impreso coincide con lo que se envía a SUNAT.
import { supabase } from '../db/supabase';

export type TipoComprobante = 'NOTA' | 'BOLETA' | 'FACTURA';
export type TipoDocCliente = 'DNI' | 'RUC' | 'CE' | 'SIN';

/** Lo que la Caja necesita saber de Ajustes > Facturación (null = facturación apagada o sin instalar). */
export interface FacturacionCaja {
  modo: 'SIMULADO' | 'PRUEBA' | 'REAL';
  porDefecto: TipoComprobante;
  igvPct: number;
  icbperUnidad: number;
  regimen: string | null;
}

const CLAVE_COPIA = 'siumax_facturacion_caja';
const copiaGuardada = (): FacturacionCaja | null => {
  try { return JSON.parse(localStorage.getItem(CLAVE_COPIA) || 'null'); } catch { return null; }
};

// Con internet se lee de la base y se guarda una copia; sin internet se usa esa copia, así la Caja
// sigue emitiendo boletas (quedan "por numerar" y la base les pone número al volver la conexión).
export const cargarFacturacionCaja = async (): Promise<FacturacionCaja | null> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return copiaGuardada();
  try {
    const [{ data: cfg, error }, { data: empresa }] = await Promise.all([
      supabase.from('facturacion_config').select('activo, modo, comprobante_por_defecto, igv_porcentaje, icbper_monto').eq('id', 1).maybeSingle(),
      supabase.from('empresa_config').select('regimen').order('id').limit(1).maybeSingle(),
    ]);
    if (error) return copiaGuardada();
    if (!cfg?.activo) { try { localStorage.removeItem(CLAVE_COPIA); } catch { /* sin almacenamiento */ } return null; }
    const regimen = (empresa as { regimen?: string } | null)?.regimen ?? null;
    let porDefecto = (cfg.comprobante_por_defecto || 'NOTA') as TipoComprobante;
    if (porDefecto === 'FACTURA' && regimen === 'NRUS') porDefecto = 'BOLETA';
    const resultado: FacturacionCaja = {
      modo: cfg.modo,
      porDefecto,
      igvPct: Number(cfg.igv_porcentaje ?? 18),
      icbperUnidad: Number(cfg.icbper_monto ?? 0.5),
      regimen,
    };
    try { localStorage.setItem(CLAVE_COPIA, JSON.stringify(resultado)); } catch { /* sin almacenamiento */ }
    return resultado;
  } catch {
    return copiaGuardada(); // sin conexión: la última configuración conocida (o null: Nota de venta)
  }
};

/** Datos del comprobante que la Caja manda al guardar la venta. */
export interface DatosComprobante {
  tipo: TipoComprobante;
  clienteTipoDoc: TipoDocCliente;
  clienteNumDoc: string;
  clienteNombre: string;
  clienteDireccion: string;
}

export const DOC_TYPE: Record<TipoComprobante, number | null> = { NOTA: null, BOLETA: 3, FACTURA: 1 };

/** Lo que falta para poder emitir (o null si está todo bien). */
export const errorComprobante = (d: DatosComprobante, total: number, rucValido: (r: string) => boolean): string | null => {
  const num = d.clienteNumDoc.trim();
  if (d.tipo === 'FACTURA') {
    if (!/^\d{11}$/.test(num) || !rucValido(num)) return 'La factura necesita un RUC válido del cliente (11 números).';
    if (!d.clienteNombre.trim()) return 'Escribe la razón social del cliente.';
  }
  if (d.tipo === 'BOLETA') {
    if (num && d.clienteTipoDoc === 'DNI' && !/^\d{8}$/.test(num)) return 'El DNI tiene 8 números.';
    if (total > 700 && !num) return 'Boleta de más de S/ 700: SUNAT pide el DNI del cliente.';
    if (total > 700 && !d.clienteNombre.trim()) return 'Boleta de más de S/ 700: escribe el nombre del cliente.';
  }
  return null;
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface LineaCPE { subtotal: number; cantidad: number; tipoIgv?: string; esBolsa?: boolean }
export interface TotalesCPE { gravada: number; exonerada: number; inafecta: number; igv: number; icbper: number; total: number }

export const calcularTotalesCPE = (lineas: LineaCPE[], igvPct = 18, icbperUnidad = 0.5): TotalesCPE => {
  const tasa = igvPct / 100;
  let igv = 0, exonerada = 0, inafecta = 0, icbper = 0, total = 0;
  for (const l of lineas) {
    const cobrado = r2(Number(l.subtotal) || 0);
    const bolsa = l.esBolsa ? r2(Math.min(cobrado, (Number(l.cantidad) || 0) * icbperUnidad)) : 0;
    const neto = r2(cobrado - bolsa);
    const tipo = (l.tipoIgv || 'GRAVADO').toUpperCase();
    if (tipo === 'GRAVADO') igv += r2(neto - r2(neto / (1 + tasa)));
    else if (tipo === 'EXONERADO') exonerada += neto;
    else inafecta += neto;
    icbper += bolsa;
    total += cobrado;
  }
  igv = r2(igv); exonerada = r2(exonerada); inafecta = r2(inafecta); icbper = r2(icbper); total = r2(total);
  return { gravada: r2(total - icbper - igv - exonerada - inafecta), exonerada, inafecta, igv, icbper, total };
};

export const nombreComprobante = (docType: number | null | undefined) =>
  docType === 1 ? 'FACTURA ELECTRÓNICA' : docType === 3 ? 'BOLETA DE VENTA ELECTRÓNICA' : docType === 7 ? 'NOTA DE CRÉDITO ELECTRÓNICA' : 'NOTA DE VENTA';

/** Motivos de nota de crédito que usa SiuMax (catálogo 09 de SUNAT). */
export const MOTIVO_NOTA_CREDITO: Record<string, string> = {
  '01': 'Anulación de la operación',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
};

export const numeroComprobante = (serie?: string | null, numero?: string | number | null) =>
  serie && numero != null && numero !== '' ? `${serie}-${String(numero).padStart(8, '0')}` : '';

const CODIGO_DOC: Record<string, string> = { RUC: '6', DNI: '1', CE: '4', SIN: '-' };

/** Texto del QR (formato SUNAT). El hash llega después, cuando el facturador procesa el comprobante. */
export const textoQRComprobante = (o: {
  ruc: string; docType: number; serie: string; numero: string | number; totales: TotalesCPE; fecha: Date;
  clienteTipoDoc?: string; clienteNumDoc?: string; hash?: string | null;
}) => {
  const fecha = new Date(o.fecha.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10); // día en Perú
  return [o.ruc, String(o.docType).padStart(2, '0'), o.serie, o.numero, o.totales.igv.toFixed(2), o.totales.total.toFixed(2), fecha,
    CODIGO_DOC[o.clienteTipoDoc || 'SIN'] || '-', o.clienteNumDoc || '-', o.hash || ''].join('|') + '|';
};

/** Estado ante SUNAT (cpe_estado) para mostrarlo igual en todas las pantallas. */
export const ESTADO_CPE: Record<string, { texto: string; clase: string }> = {
  ACEPTADO: { texto: 'Aceptado', clase: 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' },
  OBSERVADO: { texto: 'Aceptado con observación', clase: 'border-[var(--color-warning)] text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)]' },
  PENDIENTE: { texto: 'Enviando…', clase: 'border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg-2)]' },
  ENVIANDO: { texto: 'Enviando…', clase: 'border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg-2)]' },
  ERROR: { texto: 'Error (se reintenta)', clase: 'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)]' },
  RECHAZADO: { texto: 'Rechazado por SUNAT', clase: 'border-[var(--color-danger)] text-white bg-[var(--color-danger)]' },
  // Venta anulada antes de que SUNAT aceptara el comprobante: se confirma con el proveedor / no llegó a emitirse
  // Nubefact ya la generó (PDF) y la manda a SUNAT en su resumen diario: está emitida, falta que SUNAT confirme
  GENERADO: { texto: 'Generada · SUNAT por confirmar', clase: 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-bg)]' },
  ANULANDO: { texto: 'Anulando…', clase: 'border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg-2)]' },
  NO_EMITIDO: { texto: 'No emitido (anulada)', clase: 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-bg)]' },
};
export const PROBLEMA_CPE = ['ERROR', 'RECHAZADO'];

/** ¿El comprobante ya existe para SUNAT? Aceptado, o generado por Nubefact (tiene PDF) esperando el resumen diario. */
export const comprobanteEmitido = (estado: string | null | undefined, pdf?: string | null) =>
  ['ACEPTADO', 'OBSERVADO'].includes(estado || '') || (estado === 'PENDIENTE' && Boolean(pdf));

/** Boleta/factura de una fila de `sales` (null = nota de venta), para las tablas de Finanzas. */
export const comprobanteDeVenta = (v: { doc_type?: number | null; doc_serial?: string | null; doc_number?: string | number | null; cpe_estado?: string | null; cpe_pdf?: string | null }) =>
  v.doc_type ? { docType: Number(v.doc_type), numero: numeroComprobante(v.doc_serial, v.doc_number) || 'Por numerar', estado: v.cpe_estado || null, generado: Boolean(v.cpe_pdf) } : null;

/** ¿Hay comprobantes con problema? (error, rechazado, o pendiente hace más de 10 minutos). Para los avisos de la Caja y Finanzas. */
export const contarComprobantesConProblema = async (): Promise<number> => {
  try {
    const hace10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [{ count: malos }, { count: atascados }, { count: notasMal }] = await Promise.all([
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', PROBLEMA_CPE),
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', ['PENDIENTE', 'ENVIANDO', 'ANULANDO']).is('cpe_pdf', null).lt('created_at', hace10),
      supabase.from('notas_credito').select('id', { count: 'exact', head: true }).in('cpe_estado', PROBLEMA_CPE),
    ]);
    return (malos || 0) + (atascados || 0) + (notasMal || 0);
  } catch {
    return 0;
  }
};
