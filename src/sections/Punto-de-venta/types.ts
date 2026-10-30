// src/sections/Punto-de-venta/types.ts
import type { Product } from '../Inventario/types';

import type { Cliente } from '../Clientes/types';

// RE-EXPORTAR PRODUCT Y CLIENTE PARA USO EN COMPONENTES DEL POS
export type { Product, Cliente };

export interface CartItem extends Product {
  cartQuantity: number; // Cantidad que el cliente está comprando
  subtotal: number;     // Precio * Cantidad
  precioLista?: number;               // fase 1.4: el precio que tenía antes de cambiarlo al cobrar
  precioCambiadoPor?: string | null;  // quién lo cambió o, si fue con clave, el administrador que autorizó
  precioBase?: number;                // fase 1.3: el precio normal del producto (sin escala)
  escala?: number;                    // fase 1.3: "desde" de la escala aplicada (x6+)
  sinEscala?: boolean;                // el cajero apagó el precio por cantidad en esta línea (cobra el precio normal)
  esMayoristaAplicado?: boolean;      // fase 4.4: se le aplicó el precio mayorista
  descuentoPorcentajeAplicado?: number; // fase 4.4: descuento porcentual del cliente o empresa aplicado
  numeroSerie?: string;               // fase 6: número de serie / IMEI para productos que lo requieran
  garantiaHasta?: string;             // fase 6: fecha calculada de vencimiento de garantía (YYYY-MM-DD)
}

export interface HeldCart {
  id?: string;
  cart: CartItem[];
  cliente?: Cliente | null;
  nombre?: string;
  timestamp?: number;
}