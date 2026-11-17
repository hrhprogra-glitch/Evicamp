import React from 'react';
import { Search, Wrench, History, Edit2, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { PaginacionSobrio } from '../../../../components/PaginacionSobrio';
import type { Vehiculo } from './types';

interface TablaVehiculosProps {
  vehiculos: Vehiculo[];
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  onMantenimiento: (v: Vehiculo) => void;
  onHistorial: (v: Vehiculo) => void;
  onEditar: (v: Vehiculo) => void;
  onEliminar: (v: Vehiculo) => void;
}

// Mismo molde que Inventario > Productos (SiuMax Sobrio): tabla-marco, cabecera oscura,
// filas en grid-cols-12 con p-3 md:p-4 y separador fino. Sin bordes gruesos ni sombras.
export const TablaVehiculos: React.FC<TablaVehiculosProps> = ({
  vehiculos,
  pagina,
  totalPaginas,
  onCambiarPagina,
  onMantenimiento,
  onHistorial,
  onEditar,
  onEliminar,
}) => {
  const handleKeyDownRow = (e: React.KeyboardEvent, index: number, v: Vehiculo) => {
    // Enter en un botón de la fila debe hacer solo la acción del botón, no abrir la edición.
    if (e.key === 'Enter' && e.target !== e.currentTarget) return;
    if (e.key === 'ArrowDown') {
      // El listener global de Inventario también mueve el foco con ↓; evitar que salte de dos en dos.
      e.preventDefault(); e.stopPropagation();
      if (index === vehiculos.length - 1) {
        document.getElementById('btn-pag-bottom-vehiculos-ant')?.focus();
      } else {
        const next = document.getElementById(`fila-veh-${index + 1}`);
        if (next) next.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      if (index === 0) {
        document.getElementById('buscador-activos')?.focus();
      } else {
        const prev = document.getElementById(`fila-veh-${index - 1}`);
        if (prev) prev.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onEditar(v);
    }
  };

  // Etiquetas con los mismos colores token que EtiquetaStock (Inventario).
  const getBadgeVencimiento = (fechaStr?: string | null) => {
    if (!fechaStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--color-border)] bg-[var(--color-bg-2)] text-[var(--color-muted)] font-black text-[10px] uppercase tracking-widest rounded-none">
          Sin registrar
        </span>
      );
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr + 'T00:00:00');
    const diffMs = fecha.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (isNaN(diffDias)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--color-border)] bg-[var(--color-bg-2)] text-[var(--color-muted)] font-black text-[10px] uppercase tracking-widest rounded-none">
          {fechaStr}
        </span>
      );
    }

    let clase = 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]';
    let icono: React.ReactNode = <CheckCircle2 size={11} />;
    let texto = `Vigente (${diffDias}d)`;

    if (diffDias < 0) {
      clase = 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]';
      icono = <AlertTriangle size={11} />;
      texto = `Vencido (${Math.abs(diffDias)}d)`;
    } else if (diffDias <= 30) {
      clase = 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]';
      icono = <Clock size={11} />;
      texto = `Vence en ${diffDias}d`;
    }

    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className={`inline-flex items-center gap-1 px-2 py-1 border font-black text-[10px] uppercase tracking-widest rounded-none ${clase}`}>
          {icono} {texto}
        </span>
        <span className="text-[10px] font-bold text-[var(--color-muted)] tracking-wider">{fechaStr}</span>
      </div>
    );
  };

  return (
    <div id="tabla-vehiculos-activos" className="tabla-marco w-full flex flex-col">
      <PaginacionSobrio
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="vehiculos"
        posicion="top"
        selectorFilas="#tabla-vehiculos-activos [data-row='true']"
        idBuscador="buscador-activos"
      />

      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="md:min-w-[960px]">
          <div className="tabla-cabecera hidden md:grid grid-cols-12 p-4 items-center">
            <div className="col-span-2">Placa</div>
            <div className="col-span-2">Vehículo</div>
            <div className="col-span-1">Kilometraje</div>
            <div className="col-span-2">SOAT</div>
            <div className="col-span-2">Rev. Técnica</div>
            <div className="col-span-1">Conductor</div>
            <div className="col-span-1 text-center">Estado</div>
            <div className="col-span-1 text-center">Acciones</div>
          </div>

          {vehiculos.length === 0 ? (
            <div className="vacio-sobrio">
              <Search size={32} />
              No se registran vehículos con esos parámetros.
            </div>
          ) : (
            <div>
              {vehiculos.map((v, idx) => {
                const estadoClase =
                  v.estado === 'OPERATIVO'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]'
                    : v.estado === 'EN_TALLER'
                    ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]'
                    : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]';

                return (
                  <div
                    key={v.id}
                    id={`fila-veh-${idx}`}
                    data-row="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDownRow(e, idx, v)}
                    onClick={() => onEditar(v)}
                    title="Presione Enter o haga clic para ver el detalle"
                    className="grid grid-cols-12 items-center min-h-[79px] p-3 md:p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] transition-colors cursor-pointer"
                  >
                    {/* Placa */}
                    <div className="col-span-2 pr-2 min-w-0">
                      <span className="inline-block bg-[var(--color-bg-2)] px-2 py-1 border border-[var(--color-border)] text-sm font-black text-[var(--color-ink)] uppercase rounded-none truncate max-w-full" title={v.placa}>
                        {v.placa}
                      </span>
                    </div>

                    {/* Vehículo */}
                    <div className="col-span-2 pr-2 min-w-0 flex flex-col gap-1">
                      <p className="font-black text-sm uppercase text-[var(--color-ink)] leading-tight truncate" title={[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}>
                        {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}
                      </p>
                      <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase truncate">
                        {[v.anio ? `Año: ${v.anio}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(' · ')}
                      </span>
                    </div>

                    {/* Kilometraje */}
                    <div className="col-span-1 text-center font-bold text-sm text-[var(--color-ink)] whitespace-nowrap">
                      {Number(v.kilometraje || 0).toLocaleString()} km
                    </div>

                    {/* SOAT */}
                    <div className="col-span-2 pr-2 min-w-0">
                      {getBadgeVencimiento(v.vencimiento_soat)}
                    </div>

                    {/* Rev. Técnica */}
                    <div className="col-span-2 pr-2 min-w-0">
                      {getBadgeVencimiento(v.vencimiento_revision_tecnica)}
                    </div>

                    {/* Conductor */}
                    <div className="col-span-1 pr-2 min-w-0 font-bold text-[var(--color-ink)] truncate">
                      {v.trabajador_asignado_nombre || <span className="text-[var(--color-muted)]">Sin asignar</span>}
                    </div>

                    {/* Estado */}
                    <div className="col-span-1 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 border font-black text-[10px] uppercase tracking-widest rounded-none ${estadoClase}`}>
                        {v.estado}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="col-span-1 flex items-center justify-center gap-3">
                      <button
                        id={`btn-mant-veh-${v.id}`}
                        onClick={(e) => { e.stopPropagation(); onMantenimiento(v); }}
                        title="Registrar mantenimiento"
                        className="text-[#94A3B8] hover:text-[var(--color-warning)] focus:text-[var(--color-warning)] focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)] p-1 transition-colors cursor-pointer"
                      >
                        <Wrench size={16} />
                      </button>
                      <button
                        id={`btn-hist-mant-${v.id}`}
                        onClick={(e) => { e.stopPropagation(); onHistorial(v); }}
                        title="Historial de mantenimientos"
                        className="text-[#94A3B8] hover:text-[var(--color-info)] focus:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 transition-colors cursor-pointer"
                      >
                        <History size={16} />
                      </button>
                      <button
                        id={`btn-editar-veh-${v.id}`}
                        onClick={(e) => { e.stopPropagation(); onEditar(v); }}
                        title="Editar vehículo"
                        className="text-[#94A3B8] hover:text-[var(--color-success)] focus:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-success)] p-1 transition-colors cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        id={`btn-eliminar-veh-${v.id}`}
                        onClick={(e) => { e.stopPropagation(); onEliminar(v); }}
                        title="Eliminar vehículo"
                        className="text-[#94A3B8] hover:text-red-500 focus:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PaginacionSobrio
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="vehiculos"
        posicion="bottom"
        selectorFilas="#tabla-vehiculos-activos [data-row='true']"
        idBuscador="buscador-activos"
      />
    </div>
  );
};
