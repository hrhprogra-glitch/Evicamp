import React from 'react';
import { ESTADO_CPE } from '../utils/comprobante';

/** Estado de una boleta, factura o nota de crédito ante SUNAT (Aceptado, Enviando…, Error, Rechazado). */
export const InsigniaCpe: React.FC<{ estado: string | null | undefined; chica?: boolean; generado?: boolean }> = ({ estado, chica, generado }) => {
  // "generado": el proveedor ya lo emitió (PDF) y SUNAT lo confirma después (boletas de Nubefact)
  const clave = estado === 'PENDIENTE' && generado ? 'GENERADO' : estado || '';
  const est = ESTADO_CPE[clave] || { texto: estado || '—', clase: 'border-[var(--color-border)]' };
  return (
    <span data-estado-cpe={estado || ''} className={`${chica ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'} font-black uppercase border text-center whitespace-nowrap ${est.clase}`}>
      {est.texto}
    </span>
  );
};
