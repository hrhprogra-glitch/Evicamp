import React, { useRef } from 'react';
import { Search, X, FilterX } from 'lucide-react';

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

export const FiltrosConteos: React.FC<Props> = ({
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

  const focusPaginacion = () => {
    const btnPrev = document.getElementById('btn-pag-prev-conteos');
    const btnNext = document.getElementById('btn-pag-next-conteos');
    if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
      btnPrev.focus();
    } else if (btnNext) {
      btnNext.focus();
    } else if (btnPrev) {
      btnPrev.focus();
    } else {
      focusPrimerRegistro();
    }
  };

  // Teclas comunes de los filtros: ↑ a "Nuevo ajuste", ↓ a la paginación, ← → entre filtros
  const teclas = (izq: string | null, der: string | null) => (e: React.KeyboardEvent<HTMLElement>) => {
    const ir = (id: string | null) => { if (!id) return; const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); if (el?.tagName === 'INPUT' && el.type === 'text') el.select(); };
    const acc: Record<string, () => void> = {
      ArrowUp: () => ir('btn-nuevo-ajuste'),
      ArrowDown: () => focusPaginacion(),
      ArrowLeft: () => ir(izq),
      ArrowRight: () => (der ? ir(der) : focusPaginacion()),
    };
    if (acc[e.key]) { e.preventDefault(); e.stopPropagation(); acc[e.key](); }
  };

  // Como Inventario: buscador grande a la izquierda y los filtros (de la misma altura) a la derecha
  return (
    <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 px-2 sm:px-3 shrink-0 items-stretch xl:items-center justify-between">
      <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
        <div className="buscador-sobrio__icono"><Search size={18} /></div>
        <input
          id="buscador-global-conteos"
          autoComplete="off"
          type="text"
          placeholder="BUSCAR PRODUCTO..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); setSearchQuery(''); return; }
            if (e.key === 'ArrowLeft') return;
            if (e.key === 'ArrowRight' && e.currentTarget.selectionStart !== e.currentTarget.value.length) return;
            if (e.key === 'ArrowRight' && searchQuery) {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-borrar-buscador-conteos')?.focus();
              return;
            }
            teclas(null, 'filtro-motivo-conteos')(e);
          }}
          style={{ paddingRight: searchQuery ? '8rem' : undefined }}
        />
        {searchQuery && (
          <div className="buscador-sobrio__match">
            <span className="buscador-sobrio__conteo">{matchCount} MATCH</span>
            <button 
              id="btn-borrar-buscador-conteos"
              type="button" 
              title="Borrar búsqueda" 
              className="buscador-sobrio__borrar"
              onClick={() => { setSearchQuery(''); document.getElementById('buscador-global-conteos')?.focus(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                  document.getElementById('buscador-global-conteos')?.focus();
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  e.stopPropagation();
                  const inp = document.getElementById('buscador-global-conteos') as HTMLInputElement | null;
                  if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                  }
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('filtro-motivo-conteos')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusPaginacion();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-nuevo-ajuste')?.focus();
                }
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
        <select id="filtro-motivo-conteos" value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
          onKeyDown={teclas(searchQuery ? 'btn-borrar-buscador-conteos' : 'buscador-global-conteos', 'filtro-orden-conteos')} className="filtro-sobrio w-full sm:w-auto">
          <option value="">TODOS LOS MOTIVOS</option>
          {motivosUnicos.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select id="filtro-orden-conteos" value={filtroOrden} onChange={(e) => setFiltroOrden(e.target.value)}
          onKeyDown={teclas('filtro-motivo-conteos', 'filtro-fecha-conteos')} className="filtro-sobrio w-full sm:w-auto">
          <option value="FECHA_DESC">MÁS RECIENTES</option>
          <option value="FECHA_ASC">MÁS ANTIGUOS</option>
          <option value="PERDIDA_DESC">MAYOR PÉRDIDA S/</option>
          <option value="PERDIDA_ASC">MENOR PÉRDIDA S/</option>
        </select>

        {/* Fecha: Enter abre el calendario y, al elegir, el selector se queda en la fecha */}
        <input
          id="filtro-fecha-conteos"
          autoComplete="off"
          type="date"
          value={filtroFecha}
          title="Filtrar por fecha"
          onChange={(e) => {
            lastDateChangeRef.current = Date.now();
            setFiltroFecha(e.target.value);
            setTimeout(() => (document.getElementById('filtro-fecha-conteos') as HTMLInputElement | null)?.focus(), 50);
          }}
          onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {} }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (Date.now() - lastDateChangeRef.current < 500) { e.currentTarget.focus(); return; }
              try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
              return;
            }
            teclas('filtro-orden-conteos', 'btn-limpiar-filtros-conteos')(e);
          }}
          className="filtro-sobrio w-full sm:w-auto"
        />

        <button id="btn-limpiar-filtros-conteos" type="button" onClick={onClearFilters}
          onKeyDown={teclas('filtro-fecha-conteos', null)} className="limpiar-sobrio"
          title={hasActiveFilters ? 'Limpiar todos los filtros' : 'Sin filtros'}>
          <FilterX size={16} />
        </button>
      </div>
    </div>
  );
};
