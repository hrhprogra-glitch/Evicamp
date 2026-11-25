import React from 'react';

interface UnidadMaterialProps {
  unidad: string | null | undefined;
  /** Metros por UND. Viene del producto en Inventario (products.ref_qty), no de un texto fijo. */
  equivalenciaM?: number | null;
}

/**
 * Etiqueta de unidad en Salidas (dueño 24/11/2026, corregido en Inventario el mismo día):
 * los rollos de manguera se cuentan como UND y cada UND son 500 M. La equivalencia la guarda
 * el producto en Inventario; las cantidades, el stock y el historial NO se multiplican.
 * El texto antiguo «Metro» se mantiene solo para las salidas históricas que aún lo traen.
 */
export const UnidadMaterial: React.FC<UnidadMaterialProps> = ({ unidad, equivalenciaM }) => {
  const u = String(unidad || '').toUpperCase().trim();
  const metros = Number(equivalenciaM || 0);
  const etiqueta = (cantidad: number) => (
    <span className="block leading-tight">
      <span className="font-black">UND</span>
      <span className="block text-[9px] font-bold text-[var(--color-muted)]">1 UND = {cantidad} M</span>
    </span>
  );

  if (metros > 0) return etiqueta(Math.round(metros * 1000) / 1000);
  if (/^(M|METRO|METROS|MTR|MT|ML)$/.test(u)) return etiqueta(500); // salidas anteriores al cambio de Inventario
  return <>{u}</>;
};
