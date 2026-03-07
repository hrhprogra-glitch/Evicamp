// src/sections/Reportes/types.ts
export interface TicketVenta {
  id: string;
  created_at: string;
  total: number;
  metodo_pago: string; // Ej: 'EFECTIVO', 'YAPE', 'MIXTO'
  estado: 'COMPLETADO' | 'ANULADO';
  cart_snapshot?: any; // (Opcional) Para guardar qué productos exactos se vendieron
}