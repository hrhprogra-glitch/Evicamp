import React from 'react';
import { Calendar, CheckCircle, FlaskConical, Clock } from 'lucide-react';
import type { VisitaContrato } from '../types';

interface TablaVisitasProps {
  visitas: VisitaContrato[];
  onRegistrarConsumo: (visita: VisitaContrato) => void;
  onMarcarRealizada: (visitaId: number) => void;
}

export const TablaVisitas: React.FC<TablaVisitasProps> = ({
  visitas,
  onRegistrarConsumo,
  onMarcarRealizada,
}) => {
  if (visitas.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] font-mono bg-[var(--color-surface)]">
        <Calendar size={36} className="mx-auto mb-3 text-[var(--color-muted)]" />
        <p className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">No hay visitas programadas</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Las visitas se generan automáticamente desde la ficha de cada contrato para el mes correspondiente.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
      <table className="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase text-[10px] tracking-wider font-black">
            <th className="py-2.5 px-3">Fecha</th>
            <th className="py-2.5 px-3">Contrato / Cliente</th>
            <th className="py-2.5 px-3">Técnico</th>
            <th className="py-2.5 px-3">Insumos Consumidos</th>
            <th className="py-2.5 px-3 text-center">Estado</th>
            <th className="py-2.5 px-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {visitas.map((v) => (
            <tr key={v.id} className="hover:bg-[var(--color-bg)] transition-colors">
              <td className="py-2.5 px-3 font-bold text-[var(--color-ink)] whitespace-nowrap">
                {v.fecha_programada}
              </td>
              <td className="py-2.5 px-3">
                <div className="font-bold text-[var(--color-ink)]">
                  {v.contrato ? `${v.contrato.codigo} - ${v.contrato.titulo}` : 'Contrato'}
                </div>
                {v.contrato?.customer && (
                  <div className="text-[10px] text-[var(--color-muted)]">
                    Cliente: {v.contrato.customer.name}
                  </div>
                )}
              </td>
              <td className="py-2.5 px-3 text-[var(--color-ink)] whitespace-nowrap">
                {v.tecnico?.nombre || <span className="text-[var(--color-muted)]">Sin asignar</span>}
              </td>
              <td className="py-2.5 px-3">
                {v.consumos && v.consumos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {v.consumos.map((c) => (
                      <span key={c.id} className="px-1.5 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-bold">
                        {c.descripcion} ({c.cantidad} {c.unidad})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--color-muted)] text-[11px] italic">Ninguno</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                    v.estado === 'REALIZADO'
                      ? 'bg-green-100 text-green-900 border-green-400'
                      : v.estado === 'CANCELADO'
                      ? 'bg-red-100 text-red-900 border-red-400'
                      : 'bg-yellow-100 text-yellow-900 border-yellow-400'
                  }`}
                >
                  {v.estado}
                </span>
              </td>
              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    id={`btn-consumo-visita-${v.id}`}
                    onClick={() => onRegistrarConsumo(v)}
                    title="Registrar o agregar insumos usados"
                    className="h-7 px-2 border border-[var(--color-border)] hover:border-[var(--color-ink)] font-mono text-[11px] font-bold text-[var(--color-ink)] flex items-center gap-1 transition-colors"
                  >
                    <FlaskConical size={12} />
                    <span>Insumo</span>
                  </button>

                  {v.estado === 'PENDIENTE' && (
                    <button
                      id={`btn-realizar-visita-${v.id}`}
                      onClick={() => onMarcarRealizada(v.id)}
                      title="Marcar visita como realizada"
                      className="h-7 px-2 bg-green-700 text-white hover:bg-green-800 font-mono text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle size={12} />
                      <span>Listo</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
