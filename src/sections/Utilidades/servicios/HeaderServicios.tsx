// Cabecera de Utilidades de Talleres y servicios (SiuMax Nego, paso 3h; base: HeaderGraficos de SiuMax Servic).
// Mismo título que la vista Productos y las mismas pestañas (PestanasUtilidades) para no perderse.
// Título, pestañas y botón Imprimir arriba; 4 tarjetas KPI; y debajo una sola fila con buscador, filtro y fecha/período.

import React from 'react';
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Printer,
  Layers,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import type { PeriodoFiltro, MetricasGlobales, PestanaServicios } from './types';
import { PestanasUtilidades, type PestanaUtilidades } from '../PestanasUtilidades';
import { formatearMonto } from '../../../utils/formato';

interface HeaderServiciosProps {
  tabActiva: PestanaServicios;
  onCambiarPestana: (tab: PestanaUtilidades) => void;
  conComercio: boolean;
  periodo: PeriodoFiltro;
  setPeriodo: (p: PeriodoFiltro) => void;
  fechaDesde: string;
  setFechaDesde: (f: string) => void;
  fechaHasta: string;
  setFechaHasta: (f: string) => void;
  metricas: MetricasGlobales;
  onImprimir: () => void;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroTipo: string;
  onFiltroTipoChange: (val: string) => void;
}


