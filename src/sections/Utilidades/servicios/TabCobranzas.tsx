// src/sections/Graficos/components/TabCobranzas.tsx
// Cuentas por cobrar en estilo SiuMax Sobrio

import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { ModalDetalleFila } from '../../../components/ModalDetalleFila';
import type { ItemCuentaPorCobrar } from './types';
import { verFechaLocal } from './types';

interface TabCobranzasProps {
  cuentas: ItemCuentaPorCobrar[];
  busqueda: string;
  filtroTipo: string;
}

// Filas: ↑ ↓ se mueven entre filas; ↑ desde la primera sube al buscador de la cabecera (Nego 3h)
const teclaFila = (e: React.KeyboardEvent<HTMLTableRowElement>, abrir: () => void) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
    if (ant) ant.focus(); else (document.querySelector('[id^="buscador-reporte-"]') as HTMLElement | null)?.focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  else if (e.key === 'Enter') { e.preventDefault(); abrir(); }
};

export const TabCobranzas: React.FC<TabCobranzasProps> = ({ cuentas, busqueda, filtroTipo }) => {
  const [detalle, setDetalle] = useState<ItemCuentaPorCobrar | null>(null);
  // Hoy en la hora local (antes en UTC: de noche ya era 'mañana')
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

  const filtradas = cuentas.filter((c) => {
    if (filtroTipo !== 'TODOS' && c.tipo !== filtroTipo) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchCod = c.codigo.toLowerCase().includes(q);
      const matchCli = c.cliente.toLowerCase().includes(q);
      if (!matchCod && !matchCli) return false;
    }
    return true;
  });

  const totalPorCobrar = filtradas.reduce((s, c) => s + c.saldo, 0);
  const totalVencido = filtradas
    .filter((c) => c.fechaVencimiento && c.fechaVencimiento < hoyStr)
    .reduce((s, c) => s + c.saldo, 0);

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Resumen de Estado de Cobranza */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="tarjeta-sobria p-4 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-[var(--color-warning-dark)] uppercase tracking-wider">
              Total Cuentas por Cobrar
            </div>
            <div className="text-2xl font-black text-[var(--color-ink)] font-mono mt-1">
              S/ {totalPorCobrar.toFixed(2)}
            </div>
            <div className="text-[10px] text-[var(--color-muted)] font-bold uppercase mt-0.5">
              {filtradas.length} documentos con saldo pendiente
            </div>
          </div>
          <Clock size={32} className="text-[var(--color-warning-dark)]" />
        </div>

        <div className="tarjeta-sobria p-4 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-[var(--color-danger)] uppercase tracking-wider">
              Saldos Vencidos
            </div>
            <div className="text-2xl font-black text-[var(--color-danger)] font-mono mt-1">
              S/ {totalVencido.toFixed(2)}
            </div>
            <div className="text-[10px] text-[var(--color-muted)] font-bold uppercase mt-0.5">
              Requieren gestión o cobro inmediato
            </div>
          </div>
          <AlertCircle size={32} className="text-[var(--color-danger)]" />
        </div>
      </div>

      {/* Tabla de Cobranzas */}
      <div className="tabla-marco overflow-x-auto">
        {filtradas.length === 0 ? (
          <div className="vacio-sobrio">
            <CheckCircle size={32} className="text-[var(--color-success)]" />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">
              ¡No hay cuentas pendientes por cobrar en este período!
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="tabla-cabecera">
              <tr>
                <th className="whitespace-nowrap p-4">Código</th>
                <th className="whitespace-nowrap p-4">Origen</th>
                <th className="whitespace-nowrap p-4">Cliente</th>
                <th className="whitespace-nowrap p-4">Emisión</th>
                <th className="whitespace-nowrap p-4">Vencimiento</th>
                <th className="whitespace-nowrap p-4 text-right">Total Inicial</th>
                <th className="whitespace-nowrap p-4 text-right">Pagado / Adelanto</th>
                <th className="whitespace-nowrap p-4 text-right">Saldo Deuda</th>
                <th className="whitespace-nowrap p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]">
              {filtradas.map((c) => {
                const esVencido = c.fechaVencimiento && c.fechaVencimiento < hoyStr;

                return (
                  <tr
                    key={`${c.tipo}-${c.id}`}
                    data-fila-grafico="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => teclaFila(e, () => setDetalle(c))}
                    onClick={() => setDetalle(c)}
                    title="Presione Enter o haga clic para ver el detalle"
                    className="tabla-fila h-[79px] cursor-pointer"
                  >
                    <td className="p-4 font-mono font-black whitespace-nowrap">
                      {c.codigo}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                          c.tipo === 'CONTRATO'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : c.tipo === 'TALLER'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}
                      >
                        {c.tipo}
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      {c.cliente}
                    </td>
                    <td className="p-4 text-[var(--color-muted)] font-mono whitespace-nowrap text-[11px] font-bold">
                      {verFechaLocal(c.fechaEmision)}
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-[11px] font-bold">
                      {c.fechaVencimiento ? (
                        <span className={esVencido ? 'text-[var(--color-danger)] font-black' : 'text-[var(--color-muted)]'}>
                          {verFechaLocal(c.fechaVencimiento)} {esVencido ? '(Vencido)' : ''}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted)]">Sin plazo</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold whitespace-nowrap text-[var(--color-muted)]">
                      S/ {c.total.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-success)] whitespace-nowrap">
                      S/ {c.pagado.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-danger)] whitespace-nowrap">
                      S/ {c.saldo.toFixed(2)}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                          esVencido
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {esVencido ? 'VENCIDO' : 'POR COBRAR'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detalle && (
        <ModalDetalleFila
          titulo="Detalle de cobranza"
          subtitulo={`${detalle.codigo} · ${detalle.cliente}`}
          onClose={() => setDetalle(null)}
          campos={[
            { etiqueta: 'Código', valor: detalle.codigo },
            { etiqueta: 'Origen', valor: detalle.tipo },
            { etiqueta: 'Cliente', valor: detalle.cliente },
            { etiqueta: 'Emisión', valor: verFechaLocal(detalle.fechaEmision) },
            { etiqueta: 'Vencimiento', valor: verFechaLocal(detalle.fechaVencimiento) },
            { etiqueta: 'Total inicial', valor: `S/ ${detalle.total.toFixed(2)}` },
            { etiqueta: 'Pagado / Adelanto', valor: `S/ ${detalle.pagado.toFixed(2)}` },
            { etiqueta: 'Saldo de deuda', valor: `S/ ${detalle.saldo.toFixed(2)}` },
            { etiqueta: 'Estado', valor: detalle.estado },
          ]}
        />
      )}
    </div>
  );
};
