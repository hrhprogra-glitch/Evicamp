import React from 'react';
import { Plus } from 'lucide-react';
import { TarjetaTrabajo } from './TarjetaTrabajo';
import type { Trabajo } from '../types';

interface VistaSemanaProps {
  trabajos: Trabajo[];
  diasSemana: { fecha: string; nombreDia: string; esHoy: boolean }[];
  onSeleccionarTrabajo: (t: Trabajo) => void;
  onCrearEnFecha: (fecha: string) => void;
}

export const VistaSemana: React.FC<VistaSemanaProps> = ({
  trabajos,
  diasSemana,
  onSeleccionarTrabajo,
  onCrearEnFecha,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2 font-mono min-h-[500px]">
      {diasSemana.map((d) => {
        const trabajosDelDia = trabajos.filter((t) => t.fecha === d.fecha);

        return (
          <div
            key={d.fecha}
            className={`flex flex-col border ${
              d.esHoy
                ? 'border-[var(--color-accent)] bg-amber-50/20'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            {/* Cabecera del día */}
            <div
              className={`p-2 border-b flex items-center justify-between ${
                d.esHoy
                  ? 'bg-[var(--color-accent)] text-white font-black'
                  : 'bg-[var(--color-bg)] text-[var(--color-ink)] border-[var(--color-border)] font-bold'
              }`}
            >
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-wider">{d.nombreDia}</span>
                <span className="text-xs font-black">{d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}</span>
              </div>

              <div className="flex items-center gap-1">
                {trabajosDelDia.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 font-black ${
                      d.esHoy ? 'bg-white text-[var(--color-accent-dark)]' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {trabajosDelDia.length}
                  </span>
                )}
                <button
                  type="button"
                  title={`Programar trabajo el ${d.fecha}`}
                  onClick={() => onCrearEnFecha(d.fecha)}
                  className={`p-0.5 cursor-pointer rounded-none hover:scale-110 ${
                    d.esHoy ? 'text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Lista de trabajos del día */}
            <div className="p-1.5 flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[600px]">
              {trabajosDelDia.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-3 text-center text-[10px] text-[var(--color-muted)] border border-dashed border-slate-200 min-h-[80px]">
                  <span>Sin trabajos</span>
                </div>
              ) : (
                trabajosDelDia.map((t) => (
                  <TarjetaTrabajo
                    key={t.id}
                    trabajo={t}
                    onClick={() => onSeleccionarTrabajo(t)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
