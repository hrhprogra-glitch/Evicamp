export type FrecuenciaContrato = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMESTRAL';
export type EstadoContrato = 'ACTIVO' | 'PAUSADO' | 'FINALIZADO';
export type EstadoVisita = 'PENDIENTE' | 'REALIZADO' | 'CANCELADO' | 'REPROGRAMADO';
export type EstadoCobro = 'PENDIENTE' | 'PAGADO' | 'PARCIAL' | 'ANULADO';

export interface Contrato {
  id: number;
  codigo: string;
  customer_id: number;
  bien_id: number | null;
  titulo: string;
  frecuencia: FrecuenciaContrato;
  dias_semana: number[]; // 1=Lunes .. 7=Domingo
  dia_cobro: number;
  precio_periodo: number;
  moneda: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoContrato;
  direccion: string | null;
  ubicacion: string | null;
  tecnico_principal_id: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
    dni?: string;
    ruc?: string;
    telefono?: string;
    direccion?: string;
  };
  bien?: {
    id: number;
    nombre: string;
    tipo: string;
    direccion?: string;
    ubicacion?: string;
  };
  tecnico?: {
    id: number;
    nombre: string;
    cargo?: string;
    telefono?: string;
  };
}

export interface ConsumoVisita {
  id: number;
  visita_id: number;
  product_id: number | null;
  batch_id: number | null;
  descripcion: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  subtotal_costo: number;
  created_at: string;
}

export interface VisitaContrato {
  id: number;
  contrato_id: number;
  agenda_trabajo_id: number | null;
  fecha_programada: string;
  fecha_ejecutada: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  tecnico_id: number | null;
  estado: EstadoVisita;
  observaciones: string | null;
  parametros: Record<string, any>;
  fotos: string[];
  created_at: string;
  updated_at: string;
  contrato?: {
    id: number;
    codigo: string;
    titulo: string;
    customer_id: number;
    customer?: { id: number; name: string };
  };
  tecnico?: {
    id: number;
    nombre: string;
  };
  consumos?: ConsumoVisita[];
}

export interface CobroContrato {
  id: number;
  contrato_id: number;
  customer_id: number;
  periodo: string;
  monto: number;
  moneda: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: EstadoCobro;
  monto_pagado: number;
  fecha_pago: string | null;
  metodo_pago: string | null;
  referencia_pago: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  contrato?: {
    id: number;
    codigo: string;
    titulo: string;
  };
  customer?: {
    id: number;
    name: string;
    dni?: string;
    ruc?: string;
  };
}
