export interface Cliente {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
}

export interface FiadoDetalle {
  productoId: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

// NUEVO: Interfaz para guardar cada pago individual
export interface PagoAbono {
  id: string;
  monto: number;
  metodo: string;
  fecha: string;
}

export interface Fiado {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  clienteDni?: string;
  clienteTelefono?: string;
  montoOriginal: number;
  saldoPendiente: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
  detalles: FiadoDetalle[];
  pagos?: PagoAbono[]; // <-- NUEVO: Arreglo de pagos
}