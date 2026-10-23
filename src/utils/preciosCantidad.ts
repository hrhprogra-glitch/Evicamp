// src/utils/preciosCantidad.ts
// PRECIOS POR CANTIDAD (fase 1.3): cada producto puede tener escalas "desde N → precio" (products.precios_cantidad,
// jsonb). La Caja usa la escala más alta que alcance la cantidad del carrito; si no alcanza ninguna, el precio normal.

export interface EscalaPrecio { desde: number; precio: number }

/** Las escalas válidas (cantidad y precio mayores que 0), de menor a mayor cantidad y sin repetir la cantidad. */
export const escalasValidas = (lista: unknown): EscalaPrecio[] => {
  if (!Array.isArray(lista)) return [];
  const porDesde = new Map<number, number>();
  for (const e of lista) {
    const desde = Number((e as EscalaPrecio)?.desde); const precio = Number((e as EscalaPrecio)?.precio);
    if (desde > 0 && precio > 0) porDesde.set(desde, Math.round(precio * 100) / 100);
  }
  return [...porDesde].map(([desde, precio]) => ({ desde, precio })).sort((a, b) => a.desde - b.desde);
};

/** La escala que corresponde a esa cantidad (la de mayor "desde" que se alcanza), o null. */
export const escalaPara = (lista: unknown, cantidad: number): EscalaPrecio | null =>
  escalasValidas(lista).filter((e) => cantidad >= e.desde).pop() || null;
