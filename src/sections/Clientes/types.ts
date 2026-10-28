export interface Cliente {
  id: string;
  nombre: string;
  dni: string;            // DNI (8 números); vacío = no tiene o no se sabe
  telefono: string;
  // Fase 4.1: ficha del cliente (todo opcional, ver src/utils/documento.ts)
  ruc?: string;           // RUC (11 números), aparte del DNI: una persona con negocio puede tener los dos
  direccion?: string;
  ubicacion?: string;     // link de ubicación (ej. Google Maps)
  referencia?: string;    // para distinguir: "Sra. Rosa – vecina 2do piso"
}

export interface FiadoDetalle {
  productoId: string;
  name: string;
  qty: number | string; // <-- CORREGIDO: Soporta el string vacío o puntos decimales en tránsito
  price: number;
  subtotal: number | string; // <-- CORREGIDO: Soporta el string vacío en ingeniería inversa
  control_type?: string; 
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
  montoPagado?: number; // <-- AÑADIDO: Para evitar el error de TypeScript
  fechaEmision: string;
  fechaVencimiento: string;
  // CORREGIDO: Ampliamos los estados para que acepte los de la base de datos
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'CANCELADO' | 'ANULADO'; 
  detalles: FiadoDetalle[];
  pagos?: PagoAbono[]; 
}
export interface ClienteFiadoAgrupado {
  clienteNombre: string;
  clienteId?: string;
  clienteDni?: string;
  clienteTelefono?: string;
  totalOriginal: number;
  totalPendiente: number;
  totalPagado: number;
  fiados: Fiado[];
}
