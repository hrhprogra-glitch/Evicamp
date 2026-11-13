import React, { useState } from 'react';
import { Eye, Edit3, Repeat, Calendar, DollarSign } from 'lucide-react';
import type { Contrato } from '../types';

interface TablaContratosProps {
  contratos: Contrato[];
  onVerDetalle: (contrato: Contrato) => void;
  onEditar: (contrato: Contrato) => void;
}

export const TablaContratos: React.FC<TablaContratosProps> = ({
  contratos,
  onVerDetalle,
  onEditar,
}) => {
  const [filaSeleccionada, setFilaSeleccionada] = useState<number>(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number, contrato: Contrato) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(contratos.length - 1, index + 1);
      setFilaSeleccionada(next);
      document.getElementById(`fila-contrato-${next}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, index - 1);
      setFilaSeleccionada(prev);
      document.getElementById(`fila-contrato-${prev}`)?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onVerDetalle(contrato);
    }
  };

  if (contratos.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] font-mono bg-[var(--color-surface)]">
        <Repeat size={36} className="mx-auto mb-3 text-[var(--color-muted)]" />
        <p className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">No hay contratos registrados</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Crea un contrato recurrente (semanal, quincenal, mensual) para generar visitas y cobros periódicos automáticos.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
      <table className="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase text-[10px] tracking-wider font-black">
            <th className="py-2.5 px-3">Código</th>
            <th className="py-2.5 px-3">Título / Bien Atendido</th>
            <th className="py-2.5 px-3">Cliente</th>
            <th className="py-2.5 px-3">Frecuencia / Cobro</th>
            <th className="py-2.5 px-3 text-right">Precio Período</th>
            <th className="py-2.5 px-3">Técnico</th>
            <th className="py-2.5 px-3 text-center">Estado</th>
            <th className="py-2.5 px-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {contratos.map((c, idx) => (
            <tr
              key={c.id}
              id={`fila-contrato-${idx}`}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, idx, c)}
              onClick={() => onVerDetalle(c)}
              className="hover:bg-[var(--color-bg)] focus:bg-[var(--color-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)] cursor-pointer transition-colors"
            >
              <td className="py-2.5 px-3 font-bold text-[var(--color-ink)] whitespace-nowrap">
                <span className="px-1.5 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] font-black text-[11px]">
                  {c.codigo}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <div className="font-bold text-[var(--color-ink)]">{c.titulo}</div>
                {c.bien && (
                  <div className="text-[10px] text-[var(--color-muted)]">
                    {c.bien.nombre} ({c.bien.tipo})
                  </div>
                )}
              </td>
              <td className="py-2.5 px-3">
                <div className="font-bold text-[var(--color-ink)]">{c.customer?.name || 'Cliente'}</div>
                {c.customer?.telefono && (
                  <div className="text-[10px] text-[var(--color-muted)]">{c.customer.telefono}</div>
                )}
              </td>
              <td className="py-2.5 px-3">
                <div className="font-bold text-[var(--color-ink)]">{c.frecuencia}</div>
                <div className="text-[10px] text-[var(--color-muted)]">Cobro día {c.dia_cobro}</div>
              </td>
              <td className="py-2.5 px-3 text-right font-black text-sm text-[var(--color-ink)] whitespace-nowrap">
                S/ {Number(c.precio_periodo).toFixed(2)}
              </td>
              <td className="py-2.5 px-3 text-[var(--color-ink)] whitespace-nowrap">
                {c.tecnico?.nombre || <span className="text-[var(--color-muted)]">Sin asignar</span>}
              </td>
              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                    c.estado === 'ACTIVO'
                      ? 'bg-green-100 text-green-900 border-green-400'
                      : 'bg-yellow-100 text-yellow-900 border-yellow-400'
                  }`}
                >
                  {c.estado}
                </span>
              </td>
              <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    id={`btn-ver-contrato-${c.id}`}
                    onClick={() => onVerDetalle(c)}
                    title="Ver detalles, visitas y cobros"
                    className="p-1 border border-[var(--color-border)] hover:border-[var(--color-ink)] text-[var(--color-ink)] transition-colors"
                  >
                    <Eye size={14} />
                  </button>

                  <button
                    id={`btn-editar-contrato-${c.id}`}
                    onClick={() => onEditar(c)}
                    title="Editar contrato"
                    className="p-1 border border-[var(--color-border)] hover:border-[var(--color-ink)] text-[var(--color-ink)] transition-colors"
                  >
                    <Edit3 size={14} />
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
