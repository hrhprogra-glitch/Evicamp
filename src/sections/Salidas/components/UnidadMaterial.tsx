import React from 'react';

/**
 * Etiqueta de unidad en Salidas (dueño 24/11/2026): en el sistema anterior 1 unidad de los
 * productos de metro equivalía a 500 m. Las cantidades guardadas cuentan UNIDADES (rollos),
 * no metros, por eso SOLO se corrige lo que se ve: nunca se multiplica stock ni historial.
 * Aplica a todos los materiales de metro, vengan como M, METRO, METROS, MTR o MT.
 */
export const UnidadMaterial: React.FC<{ unidad: string | null | undefined }> = ({ unidad }) => {
  const u = String(unidad || '').toUpperCase().trim();
  if (/^(M|METRO|METROS|MTR|MT|ML)$/.test(u)) {
    return (
      <span className="block leading-tight">
        <span className="font-black">UND</span>
        <span className="block text-[9px] font-bold text-[var(--color-muted)]">1 UND = 500 M</span>
      </span>
    );
  }
  return <>{u}</>;
};
