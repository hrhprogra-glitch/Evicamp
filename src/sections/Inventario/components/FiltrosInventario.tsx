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
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, setSearchQuery]);
  return (
    <div className="flex flex-col xl:flex-row gap-4 px-3 lg:px-4 shrink-0 items-center justify-between">
      
      {/* BARRA DE BÚSQUEDA (Toma el espacio restante) */}
      <div className="w-full xl:flex-1 h-14 shrink-0 flex border border-[var(--color-border)] bg-white focus-within:border-[var(--color-ink)] focus-within:ring-1 focus-within:ring-[var(--color-ink)] transition-all group shadow-sm">
        <div className="w-14 h-full flex items-center justify-center bg-[var(--color-bg)] border-r border-[var(--color-border)] text-[var(--color-subtle)] group-focus-within:bg-[var(--color-ink)] group-focus-within:text-[var(--color-accent)] group-focus-within:border-[var(--color-ink)] transition-colors shrink-0">
          <div className="mt-[-6px]"><Search size={18} /></div>
        </div>
        <div className="flex-1 relative h-full flex items-center">
          <input 
            type="text"
            placeholder="ESCANEAR BARCODE O BUSCAR POR NOMBRE / CÓDIGO..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="w-full h-full pl-4 pr-32 bg-transparent font-black text-xs uppercase outline-none text-[var(--color-ink)] placeholder:text-[var(--color-line-light)]"
          />
          {localQuery && (
            <div className="absolute right-2 flex items-center gap-2">
              <div className="flex items-center border border-[var(--color-accent)] bg-[var(--color-ink)] px-2 h-8">
                <div className="w-1.5 h-1.5 bg-[var(--color-accent)] animate-pulse mr-2"></div>
                <span className="text-[12px] font-black text-[var(--color-accent)] tracking-widest leading-none">
                  {matchCount} MATCH
                </span>
              </div>
              <button 
                onClick={() => {
                  setLocalQuery('');
                  setSearchQuery('');
                }}
                className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer rounded-none"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE DE FILTROS Y ORDENAMIENTO (A la derecha) */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
        
        {/* SELECT CATEGORÍA */}
        <select 
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="h-14 w-full sm:w-auto min-w-0 bg-white border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <option value="">Todas las Categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* SELECT ESTADO */}
        <select 
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="h-14 w-full sm:w-auto min-w-0 bg-white border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <option value="">Todos los Estados</option>
          <option value="CON_STOCK">Con Stock General</option>
          <option value="CRITICO">Nivel Crítico</option>
          <option value="SIN_STOCK">Agotados (0 Stock)</option>
        </select>

        {/* SELECT ORDENAMIENTO */}
        <select 
          value={filtroOrden}
          onChange={(e) => setFiltroOrden(e.target.value)}
          className="h-14 w-full sm:w-auto min-w-0 bg-white border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-ink)] uppercase px-3 outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
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
          onClick={onClearFilters}
          title="Limpiar todos los filtros"
          className="h-14 px-4 flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:bg-[var(--color-ink)] hover:text-white hover:border-[var(--color-ink)] transition-all cursor-pointer"
        >
          <FilterX size={16} />
        </button>
      </div>

    </div>
  );
};