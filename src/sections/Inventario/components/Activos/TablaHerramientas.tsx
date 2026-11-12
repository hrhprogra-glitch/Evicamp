import React from 'react';
import { Wrench, HandHelping, History, Edit2, Trash2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Herramienta } from './types';

interface TablaHerramientasProps {
  herramientas: Herramienta[];
  onPrestar: (h: Herramienta) => void;
  onHistorial: (h: Herramienta) => void;
  onEditar: (h: Herramienta) => void;
  onEliminar: (h: Herramienta) => void;
}

export const TablaHerramientas: React.FC<TablaHerramientasProps> = ({
  herramientas,
  onPrestar,
  onHistorial,
  onEditar,
  onEliminar,
}) => {
  const handleKeyDownRow = (e: React.KeyboardEvent, index: number, h: Herramienta) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = document.getElementById(`fila-herr-${index + 1}`);
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        document.getElementById('buscador-activos')?.focus();
      } else {
        const prev = document.getElementById(`fila-herr-${index - 1}`);
        if (prev) prev.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onEditar(h);
    }
  };

  if (herramientas.length === 0) {
    return (
      <div className="p-8 border border-[var(--color-border)] bg-[var(--color-surface)] text-center font-mono">
        <Wrench size={32} className="mx-auto mb-2 text-neutral-400" />
        <p className="font-bold text-sm">No se encontraron herramientas registradas.</p>
        <p className="text-xs text-neutral-500 mt-1">Usa el botón "+ Nueva Herramienta" para registrar una.</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto font-mono text-xs">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[var(--color-surface)] border-b-2 border-[var(--color-ink)] font-black uppercase text-[11px] tracking-wider">
          <tr>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Código</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Nombre y Marca</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)]">Categoría</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)] text-center">Total</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)] text-center">En Uso</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)] text-center">Disponibles</th>
            <th className="p-3 border-r-2 border-[var(--color-ink)] text-center">Estado</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-[var(--color-ink)]">
          {herramientas.map((h, idx) => {
            const disponibles = Math.max(0, h.cantidad_total - h.cantidad_en_uso);
            return (
              <tr
                key={h.id}
                id={`fila-herr-${idx}`}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDownRow(e, idx, h)}
                className="hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 focus:bg-amber-100/50 dark:focus:bg-amber-950/40 focus:outline-none transition-colors"
              >
                <td className="p-3 border-r-2 border-[var(--color-ink)] font-bold">
                  {h.codigo || <span className="text-neutral-400">—</span>}
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)]">
                  <div className="font-black text-sm">{h.nombre}</div>
                  <div className="text-[11px] text-neutral-500">
                    {[h.marca, h.modelo, h.serie ? `S/N: ${h.serie}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </div>
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)] font-bold uppercase">
                  {h.categoria}
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)] text-center font-bold">
                  {h.cantidad_total}
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)] text-center font-bold text-amber-600">
                  {h.cantidad_en_uso}
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)] text-center font-black text-emerald-600 text-sm">
                  {disponibles}
                </td>
                <td className="p-3 border-r-2 border-[var(--color-ink)] text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase border ${
                      h.estado === 'OPERATIVO'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-600'
                        : h.estado === 'EN_MANTENIMIENTO'
                        ? 'bg-amber-100 text-amber-900 border-amber-600'
                        : 'bg-red-100 text-red-900 border-red-600'
                    }`}
                  >
                    {h.estado === 'OPERATIVO' && <CheckCircle2 size={11} />}
                    {h.estado === 'EN_MANTENIMIENTO' && <AlertTriangle size={11} />}
                    {h.estado === 'DE_BAJA' && <XCircle size={11} />}
                    {h.estado}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      id={`btn-prestar-herr-${h.id}`}
                      onClick={() => onPrestar(h)}
                      disabled={disponibles <= 0}
                      title="Prestar a trabajador"
                      className="p-1.5 bg-blue-600 text-white border border-[var(--color-ink)] hover:bg-blue-700 disabled:opacity-30 cursor-pointer"
                    >
                      <HandHelping size={14} />
                    </button>
                    <button
                      id={`btn-historial-herr-${h.id}`}
                      onClick={() => onHistorial(h)}
                      title="Historial de préstamos"
                      className="p-1.5 bg-neutral-200 dark:bg-neutral-800 text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-neutral-300 cursor-pointer"
                    >
                      <History size={14} />
                    </button>
                    <button
                      id={`btn-editar-herr-${h.id}`}
                      onClick={() => onEditar(h)}
                      title="Editar herramienta"
                      className="p-1.5 bg-neutral-200 dark:bg-neutral-800 text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-neutral-300 cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      id={`btn-eliminar-herr-${h.id}`}
                      onClick={() => onEliminar(h)}
                      title="Eliminar herramienta"
                      className="p-1.5 bg-red-100 text-red-700 border border-red-400 hover:bg-red-200 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
