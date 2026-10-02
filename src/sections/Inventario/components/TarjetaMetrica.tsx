// src/sections/Inventario/componentes/TarjetaMetrica.tsx
import React from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isAlert?: boolean;
  isGreen?: boolean;
}

export const TarjetaMetrica: React.FC<Props> = ({ label, value, icon, isAlert, isGreen }) => (
  <div className="flex items-center gap-3 p-3 sm:p-4 border border-[var(--color-border)] bg-white rounded-none min-w-0 xl:min-w-[170px] shadow-sm last:col-span-2 sm:last:col-span-1">
    <div className={`p-2 border border-[var(--color-border)] rounded-none ${
      isAlert ? 'text-red-500 bg-red-50' : 
      isGreen ? 'text-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 
      'text-[var(--color-muted)] bg-[var(--color-bg)]'
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-muted)] mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold tracking-tighter ${
        isAlert ? 'text-red-500' : 
        isGreen ? 'text-[var(--color-accent)]' : 
        'text-[var(--color-ink)]'
      }`}>
        {value}
      </p>
    </div>
  </div>
);