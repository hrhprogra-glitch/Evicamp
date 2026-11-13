import React from 'react';
import { Plus } from 'lucide-react';
import type { Trabajo } from '../types';

interface DiaMes {
  fecha: string;
  numeroDia: number;
  esMesActual: boolean;
  esHoy: boolean;
}

interface VistaMesProps {
  trabajos: Trabajo[];
  diasMes: DiaMes[];
  onSeleccionarDia: (fecha: string) => void;
  onCrearEnFecha: (fecha: string) => void;
  onSeleccionarTrabajo: (t: Trabajo) => void;
}

const NOMBRES_DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export const VistaMes: React.FC<VistaMesProps> = ({
  trabajos,
  diasMes,
  onSeleccionarDia,
  onCrearEnFecha,
  onSeleccionarTrabajo,
}) => {
  return (
    <div className="flex flex-col border border-[var(--color-border)] bg-[var(--color-surface)] font-mono">
      {/* Cabecera de Días de la Semana */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        {NOMBRES_DIAS.map((dia) => (
          <div
            key={dia}
            className="p-2 text-center text-xs font-black uppercase tracking-wider text-[var(--color-ink)] border-r last:border-r-0 border-[var(--color-border)]"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Cuadrícula de Días */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {diasMes.map((d) => {
          const trabajosDelDia = trabajos.filter((t) => t.fecha === d.fecha);

          return (
            <div
              key={d.fecha}
              onClick={() => onSeleccionarDia(d.fecha)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSeleccionarDia(d.fecha);
                }
              }}
              className={`min-h-[95px] p-1.5 border-b border-r last:border-r-0 border-[var(--color-border)] flex flex-col justify-between transition-colors cursor-pointer group outline-none focus:ring-2 focus:ring-[var(--color-ink)] ${
                !d.esMesActual
                  ? 'bg-slate-50/60 text-slate-400'
                  : d.esHoy
                  ? 'bg-amber-50/40 text-[var(--color-ink)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-slate-50'
              }`}
            >
              {/* Encabezado del número de día */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono ${
                    d.esHoy
                      ? 'px-1.5 py-0.5 bg-[var(--color-accent)] text-white font-black'
                      : d.esMesActual
                      ? 'font-bold'
                      : 'font-normal'
                  }`}
                >
                  {d.numeroDia}
                </span>

                <button
                  type="button"
                  title={`Agendar en ${d.fecha}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCrearEnFecha(d.fecha);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-opacity"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Lista compacta de trabajos */}
              <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                {trabajosDelDia.slice(0, 3).map((t) => {
                  const colorPunto =
                    t.estado === 'COMPLETADO'
                      ? 'bg-emerald-500'
                      : t.estado === 'SEGUIMIENTO'
                      ? 'bg-blue-600'
                      : t.estado === 'CANCELADO'
                      ? 'bg-red-500'
                      : 'bg-amber-500';

                  return (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionarTrabajo(t);
                      }}
                      title={`${t.titulo} - ${t.estado}`}
                      className="flex items-center gap-1 px-1 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 truncate cursor-pointer"
                    >
                      <span className={`w-1.5 h-1.5 shrink-0 rounded-none ${colorPunto}`} />
                      <span className="truncate font-semibold text-[var(--color-ink)]">
                        {t.hora_inicio ? t.hora_inicio.slice(0, 5) : ''} {t.titulo}
                      </span>
                    </div>
                  );
                })}

                {trabajosDelDia.length > 3 && (
                  <span className="text-[9px] font-bold text-[var(--color-accent-dark)] self-start px-1">
                    +{trabajosDelDia.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
