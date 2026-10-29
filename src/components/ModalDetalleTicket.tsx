import React, { useState, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { supabase } from '../db/supabase';
import { formatearCantidadDetalle } from '../utils/formato';
import { useImprimir } from '../utils/impresion';
import { TicketImprimible } from '../sections/Punto-de-venta/components/TicketImprimible';

interface Props {
  ticketId: string | null;
  onClose: () => void;
}

export const ModalDetalleTicket: React.FC<Props> = ({ ticketId, onClose }) => {
  const [detallesTicket, setDetallesTicket] = useState<any[]>([]);
  const [ventaInfo, setVentaInfo] = useState<{ clienteNombre?: string | null; metodoPago?: string | null } | null>(null);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const imprimirTicket = useImprimir(printContainerRef, `Ticket-${ticketId}`);

  useEffect(() => {
    if (!ticketId) return;
    const fetchDetalles = async () => {
      setIsLoadingDetalles(true);
      try {
        const [detallesRes, ventaRes] = await Promise.all([
          supabase.from('sale_details').select('*').eq('sale_id', ticketId),
          supabase.from('sales').select('customer_name, payment_type').eq('id', ticketId).maybeSingle()
        ]);
        setDetallesTicket(detallesRes.data || []);

        let clienteNombre = ventaRes.data?.customer_name;
        if (!clienteNombre) {
          const { data: fiado } = await supabase.from('fiados').select('customer_name').eq('sale_id', ticketId).maybeSingle();
          clienteNombre = fiado?.customer_name;
        }

        setVentaInfo({
          clienteNombre: clienteNombre || null,
          metodoPago: ventaRes.data?.payment_type || null
        });
      } catch (error) {
        console.error('Error fetching ticket details:', error);
      } finally {
        setIsLoadingDetalles(false);
      }
    };
    fetchDetalles();
  }, [ticketId]);

  // Auto-Focus inmediato en el botón "X" al abrir el modal
  useEffect(() => {
    if (!ticketId) return;
    const enfocar = () => {
      const btn = closeBtnRef.current || document.getElementById('btn-cerrar-modal-ticket');
      btn?.focus();
    };
    enfocar();
    const t1 = setTimeout(enfocar, 30);
    const t2 = setTimeout(enfocar, 100);
    const t3 = setTimeout(enfocar, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [ticketId]);

  // Focus trap y navegación por teclado (Patrón Evicamp)
  useEffect(() => {
    if (!ticketId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESCAPE: Cerrar modal
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Atajo 'p' o 'P': Reimprimir ticket
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        void imprimirTicket();
        return;
      }

      // 2. TAB: Focus Trap entre botón cerrar y botón reimprimir
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const btnPrint = document.getElementById('btn-reimprimir-ticket');
        const active = document.activeElement;
        if (active === closeBtnRef.current && btnPrint) {
          btnPrint.focus();
        } else {
          closeBtnRef.current?.focus();
        }
        return;
      }

      // 3. FLECHAS: Permitir scroll del contenido de la tabla con teclado
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += 50;
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop -= 50;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [ticketId, onClose]);

  if (!ticketId) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ticket-title"
      id="modal-detalle-ticket-container"
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4 font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-lg flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.8)]"
      >
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-4 shrink-0">
          <div>
            <p className="text-[var(--color-muted)] text-[12px] font-mono tracking-widest uppercase mb-1">Inspección Operativa</p>
            <h2 id="modal-ticket-title" className="text-[var(--color-ink)] font-black text-lg uppercase tracking-widest">
              TICKET #{String(ticketId).slice(-6)}
            </h2>
            {ventaInfo?.clienteNombre && (
              <p className="text-xs font-black text-[var(--color-ink)] uppercase mt-1 flex items-center gap-1.5">
                <span className="text-[var(--color-muted)] font-normal">Cliente:</span>
                <span className="text-[var(--color-info)] font-black bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                  {ventaInfo.clienteNombre}
                </span>
              </p>
            )}
          </div>
          <button 
            ref={closeBtnRef}
            id="btn-cerrar-modal-ticket"
            autoFocus
            onClick={onClose} 
            title="Cerrar ticket (Esc o Enter)"
            aria-label="Cerrar ticket"
            className="p-2 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:ring-offset-2 focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] shadow-[2px_2px_0_0_var(--color-ink)] transition-all rounded-none cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[var(--color-surface)] relative"
        >
          {isLoadingDetalles ? (
            <div className="absolute inset-0 bg-[var(--color-surface)]/85 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
                <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
              </div>
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
                    <td className="p-2 text-xs font-black text-[var(--color-ink)]">{formatearCantidadDetalle(item.quantity)}</td>
                    <td className="p-2 text-xs font-bold text-[var(--color-muted)] uppercase">{item.product_name}
                      {/* Fase 1.2: vendido en presentación */}
                      {item.presentacion && (
                        <span data-presentacion className="block normal-case text-[11px] text-[var(--color-info)]">{Number(item.presentacion_cantidad)} × {item.presentacion} = {Number(item.quantity)} unidades</span>
                      )}
                      {/* Fase 1.4: precio cambiado al cobrar */}
                      {item.precio_lista != null && Number(item.precio_lista) !== Number(item.price_at_moment) && (
                        <span data-precio-cambiado className="block normal-case text-[11px] text-[var(--color-warning-text)]">
                          Precio cambiado: S/ {Number(item.precio_lista).toFixed(2)} → S/ {Number(item.price_at_moment).toFixed(2)}{item.precio_cambiado_por ? ` · ${item.precio_cambiado_por}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-xs font-mono text-[var(--color-muted)] text-right">S/ {Number(item.price_at_moment).toFixed(2)}</td>
                    <td className="p-2 text-sm font-black font-mono text-[var(--color-ink)] text-right">S/ {Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isLoadingDetalles && detallesTicket.length > 0 && (
          <div className="border-t-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] flex flex-wrap justify-between items-center gap-3 shrink-0">
             <button
               id="btn-reimprimir-ticket"
               type="button"
               onClick={() => void imprimirTicket()}
               className="flex items-center gap-2 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black focus:bg-[var(--color-accent)] focus:text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
               title="Reimprimir Ticket de Venta (tecla P)"
             >
               <Printer size={16} /> Reimprimir Ticket
             </button>
             <div className="flex items-center gap-3">
               <span className="text-[var(--color-muted)] text-xs font-black uppercase tracking-widest">Total Facturado</span>
               <span className="text-[var(--color-ink)] text-xl font-black font-mono">
                 S/ {detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0).toFixed(2)}
               </span>
             </div>
          </div>
        )}

        {/* Contenedor invisible para impresión física directa o vía navegador */}
        <div style={{ display: 'none' }}>
          <TicketImprimible
            ref={printContainerRef}
            cart={detallesTicket.map((d) => ({
              id: String(d.product_id),
              name: d.product_name,
              price: Number(d.price_at_moment),
              cartQuantity: Number(d.quantity),
              subtotal: Number(d.subtotal),
              unit: d.unit,
            }))}
            total={detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0)}
            pagos={{
              efectivo: ventaInfo?.metodoPago === 'EFECTIVO' ? detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0) : 0,
              yape: ventaInfo?.metodoPago === 'YAPE' ? detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0) : 0,
              tarjeta: ventaInfo?.metodoPago === 'TARJETA' ? detallesTicket.reduce((acc, item) => acc + Number(item.subtotal), 0) : 0,
            }}
            vuelto={0}
            nroBoleta={String(ticketId).slice(-6)}
            cliente={ventaInfo?.clienteNombre ? { nombre: ventaInfo.clienteNombre } : null}
          />
        </div>
      </div>
    </div>
  );
};
