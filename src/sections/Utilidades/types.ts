// src/sections/Utilidades/types.ts
export interface MetricaDia {
  fecha: string;
  total: number;
  tickets: number;
}

export interface MetricaProducto {
  id: string;
  nombre: string;
  cantidadVendida: number;
  totalRecaudado: number;
}

export interface MetricaCategoria {
  categoria: string;
  cantidadVendida: number;
  totalRecaudado: number;
}

// TOTALES DEL SUBCONJUNTO ACTUALMENTE FILTRADO EN LA TABLA (búsqueda / categoría / rotación)
export interface StatsFiltro {
  ingresos: number;
  costos: number;
  mermas: number;
  hayFiltros: boolean;
}

// NUEVA INTERFAZ PARA EL ANÁLISIS DE RENTABILIDAD
export interface AnalisisProducto {
  id: string;
  nombre: string;
  categoria: string;
  estado: string; 
  stockActual?: number; 
  tipoControl?: string; // <-- NUEVO: Para saber si es producto de CONSUMO
  unidadesVendidas: number;
  ingresosTotales: number;
  costoTotalVentas: number;
  unidadesMerma: number;
  perdidaMerma: number;
  utilidadReal: number;
  margen: number; // Porcentaje de ganancia
}