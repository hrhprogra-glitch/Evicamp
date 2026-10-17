// src/sections/Finanzas/types.ts

export interface CashSession {
  id: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  justification?: string;
  opening_yape?: number;
  opening_card?: number;
  closing_yape?: number;
  closing_card?: number;
  expected_yape?: number;
  expected_card?: number;
}

export interface CashMovement {
  id: string;
  session_id?: string;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  description: string;
  created_at: string;
  payment_type: string;
  flujo?: 'INTERNO' | 'EXTERNO'; // <-- NUEVO: Define si entra a la caja del negocio o personal
}

export interface UnifiedItem {
  id: string; // mov.id or t.id
  created_at: string;
  isTicket: boolean;
  // Common fields:
  tipo: string; 
  descripcion: string; 
  metodo_pago: string; 
  monto: number;
  productosStr?: string;
  vendedor?: string | null; // quién hizo la venta (lo guarda el servidor con la sesión)
  devolucion?: { monto: number; autor: string | null } | null; // ticket anulado: cuánto se devolvió y quién
  
  // Exclusivo de Movimiento (flujo interno/externo):
  flujo?: 'INTERNO' | 'EXTERNO' | string;
  
  // Exclusivos de Ticket (Venta):
  estado?: string;
  es_fiado?: boolean;
  cliente_nombre?: string | null;
  monto_deuda?: number;
  monto_pagado?: number;
  total?: number;
}
export interface SuperMetricas {
  fondoInicial: number;
  ingresosExtra: number;        // ingresos manuales en EFECTIVO
  gastos: number;               // egresos pagados en EFECTIVO (salen del cajón)
  ingresosExtraYape: number;    // ingresos manuales por Yape/Plin/Transferencia
  ingresosExtraTarjeta: number; // ingresos manuales por Tarjeta
  gastosYape: number;           // egresos pagados por Yape/Plin/Transferencia
  gastosTarjeta: number;        // egresos pagados con Tarjeta
  ventasEfectivo: number;
  ventasYape: number;
  ventasTarjeta: number;
  cobroDeudasEfectivo: number;
  cobroDeudasYape: number;
  cobroDeudasTarjeta: number;
  efectivoEsperadoCaja: number;
  yapeEsperado: number;         // ventas + cobros + ingresos - egresos, todo por Yape/Transferencia
  tarjetaEsperada: number;      // ventas + cobros + ingresos - egresos, todo con Tarjeta
  totalFacturado: number;
}