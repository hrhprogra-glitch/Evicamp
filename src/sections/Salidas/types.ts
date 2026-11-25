// src/sections/Salidas/types.ts

export type TipoSalida = 'SERVICIO' | 'OBRA';
export type EstadoSalida = 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';

export interface SalidaTrabajador {
  id: number;
  salida_id: number;
  trabajador_id: number;
  trabajador?: {
    id: number;
    nombre: string;
    cargo?: string | null;
    telefono?: string | null;
    dni?: string | null;
  };
  rol: string;
}

export interface SalidaItem {
  id: number;
  salida_id: number;
  product_id?: number | null;
  batch_id?: number | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  cantidad_devuelta: number;
  costo_unitario: number;
  es_externo: boolean;
  created_at?: string;
}

export interface SalidaDevolucion {
  id: number;
  salida_id: number;
  salida_item_id: number;
  product_id?: number | null;
  batch_id?: number | null;
  cantidad: number;
  fecha: string;
  motivo?: string | null;
  usuario?: string | null;
  // 228: fecha elegida y trabajador que devolvió (puede quedar en blanco).
  trabajador_id?: number | null;
  trabajador?: { id: number; nombre: string } | null;
  created_at?: string;
}

// 230: GENERAL guardado de salidas. Es solo una vista: no crea salida nueva ni descuenta stock dos veces.
export interface SalidaFusion {
  id: number;
  codigo: string;
  created_at?: string;
  salida_ids: number[];
  salida_codigos: string[];
}

export interface Salida {
  id: number;
  codigo: string;
  tipo: TipoSalida;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
    dni?: string | null;
    ruc?: string | null;
    telefono?: string | null;
    direccion?: string | null;
  } | null;
  bien_id?: number | null;
  bien?: {
    id: number;
    nombre: string;
    tipo: string;
    direccion?: string | null;
    ubicacion?: string | null;
    placa?: string | null;
    marca?: string | null;
    modelo?: string | null;
  } | null;
  direccion?: string | null;
  ubicacion?: string | null;
  fecha: string;
  estado: EstadoSalida;
  salida_raiz_id?: number | null;
  salida_raiz_codigo?: string | null;
  observaciones?: string | null;
  usuario?: string | null;
  created_at: string;
  trabajadores?: SalidaTrabajador[];
  items?: SalidaItem[];
  devoluciones?: SalidaDevolucion[];
  fusion?: SalidaFusion | null;
}
