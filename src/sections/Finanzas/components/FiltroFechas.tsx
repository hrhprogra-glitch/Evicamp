import React, { useState, useRef } from 'react';

interface Props {
  onFilter: (desde: string, hasta: string) => void;
}

export const FiltroFechas: React.FC<Props> = ({ onFilter }) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const lastDateDesdeRef = useRef(0);
  const lastDateHastaRef = useRef(0);

  const focusPrimerRegistro = () => {
    const rows = Array.from(document.querySelectorAll('tr[data-row="true"][role="button"]')) as HTMLElement[];
    if (rows.length > 0) {
      rows[0].focus();
      rows[0].scrollIntoView({ block: 'nearest' });
    }
  };

  const focusPaginacionOPrimerRegistro = () => {
    const btnAnt = document.getElementById('btn-historial-anterior');
    if (btnAnt) {
      btnAnt.focus();
      return;
    }
    focusPrimerRegistro();
  };

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
        <input 
          id="filtro-fecha-desde-finanzas"
          autoComplete="off" 
          type="date" 
          value={desde}
          onChange={(e) => {
            lastDateDesdeRef.current = Date.now();
            setDesde(e.target.value);
            setTimeout(() => {
              document.getElementById('filtro-fecha-desde-finanzas')?.focus();
            }, 50);
          }}
          onClick={(e) => {
            try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (Date.now() - lastDateDesdeRef.current < 500) {
                e.currentTarget.focus();
                return;
              }
              try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-ver-historial')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPaginacionOPrimerRegistro();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-fecha-hasta-finanzas')?.focus();
            }
          }}
          className="bg-[var(--color-bg)] text-[var(--color-ink)] border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)] rounded-none px-3 py-2 text-xs font-bold outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest">Hasta</label>
        <input 
          id="filtro-fecha-hasta-finanzas"
          autoComplete="off" 
          type="date" 
          value={hasta}
          onChange={(e) => {
            lastDateHastaRef.current = Date.now();
            setHasta(e.target.value);
            setTimeout(() => {
              document.getElementById('filtro-fecha-hasta-finanzas')?.focus();
            }, 50);
          }}
          onClick={(e) => {
            try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (Date.now() - lastDateHastaRef.current < 500) {
                e.currentTarget.focus();
                return;
              }
              try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-ver-historial')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPaginacionOPrimerRegistro();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-fecha-desde-finanzas')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-buscar-fechas-finanzas')?.focus();
            }
          }}
          className="bg-[var(--color-bg)] text-[var(--color-ink)] border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)] rounded-none px-3 py-2 text-xs font-bold outline-none transition-colors"
        />
      </div>
      
      <div className="flex gap-2">
        <button 
          id="btn-buscar-fechas-finanzas"
          onClick={manejarBusquedaManual}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-fecha-hasta-finanzas')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-limpiar-fechas-finanzas')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPaginacionOPrimerRegistro();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-ver-historial')?.focus();
            }
          }}
          className="bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors rounded-none cursor-pointer"
        >
          Buscar
        </button>
        <button 
          id="btn-limpiar-fechas-finanzas"
          onClick={limpiarFiltros}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-buscar-fechas-finanzas')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusPaginacionOPrimerRegistro();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-ver-historial')?.focus();
            }
          }}
          className="bg-[var(--color-surface)] text-[var(--color-muted)] px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-muted)] hover:bg-[var(--color-muted)] hover:text-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors rounded-none cursor-pointer"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};
