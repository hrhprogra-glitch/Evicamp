// src/utils/formato.ts

// Formatea una cantidad de stock según el tipo de unidad del producto:
// - UND (unidad): siempre número entero, nunca hay media unidad.
// - KG / GR / LT / ML / CONSUMO: hasta 2 decimales, sin ceros sobrantes.
// Esto evita que errores de precisión de punto flotante (ej. 4.999999999999998)
// se muestren tal cual en pantalla.
export const formatearCantidad = (qty: number | string | undefined | null, unit?: string | null): string => {
  const valor = Number(qty) || 0;
  const unidadNormalizada = String(unit || 'UND').toUpperCase().trim();

  if (unidadNormalizada === 'UND' || unidadNormalizada === 'UNIDAD') {
    return String(Math.round(valor));
  }

  return String(Number(valor.toFixed(2)));
};

// Formatea una cantidad de producto en tickets o transacciones evitando ruido de punto flotante (ej. 1.420399999999999 -> 1.42).
// - Si es entero: devuelve el número sin decimales (ej. 1, 2, 5).
// - Si tiene decimales: redondea hasta 3 decimales eliminando ceros finales (ej. 1.42, 0.5, 0.355).
export const formatearCantidadDetalle = (qty: number | string | undefined | null): string => {
  const valor = Number(qty);
  if (isNaN(valor) || valor === 0) return '0';
  
  // Redondea a 3 decimales para eliminar la imprecisión binaria IEEE 754
  const redondeado = Math.round(valor * 1000) / 1000;
  return String(redondeado);
};
