export interface Herramienta {
  id: number;
  codigo?: string | null;
  nombre: string;
  categoria: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  cantidad_total: number;
  cantidad_en_uso: number;
  estado: 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'DE_BAJA';
  ubicacion?: string | null;
  observaciones?: string | null;
  created_at: string;
}

export interface PrestamoHerramienta {
  id: number;
  herramienta_id: number;
  trabajador_id?: number | null;
  trabajador_nombre: string;
  cantidad: number;
  fecha_prestamo: string;
  fecha_esperada_devolucion?: string | null;
  fecha_devolucion?: string | null;
  estado: 'PRESTADO' | 'DEVUELTO';
  notas?: string | null;
  created_at: string;
  herramienta?: Herramienta;
}

export interface Vehiculo {
  id: number;
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  color?: string | null;
  kilometraje: number;
  vencimiento_soat?: string | null;
  vencimiento_revision_tecnica?: string | null;
  trabajador_asignado_id?: number | null;
  trabajador_asignado_nombre?: string | null;
  estado: 'OPERATIVO' | 'EN_TALLER' | 'DE_BAJA';
  observaciones?: string | null;
  created_at: string;
}

export interface MantenimientoVehiculo {
  id: number;
  vehiculo_id: number;
  fecha: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO';
  kilometraje?: number | null;
  costo: number;
  taller_proveedor?: string | null;
  descripcion: string;
  observaciones?: string | null;
  created_at: string;
}
