export type EstadoTrabajo = 'PENDIENTE' | 'COMPLETADO' | 'SEGUIMIENTO' | 'CANCELADO';
export type PrioridadTrabajo = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
export type VistaAgenda = 'DIA' | 'SEMANA' | 'MES';

export interface Trabajo {
  id: number;
  titulo: string;
  customer_id: number | null;
  customer?: {
    id: number;
    name: string;
    dni?: string;
    ruc?: string;
    telefono?: string;
    direccion?: string;
  } | null;
  bien_id: number | null;
  bien?: {
    id: number;
    nombre: string;
    tipo: string;
    direccion?: string;
    ubicacion?: string;
  } | null;
  direccion: string | null;
  ubicacion: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: EstadoTrabajo;
  prioridad: PrioridadTrabajo;
  descripcion: string | null;
  notas: string | null;
  salida_id: number | null;
  trabajadores?: {
    id: number;
    trabajo_id: number;
    trabajador_id: number;
    trabajador?: {
      id: number;
      nombre: string;
      cargo?: string;
      telefono?: string;
    };
  }[];
  created_at?: string;
  updated_at?: string;
}
