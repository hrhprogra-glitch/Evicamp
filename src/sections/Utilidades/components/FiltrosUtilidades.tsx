// src/sections/Utilidades/components/FiltrosUtilidades.tsx
import React from 'react';
import { BarChart3 } from 'lucide-react';

interface Props {
  filtrarHoy: () => void;
  filtrarSemana: () => void;
  filtrarMes: () => void;
}

export const FiltrosUtilidades: React.FC<Props> = ({
  filtrarHoy, filtrarSemana, filtrarMes
}) => {
  return (
    <div className="flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 shrink-0 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)] flex items-center gap-3 uppercase tracking-wider">
          <BarChart3 size={28} className="text-[var(--color-ink)]" strokeWidth={1.5} /> Inteligencia de Negocio
        </h1>
        <p className="text-[var(--color-muted)] text-xs font-bold mt-1 uppercase tracking-widest">Análisis de Utilidad y Rendimiento</p>
      </div>

      <div className="flex gap-2 items-end">
        <button onClick={filtrarHoy} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-[13px] font-bold text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors rounded-none uppercase tracking-widest">Hoy</button>
        <button onClick={filtrarSemana} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-[13px] font-bold text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors rounded-none uppercase tracking-widest">7 Días</button>
        <button onClick={filtrarMes} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-[13px] font-bold text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors rounded-none uppercase tracking-widest">Mes</button>
      </div>
    </div>
  );
};