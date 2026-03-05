// src/sections/Inventario/componentes/EtiquetaStock.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  qty: number;
  minStock: number;
  unit: string;
}

export const EtiquetaStock: React.FC<Props> = ({ qty, minStock, unit }) => {
  let colorClass = 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]';
  let alertIcon = false;
  
  // Lógica técnica de estado de existencias
  if (qty <= minStock) {
    colorClass = 'bg-red-50 text-red-600 border-red-200';
    alertIcon = true;
  } else if (qty <= (minStock * 2)) {
    colorClass = 'bg-[#F8FAFC] text-[#1E293B] border-[#1E293B]';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 border font-black text-[10px] uppercase tracking-widest rounded-none ${colorClass}`}>
      {alertIcon && <AlertTriangle size={10} />}
      {qty} <span className="opacity-70 text-[8px]">{unit}</span>
    </div>
  );
};