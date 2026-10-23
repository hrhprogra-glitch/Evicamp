export interface Merma {
  id: string;
  batch_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  cost_unit: number;
  total_loss: number;
  reason: string;
  notes?: string;
  user_name: string;
  created_at: string;
  raw_date: string; /* <-- AÑADIMOS ESTA LÍNEA AQUÍ */
  previous_quantity: number;
  new_quantity: number;
  // Toma de inventario (fase 2.2): origen 'CONTEO'; sobrante = entró mercadería (cantidad positiva en la tabla)
  origen?: string | null;
  sobrante?: boolean;
  conteo_sistema?: number | null;
  conteo_contado?: number | null;
  turno?: string; // quién abrió / cerró la caja en ese momento
  // Corrección del motivo o la justificación de un conteo (Mermas/components/ModalEditarConteo.tsx)
  conteo_editado_por?: string | null;
  conteo_editado_at?: string | null;
  conteo_motivo_original?: string | null;
  conteo_justificacion_original?: string | null;
}