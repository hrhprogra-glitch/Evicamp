// src/sections/Graficos/components/TabTecnicos.tsx
// Productividad por técnico en estilo SiuMax Sobrio

import React from 'react';
import { Users } from 'lucide-react';
import type { ItemTecnico } from './types';

interface TabTecnicosProps {
  tecnicos: ItemTecnico[];
  busqueda?: string;
}

// Filas: ↑ ↓ se mueven entre filas; ↑ desde la primera sube al buscador de la cabecera (Nego 3h)
const teclaFila = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
    if (ant) ant.focus(); else (document.querySelector('[id^="buscador-reporte-"]') as HTMLElement | null)?.focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
};

export const TabTecnicos: React.FC<TabTecnicosProps> = ({ tecnicos, busqueda = '' }) => {
  const tecnicosFiltrados = tecnicos.filter((t) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      (t.nombre || '').toLowerCase().includes(q) ||
      (t.cargo || '').toLowerCase().includes(q)
    );
  });

  // Ordenar por trabajos completados
  const tecnicosOrdenados = [...tecnicosFiltrados].sort(
    (a, b) => b.trabajosCompletados + b.visitasRealizadas - (a.trabajosCompletados + a.visitasRealizadas)
  );

  const maxCompletados = Math.max(
    ...tecnicos.map((t) => t.trabajosCompletados + t.visitasRealizadas),
    1
  );

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Gráfico Comparativo de Trabajos Completados */}
      {tecnicosOrdenados.length > 0 && (
        <div className="tarjeta-sobria p-4 bg-[var(--color-surface)] border-2 border-[var(--color-ink)]">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={16} className="text-[var(--color-info)]" />
              Productividad Técnica (Trabajos y Visitas Ejecutadas)
            </span>
            <span className="text-[10px] text-[var(--color-muted)] font-black uppercase">
              Total completados
            </span>
          </div>

          <div className="space-y-3">
            {tecnicosOrdenados.map((t) => {
              const totalAtendidos = t.trabajosCompletados + t.visitasRealizadas;
              const ancho = Math.min(100, Math.max(6, (totalAtendidos / maxCompletados) * 100));

              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[var(--color-ink)]">
                      {t.nombre}{' '}
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        ({t.cargo || 'Técnico'})
                      </span>
                    </span>
                    <span className="font-mono font-black text-[var(--color-info)]">
                      {totalAtendidos} atendidos{' '}
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        ({t.trabajosCompletados} agenda, {t.visitasRealizadas} visitas)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-border)] h-2.5 overflow-hidden">
                    <div
                      className="bg-[var(--color-accent)] h-full transition-all duration-500"
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla Detallada por Técnico */}
      <div className="tabla-marco overflow-x-auto">
        {tecnicosOrdenados.length === 0 ? (
          <div className="vacio-sobrio">
            <Users size={32} />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">
              No se encontraron registros de técnicos activos en el período
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="tabla-cabecera">
              <tr>
                <th className="whitespace-nowrap p-4">Técnico / Trabajador</th>
                <th className="whitespace-nowrap p-4">Especialidad / Cargo</th>
                <th className="whitespace-nowrap p-4 text-center">Asignados Agenda</th>
                <th className="whitespace-nowrap p-4 text-center">Completados</th>
                <th className="whitespace-nowrap p-4 text-center">En Seguimiento</th>
                <th className="whitespace-nowrap p-4 text-center">Salidas a Obras</th>
                <th className="whitespace-nowrap p-4 text-center">Visitas Contratos</th>
                <th className="whitespace-nowrap p-4 text-right">Efectividad</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]">
              {tecnicosOrdenados.map((t) => (
                <tr key={t.id} data-fila-grafico="true" tabIndex={0} onKeyDown={teclaFila} className="tabla-fila h-[79px] cursor-pointer">
                  <td className="p-4 font-black whitespace-nowrap">
                    {t.nombre}
                  </td>
                  <td className="p-4 text-[var(--color-muted)] font-bold whitespace-nowrap">
                    {t.cargo || 'Técnico de Servicios'}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-[var(--color-muted)]">
                    {t.trabajosAsignados}
                  </td>
                  <td className="p-4 text-center font-mono font-black text-[var(--color-success)]">
                    {t.trabajosCompletados}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-[var(--color-warning-dark)]">
                    {t.trabajosSeguimiento}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-[var(--color-muted)]">
                    {t.salidasParticipadas}
                  </td>
                  <td className="p-4 text-center font-mono font-black text-[var(--color-accent-shadow)]">
                    {t.visitasRealizadas}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span
                      className={`font-mono font-black px-2 py-0.5 text-[10px] border uppercase ${
                        t.eficiencia >= 80
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : t.eficiencia >= 50
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]'
                      }`}
                    >
                      {t.eficiencia.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
