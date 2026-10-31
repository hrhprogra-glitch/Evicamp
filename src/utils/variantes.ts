// src/utils/variantes.ts
// FASE 7: Tallas y Colores (Variantes con stock propio)
import type { Product, ProductVariant } from '../sections/Inventario/types';

/** Expande la lista de productos para la Caja:
 *  - Productos normales (sin variantes): se mantienen tal cual.
 *  - Productos con variantes: cada variante activa se convierte en un ítem vendible con su propio
 *    stock, código de barras, precio específico y referencia a productoId y variantId.
 */
export const conVariantesYPresentaciones = (productos: Product[]): Product[] => {
  const resultado: Product[] = [];

  for (const p of productos) {
    // Si el producto tiene variantes activas
    if (p.tieneVariantes && Array.isArray(p.variantes) && p.variantes.length > 0) {
      const variantesActivas = p.variantes.filter((v) => v.is_active !== 0);
      if (variantesActivas.length > 0) {
        for (const v of variantesActivas) {
          resultado.push({
            ...p,
            id: `${p.id}::var::${v.id}`,
            productoId: String(p.id),
            variantId: v.id,
            variantName: v.nombre_variante,
            name: `${p.name} (${v.nombre_variante})`,
            price: v.price !== null && v.price !== undefined && v.price > 0 ? Number(v.price) : p.price,
            precioMayorista: v.precio_mayorista !== null && v.precio_mayorista !== undefined && v.precio_mayorista > 0
              ? Number(v.precio_mayorista)
              : p.precioMayorista,
            cost: v.cost_price !== null && v.cost_price !== undefined && v.cost_price > 0 ? Number(v.cost_price) : p.cost,
            barcode: (v.barcode || '').trim(),
            code: (v.code || '').trim(),
            quantity: Number(v.quantity || 0),
            minStock: Number(v.min_stock ?? p.minStock),
            tieneVariantes: true,
            variantes: p.variantes
          });
        }
      }
    }

    // El producto base genérico (ej. "POLO NIKE") se muestra en Caja:
    // - Si NO tiene variantes: se muestra siempre con su stock.
    // - Si TIENE variantes: solo se muestra si tiene stock propio/general sin clasificar (> 0).
    //   Si todo el stock está repartido en las variantes (como ocurre al ingresar lotes por talla/color),
    //   en Caja solo aparecen las variantes específicas, evitando vender prendas sin talla.
    const tieneVars = Boolean(p.tieneVariantes && Array.isArray(p.variantes) && p.variantes.some((v) => v.is_active !== 0));
    const stockVariantes = tieneVars
      ? (p.variantes || []).filter((v) => v.is_active !== 0).reduce((sum, v) => sum + Number(v.quantity || 0), 0)
      : 0;
    const stockGenerico = Number(p.quantity || 0) - stockVariantes;

    if (!tieneVars || stockGenerico > 0) {
      resultado.push(tieneVars ? { ...p, quantity: stockGenerico } : p);
    }

    // Si además tiene presentaciones (cajas, paquetes de fase 1.2)
    if (Array.isArray(p.presentaciones) && p.presentaciones.length > 0) {
      for (let i = 0; i < p.presentaciones.length; i++) {
        const pr = p.presentaciones[i];
        if (pr && pr.factor >= 2 && pr.precio > 0) {
          const nomPres = `${(pr.unidad || 'CAJA').toUpperCase()} x${pr.factor}`;
          resultado.push({
            ...p,
            id: `${p.id}::pres::${i}`,
            productoId: String(p.id),
            name: `${p.name} (${nomPres})`,
            price: Number(pr.precio),
            barcode: (pr.barcode || '').trim(),
            code: '',
            unit: pr.unidad,
            control_type: 'UND',
            quantity: Math.floor(Number(p.quantity || 0) / pr.factor),
            preciosCantidad: [],
            presentaciones: [],
            presentacion: { nombre: nomPres, factor: pr.factor, codigo: pr.unidad }
          });
        }
      }
    }
  }

  return resultado;
};
