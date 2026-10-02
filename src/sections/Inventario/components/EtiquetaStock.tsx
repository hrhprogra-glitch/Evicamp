// src/sections/Inventario/components/EtiquetaStock.tsx
import React from 'react';
import { AlertTriangle, Coffee } from 'lucide-react';
import { formatearCantidad } from '../../../utils/formato';

interface Props {
  qty: number;
  minStock: number;
  unit: string;
}

export const EtiquetaStock: React.FC<Props> = ({ qty, minStock, unit }) => {
  // 1. CASO EXCEPCIONAL: CONSUMO INTERNO (Sin alertas, bloque estático)
  if (String(unit).toUpperCase().includes('CONSUMO')) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] font-black text-[12px] uppercase tracking-widest rounded-none" title="Producto de Uso Interno o Servicio">
        <Coffee size={12} />
        CONSUMO
      </div>
    );
  }

  // 2. LÓGICA NORMAL PARA PRODUCTOS DE VENTA (Unidad / Peso)
  let colorClass = 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[#A7F3D0]';
  let alertIcon = false;
  
  if (qty <= minStock) {
    colorClass = 'bg-red-50 text-red-600 border-red-200';
    alertIcon = true;
  } else if (qty <= (minStock * 2)) {
    colorClass = 'bg-[var(--color-bg)] text-[var(--color-ink)] border-[var(--color-ink)]';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 border font-black text-xs uppercase tracking-widest rounded-none ${colorClass}`}>
      {alertIcon && <AlertTriangle size={12} />}
      {formatearCantidad(qty, unit)} <span className="opacity-70 text-[12px]">{unit}</span>
    </div>
  );
};