// SiuMax Nego, paso 3h (12/11/2026): una sola pantalla de Cotizaciones para Comercio y Servicios (decidido por el
// dueño: "Una sola pantalla"). Une las de SiuMax Servic (secciones, soles o dólares, banco, abonos, convertir en
// trabajo) y las de Comerc (se hacen desde la Caja, convertir en venta, WhatsApp, anular, vencida automática).
// Misma tabla `cotizaciones` en la base.

// Estados de Nego. BORRADOR: hecha aquí y aún no enviada. VIGENTE: enviada al cliente (las de la Caja nacen así).
// VENCIDA no se guarda: es una VIGENTE o BORRADOR con la fecha pasada. ENVIADA (de Servic) se muestra como VIGENTE.
export type EstadoCotizacion = 'BORRADOR' | 'VIGENTE' | 'VENCIDA' | 'APROBADA' | 'RECHAZADA' | 'ANULADA' | 'CONVERTIDA';
export type MonedaCotizacion = 'PEN' | 'USD';

export const ESTADOS_FILTRO: { id: string; nombre: string }[] = [
  { id: 'TODOS', nombre: 'TODOS LOS ESTADOS' },
  { id: 'BORRADOR', nombre: 'BORRADOR' },
  { id: 'VIGENTE', nombre: 'VIGENTE' },
  { id: 'VENCIDA', nombre: 'VENCIDA' },
  { id: 'APROBADA', nombre: 'APROBADA' },
  { id: 'CONVERTIDA', nombre: 'CONVERTIDA' },
  { id: 'RECHAZADA', nombre: 'RECHAZADA' },
  { id: 'ANULADA', nombre: 'ANULADA' },
];

export interface CotizacionItem {
  id?: number;
  cotizacion_id?: number;
  product_id?: number | null;     // las de la Caja traen el producto (para convertir en venta)
  es_mayorista?: boolean | null;
  product_name: string;
  seccion?: string | null;
  unidad: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CotizacionPago {
  id: number;
  cotizacion_id: number;
  monto: number;
  fecha: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  created_at: string;
}

export interface Cotizacion {
  id: number;
  numero: string;
  cliente_id: string | null;
  cliente_nombre: string;
  cliente_documento: string | null;
  cliente_telefono: string | null;
  bien_id: number | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  moneda: MonedaCotizacion;
  total: number;
  adelanto: number;
  saldo: number;                  // calculado: total − adelanto (las de la Caja no guardan saldo)
  estado: EstadoCotizacion;
  estado_guardado: string;        // el de la base (VENCIDA no se guarda)
  observaciones: string | null;
  banco_info: string | null;
  condiciones: string | null;
  trabajo_id: number | null;
  salida_id: number | null;
  sale_id: number | null;
  vendedor: string | null;
  created_at: string;
  bien?: { id: number; nombre: string; tipo: string } | null;
}

// Fila de la base → Cotizacion de pantalla
export const aCotizacion = (c: any, bienes?: Map<number, { id: number; nombre: string; tipo: string }>): Cotizacion => {
  const guardado = String(c.estado || 'VIGENTE').toUpperCase();
  let estado = (guardado === 'ENVIADA' ? 'VIGENTE' : guardado) as EstadoCotizacion;
  if ((estado === 'VIGENTE' || estado === 'BORRADOR') && c.fecha_vencimiento && new Date() > new Date(c.fecha_vencimiento)) estado = 'VENCIDA';
  const total = Number(c.total) || 0;
  const adelanto = Number(c.adelanto) || 0;
  return {
    id: c.id,
    numero: c.numero || `COT-${c.id}`,
    cliente_id: c.cliente_id ?? null,
    cliente_nombre: c.cliente_nombre || '',
    cliente_documento: c.cliente_documento ?? null,
    cliente_telefono: c.cliente_telefono ?? null,
    bien_id: c.bien_id ?? null,
    fecha_emision: c.fecha_emision,
    fecha_vencimiento: c.fecha_vencimiento ?? null,
    moneda: c.moneda === 'USD' ? 'USD' : 'PEN',
    total,
    adelanto,
    saldo: Math.max(0, Number((total - adelanto).toFixed(2))),
    estado,
    estado_guardado: guardado,
    observaciones: c.observaciones ?? null,
    banco_info: c.banco_info ?? null,
    condiciones: c.condiciones ?? null,
    trabajo_id: c.trabajo_id ?? null,
    salida_id: c.salida_id ?? null,
    sale_id: c.sale_id ?? null,
    vendedor: c.vendedor ?? null,
    created_at: c.created_at,
    bien: c.bien_id && bienes ? bienes.get(Number(c.bien_id)) ?? null : null,
  };
};

export const simbolo = (m: MonedaCotizacion) => (m === 'USD' ? 'US$' : 'S/');

// Fechas: se guardan como fecha y hora (las de la Caja vencen a las 23:59:59 de su día). Se muestran en la hora local.
export const verFecha = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
// ISO → "aaaa-mm-dd" local (para los campos de fecha)
export const aCampoFecha = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const hoyCampo = () => aCampoFecha(new Date().toISOString());

// Colores de cada estado (etiquetas sobrias, sin esquinas redondeadas)
export const CLASE_ESTADO: Record<EstadoCotizacion, string> = {
  BORRADOR: 'bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]',
  VIGENTE: 'bg-blue-100 text-blue-900 border-blue-300',
  VENCIDA: 'bg-amber-100 text-amber-900 border-amber-300',
  APROBADA: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  CONVERTIDA: 'bg-purple-100 text-purple-900 border-purple-300',
  RECHAZADA: 'bg-rose-100 text-rose-900 border-rose-300',
  ANULADA: 'bg-rose-100 text-rose-900 border-rose-300',
};
