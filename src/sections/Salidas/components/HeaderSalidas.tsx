// src/sections/Salidas/components/HeaderSalidas.tsx
// Cabecera de Salidas en estilo SiuMax Sobrio

import React from 'react';
import { Truck, Plus, Search, X } from 'lucide-react';
import type { TipoSalida, EstadoSalida } from '../types';

interface HeaderSalidasProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroTipo: TipoSalida | 'TODOS';
  onFiltroTipoChange: (tipo: TipoSalida | 'TODOS') => void;
  filtroEstado: EstadoSalida | 'TODOS';
  onFiltroEstadoChange: (estado: EstadoSalida | 'TODOS') => void;
  filtroFecha: string;
  onFiltroFechaChange: (fecha: string) => void;
  onNuevaSalida: () => void;
  metricas: {
    total: number;
    enProceso: number;
    finalizadas: number;
    canceladas: number;
  };
}

// Fila de la sub-barra que se recorre con ← →
const BARRA = ['buscador-salidas', 'filtro-tipo-salidas', 'filtro-estado-salidas', 'filtro-fecha-salidas', 'btn-filtro-fecha-todas'];

// Bajar desde la sub-barra: paginación de arriba o la primera fila
const bajarDesdeBarra = () => {
  const ant = document.getElementById('btn-pagina-ant-salidas-arriba');
  const sig = document.getElementById('btn-pagina-sig-salidas-arriba');
  if (ant && !ant.hasAttribute('disabled')) ant.focus();
  else if (sig && !sig.hasAttribute('disabled')) sig.focus();
  else (document.querySelector('[data-fila-salida="true"]') as HTMLElement | null)?.focus();
};

// Teclas de los filtros: las flechas solo mueven el selector (no cambian la opción); Enter o Espacio abren la lista
const teclasFiltro = (e: React.KeyboardEvent<HTMLSelectElement | HTMLInputElement>) => {
  const i = BARRA.indexOf(e.currentTarget.id);
  if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(BARRA[Math.min(i + 1, BARRA.length - 1)])?.focus(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(BARRA[Math.max(i - 1, 0)])?.focus(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); bajarDesdeBarra(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-nueva-salida')?.focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } }
};

// En la fecha, ← → sirven para moverse dentro del calendario (día/mes/año), como manda la regla global.
// Arriba/abajo y Enter sí siguen la costumbre de la barra de filtros.
const teclasFecha = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); bajarDesdeBarra(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-nueva-salida')?.focus(); }
  else if (e.key === 'Enter') { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin calendario */ } }
};

export const HeaderSalidas: React.FC<HeaderSalidasProps> = ({
  busqueda,
  onBusquedaChange,
  filtroTipo,
  onFiltroTipoChange,
  filtroEstado,
  onFiltroEstadoChange,
  filtroFecha,
  onFiltroFechaChange,
  onNuevaSalida,
  metricas,
}) => {
  // Cuadros de conteo, pequeños y en la cabecera (el dueño los quiere arriba, sin ocupar una fila)
  const cuadros = [
    { label: 'Total', valor: metricas.total, color: 'var(--color-ink)' },
    { label: 'En proceso', valor: metricas.enProceso, color: 'var(--color-warning-dark)' },
    { label: 'Finalizadas', valor: metricas.finalizadas, color: 'var(--color-success)' },
    { label: 'Canceladas', valor: metricas.canceladas, color: 'var(--color-danger)' },
  ];
  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* CABECERA (como Inventario y Clientes): título, cuadros de conteo y botón a la derecha */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 max-w-full flex-wrap">
          {/* Título de la Sección */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[2px_2px_0_0_var(--color-accent)] rounded-none shrink-0">
              <Truck size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Salidas
            </h1>
          </div>

          {/* Cuadros de conteo limpios y compactos */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {cuadros.map((q) => (
              <div key={q.label} className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 text-center min-w-[75px] sm:min-w-[90px]">
                <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: q.color }}>{q.label}</p>
                <p className="text-base sm:text-lg font-black leading-tight" style={{ color: q.color }}>{q.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Acción a la Derecha */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-nueva-salida"
            type="button"
            onClick={onNuevaSalida}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('buscador-salidas')?.focus(); }
            }}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none whitespace-nowrap"
          >
            <Plus size={16} /> Nueva salida
          </button>
        </div>
      </div>

      {/* SUB-BARRA: Buscador y filtros de tipo y estado en una fila limpia */}
      <div className="flex flex-col xl:flex-row gap-2.5 sm:gap-3 items-stretch xl:items-center justify-between shrink-0">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            id="buscador-salidas"
            type="text"
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            onKeyDown={(e) => {
              const input = e.currentTarget;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                bajarDesdeBarra();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('btn-nueva-salida')?.focus();
              } else if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
                e.preventDefault();
                document.getElementById('filtro-tipo-salidas')?.focus();
              }
            }}
            placeholder="BUSCAR CÓDIGO, CLIENTE, LO QUE SE ATIENDE, DIRECCIÓN O TÉCNICO..."
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <button
                type="button"
                className="buscador-sobrio__borrar"
                onClick={() => onBusquedaChange('')}
                title="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
          <select
            id="filtro-tipo-salidas"
            value={filtroTipo}
            onChange={(e) => onFiltroTipoChange(e.target.value as TipoSalida | 'TODOS')}
            onKeyDown={teclasFiltro}
            className="filtro-sobrio w-full sm:w-auto"
          >
            <option value="TODOS">TODOS LOS TIPOS</option>
            <option value="SERVICIO">SERVICIOS</option>
            <option value="OBRA">OBRAS</option>
          </select>

          <select
            id="filtro-estado-salidas"
            value={filtroEstado}
            onChange={(e) => onFiltroEstadoChange(e.target.value as EstadoSalida | 'TODOS')}
            onKeyDown={teclasFiltro}
            className="filtro-sobrio w-full sm:w-auto"
          >
            <option value="TODOS">TODOS LOS ESTADOS</option>
            <option value="EN_PROCESO">EN PROCESO</option>
            <option value="FINALIZADO">FINALIZADAS</option>
            <option value="CANCELADO">CANCELADAS</option>
          </select>

          {/* 24/11/2026 (221): fecha para ver salidas de otros días; TODAS deja la fecha vacía */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <input
              id="filtro-fecha-salidas"
              type="date"
              value={filtroFecha}
              onChange={(e) => onFiltroFechaChange(e.target.value)}
              onKeyDown={teclasFecha}
              title="Filtrar salidas por fecha"
              className="filtro-sobrio w-full sm:w-auto"
            />
            <button
              id="btn-filtro-fecha-todas"
              type="button"
              onClick={() => onFiltroFechaChange('')}
              title="Ver salidas de todos los días"
              className="boton-cabecera px-2 py-2 font-black text-[10px] uppercase tracking-widest rounded-none cursor-pointer h-[2.75rem]"
            >
              TODAS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
