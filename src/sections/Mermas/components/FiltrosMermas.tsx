import React, { useRef } from 'react';
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
  const lastDateChangeRef = useRef(0);

  const focusPrimerRegistro = () => {
    const visibleRows = Array.from(document.querySelectorAll('div[data-row="true"][role="button"]'))
      .filter((el): el is HTMLElement => {
        const htmlEl = el as HTMLElement;
        return !htmlEl.closest('.hidden');
      });
    const firstRow = visibleRows[0];
    if (firstRow) {
      firstRow.focus();
      firstRow.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div className="px-3 lg:px-4 shrink-0 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-4">
        
        {/* BUSCADOR */}
        <div className="md:col-span-12 lg:col-span-3 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-12 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Search size={18} />
          </div>
          <input 
            id="buscador-global-mermas"
            autoComplete="off" 
            type="text" 
            placeholder="BUSCAR PRODUCTO..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-registrar-merma')?.focus();
              } else if (e.key === 'ArrowRight') {
                const input = e.currentTarget;
                if (input.selectionStart === input.value.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('filtro-motivo-mermas')?.focus();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setSearchQuery('');
              }
            }}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent placeholder:text-[var(--color-subtle)]"
          />
        </div>

        {/* SELECTOR DE MOTIVO */}
        <div className="md:col-span-4 lg:col-span-3 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none">
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Filter size={16} />
          </div>
          <select 
            id="filtro-motivo-mermas"
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-registrar-merma')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                const search = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
                search?.focus();
                search?.select();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-orden-mermas')?.focus();
              }
            }}
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
            id="filtro-orden-mermas"
            value={filtroOrden}
            onChange={(e) => setFiltroOrden(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-registrar-merma')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-motivo-mermas')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-fecha-mermas')?.focus();
              }
            }}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer appearance-none"
          >
            <option value="FECHA_DESC">MÁS RECIENTES</option>
            <option value="FECHA_ASC">MÁS ANTIGUOS</option>
            <option value="PERDIDA_DESC">MAYOR PÉRDIDA S/</option>
            <option value="PERDIDA_ASC">MENOR PÉRDIDA S/</option>
          </select>
        </div>

        {/* SELECTOR DE FECHA */}
        <div 
          onClick={() => {
            const input = document.getElementById('filtro-fecha-mermas') as HTMLInputElement | null;
            input?.focus();
            try { input?.showPicker?.(); } catch {}
          }}
          className="md:col-span-2 lg:col-span-2 relative flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] transition-colors rounded-none cursor-pointer"
        >
          <div className="w-10 flex items-center justify-center bg-[var(--color-bg)] border-r-2 border-[var(--color-border)] shrink-0 text-[var(--color-muted)]">
            <Calendar size={16} />
          </div>
          <input 
            id="filtro-fecha-mermas"
            autoComplete="off" 
            type="date"
            value={filtroFecha}
            onChange={(e) => {
              lastDateChangeRef.current = Date.now();
              setFiltroFecha(e.target.value);
              // Al seleccionar la fecha, devolver foco a la selección del calendario de inmediato
              setTimeout(() => {
                const el = document.getElementById('filtro-fecha-mermas') as HTMLInputElement | null;
                el?.focus();
              }, 50);
            }}
            onClick={(e) => {
              e.stopPropagation();
              try {
                (e.currentTarget as HTMLInputElement).showPicker?.();
              } catch {}
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                // Si recién se confirmó/seleccionó la fecha (hace menos de 500ms), devolver/mantener foco en el selector
                if (Date.now() - lastDateChangeRef.current < 500) {
                  e.currentTarget.focus();
                  return;
                }
                try {
                  (e.currentTarget as HTMLInputElement).showPicker?.();
                } catch {}
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-registrar-merma')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-orden-mermas')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                const btnLimpiar = document.getElementById('btn-limpiar-filtros-mermas');
                if (btnLimpiar) btnLimpiar.focus();
                else {
                  const search = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
                  search?.focus();
                  search?.select();
                }
              }
            }}
            className="w-full p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none bg-transparent cursor-pointer"
          />
        </div>

        {/* BOTÓN LIMPIAR FILTROS */}
        <div className="md:col-span-2 lg:col-span-1 flex items-center justify-end">
          {hasActiveFilters && (
            <button 
              id="btn-limpiar-filtros-mermas"
              onClick={onClearFilters}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-registrar-merma')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusPrimerRegistro();
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('filtro-fecha-mermas')?.focus();
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  e.stopPropagation();
                  const search = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
                  search?.focus();
                  search?.select();
                }
              }}
              className="h-full w-full min-h-[46px] bg-white border-2 border-[var(--color-danger)] text-[var(--color-danger)] flex items-center justify-center hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] transition-colors cursor-pointer rounded-none font-bold text-[12px] xl:text-xs uppercase"
              title="Limpiar Filtros"
            >
              <X size={16} className="mr-1" /> Limpiar
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
