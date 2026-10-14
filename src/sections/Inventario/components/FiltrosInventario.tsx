import React, { useState, useEffect } from 'react';
import { Search, X, FilterX } from 'lucide-react';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  matchCount: number;
  categorias: string[];
  filtroCategoria: string;
  setFiltroCategoria: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroOrden: string;
  setFiltroOrden: (val: string) => void;
  onClearFilters: () => void;
}

export const FiltrosInventario: React.FC<Props> = ({ 
  searchQuery, setSearchQuery, matchCount,
  categorias, filtroCategoria, setFiltroCategoria,
  filtroEstado, setFiltroEstado,
  filtroOrden, setFiltroOrden, onClearFilters
}) => {
  // === NUEVO: ESTADO LOCAL Y DEBOUNCE PARA VELOCIDAD EXTREMA ===
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Sincronizar si los filtros se limpian desde afuera
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Esperar 300ms después de que el usuario deje de teclear para procesar la búsqueda
  useEffect(() => {
    if (localQuery === searchQuery) return;
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);
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
    <div className="flex flex-col xl:flex-row gap-4 px-8 shrink-0 items-center justify-between">
      
      {/* BARRA DE BÚSQUEDA (Toma el espacio restante) */}
      <div className="w-full flex-1 h-14 flex border border-[#E2E8F0] bg-[var(--color-surface)] focus-within:border-[var(--color-ink)] focus-within:ring-2 focus-within:ring-[var(--color-ink)] transition-all group shadow-sm">
        <div className="w-14 h-full flex items-center justify-center bg-[#F8FAFC] border-r border-[#E2E8F0] text-[#94A3B8] group-focus-within:bg-[var(--color-ink)] group-focus-within:text-[var(--color-success)] group-focus-within:border-[var(--color-ink)] transition-colors shrink-0">
          <div className="mt-[-6px]"><Search size={18} /></div>
        </div>
        <div className="flex-1 relative h-full flex items-center">
          <input 
            id="buscador-global-inventario"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            name="search_inventario_no_history"
            data-lpignore="true"
            data-form-type="other"
            placeholder="ESCANEAR BARCODE O BUSCAR POR NOMBRE / CÓDIGO..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                const btnTabLotes = document.getElementById('btn-tab-lotes');
                const btnTabProductos = document.getElementById('btn-tab-productos');
                if (btnTabLotes && btnTabLotes.classList.contains('bg-[var(--color-ink)]')) {
                  btnTabLotes.focus();
                } else if (btnTabProductos && btnTabProductos.classList.contains('bg-[var(--color-ink)]')) {
                  btnTabProductos.focus();
                } else {
                  document.getElementById('btn-nuevo-producto')?.focus();
                }
              } else if (e.key === 'ArrowRight') {
                const input = e.currentTarget;
                if (input.selectionStart === input.value.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('filtro-categoria-inventario')?.focus();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setLocalQuery('');
                setSearchQuery('');
              }
            }}
            className="w-full h-full pl-4 pr-32 bg-transparent font-black text-xs uppercase outline-none text-[var(--color-ink)] placeholder:text-[#CBD5E1]"
          />
          {localQuery && (
            <div className="absolute right-2 flex items-center gap-2">
              <div className="flex items-center border border-[var(--color-success)] bg-[var(--color-ink)] px-2 h-8">
                <div className="w-1.5 h-1.5 bg-[var(--color-success)] animate-pulse mr-2"></div>
                <span className="text-[9px] font-black text-[var(--color-success)] tracking-widest leading-none">
                  {matchCount} MATCH
                </span>
              </div>
              <button 
                onClick={() => {
                  setLocalQuery('');
                  setSearchQuery('');
                }}
                className="w-8 h-8 flex items-center justify-center border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer rounded-none"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE DE FILTROS Y ORDENAMIENTO (A la derecha) */}
      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
        
        {/* SELECT CATEGORÍA */}
        <select 
          id="filtro-categoria-inventario"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-nuevo-producto')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPrimerRegistro();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('buscador-global-inventario')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-estado-inventario')?.focus();
            }
          }}
          className="h-14 bg-[var(--color-surface)] border border-[#E2E8F0] text-[10px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-success)] focus:ring-1 focus:ring-[var(--color-success)] transition-colors cursor-pointer"
        >
          <option value="">Todas las Categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* SELECT ESTADO */}
        <select 
          id="filtro-estado-inventario"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-ingresar-lote')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPrimerRegistro();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-categoria-inventario')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-orden-inventario')?.focus();
            }
          }}
          className="h-14 bg-[var(--color-surface)] border border-[#E2E8F0] text-[10px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-success)] focus:ring-1 focus:ring-[var(--color-success)] transition-colors cursor-pointer"
        >
          <option value="">Todos los Estados</option>
          <option value="CON_STOCK">Con Stock General</option>
          <option value="CRITICO">Nivel Crítico</option>
          <option value="SIN_STOCK">Agotados (0 Stock)</option>
        </select>

        {/* SELECT ORDENAMIENTO */}
        <select 
          id="filtro-orden-inventario"
          value={filtroOrden}
          onChange={(e) => setFiltroOrden(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-proveedores')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPrimerRegistro();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-estado-inventario')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-limpiar-filtros-inventario')?.focus();
            }
          }}
          className="h-14 bg-[var(--color-surface)] border border-[#E2E8F0] text-[10px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-success)] focus:ring-1 focus:ring-[var(--color-success)] transition-colors cursor-pointer"
        >
          <option value="NOMBRE_ASC">Nombre (A - Z)</option>
          <option value="NOMBRE_DESC">Nombre (Z - A)</option>
          <option value="STOCK_DESC">Mayor Stock</option>
          <option value="STOCK_ASC">Menor Stock</option>
          <option value="PRECIO_DESC">Mayor Precio</option>
          <option value="PRECIO_ASC">Menor Precio</option>
        </select>

        {/* BOTÓN LIMPIAR FILTROS */}
        <button 
          id="btn-limpiar-filtros-inventario"
          onClick={onClearFilters}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              document.getElementById('btn-proveedores')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const btnPrev = document.getElementById('btn-pag-prev-inventario');
              const btnNext = document.getElementById('btn-pag-next-inventario');
              if (btnPrev && !btnPrev.hasAttribute('disabled')) btnPrev.focus();
              else if (btnNext && !btnNext.hasAttribute('disabled')) btnNext.focus();
              else focusPrimerRegistro();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              document.getElementById('filtro-orden-inventario')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const btnPrev = document.getElementById('btn-pag-prev-inventario');
              const btnNext = document.getElementById('btn-pag-next-inventario');
              if (btnPrev && !btnPrev.hasAttribute('disabled')) btnPrev.focus();
              else if (btnNext && !btnNext.hasAttribute('disabled')) btnNext.focus();
            }
          }}
          title="Limpiar todos los filtros"
          className="h-14 px-4 flex items-center justify-center border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-[var(--color-ink)] hover:text-white hover:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
        >
          <FilterX size={16} />
        </button>
      </div>

    </div>
  );
};