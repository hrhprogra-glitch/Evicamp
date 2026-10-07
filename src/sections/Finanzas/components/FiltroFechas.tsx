import React, { useState } from 'react';

interface Props {
  onFilter: (desde: string, hasta: string) => void;
}

export const FiltroFechas: React.FC<Props> = ({ onFilter }) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const manejarBusquedaManual = () => {
    onFilter(desde, hasta);
  };

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    onFilter('', '');
  };

  return (
    <div className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 flex flex-col items-stretch md:flex-row md:flex-wrap md:items-end gap-4 mb-6 rounded-none">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest">Desde</label>
        <input autoComplete="off" type="date" 
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="bg-[var(--color-bg)] text-[var(--color-ink)] border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] rounded-none px-3 py-2 text-xs font-bold outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest">Hasta</label>
        <input autoComplete="off" type="date" 
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="bg-[var(--color-bg)] text-[var(--color-ink)] border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] rounded-none px-3 py-2 text-xs font-bold outline-none transition-colors"
        />
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={manejarBusquedaManual}
          className="bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors rounded-none cursor-pointer"
        >
          Buscar
        </button>
        <button 
          onClick={limpiarFiltros}
          className="bg-[var(--color-surface)] text-[var(--color-muted)] px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-muted)] hover:bg-[var(--color-muted)] hover:text-[var(--color-surface)] transition-colors rounded-none cursor-pointer"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};
