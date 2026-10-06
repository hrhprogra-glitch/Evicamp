import React from 'react';
import { BarChart3 } from 'lucide-react';

interface Props {
  filtrarHoy?: () => void;
  filtrarSemana?: () => void;
  filtrarMes?: () => void;
}
export const FiltrosUtilidades: React.FC<Props> = () => {
  return (
    <div className="flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white border-2 border-[var(--color-accent-shadow)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent-shadow)] rounded-none shrink-0">
          <BarChart3 size={24} className="text-[var(--color-accent-shadow)]" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-wider font-mono">
            Inteligencia de Negocio
          </h1>
          <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest mt-1 font-mono">
            Análisis de Utilidad y Rendimiento
          </p>
        </div>
      </div>
    </div>
  );
};

