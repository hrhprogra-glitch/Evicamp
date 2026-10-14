// src/sections/Finanzas/components/TablaHistorial.tsx
import React from 'react';
import { ReceiptText, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { ModalDetalleCaja } from './ModalDetalleCaja';
import type { CashSession } from '../types';

interface Props {
  historialCajas: CashSession[];
  paginaActual: number;
  totalPaginas: number;
  onPageChange: (page: number) => void;
  onAnular?: (id: string, isTicket?: boolean) => Promise<void>;
  onDelete?: (id: string, isTicket?: boolean) => Promise<void>;
}

export const TablaHistorial: React.FC<Props> = ({ historialCajas, paginaActual, totalPaginas, onPageChange, onAnular, onDelete }) => {
  const [selectedCaja, setSelectedCaja] = React.useState<CashSession | null>(null);

  // EXTRAEMOS LA PAGINACIÓN PARA USARLA ARRIBA Y ABAJO SIN REPETIR CÓDIGO
  const ControlesPaginacion = ({ posicion }: { posicion: 'top' | 'bottom' }) => {
    const isTop = posicion === 'top';
    const idAnterior = isTop ? 'btn-historial-anterior' : 'btn-historial-anterior-bottom';
    const idSiguiente = isTop ? 'btn-historial-siguiente' : 'btn-historial-siguiente-bottom';

    return (
      <div className={`bg-[var(--color-surface)] ${isTop ? 'border-b-2' : ''} border-[var(--color-ink)] p-3 sm:p-4 flex justify-between items-center gap-2 shrink-0 rounded-none`}>
        <button
          id={idAnterior}
          aria-disabled={paginaActual === 1}
          tabIndex={0}
          onClick={() => {
            if (paginaActual > 1) onPageChange(paginaActual - 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById(idSiguiente)?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              if (isTop) {
                const firstRow = document.querySelector('tr[data-row="true"][role="button"]') as HTMLElement;
                firstRow?.focus();
                firstRow?.scrollIntoView({ block: 'nearest' });
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              if (isTop) {
                document.getElementById('filtro-fecha-desde-finanzas')?.focus();
              } else {
                const rows = Array.from(document.querySelectorAll('tr[data-row="true"][role="button"]')) as HTMLElement[];
                if (rows.length > 0) rows[rows.length - 1].focus();
              }
            } else if (e.key === 'Enter' || e.key === ' ') {
              if (paginaActual > 1) {
                e.preventDefault();
                e.stopPropagation();
                onPageChange(paginaActual - 1);
              }
            }
          }}
          className={`flex items-center gap-2 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] transition-all rounded-none ${
            paginaActual === 1
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] cursor-pointer'
          }`}
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="text-xs font-black text-[var(--color-ink)] tracking-widest uppercase">
          Página <span className="text-[var(--color-info)]">{paginaActual}</span> de {totalPaginas || 1}
        </div>
        <button
          id={idSiguiente}
          aria-disabled={paginaActual >= totalPaginas}
          tabIndex={0}
          onClick={() => {
            if (paginaActual < totalPaginas) onPageChange(paginaActual + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById(idAnterior)?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              if (isTop) {
                const firstRow = document.querySelector('tr[data-row="true"][role="button"]') as HTMLElement;
                firstRow?.focus();
                firstRow?.scrollIntoView({ block: 'nearest' });
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              if (isTop) {
                document.getElementById('btn-buscar-fechas-finanzas')?.focus();
              } else {
                const rows = Array.from(document.querySelectorAll('tr[data-row="true"][role="button"]')) as HTMLElement[];
                if (rows.length > 0) rows[rows.length - 1].focus();
              }
            } else if (e.key === 'Enter' || e.key === ' ') {
              if (paginaActual < totalPaginas) {
                e.preventDefault();
                e.stopPropagation();
                onPageChange(paginaActual + 1);
              }
            }
          }}
          className={`flex items-center gap-2 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] transition-all rounded-none ${
            paginaActual >= totalPaginas
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] cursor-pointer'
          }`}
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    // ELIMINADO: flex-1, overflow-hidden, h-full para permitir que crezca completo sin scroll interno
    <div className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col animate-fade-in rounded-none mb-8">
      
      {/* HEADER */}
      <div className="bg-[var(--color-ink)] text-[var(--color-surface)] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 shrink-0 rounded-none">
        <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <ReceiptText size={18} /> Historial de Cajas Cerradas
        </h2>
        <span className="text-[var(--color-muted)] text-[12px] font-bold uppercase tracking-widest">
          Mostrando {historialCajas.length} registros
        </span>
      </div>

      {/* PAGINACIÓN SUPERIOR */}
      <ControlesPaginacion posicion="top" />
      
      {/* TABLA SIN SCROLL INTERNO (Se eliminó overflow-auto custom-scrollbar) */}
      <div className="w-full bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--color-surface)] text-[var(--color-ink)] border-b-2 border-[var(--color-ink)]">
            <tr>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase border-r-2 border-[var(--color-border)] bg-[var(--color-surface)] whitespace-nowrap">Apertura</th>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase border-r-2 border-[var(--color-border)] bg-[var(--color-surface)] whitespace-nowrap">Cierre</th>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase border-r-2 border-[var(--color-border)] text-center bg-[var(--color-surface)] whitespace-nowrap">Fondo Inicial</th>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase border-r-2 border-[var(--color-border)] text-center bg-[var(--color-surface)] whitespace-nowrap">Efectivo / Yape / Tarjeta</th>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase border-r-2 border-[var(--color-border)] text-center bg-[var(--color-surface)] whitespace-nowrap">Diferencia Total</th>
              <th className="p-4 text-[12px] font-black tracking-widest uppercase text-center bg-[var(--color-surface)] whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {historialCajas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 lg:p-4 text-center text-[var(--color-muted)] text-xs font-bold uppercase tracking-widest border-b-2 border-[var(--color-border)]">
                  No se encontraron registros para estas fechas.
                </td>
              </tr>
            ) : (
              historialCajas.map((caja) => {
                const esperadoEfectivo = Number(caja.expected_balance || 0);
                const realEfectivo = Number(caja.closing_balance || 0);
                const esperadoYape = Number(caja.expected_yape || 0);
                const realYape = Number(caja.closing_yape || 0);
                const esperadoTarjeta = Number(caja.expected_card || 0);
                const realTarjeta = Number(caja.closing_card || 0);
                // Redondeado a centavos: sumar varios decimales en JS casi nunca da un
                // número binario exacto, y sin esto una caja cuadrada mostraba "+S/ 0.00"
                // en vez de "CUADRE EXACTO".
                const diferencia = Math.round(((realEfectivo - esperadoEfectivo) + (realYape - esperadoYape) + (realTarjeta - esperadoTarjeta)) * 100) / 100;

                return (
                  <tr
                    key={caja.id}
                    data-row="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedCaja(caja);
                      }
                    }}
                    onClick={() => setSelectedCaja(caja)}
                    className="border-b-2 border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors cursor-pointer group"
                    title="Click o Enter para ver el detalle de esta caja"
                  >
                    <td className="p-4 text-xs font-bold text-[var(--color-muted)] border-r-2 border-[var(--color-border)] whitespace-nowrap">
                      {new Date(caja.opened_at).toLocaleString('es-PE')}
                    </td>
                    <td className="p-4 text-xs font-bold text-[var(--color-muted)] border-r-2 border-[var(--color-border)] whitespace-nowrap">
                      {caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE') : '---'}
                    </td>
                    <td className="p-4 text-sm font-black text-[var(--color-ink)] text-center border-r-2 border-[var(--color-border)] whitespace-nowrap">
                      S/ {Number(caja.opening_balance).toFixed(2)}
                    </td>
                    <td className="p-4 text-xs font-black text-[var(--color-accent)] text-center border-r-2 border-[var(--color-border)] space-y-0.5 whitespace-nowrap">
                      <p>S/ {realEfectivo.toFixed(2)}</p>
                      <p className="text-[var(--color-info)]">S/ {realYape.toFixed(2)}</p>
                      <p className="text-[var(--color-purple)]">S/ {realTarjeta.toFixed(2)}</p>
                    </td>
                    <td className={`p-4 text-sm font-black text-center border-r-2 border-[var(--color-border)] whitespace-nowrap ${diferencia < 0 ? 'text-[var(--color-danger)]' : (diferencia > 0 ? 'text-[var(--color-info)]' : 'text-[var(--color-muted)]')}`}>
                      {diferencia !== 0 ? (diferencia > 0 ? `+ S/ ${diferencia.toFixed(2)}` : `- S/ ${Math.abs(diferencia).toFixed(2)}`) : 'CUADRE EXACTO'}
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-2 whitespace-nowrap">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCaja(caja);
                        }}
                        className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] p-2 text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors cursor-pointer shadow-[2px_2px_0_0_var(--color-ink)] active:translate-y-[2px] active:shadow-none rounded-none"
                        title="Ver Detalles de la Caja"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN INFERIOR (Reutilizamos la misma función de arriba, cambiando borde) */}
      <div className="border-t-2 border-[var(--color-ink)]">
        <ControlesPaginacion posicion="bottom" />
      </div>

      <ModalDetalleCaja 
        isOpen={!!selectedCaja}
        onClose={() => setSelectedCaja(null)}
        caja={selectedCaja}
        onAnular={onAnular}
        onDelete={onDelete}
      />
    </div>
  );
};