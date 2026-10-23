// src/utils/presentaciones.ts
// PRESENTACIONES (fase 1.2): un producto se puede vender también en caja, paquete, docena… (products.presentaciones,
// jsonb). Cada presentación: unidad (CAJA, PAQ…: src/utils/unidades.ts, con su código SUNAT), cuántas unidades
// trae (factor), su precio y su código de barras. El stock SIEMPRE está en unidades: vender 1 CAJA x12 descuenta 12.
import type { Product } from '../sections/Inventario/types';
import { unidadDe } from './unidades';

export interface Presentacion { unidad: string; factor: number; precio: number; barcode?: string | null }

/** Las válidas (unidad entera distinta de UND, trae 2 o más, precio mayor que 0), sin repetir unidad + factor. */
export const presentacionesValidas = (lista: unknown): Presentacion[] => {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  const salida: Presentacion[] = [];
  for (const e of lista as Presentacion[]) {
    const unidad = String(e?.unidad || '').toUpperCase(); const factor = Number(e?.factor); const precio = Number(e?.precio);
    const u = unidadDe({ unit: unidad });
    if (u.tipo !== 'ENTERA' || u.corto === 'UND' || u.corto !== unidad || !(factor >= 2) || !(precio > 0)) continue;
    const clave = `${unidad}x${factor}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push({ unidad, factor, precio: Math.round(precio * 100) / 100, barcode: String(e?.barcode || '').trim() || null });
  }
  return salida;
};

/** Nombre que se ve: "CAJA x12" */
export const nombrePresentacion = (p: Pick<Presentacion, 'unidad' | 'factor'>) => `${unidadDe({ unit: p.unidad }).nombre.toUpperCase()} x${p.factor}`;

/** Para la Caja: cada producto y, además, cada presentación como otro "producto" para buscar, escanear y vender.
 *  La presentación lleva productoId (el producto real), su factor y su stock en presentaciones enteras. */
export const conPresentaciones = (productos: Product[]): Product[] => productos.flatMap((p) => [
  p,
  ...presentacionesValidas(p.presentaciones).map((pr, i): Product => ({
    ...p,
    id: `${p.id}::${i}`,
    productoId: String(p.id),
    name: `${p.name} (${nombrePresentacion(pr)})`,
    price: pr.precio,
    barcode: pr.barcode || '',
    code: '',
    unit: pr.unidad,
    control_type: 'UND',
    quantity: Math.floor(Number(p.quantity || 0) / pr.factor),
    preciosCantidad: [],
    presentaciones: [],
    presentacion: { nombre: nombrePresentacion(pr), factor: pr.factor, codigo: unidadDe({ unit: pr.unidad }).codigo },
  })),
]);
