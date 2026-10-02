// src/sections/Reportes/components/TablaTickets.tsx
import React, { useState, useEffect } from 'react';
import { RotateCcw, Trash2, Receipt, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { supabase } from '../../../db/supabase'; 
import type { TicketVenta } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { usePermiso } from '../../../utils/permisos';

interface Props {
  tickets: TicketVenta[];
  onAnular: (id: string) => void;
  onDelete: (id: string) => void;
  idsAnulando?: Set<string>;
}

export const TablaTickets: React.FC<Props> = ({ tickets, onAnular, onDelete, idsAnulando }) => {
  // Anular o eliminar ventas requiere el permiso de anular ventas
  const puedeAnular = usePermiso('reportes_anular_ventas');
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | null>(null);
  useCerrarConEscape(ticketSeleccionado !== null, () => setTicketSeleccionado(null)); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [detallesTicket, setDetallesTicket] = useState<any[]>([]);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);
  
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [tickets.length]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTickets = tickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const verDetalles = async (id: string) => {
    setTicketSeleccionado(id);
    setIsLoadingDetalles(true);

    if (id.startsWith('ERR-')) {
      setDetallesTicket([]);
      setIsLoadingDetalles(false);
      return;
    }

    const { data, error } = await supabase
      .from('sale_details')
      .select('product_name, quantity, price_at_moment, subtotal')
      .eq('sale_id', id);
    
    if (!error && data) {
      setDetallesTicket(data);
    } else {
      setDetallesTicket([]);
    }
    setIsLoadingDetalles(false);
  };

  const PaginacionControles = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="p-3 border-y-2 border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center shrink-0">
        <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, tickets.length)} de {tickets.length}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none">
            <ChevronLeft size={16} />
          </button>
          <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-black text-[var(--color-ink)] rounded-none">
            Pág {currentPage} / {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-[8px_8px_0_0_var(--color-border)] flex flex-col font-mono rounded-none">
        
        <PaginacionControles />

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[var(--color-ink)] text-[var(--color-surface)]">
              <tr>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Fecha y Hora</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Nro. Ticket</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Pago</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Estado</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Pagado</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Deuda</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Total</th>
                <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-bold text-xs uppercase bg-[var(--color-surface)]">
                    No hay tickets registrados en este mes.
                  </td>
                </tr>
              ) : (
                currentTickets.map((t) => (
                  <tr
                    key={t.id}
                    {...clicConTeclado(() => verDetalles(t.id))}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                    title="Click para ver detalle del ticket"
                  >
                    <td className="p-4 text-xs font-bold text-[var(--color-muted)]">
                      {new Date(t.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="p-4 text-sm font-black text-[var(--color-ink)] uppercase">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-[var(--color-muted)]" />
                          #{t.id.slice(-6)}
                        </div>
                        {t.es_fiado && t.cliente_nombre && (
                          <span className="text-[12px] text-[var(--color-muted)] font-bold tracking-widest">[{t.cliente_nombre}]</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-[var(--color-muted)] uppercase">{t.metodo_pago}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[12px] font-black tracking-wider border rounded-none ${
                        t.estado === 'ANULADO' ? 'bg-[var(--color-surface)] text-[var(--color-danger)] border-[var(--color-danger)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]'
                      }`}>
                        {t.estado}
                      </span>
                    </td>
                    {/* COLUMNA PAGADO */}
                    <td className="p-4 text-right text-base font-bold text-[var(--color-muted)]">
                      S/ {Number(t.monto_pagado || 0).toFixed(2)}
                    </td>
                    {/* COLUMNA DEUDA */}
                    <td className="p-4 text-right text-lg font-black text-[var(--color-danger)]">
                      {(t.monto_deuda && t.monto_deuda > 0) ? `S/ ${Number(t.monto_deuda).toFixed(2)}` : '-'}
                    </td>
                    <td className="p-4 text-right text-lg font-black text-[var(--color-ink)]">
                      S/ {Number(t.total).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); verDetalles(t.id); }} className="p-2 bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-ink)] transition-colors cursor-pointer rounded-none" title="Ver Productos">
                          <Eye size={16} />
                        </button>
                        {t.estado !== 'ANULADO' && puedeAnular && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onAnular(t.id); }}
                            disabled={idsAnulando?.has(t.id)}
                            className="p-2 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors cursor-pointer rounded-none disabled:opacity-40 disabled:pointer-events-none"
                            title="Anular / Devolver"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {puedeAnular && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-2 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-none" title="Eliminar Permanente">
                          <Trash2 size={16} />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <PaginacionControles />

      </div>

      {/* VENTANA FLOTANTE (MODAL PLATO TÉCNICO) */}
      {ticketSeleccionado && (
        <div className="fixed inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-lg flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.8)]">
            <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-4 shrink-0">
              <div>
                <p className="text-[var(--color-muted)] text-[12px] font-mono tracking-widest uppercase mb-1">Inspección Operativa</p>
                <h2 className="text-[var(--color-ink)] font-black text-lg uppercase tracking-widest">TICKET #{ticketSeleccionado.slice(-6)}</h2>
              </div>
              <button onClick={() => setTicketSeleccionado(null)} className="p-2 bg-[var(--color-surface)] border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] transition-colors rounded-none">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[var(--color-surface)]">
              {isLoadingDetalles ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[var(--color-ink)] border-t-transparent animate-spin rounded-full mb-3"></div>
                  <p className="text-[var(--color-muted)] text-xs font-black uppercase tracking-widest">Descargando registros...</p>
                </div>
              ) : detallesTicket.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-[var(--color-border)]">
                  <p className="text-[var(--color-danger)] text-xs font-black uppercase tracking-widest">No hay productos registrados para este ticket.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[var(--color-ink)] text-[var(--color-surface)]">
                    <tr>
                      <th className="p-2 text-[12px] font-black tracking-widest uppercase">Cant/Kg</th>
                      <th className="p-2 text-[12px] font-black tracking-widest uppercase">Producto</th>
                      <th className="p-2 text-[12px] font-black tracking-widest uppercase text-right">P. Unit</th>
                      <th className="p-2 text-[12px] font-black tracking-widest uppercase text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesTicket.map((item, index) => (
                      <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                        <td className="p-2 text-xs font-black text-[var(--color-ink)]">{Number(item.quantity).toString()}</td>
                        <td className="p-2 text-xs font-bold text-[var(--color-muted)] uppercase">{item.product_name}</td>
                        <td className="p-2 text-xs font-mono text-[var(--color-muted)] text-right">S/ {Number(item.price_at_moment).toFixed(2)}</td>
                        <td className="p-2 text-sm font-black font-mono text-[var(--color-ink)] text-right">S/ {Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] flex justify-between items-center shrink-0">
               <span className="text-[var(--color-muted)] text-xs font-black uppercase tracking-widest">Total Facturado</span>
               <span className="text-[var(--color-ink)] text-xl font-black font-mono">
                 S/ {detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0).toFixed(2)}
               </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};