import React from 'react';
import { Search, HandHelping, History, Edit2, Trash2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Herramienta } from './types';

interface TablaHerramientasProps {
  herramientas: Herramienta[];
  onPrestar: (h: Herramienta) => void;
  onHistorial: (h: Herramienta) => void;
  onEditar: (h: Herramienta) => void;
  onEliminar: (h: Herramienta) => void;
}

// Mismo molde que Inventario > Productos (SiuMax Sobrio): tabla-marco, cabecera oscura,
// filas en grid-cols-12 con p-3 md:p-4 y separador fino. Sin bordes gruesos ni sombras.
export const TablaHerramientas: React.FC<TablaHerramientasProps> = ({
  herramientas,
  onPrestar,
  onHistorial,
  onEditar,
  onEliminar,
}) => {
  const handleKeyDownRow = (e: React.KeyboardEvent, index: number, h: Herramienta) => {
    // Enter en un botón de la fila debe hacer solo la acción del botón, no abrir la edición.
    if (e.key === 'Enter' && e.target !== e.currentTarget) return;
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
      <div className="tabla-marco">
        <div className="vacio-sobrio">
          <Search size={32} />
          No se registran herramientas con esos parámetros.
        </div>
      </div>
    );
  }

  return (
    <div id="tabla-herramientas-activos" className="tabla-marco w-full overflow-x-auto custom-scrollbar">
      <div className="md:min-w-[960px]">
        <div className="tabla-cabecera hidden md:grid grid-cols-12 p-4 items-center">
          <div className="col-span-2">Código</div>
          <div className="col-span-3">Nombre y Marca</div>
          <div className="col-span-2">Categoría</div>
          <div className="col-span-1 text-center">Total</div>
          <div className="col-span-1 text-center">En Uso</div>
          <div className="col-span-1 text-center">Disponibles</div>
          <div className="col-span-1 text-center">Estado</div>
          <div className="col-span-1 text-center">Acciones</div>
        </div>

        <div>
          {herramientas.map((h, idx) => {
            const disponibles = Math.max(0, h.cantidad_total - h.cantidad_en_uso);
            const estadoClase =
              h.estado === 'OPERATIVO'
                ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]'
                : h.estado === 'EN_MANTENIMIENTO'
                ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]'
                : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]';

            return (
              <div
                key={h.id}
                id={`fila-herr-${idx}`}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDownRow(e, idx, h)}
                className="grid grid-cols-12 items-center min-h-[79px] p-3 md:p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] transition-colors"
              >
                {/* Código */}
                <div className="col-span-2 pr-2 min-w-0">
                  <span className="inline-block bg-[var(--color-bg-2)] px-2 py-1 border border-[var(--color-border)] text-sm font-black text-[var(--color-ink)] rounded-none truncate max-w-full" title={h.codigo || undefined}>
                    {h.codigo || '—'}
                  </span>
                </div>

                {/* Nombre y Marca */}
                <div className="col-span-3 pr-2 min-w-0 flex flex-col gap-1">
                  <p className="font-black text-sm uppercase text-[var(--color-ink)] leading-tight truncate" title={h.nombre}>
                    {h.nombre}
                  </p>
                  <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase truncate">
                    {[h.marca, h.modelo, h.serie ? `S/N: ${h.serie}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </span>
                </div>

                {/* Categoría */}
                <div className="col-span-2 pr-2 min-w-0">
                  <span className="inline-block text-[10px] font-black text-white bg-[var(--color-ink)] px-2 py-0.5 tracking-widest rounded-none uppercase truncate max-w-full">
                    {h.categoria}
                  </span>
                </div>

                {/* Total */}
                <div className="col-span-1 text-center font-bold text-sm text-[var(--color-ink)]">
                  {h.cantidad_total}
                </div>

                {/* En Uso */}
                <div className="col-span-1 text-center font-bold text-sm text-[var(--color-warning)]">
                  {h.cantidad_en_uso}
                </div>

                {/* Disponibles */}
                <div className="col-span-1 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 border font-black text-xs uppercase tracking-widest rounded-none ${
                    disponibles > 0
                      ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]'
                  }`}>
                    {disponibles}
                  </span>
                </div>

                {/* Estado */}
                <div className="col-span-1 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 border font-black text-[10px] uppercase tracking-widest rounded-none ${estadoClase}`}>
                    {h.estado === 'OPERATIVO' && <CheckCircle2 size={11} />}
                    {h.estado === 'EN_MANTENIMIENTO' && <AlertTriangle size={11} />}
                    {h.estado === 'DE_BAJA' && <XCircle size={11} />}
                    {h.estado}
                  </span>
                </div>

                {/* Acciones */}
                <div className="col-span-1 flex items-center justify-center gap-3">
                  <button
                    id={`btn-prestar-herr-${h.id}`}
                    onClick={(e) => { e.stopPropagation(); onPrestar(h); }}
                    disabled={disponibles <= 0}
                    title="Prestar a trabajador"
                    className="text-[#94A3B8] hover:text-[#3B82F6] focus:text-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] p-1 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    <HandHelping size={16} />
                  </button>
                  <button
                    id={`btn-historial-herr-${h.id}`}
                    onClick={(e) => { e.stopPropagation(); onHistorial(h); }}
                    title="Historial de préstamos"
                    className="text-[#94A3B8] hover:text-[var(--color-info)] focus:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 transition-colors cursor-pointer"
                  >
                    <History size={16} />
                  </button>
                  <button
                    id={`btn-editar-herr-${h.id}`}
                    onClick={(e) => { e.stopPropagation(); onEditar(h); }}
                    title="Editar herramienta"
                    className="text-[#94A3B8] hover:text-[var(--color-success)] focus:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-success)] p-1 transition-colors cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    id={`btn-eliminar-herr-${h.id}`}
                    onClick={(e) => { e.stopPropagation(); onEliminar(h); }}
                    title="Eliminar herramienta"
                    className="text-[#94A3B8] hover:text-red-500 focus:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
