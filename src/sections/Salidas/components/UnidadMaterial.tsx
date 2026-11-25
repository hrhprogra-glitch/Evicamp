import React from 'react';

interface UnidadMaterialProps {
  unidad: string | null | undefined;
}

/**
 * Etiqueta de unidad en Salidas (dueño 24/11/2026): se muestra SOLO la unidad real del producto.
 * Se quitó definitivamente el texto «1 UND = 500 M». La manguera se ingresa en metros (M) y el
 * rollo es una presentación en Opciones avanzadas; por eso aquí no hay equivalencias ni cálculos.
 * Las salidas históricas que aún traen «Metro» se muestran como «M».
 */
export const UnidadMaterial: React.FC<UnidadMaterialProps> = ({ unidad }) => {
  const u = String(unidad || '').toUpperCase().trim();
  if (/^(M|METRO|METROS|MTR|MT|ML)$/.test(u)) return <span className="font-black">M</span>;
  return <span className="font-black">{u}</span>;
};
