import React from 'react';
import { Car, Wrench, History, Edit2, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { Vehiculo } from './types';

interface TablaVehiculosProps {
  vehiculos: Vehiculo[];
  onMantenimiento: (v: Vehiculo) => void;
  onHistorial: (v: Vehiculo) => void;
  onEditar: (v: Vehiculo) => void;
  onEliminar: (v: Vehiculo) => void;
}

export const TablaVehiculos: React.FC<TablaVehiculosProps> = ({
  vehiculos,
  onMantenimiento,
  onHistorial,
  onEditar,
  onEliminar,
}) => {
  const handleKeyDownRow = (e: React.KeyboardEvent, index: number, v: Vehiculo) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = document.getElementById(`fila-veh-${index + 1}`);
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
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

  const getBadgeVencimiento = (fechaStr?: string | null) => {
    if (!fechaStr) {
      return (
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300">
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
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300">
          {fechaStr}
        </span>
      );
    }

    if (diffDias < 0) {
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 text-red-900 border border-red-600">
            <AlertTriangle size={11} /> Vencido ({Math.abs(diffDias)}d)
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5">{fechaStr}</span>
        </div>
      );
    } else if (diffDias <= 30) {
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-600">
            <Clock size={11} /> Vence en {diffDias}d
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5">{fechaStr}</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-600">
            <CheckCircle2 size={11} /> Vigente ({diffDias}d)
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5">{fechaStr}</span>
        </div>
      );
    }
  };

  if (vehiculos.length === 0) {
    return (
      <div className="p-8 border border-[var(--color-border)] bg-[var(--color-surface)] text-center font-mono">
        <Car size={32} className="mx-auto mb-2 text-neutral-400" />
        <p className="font-bold text-sm">No se encontraron vehículos registrados.</p>
        <p className="text-xs text-neutral-500 mt-1">Usa el botón "+ Nuevo Vehículo" para registrar uno.</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto font-mono text-xs">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[var(--color-surface)] border-b-2 border-[var(--color-ink)] font-black uppercase text-[11px] tracking-wider">
          <tr>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Placa</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Vehículo</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Kilometraje</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">SOAT</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Rev. Técnica</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Conductor</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)] text-center">Estado</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-[var(--color-ink)]">
          {vehiculos.map((v, idx) => (
            <tr
              key={v.id}
              id={`fila-veh-${idx}`}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDownRow(e, idx, v)}
              className="hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-amber-100/50 dark:focus:bg-amber-950/40 focus:outline-none transition-colors"
            >
              <td className="p-3 border-r-2 border-[var(--color-ink)]">
                <span className="font-black text-sm uppercase px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-ink)]">
                  {v.placa}
                </span>
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)]">
                <div className="font-black text-sm">
                  {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {[v.anio ? `Año: ${v.anio}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(' · ')}
                </div>
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)] font-bold text-sm">
                {Number(v.kilometraje || 0).toLocaleString()} km
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)]">
                {getBadgeVencimiento(v.vencimiento_soat)}
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)]">
                {getBadgeVencimiento(v.vencimiento_revision_tecnica)}
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)] font-bold">
                {v.trabajador_asignado_nombre || <span className="text-neutral-400">Sin asignar</span>}
              </td>
              <td className="p-3 border-r-2 border-[var(--color-ink)] text-center">
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border ${
                    v.estado === 'OPERATIVO'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-600'
                      : v.estado === 'EN_TALLER'
                      ? 'bg-amber-100 text-amber-900 border-amber-600'
                      : 'bg-red-100 text-red-900 border-red-600'
                  }`}
                >
                  {v.estado}
                </span>
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    id={`btn-mant-veh-${v.id}`}
                    onClick={() => onMantenimiento(v)}
                    title="Registrar mantenimiento"
                    className="p-1.5 bg-amber-600 text-white border border-[var(--color-ink)] hover:bg-amber-700 cursor-pointer"
                  >
                    <Wrench size={14} />
                  </button>
                  <button
                    id={`btn-hist-mant-${v.id}`}
                    onClick={() => onHistorial(v)}
                    title="Historial de mantenimientos"
                    className="p-1.5 bg-neutral-200 dark:bg-neutral-800 text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-neutral-300 cursor-pointer"
                  >
                    <History size={14} />
                  </button>
                  <button
                    id={`btn-editar-veh-${v.id}`}
                    onClick={() => onEditar(v)}
                    title="Editar vehículo"
                    className="p-1.5 bg-neutral-200 dark:bg-neutral-800 text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-neutral-300 cursor-pointer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    id={`btn-eliminar-veh-${v.id}`}
                    onClick={() => onEliminar(v)}
                    title="Eliminar vehículo"
                    className="p-1.5 bg-red-100 text-red-700 border border-red-400 hover:bg-red-200 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
