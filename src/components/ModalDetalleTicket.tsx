import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Receipt, ListFilter } from 'lucide-react';
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
  const [ventaInfo, setVentaInfo] = useState<{
    clienteNombre?: string | null;
    metodoPago?: string | null;
    vendedor?: string | null;
    fecha?: string | null;
    efectivo?: number;
    yape?: number;
    tarjeta?: number;
    fiadoData?: any | null;
  } | null>(null);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);
  const [vista, setVista] = useState<'TICKET' | 'TABLA'>('TICKET');

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const printBtnRef = useRef<HTMLButtonElement>(null);
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
          supabase
            .from('sales')
            .select('customer_name, payment_type, created_at, seller_name, total, amount_cash, amount_yape, amount_card, amount_credit')
            .eq('id', ticketId)
            .maybeSingle()
        ]);

        const detalles = detallesRes.data || [];
        setDetallesTicket(detalles);

        let clienteNombre = ventaRes.data?.customer_name;
        let fiadoData = null;

        const { data: fiado } = await supabase
          .from('fiados')
          .select('*')
          .eq('sale_id', ticketId)
          .maybeSingle();

        if (fiado) {
          clienteNombre = fiado.customer_name || clienteNombre;
          fiadoData = {
            montoDeuda: Number(fiado.total || 0),
            fechaVencimiento: fiado.due_date ? new Date(fiado.due_date).toLocaleDateString('es-PE') : 'Sin fecha',
            clienteNombre: clienteNombre || 'CLIENTE',
            clienteDni: fiado.customer_dni || '',
            clienteTelefono: fiado.customer_phone || ''
          };
        }

        const totalCalc = detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

        setVentaInfo({
          clienteNombre: clienteNombre || null,
          metodoPago: ventaRes.data?.payment_type || null,
          vendedor: (ventaRes.data as any)?.seller_name || null,
          fecha: ventaRes.data?.created_at || null,
          efectivo: Number(ventaRes.data?.amount_cash || (ventaRes.data?.payment_type === 'EFECTIVO' ? totalCalc : 0)),
          yape: Number(ventaRes.data?.amount_yape || (ventaRes.data?.payment_type === 'YAPE' ? totalCalc : 0)),
          tarjeta: Number(ventaRes.data?.amount_card || (ventaRes.data?.payment_type === 'TARJETA' ? totalCalc : 0)),
          fiadoData
        });
      } catch (error) {
        console.error('Error fetching ticket details:', error);
      } finally {
        setIsLoadingDetalles(false);
      }
    };
    fetchDetalles();
  }, [ticketId]);

  // Auto-Focus inmediato en el botón Reimprimir al abrir el modal (o botón cerrar si está cargando)
  useEffect(() => {
    if (!ticketId) return;
    const enfocar = () => {
      const btnPrint = document.getElementById('btn-reimprimir-ticket');
      if (btnPrint) {
        btnPrint.focus();
      } else {
        closeBtnRef.current?.focus();
      }
    };
    enfocar();
    const t1 = setTimeout(enfocar, 50);
    const t2 = setTimeout(enfocar, 150);
    const t3 = setTimeout(enfocar, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [ticketId, isLoadingDetalles]);

  const ejecutarImpresion = async () => {
    try {
      await imprimirTicket();
    } catch (err) {
      console.warn('Fallo useImprimir, ejecutando window.print():', err);
      window.print();
    }
  };

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
        void ejecutarImpresion();
        return;
      }

      // 2. TAB: Focus Trap
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const active = document.activeElement;
        const btnPrint = document.getElementById('btn-reimprimir-ticket');
        const btnCerrar = closeBtnRef.current;
        const tabTicket = document.getElementById('btn-tab-ticket');
        const tabTabla = document.getElementById('btn-tab-tabla');

        if (e.shiftKey) {
          if (active === btnPrint) {
            tabTabla?.focus();
          } else if (active === tabTabla) {
            tabTicket?.focus();
          } else if (active === tabTicket) {
            btnCerrar?.focus();
          } else {
            btnPrint?.focus();
          }
        } else {
          if (active === btnCerrar) {
            tabTicket?.focus();
          } else if (active === tabTicket) {
            tabTabla?.focus();
          } else if (active === tabTabla) {
            btnPrint?.focus();
          } else {
            btnCerrar?.focus();
          }
        }
        return;
      }

      // 3. FLECHAS: Selector arriba / abajo / izquierda / derecha
      const active = document.activeElement;
      const btnPrint = document.getElementById('btn-reimprimir-ticket');
      const btnCerrar = closeBtnRef.current;
      const tabTicket = document.getElementById('btn-tab-ticket');
      const tabTabla = document.getElementById('btn-tab-tabla');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (active === btnCerrar || active === tabTicket || active === tabTabla) {
          btnPrint?.focus();
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += 60;
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (active === btnPrint) {
          tabTicket?.focus();
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop -= 60;
        }
      } else if (e.key === 'ArrowRight') {
        if (active === tabTicket) {
          e.preventDefault();
          tabTabla?.focus();
        } else if (active === tabTabla) {
          e.preventDefault();
          btnCerrar?.focus();
        }
      } else if (e.key === 'ArrowLeft') {
        if (active === btnCerrar) {
          e.preventDefault();
          tabTabla?.focus();
        } else if (active === tabTabla) {
          e.preventDefault();
          tabTicket?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [ticketId, onClose]);

  if (!ticketId) return null;

  const totalCalculado = detallesTicket.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

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
        className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-lg flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.88)]"
      >
        {/* CABECERA */}
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 sm:p-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--color-muted)] text-[11px] font-mono tracking-widest uppercase">
                {vista === 'TICKET' ? 'Previsualización Ticket 80mm' : 'Inspección Operativa'}
              </span>
              {ventaInfo?.clienteNombre && (
                <span className="text-[11px] font-black text-[var(--color-info)] bg-blue-50 px-1.5 py-0.5 border border-blue-200 uppercase">
                  {ventaInfo.clienteNombre}
                </span>
              )}
            </div>
            <h2 id="modal-ticket-title" className="text-[var(--color-ink)] font-black text-base sm:text-lg uppercase tracking-widest">
              TICKET #{String(ticketId).slice(-6)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* TABS DE VISTA: TICKET / TABLA */}
            <div className="flex border-2 border-[var(--color-ink)] bg-white p-0.5 shadow-[2px_2px_0_0_var(--color-ink)]">
              <button
                id="btn-tab-ticket"
                type="button"
                onClick={() => setVista('TICKET')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase cursor-pointer transition-colors ${
                  vista === 'TICKET'
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'text-[var(--color-ink)] hover:bg-gray-100'
                } focus:outline-none focus:ring-2 focus:ring-black`}
                title="Ver Ticket Impreso (80mm)"
              >
                <Receipt size={13} /> Ticket
              </button>
              <button
                id="btn-tab-tabla"
                type="button"
                onClick={() => setVista('TABLA')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase cursor-pointer transition-colors ${
                  vista === 'TABLA'
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'text-[var(--color-ink)] hover:bg-gray-100'
                } focus:outline-none focus:ring-2 focus:ring-black`}
                title="Ver Tabla de Datos Operativa"
              >
                <ListFilter size={13} /> Tabla
              </button>
            </div>

            <button 
              ref={closeBtnRef}
              id="btn-cerrar-modal-ticket"
              onClick={onClose} 
              title="Cerrar ventana (Esc)"
              aria-label="Cerrar ticket"
              className="p-1.5 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR CENTRAL */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 bg-[var(--color-bg)] relative flex justify-center"
        >
          {isLoadingDetalles ? (
            <div className="absolute inset-0 bg-[var(--color-surface)]/85 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
                <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando ticket...</span>
              </div>
            </div>
          ) : detallesTicket.length === 0 ? (
            <div className="w-full text-center py-10 border-2 border-dashed border-[var(--color-border)] bg-white">
              <p className="text-[var(--color-danger)] text-xs font-black uppercase tracking-widest">No hay productos registrados para este ticket.</p>
            </div>
          ) : vista === 'TICKET' ? (
            /* 🧾 PREVISUALIZACIÓN VISUAL DEL TICKET REAL */
            <div className="transform sm:scale-105 origin-top pb-6 w-full flex justify-center">
              <TicketImprimible
                ref={printContainerRef}
                cart={detallesTicket.map((d) => ({
                  id: String(d.product_id),
                  name: d.product_name,
                  price: Number(d.price_at_moment),
                  cartQuantity: Number(d.quantity),
                  subtotal: Number(d.subtotal),
                  unit: d.unit,
                  numeroSerie: d.numero_serie || undefined,
                  garantiaHasta: d.garantia_hasta || undefined,
                }))}
                total={totalCalculado}
                pagos={{
                  efectivo: ventaInfo?.efectivo || 0,
                  yape: ventaInfo?.yape || 0,
                  tarjeta: ventaInfo?.tarjeta || 0,
                }}
                vuelto={0}
                nroBoleta={String(ticketId).slice(-6)}
                fiadoData={ventaInfo?.fiadoData}
                cliente={ventaInfo?.clienteNombre ? { nombre: ventaInfo.clienteNombre } : null}
                vendedor={ventaInfo?.vendedor}
              />
            </div>
          ) : (
            /* 📋 TABLA DETALLADA DE INSPECCIÓN */
            <div className="w-full bg-white border-2 border-[var(--color-ink)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--color-ink)] text-[var(--color-surface)]">
                  <tr>
                    <th className="p-2 text-[11px] font-black tracking-widest uppercase">Cant/Kg</th>
                    <th className="p-2 text-[11px] font-black tracking-widest uppercase">Producto</th>
                    <th className="p-2 text-[11px] font-black tracking-widest uppercase text-right">P. Unit</th>
                    <th className="p-2 text-[11px] font-black tracking-widest uppercase text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detallesTicket.map((item, index) => (
                    <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                      <td className="p-2 text-xs font-black text-[var(--color-ink)]">{formatearCantidadDetalle(item.quantity)}</td>
                      <td className="p-2 text-xs font-bold text-[var(--color-muted)] uppercase">{item.product_name}
                        {item.presentacion && (
                          <span data-presentacion className="block normal-case text-[11px] text-[var(--color-info)]">
                            {Number(item.presentacion_cantidad)} × {item.presentacion} = {Number(item.quantity)} unidades
                          </span>
                        )}
                        {item.precio_lista != null && Number(item.precio_lista) !== Number(item.price_at_moment) && (
                          <span data-precio-cambiado className="block normal-case text-[11px] text-[var(--color-warning-text)]">
                            Precio cambiado: S/ {Number(item.precio_lista).toFixed(2)} → S/ {Number(item.price_at_moment).toFixed(2)}{item.precio_cambiado_por ? ` · ${item.precio_cambiado_por}` : ''}
                          </span>
                        )}
                        {item.numero_serie && (
                          <span className="block font-mono text-[10px] font-bold text-amber-900 bg-amber-50 px-1 border border-amber-300 w-fit mt-0.5 uppercase">
                            SERIE/IMEI: {item.numero_serie}
                          </span>
                        )}
                        {item.garantia_hasta && (
                          <span className="block font-mono text-[10px] font-bold text-emerald-900 bg-emerald-50 px-1 border border-emerald-300 w-fit mt-0.5 uppercase">
                            🛡️ Garantía hasta: {item.garantia_hasta}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-xs font-mono text-[var(--color-muted)] text-right">S/ {Number(item.price_at_moment).toFixed(2)}</td>
                      <td className="p-2 text-sm font-black font-mono text-[var(--color-ink)] text-right">S/ {Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON SELECTOR DESTACADO */}
        {!isLoadingDetalles && detallesTicket.length > 0 && (
          <div className="border-t-2 border-[var(--color-ink)] p-3 sm:p-4 bg-[var(--color-bg)] flex flex-wrap justify-between items-center gap-3 shrink-0">
             <button
               ref={printBtnRef}
               id="btn-reimprimir-ticket"
               type="button"
               onClick={() => void ejecutarImpresion()}
               className="flex items-center gap-2 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black focus:bg-[var(--color-accent)] focus:text-black focus:outline-none focus:ring-4 focus:ring-black font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
               title="Reimprimir Ticket de Venta (tecla Enter o P)"
             >
               <Printer size={16} /> [ENTER / P] REIMPRIMIR TICKET
             </button>
             <div className="flex items-center gap-3">
               <span className="text-[var(--color-muted)] text-xs font-black uppercase tracking-widest">Total Facturado</span>
               <span className="text-[var(--color-ink)] text-xl font-black font-mono">
                 S/ {totalCalculado.toFixed(2)}
               </span>
             </div>
          </div>
        )}

        {/* Respaldo para cuando la vista esté en TABLA pero el usuario imprima */}
        {vista === 'TABLA' && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <TicketImprimible
              ref={printContainerRef}
              cart={detallesTicket.map((d) => ({
                id: String(d.product_id),
                name: d.product_name,
                price: Number(d.price_at_moment),
                cartQuantity: Number(d.quantity),
                subtotal: Number(d.subtotal),
                unit: d.unit,
                numeroSerie: d.numero_serie || undefined,
                garantiaHasta: d.garantia_hasta || undefined,
              }))}
              total={totalCalculado}
              pagos={{
                efectivo: ventaInfo?.efectivo || 0,
                yape: ventaInfo?.yape || 0,
                tarjeta: ventaInfo?.tarjeta || 0,
              }}
              vuelto={0}
              nroBoleta={String(ticketId).slice(-6)}
              fiadoData={ventaInfo?.fiadoData}
              cliente={ventaInfo?.clienteNombre ? { nombre: ventaInfo.clienteNombre } : null}
              vendedor={ventaInfo?.vendedor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