export const HeaderServicios: React.FC<HeaderServiciosProps> = ({
  tabActiva,
  onCambiarPestana,
  conComercio,
  periodo,
  setPeriodo,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  metricas,
  onImprimir,
  busqueda,
  onBusquedaChange,
  filtroTipo,
  onFiltroTipoChange,
}) => {
  const idBuscador =
    tabActiva === 'rentabilidad'
      ? 'buscador-reporte-rentabilidad'
      : tabActiva === 'tecnicos'
      ? 'buscador-reporte-tecnicos'
      : tabActiva === 'materiales'
      ? 'buscador-reporte-materiales'
      : 'buscador-reporte-cobranzas';

  const placeholderBuscador =
    tabActiva === 'rentabilidad'
      ? 'BUSCAR POR CÓDIGO, SERVICIO O CLIENTE...'
      : tabActiva === 'tecnicos'
      ? 'BUSCAR TÉCNICO, TRABAJADOR O ESPECIALIDAD...'
      : tabActiva === 'materiales'
      ? 'BUSCAR MATERIAL O REPUESTO CONSUMIDO...'
      : 'BUSCAR CÓDIGO DE COTIZACIÓN, CONTRATO O CLIENTE...';

  const tieneFiltroTipo = tabActiva === 'rentabilidad' || tabActiva === 'cobranzas';

  const enfocar = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  };

  const bajarAContenido = () => {
    const fila = document.querySelector('[data-fila-grafico="true"], tbody tr') as HTMLElement | null;
    if (fila) fila.focus();
  };

  const subirACabecera = () => {
    enfocar(`btn-tab-util-${tabActiva}`);
  };

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* CABECERA (como Inventario y Clientes): título, pestañas sobrias y botón a la derecha */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 min-w-0 max-w-full">
          {/* Título de la Sección */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
              <TrendingUp size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Inteligencia de Negocio
            </h1>
          </div>

          <PestanasUtilidades activa={tabActiva} conComercio={conComercio} conServicios onCambiar={onCambiarPestana} idDerecha="btn-imprimir-graficos" idAbajo={idBuscador} />
        </div>

        {/* Botón de Acción a la Derecha */}
        <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">
          <button
            id="btn-imprimir-graficos"
            type="button"
            onClick={onImprimir}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                enfocar('btn-tab-util-cobranzas');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                enfocar(idBuscador);
              }
            }}
            style={{ '--icono': 'var(--color-ink)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none flex-1 sm:flex-initial"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* SUB-BARRA: Tarjetas Métricas + Fila Única (Buscador, Filtro y Fecha/Período) */}
      <div className="px-3 sm:px-4 lg:px-6 flex flex-col gap-4">
        {/* Tarjetas Métricas Sobrias */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Ingresos Generados */}
          <div className="tarjeta-sobria p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] flex items-center justify-between">
              <span>Ingresos Generados</span>
              <DollarSign size={14} className="text-[var(--color-success)]" />
            </span>
            <div className="text-xl font-black text-[var(--color-ink)] font-mono mt-1">
              S/ {formatearMonto(metricas.ingresosTotales)}
            </div>
            <span className="text-[9px] text-[var(--color-muted)] font-bold mt-0.5">
              Servicios, taller y contratos
            </span>
          </div>

          {/* Costo de Materiales */}
          <div className="tarjeta-sobria p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--color-danger)] flex items-center justify-between">
              <span>Costo Materiales</span>
              <Package size={14} className="text-[var(--color-danger)]" />
            </span>
            <div className="text-xl font-black text-[var(--color-danger)] font-mono mt-1">
              S/ {formatearMonto(metricas.costoMateriales)}
            </div>
            <span className="text-[9px] text-[var(--color-muted)] font-bold mt-0.5">
              Insumos y repuestos consumidos
            </span>
          </div>

          {/* Utilidad Bruta */}
          <div className="tarjeta-sobria p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--color-success)] flex items-center justify-between">
              <span>Utilidad Bruta</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-black">
                {metricas.margenPorcentaje.toFixed(1)}% MARGEN
              </span>
            </span>
            <div className="text-xl font-black text-[var(--color-success)] font-mono mt-1">
              S/ {formatearMonto(metricas.utilidadBruta)}
            </div>
            <span className="text-[9px] text-[var(--color-muted)] font-bold mt-0.5">
              Ingresos menos costos
            </span>
          </div>

          {/* Por Cobrar */}
          <div className="tarjeta-sobria p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--color-warning-dark)] flex items-center justify-between">
              <span>Por Cobrar</span>
              <AlertCircle size={14} className="text-[var(--color-warning-dark)]" />
            </span>
            <div className="text-xl font-black text-[var(--color-warning-dark)] font-mono mt-1">
              S/ {formatearMonto(metricas.cuentasPorCobrar)}
            </div>
            <span className="text-[9px] text-[var(--color-muted)] font-bold mt-0.5">
              Saldos pendientes de cobro
            </span>
          </div>
        </div>

        {/* FILA ÚNICA: Buscador + Filtro (si aplica) + Fecha/Período */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Buscador Sobrio */}
          <div className="buscador-sobrio flex-1 shrink-0">
            <div className="buscador-sobrio__icono"><Search size={18} /></div>
            <input
              id={idBuscador}
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              onKeyDown={(e) => {
                const input = e.currentTarget;
                if (e.key === 'ArrowRight' && (input.selectionEnd === input.value.length || !input.value)) {
                  e.preventDefault();
                  if (busqueda) enfocar('btn-borrar-buscador-graficos');
                  else if (tieneFiltroTipo) enfocar('filtro-tipo-graficos');
                  else enfocar('select-periodo-graficos');
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  subirACabecera();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  bajarAContenido();
                } else if (e.key === 'Escape' && busqueda) {
                  e.preventDefault();
                  onBusquedaChange('');
                }
              }}
              placeholder={placeholderBuscador}
            />
            {busqueda && (
              <div className="buscador-sobrio__match">
                <button
                  id="btn-borrar-buscador-graficos"
                  type="button"
                  className="buscador-sobrio__borrar"
                  onClick={() => {
                    onBusquedaChange('');
                    enfocar(idBuscador);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      onBusquedaChange('');
                      enfocar(idBuscador);
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      enfocar(idBuscador);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      if (tieneFiltroTipo) enfocar('filtro-tipo-graficos');
                      else enfocar('select-periodo-graficos');
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      subirACabecera();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      bajarAContenido();
                    }
                  }}
                  title="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Filtro por tipo (Rentabilidad o Cobranzas) */}
          {tieneFiltroTipo && (
            <select
              id="filtro-tipo-graficos"
              value={filtroTipo}
              onChange={(e) => onFiltroTipoChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  if (busqueda) enfocar('btn-borrar-buscador-graficos');
                  else enfocar(idBuscador);
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  enfocar('select-periodo-graficos');
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  subirACabecera();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  bajarAContenido();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try { e.currentTarget.showPicker(); } catch { /* sin lista */ }
                }
              }}
              className="filtro-sobrio w-full md:w-auto"
            >
              {tabActiva === 'rentabilidad' ? (
                <>
                  <option value="TODOS">TODOS LOS TIPOS</option>
                  <option value="SERVICIO">SERVICIOS OCASIONALES</option>
                  <option value="OBRA">OBRAS Y PROYECTOS</option>
                  <option value="CONTRATO">CONTRATOS PERIÓDICOS</option>
                  <option value="TALLER">TALLER</option>
                </>
              ) : (
                <>
                  <option value="TODOS">TODOS LOS SALDOS</option>
                  <option value="COTIZACION">SOLO COTIZACIONES</option>
                  <option value="CONTRATO">SOLO CUOTAS DE CONTRATOS</option>
                  <option value="TALLER">SOLO ÓRDENES DEL TALLER</option>
                </>
              )}
            </select>
          )}

          {/* Filtro de Fecha / Período al costado del filtro junto con el buscador */}
          <select
            id="select-periodo-graficos"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (tieneFiltroTipo) enfocar('filtro-tipo-graficos');
                else if (busqueda) enfocar('btn-borrar-buscador-graficos');
                else enfocar(idBuscador);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (periodo === 'personalizado') enfocar('input-fecha-desde-graficos');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                enfocar('btn-imprimir-graficos');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                bajarAContenido();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                try { e.currentTarget.showPicker(); } catch { /* sin lista */ }
              }
            }}
            className="filtro-sobrio w-full md:w-auto"
          >
            <option value="hoy">HOY</option>
            <option value="semana">ESTA SEMANA</option>
            <option value="mes">ESTE MES</option>
            <option value="anio">ESTE AÑO</option>
            <option value="personalizado">RANGO PERSONALIZADO</option>
          </select>

          {periodo === 'personalizado' && (
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <input
                id="input-fecha-desde-graficos"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    enfocar('select-periodo-graficos');
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    enfocar('input-fecha-hasta-graficos');
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    enfocar('btn-imprimir-graficos');
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    bajarAContenido();
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    try { e.currentTarget.showPicker(); } catch { /* sin picker */ }
                  }
                }}
                className="h-[42px] px-2.5 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] font-mono text-xs font-bold rounded-none outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              <span className="text-[var(--color-muted)] font-bold uppercase text-[10px]">hasta</span>
              <input
                id="input-fecha-hasta-graficos"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    enfocar('input-fecha-desde-graficos');
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    enfocar('btn-imprimir-graficos');
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    bajarAContenido();
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    try { e.currentTarget.showPicker(); } catch { /* sin picker */ }
                  }
                }}
                className="h-[42px] px-2.5 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] font-mono text-xs font-bold rounded-none outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
