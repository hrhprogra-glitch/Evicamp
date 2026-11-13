// Utilidades de Talleres y servicios (de SiuMax Servic "Gráficos"; SiuMax Nego, paso 3h). 'TALLER' es nuevo en Nego.
export type PestanaServicios = 'rentabilidad' | 'tecnicos' | 'materiales' | 'cobranzas';
export type PeriodoFiltro = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

export interface MetricasGlobales {
  ingresosTotales: number;
  costoMateriales: number;
  utilidadBruta: number;
  margenPorcentaje: number;
  cuentasPorCobrar: number;
  totalTrabajos: number;
  totalTrabajosCompletados: number;
  totalContratosActivos: number;
}

export interface ItemRentabilidad {
  id: number | string;
  tipo: 'OBRA' | 'SERVICIO' | 'CONTRATO' | 'TALLER';
  codigo: string;
  nombre: string;
  cliente: string;
  ingreso: number;
  costoMateriales: number;
  utilidad: number;
  margen: number;
  fecha: string;
}

export interface ItemTecnico {
  id: number;
  nombre: string;
  cargo: string;
  trabajosAsignados: number;
  trabajosCompletados: number;
  trabajosSeguimiento: number;
  salidasParticipadas: number;
  visitasRealizadas: number;
  eficiencia: number;
}

export interface ItemMaterialTop {
  productoId: number | string;
  nombre: string;
  unidad: string;
  cantidadConsumida: number;
  costoTotal: number;
  usadoEnObras: number;
  usadoEnContratos: number;
}

export interface ItemCuentaPorCobrar {
  id: number | string;
  tipo: 'COTIZACION' | 'CONTRATO' | 'TALLER';
  codigo: string;
  cliente: string;
  total: number;
  pagado: number;
  saldo: number;
  fechaEmision: string;
  fechaVencimiento: string | null;
  estado: string;
}

// Fecha en la hora local (Perú): las fechas con hora se guardan en UTC; las 'aaaa-mm-dd' se toman al mediodía
export const verFechaLocal = (f: string | null | undefined) => {
  if (!f) return '-';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(f) ? `${f}T12:00:00` : f);
  return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
