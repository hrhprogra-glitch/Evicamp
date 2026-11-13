// Sub-barra de la pestaña Cotizaciones de ENCARGOS (SiuMax Nego). La cabecera (título "Encargos", pestañas y
// "Nueva cotización") está en Encargos/CabeceraEncargos. Aquí: cuadros de totales y, en UNA fila, buscador y estado.
import React from 'react';
import { Search, X } from 'lucide-react';
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
}

const primeraFila = () => (document.querySelector('[data-fila-coti="true"]') as HTMLElement | null)?.focus();
// ↑ desde la sub-barra: la pestaña Cotizaciones o, si no hay pestañas, "Nueva cotización"
const subir = () => (document.getElementById('tab-encargos-cotizaciones') || document.getElementById('btn-nueva-cotizacion'))?.focus();

export const HeaderCotizaciones: React.FC<Props> = ({ busqueda, onBusquedaChange, filtroEstado, onFiltroEstadoChange, cotizaciones, encontradas }) => {
  // Montos en soles (las de dólares no se suman con las de soles)
  const soles = cotizaciones.filter((c) => c.moneda !== 'USD');
  const cuadros = [
    { label: 'Cotizado', valor: `S/ ${formatearMonto(soles.filter((c) => c.estado !== 'ANULADA' && c.estado !== 'RECHAZADA').reduce((s, c) => s + c.total, 0))}`, color: 'var(--color-ink)' },
    { label: 'Aprobadas', valor: String(cotizaciones.filter((c) => c.estado === 'APROBADA' || c.estado === 'CONVERTIDA').length), color: 'var(--color-success)' },
    { label: 'Por cobrar', valor: `S/ ${formatearMonto(soles.filter((c) => c.estado === 'APROBADA').reduce((s, c) => s + c.saldo, 0))}`, color: 'var(--color-danger)' },
    { label: 'Pendientes', valor: String(cotizaciones.filter((c) => c.estado === 'BORRADOR' || c.estado === 'VIGENTE').length), color: 'var(--color-warning-dark)' },
  ];

  const teclasFiltro = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('buscador-cotizaciones')?.focus(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); primeraFila(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); subir(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } }
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 flex flex-col gap-3 font-mono">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cuadros.map((q) => (
          <div key={q.label} className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: q.color }}>{q.label}</p>
            <p className="text-base font-black leading-tight whitespace-nowrap" style={{ color: q.color }}>{q.valor}</p>
          </div>
        ))}
      </div>
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
              else if (e.key === 'ArrowUp') { e.preventDefault(); subir(); }
              else if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
                e.preventDefault();
                document.getElementById(busqueda ? 'btn-borrar-buscador-cotizaciones' : 'filtro-estado-coti')?.focus();
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
                  else if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('filtro-estado-coti')?.focus(); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); primeraFila(); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); subir(); }
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
  );
};
