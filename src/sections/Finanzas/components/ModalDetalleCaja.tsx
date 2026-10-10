// src/sections/Finanzas/components/ModalDetalleCaja.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Receipt, Download, FileText, ChevronLeft, Eye, RotateCcw, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { TablaMovimientos } from './TablaMovimientos';
import type { UnifiedItem } from '../types';
import { useReactToPrint } from 'react-to-print';
// html2canvas-pro (no el html2canvas normal): Tailwind v4 usa colores oklch() en su CSS, y la
// librería original no sabe interpretarlos (falla al generar la imagen). Este fork sí los soporta.
import html2canvas from 'html2canvas-pro';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ModalDetalleTicket } from '../../../components/ModalDetalleTicket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caja: any;
  onAnular?: (id: string, isTicket?: boolean) => Promise<void>;
  onDelete?: (id: string, isTicket?: boolean) => Promise<void>;
}

export const ModalDetalleCaja: React.FC<Props> = ({ isOpen, onClose, caja, onAnular, onDelete }) => {
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | null>(null);
  const [idsProcesando, setIdsProcesando] = useState<Set<string>>(new Set());
  
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana

  const [tickets, setTickets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDeuda, setFiltroDeuda] = useState('TODOS');
  
  // 🧾 Movimientos manuales de Caja Interna (Ingreso Extra / Gasto-Retiro, registrados desde
  // "Nuevo Movimiento"). Antes el reporte solo mostraba las ventas y estos quedaban afuera.
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 🪟 Dos vistas: "DETALLE" (clara y completa, se ve primero al hacer clic) y "TICKET"
  // (formato angosto 80mm, vista previa antes de imprimir o descargar). Antes solo existía
  // la vista de ticket, forzando a leer todo apretado en un formato pensado para imprimir.
  const [vista, setVista] = useState<'DETALLE' | 'TICKET'>('DETALLE');
  const [descargando, setDescargando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const esAnulada = (t: any) => t.status === 'ANULADO' || t.sunat_status === 'ANULADO';

  const handleAnularInterno = async (id: string) => {
    if (!onAnular) return;
    if (!window.confirm('¿Estás seguro de anular/devolver este ticket?')) return;
    try {
      setIdsProcesando(prev => new Set(prev).add(id));
      await onAnular(id, true);
      await cargarResumenTicket();
    } finally {
      setIdsProcesando(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteInterno = async (id: string) => {
    if (!onDelete) return;
    if (!window.confirm('¿Eliminar este ticket permanentemente?')) return;
    try {
      setIdsProcesando(prev => new Set(prev).add(id));
      await onDelete(id, true);
      await cargarResumenTicket();
    } finally {
      setIdsProcesando(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Resumen_Caja_${caja?.id}`,
  });

  const handleDescargar = async () => {
    if (!printRef.current) return;
    setDescargando(true);
    try {
      const canvas = await html2canvas(printRef.current, { backgroundColor: 'var(--color-surface)', scale: 2 });
      const link = document.createElement('a');
      link.download = `Ticket_Caja_${caja.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('No se pudo descargar el ticket.');
    } finally {
      setDescargando(false);
    }
  };

  useEffect(() => {
    if (isOpen && caja) {
      setVista('DETALLE'); // siempre arranca en la vista clara, no en el ticket
      cargarResumenTicket();
    }
  }, [isOpen, caja]);

  const cargarResumenTicket = async () => {
    setLoading(true);

    // Buscamos ventas en el rango de la caja
        const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', caja.opened_at)
      .lte('created_at', caja.closed_at || new Date().toISOString())
      .order('id', { ascending: false });

    if (sales) {
      const salesIds = sales.map(s => s.id);
      const detailsBySale: Record<string, string[]> = {};
      
      if (salesIds.length > 0) {
        const chunkSize = 200;
        const allDetails: any[] = [];
        for (let i = 0; i < salesIds.length; i += chunkSize) {
          const chunk = salesIds.slice(i, i + chunkSize);
          const { data } = await supabase.from('sale_details').select('sale_id, product_name').in('sale_id', chunk);
          if (data) {
            allDetails.push(...data);
          }
        }
        allDetails.forEach(d => {
          if (!detailsBySale[d.sale_id]) detailsBySale[d.sale_id] = [];
          detailsBySale[d.sale_id].push(d.product_name);
        });
      }
      
      sales.forEach(s => {
        s.productosStr = detailsBySale[s.id]?.join(' ') || '';
      });

      const fiadosMap: any = {};
      const idsConCredito = sales.filter(t => Number(t.amount_credit || 0) > 0).map(t => t.id);

      if (idsConCredito.length > 0) {
        const { data: fiadosData } = await supabase
          .from('fiados')
          .select('sale_id, customer_name, amount, paid_amount')
          .in('sale_id', idsConCredito);
        if (fiadosData) {
          fiadosData.forEach(f => {
            fiadosMap[f.sale_id] = f;
          });
        }
      }

      const ticketsFormateados = sales.map(t => {
        const fiado = t.id ? fiadosMap[String(t.id)] : null;
        const creditoOriginal = Number(t.amount_credit || 0);
        const esFiado = creditoOriginal > 0;
        const montoPagado = Number(t.amount_cash || 0) + Number(t.amount_yape || 0) + Number(t.amount_card || 0) + Number(t.amount_transfer || 0);
        const deudaActual = esFiado ? (fiado ? Math.max(0, Number(fiado.amount || 0) - Number(fiado.paid_amount || 0)) : creditoOriginal) : 0;

        return {
          ...t,
          payment_type: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
          es_fiado: esFiado,
          cliente_nombre: fiado ? fiado.customer_name : null,
          monto_pagado: montoPagado,
          monto_deuda: deudaActual
        };
      });
      setTickets(ticketsFormateados);
    } else {
      setTickets([]);
    }

    // Movimientos manuales de Caja Interna de ESTA sesión (Ingreso Extra / Gasto-Retiro).
    // Los de Caja Externa (personal) no entran: no son plata del negocio, no van en su reporte.
    // Los abonos de fiados (INGRESO_FIADO) tampoco: ya se cuentan en "Final" vía closing_balance.
    const { data: movs } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', String(caja.id))
      .order('created_at');

    const custIds = new Set();
    (movs || []).forEach((m: any) => {
      if (m.description) {
        const match = m.description.match(/Cliente ID: (\d+)/);
        if (match) custIds.add(match[1]);
      }
    });
    const customersMap: Record<string, string> = {};
    if (custIds.size > 0) {
      const { data: custData } = await supabase.from('customers').select('id, name').in('id', Array.from(custIds));
      if (custData) {
        custData.forEach(c => customersMap[c.id] = c.name);
      }
    }
    
    const movsConNombre = (movs || []).map(m => {
      let desc = m.description;
      if (desc) {
        const match = desc.match(/Cliente ID: (\d+)/);
        if (match && customersMap[match[1]]) {
          desc = desc.replace(`Cliente ID: ${match[1]}`, `Cliente: ${customersMap[match[1]]}`);
        }
      }
      return { ...m, description: desc };
    });
    
    setMovimientos(movsConNombre);

    setLoading(false);
  };

  if (!isOpen || !caja) return null;

  const ventasValidas = tickets.filter(t => t.sunat_status !== 'ANULADO');
  const movsInternos = movimientos.filter(m => m.flujo === 'INTERNO' || !m.flujo || String(m.flujo) === 'INGRESO_FIADO');
  const movsExternos = movimientos.filter(m => m.flujo === 'EXTERNO');
  const totalInternos = movsInternos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);
  const totalExternos = movsExternos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);
  const totalMovimientos = movimientos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);

  const unificados: UnifiedItem[] = [];

  tickets.forEach((t: any) => {
    unificados.push({
      id: String(t.id),
      created_at: t.created_at,
      isTicket: true,
      tipo: 'VENTA',
      descripcion: `Ticket #${String(t.id).slice(-6)}`,
      metodo_pago: t.payment_type,
      monto: Number(t.total) || 0,
      estado: esAnulada(t) ? 'ANULADO' : 'COMPLETADO',
      es_fiado: t.es_fiado,
      productosStr: t.productosStr,
      cliente_nombre: t.cliente_nombre,
      flujo: 'INTERNO',
      monto_pagado: t.monto_pagado,
      monto_deuda: t.monto_deuda,
      total: t.total
    });
  });

  const anuladasDeEstaCaja = new Set(tickets.filter((t: any) => t.sunat_status === 'ANULADO' || t.status === 'ANULADO').map((t: any) => String(t.id).slice(-6)));

  movimientos.forEach((m: any) => {
    if (m.flujo === 'DEVOLUCION') {
      const match = /#(\w{1,6})\)?\s*$/.exec(String(m.description || ''));
      if (match && anuladasDeEstaCaja.has(match[1])) return; // Ocultar para evitar "duplicado" visual
    }
    unificados.push({
      id: String(m.id),
      created_at: m.created_at,
      isTicket: false,
      tipo: m.type,
      descripcion: m.description,
      metodo_pago: m.payment_type,
      monto: Number(m.amount) || 0,
      flujo: m.flujo
    });
  });

  unificados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-5xl h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.9)] flex flex-col">

        <div className="bg-[var(--color-info)] p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-white gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {vista === 'TICKET' && (
              <button
                onClick={() => setVista('DETALLE')}
                className="flex items-center gap-1 bg-white text-[var(--color-ink)] px-2.5 py-1.5 border-2 border-[var(--color-ink)] font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shrink-0 rounded-none"
                title="Volver al detalle"
              >
                <ChevronLeft size={16} strokeWidth={3} /> Volver
              </button>
            )}
            <h2 className="font-black uppercase tracking-widest flex items-center gap-2 text-base sm:text-lg truncate">
              <Receipt size={22} className="shrink-0" /> <span className="truncate">{vista === 'DETALLE' ? 'Detalle de Caja' : 'Ticket'} #{caja.id}</span>
            </h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform cursor-pointer shrink-0">
            <X size={26} strokeWidth={3} />
          </button>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
              <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
            </div>
          ) : vista === 'DETALLE' ? (
          <>
            {/* VISTA CLARA: todo lo que hubo, sin el formato angosto de ticket */}
            <div className="flex-1 overflow-hidden flex flex-col">
<div className="p-4 sm:p-6 pb-4 flex flex-col gap-4 shrink-0 overflow-y-auto max-h-[40vh] custom-scrollbar">

              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Apertura</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{new Date(caja.opened_at).toLocaleString('es-PE')}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Cierre</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE') : '---'}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Fondo Inicial</p>
                  <p className="text-base font-black text-[var(--color-ink)]">S/ {Number(caja.opening_balance).toFixed(2)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Saldo Final Contado</p>
                  <p className="text-base font-black text-[var(--color-ink)]">S/ {(Number(caja.closing_balance || 0) + Number(caja.closing_yape || 0) + Number(caja.closing_card || 0)).toFixed(2)}</p>
                </div>
              </div>

              {caja.justification && (
                <div className="border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-3">
                  <p className="text-xs font-black text-[var(--color-warning-dark)] uppercase mb-1">Justificación de la diferencia</p>
                  <p className="text-sm font-bold text-[var(--color-ink)]">{caja.justification}</p>
                </div>
              )}

              
                            </div>
<div className="px-4 sm:px-6 pb-4 shrink-0">
<div className="p-3 sm:p-4 bg-[var(--color-bg)] border-2 border-[var(--color-ink)] flex flex-wrap gap-3">
               <div className="relative flex-1 min-w-[200px]">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-[var(--color-ink)] text-white w-10 justify-center">
                   <Search size={16} />
                 </div>
                 <input
                   type="text"
                   placeholder="BUSCAR POR CLIENTE, N° TICKET O DETALLE"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-3 py-2.5 text-xs font-bold uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none"
                 />
               </div>
               <select
                 value={filtroCategoria}
                 onChange={(e) => setFiltroCategoria(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white flex-1 min-w-[140px]"
               >
                 <option value="TODOS">Categoría: TODAS</option>
                 <option value="VENTAS">Solo Ventas</option>
                 <option value="PAGOS_DEUDAS">Pagos de Deudas</option>
                 <option value="MOV_INTERNOS">Mov. Internos</option>
                 <option value="MOV_EXTERNOS">Mov. Externos</option>
               </select>
               <select
                 value={filtroEstado}
                 onChange={(e) => setFiltroEstado(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white flex-1 min-w-[140px]"
               >
                 <option value="TODOS">Estado: TODOS</option>
                 <option value="COMPLETADO">COMPLETADOS</option>
                 <option value="ANULADO">ANULADOS</option>
               </select>
               <select
                 value={filtroDeuda}
                 onChange={(e) => setFiltroDeuda(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white flex-1 min-w-[140px]"
               >
                 <option value="TODOS">Deuda: TODAS</option>
                 <option value="CON_DEUDA">CON DEUDA</option>
                 <option value="SIN_DEUDA">SIN DEUDA</option>
               </select>
             </div>
             </div>
              <div className="flex-1 overflow-auto bg-[var(--color-bg-2)] min-h-0 custom-scrollbar border-t-2 border-[var(--color-ink)]">
                <TablaMovimientos 
                  movimientos={unificados.filter(m => {
                  // SEARCH
                  if (searchTerm) {
                     const st = searchTerm.toLowerCase();
                     const matchDesc = m.descripcion?.toLowerCase().includes(st);
                     const matchCli = m.cliente_nombre?.toLowerCase().includes(st);
                     const matchTicket = m.isTicket && ('#' + String(m.id).slice(-6)).includes(st);
                     const matchMonto = String(m.monto).includes(st);
                     const matchProd = m.productosStr?.toLowerCase().includes(st);
                     if (!matchDesc && !matchCli && !matchTicket && !matchMonto && !matchProd) return false;
                  }
                  // ESTADO (Por defecto completado si no tiene estado)
                  const st = m.estado || 'COMPLETADO';
                  if (filtroEstado !== 'TODOS' && st !== filtroEstado) return false;
                  // DEUDA
                  if (filtroDeuda === 'CON_DEUDA' && !(Number(m.monto_deuda) > 0)) return false;
                  if (filtroDeuda === 'SIN_DEUDA' && Number(m.monto_deuda) > 0) return false;
                  // CATEGORIA
                  if (filtroCategoria !== 'TODOS') {
                    const isAbono = m.descripcion?.includes('ABONO DE FIADO');
                    if (filtroCategoria === 'VENTAS' && !m.isTicket) return false;
                    if (filtroCategoria === 'PAGOS_DEUDAS' && !isAbono) return false;
                    if (filtroCategoria === 'MOV_INTERNOS' && (m.isTicket || isAbono || m.flujo === 'EXTERNO')) return false;
                    if (filtroCategoria === 'MOV_EXTERNOS' && m.flujo !== 'EXTERNO') return false;
                  }
                  return true;
                })} 
                  onDelete={onDelete ? handleDeleteInterno : undefined as any}
                  onAnularTicket={onAnular ? handleAnularInterno : undefined as any}
                  onVerTicket={(id) => setTicketSeleccionado(id)}
                  idsAnulando={idsProcesando}
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)]">
              <button
                onClick={() => setVista('TICKET')}
                className="w-full bg-[var(--color-ink)] text-white p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-info)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 cursor-pointer"
              >
                <FileText size={20} /> Ver Ticket para Imprimir / Descargar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* VISTA TICKET: formato angosto 80mm, vista previa antes de imprimir o descargar */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[var(--color-bg-2)]">
              <div ref={printRef} className="bg-white p-4 text-[var(--color-ink)] w-[80mm] mx-auto border border-dashed border-gray-300 shadow-md print:border-0 print:p-0 print:shadow-none">
                <div className="text-center border-b-2 border-black pb-2 mb-4">
                  <h3 className="font-black text-lg uppercase">Resumen de Caja</h3>
                  <p className="text-[12px] font-bold">ID: {caja.id}</p>
                  <p className="text-[12px]">Desde: {new Date(caja.opened_at).toLocaleString()}</p>
                  <p className="text-[12px]">Hasta: {caja.closed_at ? new Date(caja.closed_at).toLocaleString() : '---'}</p>
                </div>

                <table className="w-full text-[12px] mb-4">
                  <thead>
                    <tr className="border-b border-black text-left">
                      <th>HORA</th>
                      <th>MET.</th>
                      <th className="text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasValidas.map(t => (
                      <tr key={t.id}>
                        <td className="py-1">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="uppercase">{t.payment_type}</td>
                        <td className="text-right">S/ {Number(t.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {movimientos.length > 0 && (
                  <table className="w-full text-[12px] mb-4">
                    <thead>
                      <tr className="border-b border-black text-left">
                        <th colSpan={2}>MOVIMIENTOS DE CAJA</th>
                        <th className="text-right">MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map(m => (
                        <tr key={m.id}>
                          <td className="py-1" colSpan={2}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {m.description}
                          </td>
                          <td className={`text-right ${m.type === 'INGRESO' ? 'text-green-700' : 'text-red-700'}`}>
                            {m.type === 'INGRESO' ? '+' : '-'} S/ {Number(m.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="border-t-2 border-black pt-2 space-y-1 font-black text-xs uppercase">
                  <div className="flex justify-between"><span>Base:</span><span>S/ {Number(caja.opening_balance).toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Efectivo:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_cash || 0), 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-blue-600"><span>Yape:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_yape || 0), 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-purple-600"><span>Tarjeta:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_card || 0), 0).toFixed(2)}</span></div>
                  {movimientos.length > 0 && (
                    <div className="flex justify-between text-[var(--color-ink)]">
                      <span>Movimientos (Ingresos - Gastos):</span>
                      <span>S/ {totalMovimientos.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-1 text-lg">
                    <span>Final:</span>
                    <span>S/ {Number(caja.closing_balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] flex gap-2">
              <button
                onClick={handleDescargar}
                disabled={descargando}
                className="flex-1 bg-white text-[var(--color-ink)] p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-border)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 disabled:opacity-50 cursor-pointer"
              >
                <Download size={20} /> {descargando ? 'Descargando...' : 'Descargar'}
              </button>
              <button
                onClick={() => handlePrint()}
                className="flex-1 bg-[var(--color-ink)] text-white p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-accent)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 cursor-pointer"
              >
                <Printer size={20} /> Imprimir
              </button>
            </div>
          </>
        )}

            </div>
    </div>
    {ticketSeleccionado && (
      <ModalDetalleTicket
        ticketId={ticketSeleccionado}
        onClose={() => setTicketSeleccionado(null)}
      />
    )}
    </>
  );
};



