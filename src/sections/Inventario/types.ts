export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  code: string;
  barcode: string;
  category: string;
  unit: string;
  imageUrl?: string | null;
  control_type?: string;
  vencimiento?: string | null; // el más cercano de sus lotes con stock (filtros Vencidos / Vencen en 30 días)
  vendido30?: number;           // fase 2.4: unidades vendidas en 30 días (undefined = no se pudo saber)
  ultimaVenta?: string | null;  // fecha de su última venta (sin las anuladas)
  preciosCantidad?: { desde: number; precio: number }[]; // fase 1.3: "desde N → precio" (products.precios_cantidad)
  precioMayorista?: number;                               // fase 4.4: precio preferencial para clientes mayoristas
  // Fase 3: búsquedas avanzadas y ubicación en tienda
  marca?: string | null;
  modelo?: string | null;
  medida?: string | null;
  laboratorio?: string | null;
  ubicacion?: string | null;
  // Fase 6: control de series/IMEI y garantías
  controlaSeries?: boolean;
  mesesGarantia?: number;
  // Fase 1.2: presentaciones (caja, paquete…) y, en la Caja, la presentación vendida como otro "producto"
  presentaciones?: { unidad: string; factor: number; precio: number; barcode?: string | null }[];
  productoId?: string;                                              // el producto real (si esto es una presentación)
  presentacion?: { nombre: string; factor: number; codigo: string }; // "CAJA x12", trae 12, código SUNAT BX
}
