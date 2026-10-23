// src/sections/Punto-de-venta/types.ts
import type { Product } from '../Inventario/types';

// RE-EXPORTAR PRODUCT PARA USO EN COMPONENTES DEL POS
export type { Product };

export interface CartItem extends Product {
  cartQuantity: number; // Cantidad que el cliente está comprando
  subtotal: number;     // Precio * Cantidad
  precioLista?: number;               // fase 1.4: el precio que tenía antes de cambiarlo al cobrar
  precioCambiadoPor?: string | null;  // quién lo cambió o, si fue con clave, el administrador que autorizó
}