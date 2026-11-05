import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface Props {
  onToggleTops?: () => void;
  filtrarHoy?: () => void;
  filtrarSemana?: () => void;
  filtrarMes?: () => void;
}

export const FiltrosUtilidades: React.FC<Props> = ({ onToggleTops }) => {
  return (
    <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 shrink-0">
      <div className="flex items-center gap-3" title="Análisis de Utilidad y Rendimiento">
        <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
          <BarChart3 size={20} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
            Inteligencia de Negocio
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {onToggleTops && (
          <button
            id="btn-tops-utilidades"
            type="button"
            onClick={onToggleTops}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('buscador-global-utilidades')?.focus();
              }
            }}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera flex-1 sm:flex-none justify-center bg-[var(--color-bg)] text-[var(--color-ink)] px-4 sm:px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest sm:tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer flex items-center gap-2"
            title="Ver los 5 productos más rentables"
          >
            <TrendingUp size={16} /> Top 5 Rentables
          </button>
        )}
      </div>
    </div>
  );
};
