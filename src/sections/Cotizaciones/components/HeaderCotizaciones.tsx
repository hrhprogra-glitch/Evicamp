// Cabecera de Cotizaciones (SiuMax Nego, paso 3h) en estilo SiuMax Sobrio, como Salidas: título, cuadros de conteo y
// "Nueva cotización" en UNA fila; debajo, buscador y filtro de estado en una sola fila.
import React from 'react';
import { FileText, Plus, Search, X } from 'lucide-react';
import type { Cotizacion } from '../types';
import { ESTADOS_FILTRO } from '../types';
import { formatearMonto } from '../../../utils/formato';

interface Props {
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  filtroEstado: string;
  onFiltroEstadoChange: (v: string) => void;
  cotizaciones: Cotizacion[];
  encontradas: number;
  onNueva: () => void;
}

const BARRA = ['buscador-cotizaciones', 'filtro-estado-coti'];
const primeraFila = () => (document.querySelector('[data-fila-coti="true"]') as HTMLElement | null)?.focus();

export const HeaderCotizaciones: React.FC<Props> = ({ busqueda, onBusquedaChange, filtroEstado, onFiltroEstadoChange, cotizaciones, encontradas, onNueva }) => {
  // Montos en soles (las de dólares se cuentan aparte para no sumar monedas distintas)
  const soles = cotizaciones.filter((c) => c.moneda !== 'USD');
  const activas = (c: Cotizacion) => c.estado === 'APROBADA' || c.estado === 'CONVERTIDA';
  const cuadros = [
    { label: 'Cotizado', valor: `S/ ${formatearMonto(soles.filter((c) => c.estado !== 'ANULADA' && c.estado !== 'RECHAZADA').reduce((s, c) => s + c.total, 0))}`, color: 'var(--color-ink)' },
    { label: 'Aprobadas', valor: String(cotizaciones.filter(activas).length), color: 'var(--color-success)' },
    { label: 'Por cobrar', valor: `S/ ${formatearMonto(soles.filter((c) => c.estado === 'APROBADA').reduce((s, c) => s + c.saldo, 0))}`, color: 'var(--color-danger)' },
    { label: 'Pendientes', valor: String(cotizaciones.filter((c) => c.estado === 'BORRADOR' || c.estado === 'VIGENTE').length), color: 'var(--color-warning-dark)' },
  ];

  const teclasFiltro = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('buscador-cotizaciones')?.focus(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); primeraFila(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-nueva-cotizacion')?.focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } }
  };

  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 min-w-0 max-w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
              <FileText size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">Cotizaciones</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            {cuadros.map((q) => (
              <div key={q.label} className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1.5 text-center min-w-[90px] lg:min-w-[110px]">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: q.color }}>{q.label}</p>
                <p className="text-base font-black leading-tight whitespace-nowrap" style={{ color: q.color }}>{q.valor}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">
          <button
            id="btn-nueva-cotizacion"
            type="button"
            onClick={onNueva}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('buscador-cotizaciones')?.focus(); } }}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none flex-1 sm:flex-initial whitespace-nowrap"
          >
            <Plus size={16} /> Nueva cotización
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="buscador-sobrio flex-1 shrink-0">
            <div className="buscador-sobrio__icono"><Search size={18} /></div>
            <input
              id="buscador-cotizaciones"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              onKeyDown={(e) => {
                const input = e.currentTarget;
                if (e.key === 'Escape' && busqueda) { e.preventDefault(); e.stopPropagation(); onBusquedaChange(''); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); primeraFila(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-nueva-cotizacion')?.focus(); }
                else if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
                  e.preventDefault();
                  document.getElementById(busqueda ? 'btn-borrar-buscador-cotizaciones' : BARRA[1])?.focus();
                }
              }}
              placeholder="BUSCAR NÚMERO, CLIENTE, DOCUMENTO O ASUNTO..."
            />
            {busqueda && (
              <div className="buscador-sobrio__match">
                <span className="buscador-sobrio__conteo">{encontradas} MATCH</span>
                <button
                  id="btn-borrar-buscador-cotizaciones"
                  type="button"
                  className="buscador-sobrio__borrar"
                  onClick={() => { onBusquedaChange(''); document.getElementById('buscador-cotizaciones')?.focus(); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('buscador-cotizaciones')?.focus(); }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(BARRA[1])?.focus(); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); primeraFila(); }
                  }}
                  title="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <select id="filtro-estado-coti" value={filtroEstado} onChange={(e) => onFiltroEstadoChange(e.target.value)} onKeyDown={teclasFiltro} className="filtro-sobrio w-full md:w-auto">
            {ESTADOS_FILTRO.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};
