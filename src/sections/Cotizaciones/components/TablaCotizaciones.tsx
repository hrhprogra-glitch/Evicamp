// Lista de cotizaciones (SiuMax Nego, paso 3h). Cada fila se selecciona con ↑ ↓ y Enter abre el detalle (como en
// Comerc y en Salidas); ↑ desde la primera fila vuelve al buscador. Mismo molde que Inventario > Productos
// (SiuMax Sobrio): tabla-marco, cabecera oscura, celdas p-4 y filas de 79 px (17/11/2026).
import React from 'react';
import { FileText } from 'lucide-react';
import type { Cotizacion } from '../types';
import { CLASE_ESTADO, simbolo, verFecha } from '../types';
import { formatearMonto } from '../../../utils/formato';

interface Props {
  cotizaciones: Cotizacion[];
  conBien: boolean;               // columna "Lo que se atiende" (con Talleres y servicios)
  onVerDetalle: (c: Cotizacion) => void;
}

export const TablaCotizaciones: React.FC<Props> = ({ cotizaciones, conBien, onVerDetalle }) => {
  if (cotizaciones.length === 0) {
    return (
      <div className="tabla-marco flex flex-col">
        <div className="vacio-sobrio">
          <FileText size={32} />
          <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)] mt-2">No se encontraron cotizaciones</p>
          <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">Crea una con "Nueva cotización" (o desde la Caja) o cambia la búsqueda.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="tabla-marco flex flex-col font-mono">
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" id="tabla-cotizaciones">
          <thead className="tabla-cabecera sticky top-0 z-10">
            <tr>
              <th className="whitespace-nowrap p-4">Número</th>
              <th className="whitespace-nowrap p-4">Emisión / vence</th>
              <th className="whitespace-nowrap p-4">Cliente</th>
              {conBien && <th className="whitespace-nowrap p-4">Lo que se atiende</th>}
              <th className="whitespace-nowrap p-4 text-right">Total</th>
              <th className="whitespace-nowrap p-4 text-right">Pagado</th>
              <th className="whitespace-nowrap p-4 text-right">Saldo</th>
              <th className="whitespace-nowrap p-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {cotizaciones.map((c) => {
              const s = simbolo(c.moneda);
              return (
                <tr
                  key={c.id}
                  id={`fila-coti-${c.id}`}
                  data-fila-coti="true"
                  data-row="true"
                  tabIndex={0}
                  onClick={() => onVerDetalle(c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onVerDetalle(c); }
                    else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
                      if (ant) ant.focus(); else document.getElementById('buscador-cotizaciones')?.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
                  }}
                  className="tabla-fila h-[79px] cursor-pointer"
                >
                  <td className="p-4 font-black whitespace-nowrap">{c.numero}</td>
                  <td className="p-4 whitespace-nowrap text-[11px] font-bold">
                    <div>{verFecha(c.fecha_emision)}</div>
                    <div className="text-[9px] text-[var(--color-muted)]">{c.fecha_vencimiento ? `Vence: ${verFecha(c.fecha_vencimiento)}` : 'Sin vencimiento'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-black uppercase line-clamp-1">{c.cliente_nombre || 'Sin cliente'}</div>
                    <div className="text-[10px] font-bold text-[var(--color-muted)] line-clamp-1">{c.observaciones || (c.cliente_documento ? `Doc: ${c.cliente_documento}` : '')}</div>
                  </td>
                  {conBien && (
                    <td className="p-4 text-[11px] font-bold">
                      {c.bien ? <span className="line-clamp-1">{c.bien.nombre}</span> : <span className="text-[var(--color-muted)]">—</span>}
                    </td>
                  )}
                  <td className="p-4 text-right font-black whitespace-nowrap">{s} {formatearMonto(c.total)}</td>
                  <td className="p-4 text-right font-black whitespace-nowrap text-[var(--color-success)]">{s} {formatearMonto(c.adelanto)}</td>
                  <td className={`p-4 text-right font-black whitespace-nowrap ${c.saldo > 0.009 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{s} {formatearMonto(c.saldo)}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${CLASE_ESTADO[c.estado]}`}>{c.estado}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-[var(--color-border)] text-[10px] font-bold text-[var(--color-muted)] uppercase flex justify-between">
        <span>↑ ↓ para moverse · Enter abre la cotización</span>
        <span>{cotizaciones.length} cotización(es)</span>
      </div>
    </div>
  );
};
