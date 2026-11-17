// src/sections/Utilidades/components/TablaRanking.tsx
import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { formatearMonto } from '../../../utils/formato';
import { ModalDetalleFila } from '../../../components/ModalDetalleFila';

interface Props {
  titulo: string;
  items: { nombre: string; cantidad: number; total: number }[];
  color?: string; // Se mantiene por compatibilidad pero el render usará nuestro estándar visual
}

export const TablaRanking: React.FC<Props> = ({ titulo, items }) => {
  const maxTotal = Math.max(...items.map(i => i.total), 1);
  const [detalle, setDetalle] = useState<{ nombre: string; cantidad: number; total: number; puesto: number } | null>(null);

  return (
    <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col min-w-[300px] max-h-[220px] overflow-hidden rounded-none font-sans">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-bg)] text-[var(--color-ink)]">
        <Trophy size={16} strokeWidth={1.5} />
        <h3 className="font-bold uppercase tracking-widest text-[13px]">{titulo}</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
        {items.length === 0 ? (
          <p className="text-center text-[var(--color-muted)] font-bold text-[12px] uppercase tracking-widest py-5 sm:py-8">NO HAY DATOS</p>
        ) : (
          items.map((item, index) => {
            const porcentaje = (item.total / maxTotal) * 100;

            return (
              <div
                key={index}
                data-fila-ranking="true"
                role="button"
                tabIndex={0}
                onClick={() => setDetalle({ ...item, puesto: index + 1 })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetalle({ ...item, puesto: index + 1 });
                  }
                }}
                title="Presione Enter o haga clic para ver el detalle"
                className="flex flex-col gap-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
              >
                <div className="flex justify-between items-end">
                  <span className="text-[12px] font-bold text-[var(--color-ink)] uppercase tracking-wider truncate pr-2">
                    {index + 1}. {item.nombre}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--color-ink)] font-mono">
                    S/ {formatearMonto(item.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-none overflow-hidden">
                    <div className="h-full bg-[var(--color-ink)] rounded-none" style={{ width: `${porcentaje}%` }}></div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--color-muted)] w-12 text-right uppercase tracking-wider">
                    {item.cantidad} U.
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {detalle && (
        <ModalDetalleFila
          titulo="Detalle del ranking"
          subtitulo={`${titulo} · Puesto ${detalle.puesto}`}
          onClose={() => setDetalle(null)}
          campos={[
            { etiqueta: 'Ranking', valor: titulo },
            { etiqueta: 'Puesto', valor: detalle.puesto },
            { etiqueta: 'Nombre', valor: detalle.nombre },
            { etiqueta: 'Cantidad', valor: `${detalle.cantidad} U.` },
            { etiqueta: 'Total', valor: `S/ ${formatearMonto(detalle.total)}` },
          ]}
        />
      )}
    </div>
  );
};
