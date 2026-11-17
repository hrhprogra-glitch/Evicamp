import React, { useState } from 'react';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';
import { ModalDetalleFila } from '../../../components/ModalDetalleFila';
import type { CobroContrato } from '../types';

interface TablaCobrosProps {
  cobros: CobroContrato[];
  onRegistrarPago: (cobro: CobroContrato) => void;
}

export const TablaCobros: React.FC<TablaCobrosProps> = ({
  cobros,
  onRegistrarPago,
}) => {
  const [detalle, setDetalle] = useState<CobroContrato | null>(null);

  if (cobros.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] font-mono bg-[var(--color-surface)]">
        <DollarSign size={36} className="mx-auto mb-3 text-[var(--color-muted)]" />
        <p className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">No hay cobros ni cuotas emitidas</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Emite las cuotas mensuales o periódicas desde la ficha de cada contrato para llevar el control de pagos.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
      <table className="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase text-[10px] tracking-wider font-black">
            <th className="py-2.5 px-3">Período</th>
            <th className="py-2.5 px-3">Contrato / Cliente</th>
            <th className="py-2.5 px-3 text-right">Monto Total</th>
            <th className="py-2.5 px-3 text-right">Monto Pagado</th>
            <th className="py-2.5 px-3 text-right">Saldo Deuda</th>
            <th className="py-2.5 px-3">Detalle Pago</th>
            <th className="py-2.5 px-3 text-center">Estado</th>
            <th className="py-2.5 px-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {cobros.map((c) => {
            const saldo = Math.max(0, c.monto - (c.monto_pagado || 0));
            return (
              <tr
                key={c.id}
                data-fila-cobro="true"
                role="button"
                tabIndex={0}
                title="Presione Enter o haga clic para ver el detalle"
                onClick={() => setDetalle(c)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle(c); }
                }}
                className="hover:bg-[var(--color-bg)] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--color-ink)]"
              >
                <td className="py-2.5 px-3 font-bold text-[var(--color-ink)] whitespace-nowrap">
                  {c.periodo}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-[var(--color-ink)]">
                    {c.contrato ? `${c.contrato.codigo} - ${c.contrato.titulo}` : 'Contrato'}
                  </div>
                  {c.customer && (
                    <div className="text-[10px] text-[var(--color-muted)]">
                      Cliente: {c.customer.name}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-[var(--color-ink)] whitespace-nowrap">
                  S/ {Number(c.monto).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-green-700 whitespace-nowrap">
                  S/ {Number(c.monto_pagado || 0).toFixed(2)}
                </td>
                <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${saldo > 0 ? 'text-red-700' : 'text-[var(--color-muted)]'}`}>
                  S/ {saldo.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[var(--color-muted)]">
                  {c.fecha_pago ? (
                    <span>
                      {c.fecha_pago} {c.metodo_pago ? `(${c.metodo_pago})` : ''}
                    </span>
                  ) : (
                    <span className="italic">Pendiente</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                      c.estado === 'PAGADO'
                        ? 'bg-green-100 text-green-900 border-green-400'
                        : c.estado === 'PARCIAL'
                        ? 'bg-yellow-100 text-yellow-900 border-yellow-400'
                        : 'bg-red-100 text-red-900 border-red-400'
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  {c.estado !== 'PAGADO' ? (
                    <button
                      id={`btn-pagar-cobro-${c.id}`}
                      onClick={(e) => { e.stopPropagation(); onRegistrarPago(c); }}
                      title="Registrar cobro o abono"
                      className="h-7 px-2.5 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] font-mono text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors"
                    >
                      <DollarSign size={12} />
                      <span>Cobrar</span>
                    </button>
                  ) : (
                    <span className="text-green-700 font-bold flex items-center justify-center gap-1 text-[11px]">
                      <CheckCircle size={12} />
                      <span>Saldado</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {detalle && (
        <ModalDetalleFila
          titulo="Detalle del cobro"
          subtitulo={`${detalle.periodo} · ${detalle.contrato?.codigo || 'Contrato'}`}
          onClose={() => setDetalle(null)}
          campos={[
            { etiqueta: 'Período', valor: detalle.periodo },
            {
              etiqueta: 'Contrato / Cliente',
              valor: detalle.contrato
                ? `${detalle.contrato.codigo} - ${detalle.contrato.titulo}`
                : 'Contrato',
            },
            { etiqueta: 'Cliente', valor: detalle.customer?.name || '—' },
            { etiqueta: 'Monto total', valor: `${detalle.moneda} ${Number(detalle.monto).toFixed(2)}` },
            { etiqueta: 'Monto pagado', valor: `${detalle.moneda} ${Number(detalle.monto_pagado || 0).toFixed(2)}` },
            {
              etiqueta: 'Saldo de deuda',
              valor: `${detalle.moneda} ${Math.max(0, detalle.monto - (detalle.monto_pagado || 0)).toFixed(2)}`,
            },
            { etiqueta: 'Fecha de emisión', valor: detalle.fecha_emision },
            { etiqueta: 'Fecha de vencimiento', valor: detalle.fecha_vencimiento },
            { etiqueta: 'Fecha de pago', valor: detalle.fecha_pago || 'Pendiente' },
            { etiqueta: 'Método de pago', valor: detalle.metodo_pago || '—' },
            { etiqueta: 'Referencia', valor: detalle.referencia_pago || '—' },
            { etiqueta: 'Estado', valor: detalle.estado },
            { etiqueta: 'Notas', valor: detalle.notas || '—' },
          ]}
        />
      )}
    </div>
  );
};
