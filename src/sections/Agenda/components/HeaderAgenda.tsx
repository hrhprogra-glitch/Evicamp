// src/sections/Agenda/components/HeaderAgenda.tsx
// Cabecera de Agenda en estilo SiuMax Sobrio
// Buscador y filtro a la izquierda, fecha a la derecha, y métricas subidas a la cabecera

import React from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import type { VistaAgenda, EstadoTrabajo } from '../types';

interface HeaderAgendaProps {
  vista: VistaAgenda;
  setVista: (v: VistaAgenda) => void;
  fechaActual: string;
  setFechaActual: (f: string) => void;
  busqueda: string;
  setBusqueda: (b: string) => void;
  filtroEstado: EstadoTrabajo | 'TODOS';
  setFiltroEstado: (e: EstadoTrabajo | 'TODOS') => void;
  onNuevoTrabajo: () => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  onHoy: () => void;
  tituloRango: string;
  metricas: {
    total: number;
    pendientes: number;
    seguimiento: number;
    completados: number;
  };
}

const VISTAS: { id: VistaAgenda; label: string }[] = [
  { id: 'DIA', label: 'Día' },
  { id: 'SEMANA', label: 'Semana' },
  { id: 'MES', label: 'Mes' },
];

export const HeaderAgenda: React.FC<HeaderAgendaProps> = ({
  vista,
  setVista,
  fechaActual,
  setFechaActual,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  onNuevoTrabajo,
  onAnterior,
  onSiguiente,
  onHoy,
  tituloRango,
  metricas,
}) => {
  const enfocar = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') el.select();
    }
  };

  const focusTrabajoAbajo = () => {
    const primerTrabajo = document.querySelector('[data-tarjeta-trabajo="true"]') as HTMLElement | null;
    if (primerTrabajo) {
      primerTrabajo.focus();
      primerTrabajo.scrollIntoView({ block: 'nearest' });
      return;
    }
    const btnVacio = document.getElementById('btn-programar-trabajo-vacio');
    if (btnVacio) {
      btnVacio.focus();
      btnVacio.scrollIntoView({ block: 'nearest' });
      return;
    }
    document.getElementById('btn-nuevo-trabajo')?.focus();
  };

  const focusPestanaArriba = () => {
    const activa = document.querySelector('[role="tab"][data-activa="true"]') as HTMLElement | null;
    if (activa) {
      activa.focus();
      return;
    }
    document.getElementById('btn-vista-dia')?.focus();
  };

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* CABECERA: título, pestañas de vista, métricas SUBIDAS, y botón a la derecha */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-6 min-w-0 max-w-full">
          {/* Título de la Sección */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
              <CalendarIcon size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Agenda
            </h1>
          </div>

          {/* PESTAÑAS SOBRIAS: Selector de Vistas */}
          <div role="tablist" aria-label="Vistas Agenda" className="pestanas-sobrias flex min-w-0 w-full md:w-auto">
            {VISTAS.map((v, idx) => (
              <button
                key={v.id}
                id={`btn-vista-${v.id.toLowerCase()}`}
                role="tab"
                aria-selected={vista === v.id}
                data-activa={vista === v.id}
                type="button"
                onClick={() => setVista(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (idx < VISTAS.length - 1) {
                      enfocar(`btn-vista-${VISTAS[idx + 1].id.toLowerCase()}`);
                    } else {
                      enfocar('btn-nuevo-trabajo');
                    }
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (idx > 0) {
                      enfocar(`btn-vista-${VISTAS[idx - 1].id.toLowerCase()}`);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    enfocar('buscador-agenda');
                  }
                }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer border-l-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
                  vista === v.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* CUADROS DE CONTEO SUBIDOS (Total Trabajos, Pendientes, Volver a ir, Completados) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full md:w-auto">
            <div className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 flex items-center justify-between gap-2 min-w-[85px] lg:min-w-[95px]">
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--color-muted)] block tracking-wider">
                  Total
                </span>
                <span className="text-base font-black text-[var(--color-ink)] leading-tight">
                  {metricas.total}
                </span>
              </div>
            </div>

            <div className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 flex items-center justify-between gap-2 min-w-[95px] lg:min-w-[105px]">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-700 block tracking-wider flex items-center gap-1">
                  <Clock size={10} /> Pendientes
                </span>
                <span className="text-base font-black text-amber-900 leading-tight">
                  {metricas.pendientes}
                </span>
              </div>
            </div>

            <div className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 flex items-center justify-between gap-2 min-w-[95px] lg:min-w-[105px]">
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-700 block tracking-wider flex items-center gap-1">
                  <RotateCcw size={10} /> Volver a ir
                </span>
                <span className="text-base font-black text-blue-900 leading-tight">
                  {metricas.seguimiento}
                </span>
              </div>
            </div>

            <div className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 flex items-center justify-between gap-2 min-w-[95px] lg:min-w-[105px]">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-700 block tracking-wider flex items-center gap-1">
                  <CheckCircle size={10} /> Completados
                </span>
                <span className="text-base font-black text-emerald-900 leading-tight">
                  {metricas.completados}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Acción a la Derecha */}
        <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">
          <button
            id="btn-nuevo-trabajo"
            type="button"
            onClick={onNuevoTrabajo}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                enfocar(`btn-vista-${VISTAS[VISTAS.length - 1].id.toLowerCase()}`);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                enfocar('input-fecha-agenda');
              }
            }}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none flex-1 sm:flex-initial"
          >
            <Plus size={16} /> Nuevo trabajo
          </button>
        </div>
      </div>

      {/* SUB-BARRA: BUSCADOR Y FILTRO A LA IZQUIERDA, NAVEGACIÓN DE FECHA A LA DERECHA */}
      <div className="px-3 sm:px-4 lg:px-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* IZQUIERDA: Buscador Sobrio y Filtro de Estado */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="buscador-sobrio flex-1 max-w-md">
            <div className="buscador-sobrio__icono"><Search size={16} /></div>
            <input
              id="buscador-agenda"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  const inp = e.currentTarget;
                  if (inp.selectionStart === inp.value.length) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (busqueda) {
                      enfocar('btn-borrar-buscador-agenda');
                    } else {
                      enfocar('filtro-estado-agenda');
                    }
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusPestanaArriba();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusTrabajoAbajo();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setBusqueda('');
                }
              }}
              placeholder="BUSCAR TRABAJO, CLIENTE..."
            />
            {busqueda && (
              <div className="buscador-sobrio__match">
                <button
                  id="btn-borrar-buscador-agenda"
                  type="button"
                  className="buscador-sobrio__borrar"
                  onClick={() => {
                    setBusqueda('');
                    enfocar('buscador-agenda');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setBusqueda('');
                      enfocar('buscador-agenda');
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      e.stopPropagation();
                      const inp = document.getElementById('buscador-agenda') as HTMLInputElement | null;
                      if (inp) {
                        inp.focus();
                        inp.setSelectionRange(inp.value.length, inp.value.length);
                      }
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      e.stopPropagation();
                      enfocar('filtro-estado-agenda');
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                      focusPestanaArriba();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      e.stopPropagation();
                      focusTrabajoAbajo();
                    }
                  }}
                  title="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <select
            id="filtro-estado-agenda"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoTrabajo | 'TODOS')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (busqueda) {
                  enfocar('btn-borrar-buscador-agenda');
                } else {
                  enfocar('buscador-agenda');
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                enfocar('btn-fecha-anterior');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                focusPestanaArriba();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusTrabajoAbajo();
              }
            }}
            className="filtro-sobrio shrink-0"
          >
            <option value="TODOS">TODOS LOS ESTADOS</option>
            <option value="PENDIENTE">PENDIENTES</option>
            <option value="SEGUIMIENTO">VOLVER A IR (SEGUIMIENTO)</option>
            <option value="COMPLETADO">COMPLETADOS</option>
            <option value="CANCELADO">CANCELADOS</option>
          </select>
        </div>

        {/* DERECHA: Navegación temporal de fechas y cambio de fecha */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
          <button
            id="btn-fecha-anterior"
            type="button"
            onClick={onAnterior}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                enfocar('filtro-estado-agenda');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                enfocar('btn-fecha-hoy');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                enfocar('btn-nuevo-trabajo');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusTrabajoAbajo();
              }
            }}
            title="Período anterior"
            aria-label="Período anterior"
            className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-ink)] cursor-pointer rounded-none focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            id="btn-fecha-hoy"
            type="button"
            onClick={onHoy}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                enfocar('btn-fecha-anterior');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                enfocar('btn-fecha-siguiente');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                enfocar('btn-nuevo-trabajo');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusTrabajoAbajo();
              }
            }}
            className="px-3 py-2 text-xs font-black uppercase tracking-widest border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-ink)] cursor-pointer rounded-none focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]"
          >
            Hoy
          </button>

          <button
            id="btn-fecha-siguiente"
            type="button"
            onClick={onSiguiente}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                enfocar('btn-fecha-hoy');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                enfocar('input-fecha-agenda');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                enfocar('btn-nuevo-trabajo');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusTrabajoAbajo();
              }
            }}
            title="Período siguiente"
            aria-label="Período siguiente"
            className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-ink)] cursor-pointer rounded-none focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]"
          >
            <ChevronRight size={16} />
          </button>

          <span className="text-xs font-black uppercase text-[var(--color-ink)] ml-1 sm:ml-2 whitespace-nowrap">
            {tituloRango}
          </span>

          <input
            id="input-fecha-agenda"
            type="date"
            value={fechaActual}
            onChange={(e) => {
              if (e.target.value) {
                setFechaActual(e.target.value);
                // Regla del dueño: al escoger la fecha, el selector se queda en el calendario
                setTimeout(() => enfocar('input-fecha-agenda'), 50);
              }
            }}
            onClick={(e) => {
              try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
                return;
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                enfocar('btn-fecha-siguiente');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                enfocar('btn-nuevo-trabajo');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusTrabajoAbajo();
              }
            }}
            className="ml-1 sm:ml-2 text-xs border border-[var(--color-border)] px-2 py-1.5 bg-[var(--color-surface)] font-mono text-[var(--color-ink)] font-bold rounded-none cursor-pointer outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]"
          />
        </div>
      </div>
    </div>
  );
};
