import React, { useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { TarjetaTrabajo } from './TarjetaTrabajo';
import type { Trabajo } from '../types';

interface VistaDiaProps {
  trabajos: Trabajo[];
  fecha: string;
  onSeleccionarTrabajo: (t: Trabajo) => void;
  onNuevoTrabajo: () => void;
}

export const VistaDia: React.FC<VistaDiaProps> = ({
  trabajos,
  fecha,
  onSeleccionarTrabajo,
  onNuevoTrabajo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Manejo de flechas entre tarjetas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (!active || active.getAttribute('data-tarjeta-trabajo') !== 'true') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = active.nextElementSibling as HTMLElement | null;
        if (next && next.getAttribute('data-tarjeta-trabajo') === 'true') {
          next.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = active.previousElementSibling as HTMLElement | null;
        if (prev && prev.getAttribute('data-tarjeta-trabajo') === 'true') {
          prev.focus();
        } else {
          document.getElementById('buscador-agenda')?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 font-mono">
      {/* Lista de Trabajos */}
      {trabajos.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-[var(--color-border)] text-center bg-[var(--color-surface)] flex flex-col items-center justify-center gap-2">
          <Calendar size={28} className="text-[var(--color-muted)]" />
          <p className="text-xs font-black uppercase text-[var(--color-ink)]">
            No hay trabajos programados para este día
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Puedes agendar un nuevo trabajo con el botón superior o presionando abajo.
          </p>
          <button
            id="btn-programar-trabajo-vacio"
            type="button"
            onClick={onNuevoTrabajo}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('buscador-agenda')?.focus();
              }
            }}
            className="mt-2 px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-xs font-bold uppercase rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
          >
            + Programar Trabajo Ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trabajos.map((t) => (
            <TarjetaTrabajo
              key={t.id}
              trabajo={t}
              onClick={() => onSeleccionarTrabajo(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
