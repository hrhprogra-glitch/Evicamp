// src/sections/Utilidades/components/TablaRanking.tsx
import React from 'react';
import { Trophy } from 'lucide-react';

interface Props {
  titulo: string;
  items: { nombre: string; cantidad: number; total: number }[];
  color?: string; // Se mantiene por compatibilidad pero el render usará nuestro estándar visual
}

export const TablaRanking: React.FC<Props> = ({ titulo, items }) => {
  const maxTotal = Math.max(...items.map(i => i.total), 1);

  return (
    <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col min-w-[300px] max-h-[220px] overflow-hidden rounded-none font-sans">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-bg)] text-[var(--color-ink)]">
        <Trophy size={16} strokeWidth={1.5} />
        <h3 className="font-bold uppercase tracking-widest text-[13px]">{titulo}</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
        {items.length === 0 ? (
          <p className="text-center text-[var(--color-muted)] font-bold text-[12px] uppercase tracking-widest py-5 sm:py-8">NO HAY DATOS</p>
        ) : (
          items.map((item, index) => {
            const porcentaje = (item.total / maxTotal) * 100;

            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-[12px] font-bold text-[var(--color-ink)] uppercase tracking-wider truncate pr-2">
                    {index + 1}. {item.nombre}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--color-ink)] font-mono">
                    S/ {item.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-none overflow-hidden">
                    <div className="h-full bg-[var(--color-ink)] rounded-none" style={{ width: `${porcentaje}%` }}></div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--color-muted)] w-12 text-right uppercase tracking-wider">
                    {item.cantidad} U.
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};