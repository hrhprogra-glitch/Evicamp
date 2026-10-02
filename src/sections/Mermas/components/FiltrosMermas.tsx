import React from 'react';
import { Search, Filter, ArrowUpDown, X, Calendar } from 'lucide-react';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filtroMotivo: string;
  setFiltroMotivo: (val: string) => void;
  filtroOrden: string;
  setFiltroOrden: (val: string) => void;
  filtroFecha: string;
  setFiltroFecha: (val: string) => void;
  motivosUnicos: string[];
  onClearFilters: () => void;
  matchCount: number;
}

export const FiltrosMermas: React.FC<Props> = ({
  searchQuery, setSearchQuery,
  filtroMotivo, setFiltroMotivo,
  filtroOrden, setFiltroOrden,
  filtroFecha, setFiltroFecha,
  motivosUnicos, onClearFilters, matchCount
}) => {
  const hasActiveFilters = searchQuery !== '' || filtroMotivo !== '' || filtroOrden !== 'FECHA_DESC' || filtroFecha !== '';

  return (
    <div className="px-3 lg:px-4 shrink-0 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-4">
        
        {/* BUSCADOR */}
        <div className="md:col-span-12 lg:col-span-3 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-12 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR PRODUCTO..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent placeholder:text-[var(--color-subtle)]"
          />
        </div>

        {/* SELECTOR DE MOTIVO */}
        <div className="md:col-span-4 lg:col-span-3 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Filter size={16} />
          </div>
          <select 
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer appearance-none"
          >
            <option value="">TODOS LOS MOTIVOS</option>
            {motivosUnicos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* SELECTOR DE ORDEN */}
        <div className="md:col-span-4 lg:col-span-3 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <ArrowUpDown size={16} />
          </div>
          <select 
            value={filtroOrden}
            onChange={(e) => setFiltroOrden(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer appearance-none"
          >
            <option value="FECHA_DESC">MÁS RECIENTES</option>
            <option value="FECHA_ASC">MÁS ANTIGUOS</option>
            <option value="PERDIDA_DESC">MAYOR PÉRDIDA S/</option>
            <option value="PERDIDA_ASC">MENOR PÉRDIDA S/</option>
          </select>
        </div>

        {/* SELECTOR DE FECHA (NUEVO) */}
        <div className="md:col-span-2 lg:col-span-2 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Calendar size={16} />
          </div>
          <input 
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer"
          />
        </div>

        {/* BOTÓN LIMPIAR FILTROS */}
        <div className="md:col-span-2 lg:col-span-1 flex items-center justify-end">
          {hasActiveFilters && (
            <button 
              onClick={onClearFilters}
              className="h-full w-full min-h-[46px] bg-white border-2 border-[var(--color-danger)] text-[var(--color-danger)] flex items-center justify-center hover:bg-[var(--color-danger)] hover:text-white transition-colors cursor-pointer rounded-none font-bold text-[12px] xl:text-xs uppercase"
              title="Limpiar Filtros"
            >
              <X size={16} className="mr-1" /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest border-l-2 border-[var(--color-ink)] pl-2">
        <span>Resultados: <strong className="text-[var(--color-ink)]">{matchCount}</strong></span>
      </div>
    </div>
  );
};