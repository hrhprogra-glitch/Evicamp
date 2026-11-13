// src/sections/Taller/types.ts
// Tipos para el módulo de Taller y Reparaciones (Fase 12)

export type EstadoOrdenTaller =
  | 'RECIBIDO'
  | 'DIAGNOSTICO'
  | 'PRESUPUESTADO'
  | 'EN_PROCESO'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type PrioridadOrden = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface TallerRepuesto {
  id?: number;
  orden_id?: number;
  product_id?: number | null;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  precio_unitario: number;
  subtotal: number;
  es_externo: boolean;
}

export interface TallerPago {
  id?: number;
  orden_id?: number;
  monto: number;
  fecha: string;
  metodo: 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO';
  referencia?: string | null;
  tipo: 'ADELANTO' | 'PAGO_FINAL' | 'ABONO';
  notas?: string | null;
  created_at?: string;
}

export interface TallerOrden {
  id: number;
  codigo: string;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
    telefono?: string | null;
    dni?: string | null;
    ruc?: string | null;
    direccion?: string | null;
  } | null;
  bien_id?: number | null;
  bien?: {
    id: number;
    nombre: string;
    tipo?: string | null;
    direccion?: string | null;
  } | null;
  tipo_equipo: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  color?: string | null;
  accesorios?: string | null;
  falla_reportada: string;
  diagnostico?: string | null;
  solucion_aplicada?: string | null;
  tecnico_id?: number | null;
  tecnico?: {
    id: number;
    nombre: string;
  } | null;
  estado: EstadoOrdenTaller;
  prioridad: PrioridadOrden;
  costo_mano_obra: number;
  costo_repuestos: number;
  total: number;
  adelanto: number;
  saldo: number;
  fecha_ingreso: string;
  fecha_prometida?: string | null;
  fecha_listo?: string | null;
  fecha_entrega?: string | null;
  meses_garantia: number;
  garantia_vence?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at?: string;
  taller_repuestos?: TallerRepuesto[];
  taller_pagos?: TallerPago[];
}

export interface FiltrosTaller {
  busqueda: string;
  estado: string; // 'TODOS' o un EstadoOrdenTaller
  tecnicoId: string; // '' o id del trabajador
}
