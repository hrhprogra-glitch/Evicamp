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
  grupoId?: string;       // grupo de clientes (familia o empresa); vacío = sin grupo
  diasPlazo?: number;     // fase 4.3: días de plazo para pagar (ej. 7, 15, 30 días; vacío = fecha por defecto)
  esMayorista?: boolean;   // fase 4.4: si es true, paga precio mayorista en caja automáticamente
  descuentoPorcentaje?: number; // fase 4.4: descuento porcentual especial (ej. 10%)
  // Talleres y servicios (SiuMax Nego, paso 3c; vienen de SiuMax Servic): se ven si el negocio eligió ese tipo
  correo?: string;
  personaContacto?: string; // con quién se habla: "Sr. Juan, administrador"
  notas?: string;
}

// Grupo de clientes (fase 4.1): familia o empresa. Cada cliente conserva su cuenta; el grupo junta sus deudas
export interface GrupoClientes {
  id: string;
  nombre: string;
  tipo: 'FAMILIA' | 'EMPRESA';
  ruc?: string;
  descuentoPorcentaje?: number; // fase 4.4: descuento porcentual para todos los miembros de la empresa/grupo
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
  grupoNombre?: string;   // fase 4.1: su grupo (familia o empresa)
  totalOriginal: number;
  totalPendiente: number;
  totalPagado: number;
  fiados: Fiado[];
}

// Fase 4.5: Cotizaciones (proformas que NO descuentan stock)
export interface DetalleCotizacion {
  id?: number | string;
  cotizacion_id?: number | string;
  product_id?: number | string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  es_mayorista?: boolean;
}

export interface Cotizacion {
  id: number | string;
  numero: string;
  cliente_id?: string;
  cliente_nombre: string;
  cliente_documento?: string;
  cliente_telefono?: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado: 'VIGENTE' | 'CONVERTIDA' | 'VENCIDA' | 'ANULADA';
  total: number;
  observaciones?: string;
  sale_id?: number;
  vendedor?: string;
  detalles?: DetalleCotizacion[];
}

// Fase 4.6: Pedidos por encargo (reserva de mercadería con fecha de entrega y adelanto)
export interface DetallePedido {
  id?: number | string;
  pedido_id?: number | string;
  product_id?: number | string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  es_mayorista?: boolean;
}

export interface PedidoCliente {
  id: number | string;
  numero: string;
  cliente_id?: string;
  cliente_nombre: string;
  cliente_documento?: string;
  cliente_telefono?: string;
  fecha_entrega: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  total: number;
  adelanto: number;
  saldo_pendiente: number;
  metodo_adelanto?: string;
  sale_id?: number;
  observaciones?: string;
  vendedor?: string;
  detalles?: DetallePedido[];
}

// ---------- Talleres y servicios (SiuMax Nego, paso 3c; tipos de SiuMax Servic) ----------
// Lo que se atiende de un cliente (tabla bienes_cliente): piscina, jardín, vehículo, equipo...
export type TipoBien = 'PISCINA' | 'JARDIN' | 'VEHICULO' | 'EQUIPO' | 'LOCAL' | 'OTRO';
export const TIPOS_BIEN: { id: TipoBien; nombre: string }[] = [
  { id: 'PISCINA', nombre: 'Piscina' },
  { id: 'JARDIN', nombre: 'Jardín o riego' },
  { id: 'VEHICULO', nombre: 'Vehículo' },
  { id: 'EQUIPO', nombre: 'Equipo' },
  { id: 'LOCAL', nombre: 'Local u obra' },
  { id: 'OTRO', nombre: 'Otro' },
];
export interface BienCliente {
  id: string;
  clienteId: string;
  tipo: TipoBien;
  nombre: string;
  direccion?: string;
  ubicacion?: string;
  volumenM3?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  serie?: string;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'BAJA';
  notas?: string;
}

// Trabajador (tabla trabajadores): técnico o ayudante, use o no el sistema
export interface Trabajador {
  id: string;
  nombre: string;
  dni?: string;
  cargo?: string;
  telefono?: string;
  fechaIngreso?: string;   // AAAA-MM-DD
  estado: 'ACTIVO' | 'INACTIVO';
  empleadoId?: string;     // su usuario del sistema (Ajustes > Usuarios), si tiene
  notas?: string;
}
