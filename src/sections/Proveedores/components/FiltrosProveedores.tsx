import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  matchCount: number;
}

export const FiltrosProveedores: React.FC<Props> = ({
  searchQuery, setSearchQuery,
  filtroEstado, setFiltroEstado,
  matchCount
}) => {
  const hasActiveFilters = searchQuery !== '' || filtroEstado !== '';

  return (
    <div className="px-3 lg:px-4 shrink-0 flex flex-col gap-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* BUSCADOR */}
        <div className="md:col-span-8 lg:col-span-6 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-info)] transition-colors rounded-none">
          <div className="w-12 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR POR RUC O RAZÓN SOCIAL..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent placeholder:text-[var(--color-subtle)]"
          />
        </div>

        {/* SELECTOR DE ESTADO */}
        <div className="md:col-span-3 lg:col-span-4 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-info)] transition-colors rounded-none">
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Filter size={16} />
          </div>
          <select 
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer appearance-none"
          >
            <option value="">TODOS LOS ESTADOS</option>
            <option value="ACTIVO">SOLO ACTIVOS</option>
            <option value="INACTIVO">SOLO INACTIVOS</option>
          </select>
        </div>

        {/* BOTÓN LIMPIAR FILTROS */}
        <div className="md:col-span-1 lg:col-span-2 flex items-center justify-end">
          {hasActiveFilters && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setFiltroEstado('');
              }}
              className="h-full w-full bg-white border-2 border-[var(--color-danger)] text-[var(--color-danger)] flex items-center justify-center hover:bg-[var(--color-danger)] hover:text-white transition-colors cursor-pointer rounded-none font-bold text-xs"
              title="Limpiar Filtros"
            >
              <X size={18} className="mr-1" /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest border-l-2 border-[var(--color-ink)] pl-2">
        <span>Resultados: <strong className="text-[var(--color-ink)]">{matchCount}</strong> proveedores</span>
      </div>
    </div>
  );
};