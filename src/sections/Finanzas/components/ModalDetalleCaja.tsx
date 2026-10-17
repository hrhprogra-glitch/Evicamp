import { coincideBusqueda } from '../../../utils/busqueda';
import { formatearCantidadDetalle } from '../../../utils/formato';
// src/sections/Finanzas/components/ModalDetalleCaja.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Receipt, Download, FileText, ChevronLeft, Eye, RotateCcw, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { TablaMovimientos } from './TablaMovimientos';
import type { UnifiedItem } from '../types';
import { useImprimir } from '../../../utils/impresion';
import { numeroTicketDe, autorDe } from '../../../utils/movimientosCaja';
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useCerrarConEscape(isOpen, () => {
    if (vista === 'TICKET') setVista('DETALLE');
    else onClose();
  }); // Escape (o "Atrás" del control de TV) cierra la ventana o vuelve a DETALLE

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

  const handlePrint = useImprimir(printRef, `Resumen_Caja_${caja?.id}`);

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

  // ⌨️ NAVEGACIÓN TOTAL POR TECLADO DENTRO DE MODAL DETALLE DE CAJA
  useEffect(() => {
    if (!isOpen || vista !== 'DETALLE' || ticketSeleccionado || loading) return;

    // Auto-enfocar el buscador al abrir el modal
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (ticketSeleccionado) return;

      const active = document.activeElement as HTMLElement;

      // ================= FOCUS TRAP PARA TAB =================
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const modalContainer = document.getElementById('modal-detalle-caja-container');
        if (modalContainer) {
          const focusables = Array.from(modalContainer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), tr[data-row="true"][role="button"]'
          )).filter(el => el.tabIndex !== -1 && !el.classList.contains('hidden') && el.offsetParent !== null);

          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && (active === first || !focusables.includes(active))) {
              last.focus();
            } else if (!e.shiftKey && (active === last || !focusables.includes(active))) {
              first.focus();
            } else {
              const idx = focusables.indexOf(active);
              if (idx !== -1) {
                const target = e.shiftKey ? focusables[idx - 1] : focusables[idx + 1];
                if (target) target.focus();
              } else {
                first.focus();
              }
            }
          }
        }
        return;
      }
      // =======================================================

      // 🛡️ RESCATE DE FOCO PERDIDO: Si el foco quedó en el body, fuera del modal o en un elemento no interactivo
      const modalContainer = document.getElementById('modal-detalle-caja-container');
      const isSearch = active?.id === 'buscador-detalle-caja';
      const isSelect = ['filtro-categoria-detalle-caja', 'filtro-estado-detalle-caja', 'filtro-deuda-detalle-caja'].includes(active?.id || '');
      const isRowOrChild = !!active?.closest('#tabla-movimientos-caja tr[data-row="true"]');
      const isKnownButton = active?.id === 'btn-ver-ticket-caja' || active?.id === 'btn-cerrar-modal-detalle-caja';

      if (!active || (modalContainer && !modalContainer.contains(active)) || (!isSearch && !isSelect && !isRowOrChild && !isKnownButton)) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          const firstRow = document.querySelector('#tabla-movimientos-caja tr[data-row="true"]') as HTMLElement;
          if (firstRow) {
            firstRow.focus();
            firstRow.scrollIntoView({ block: 'nearest' });
          } else {
            searchInputRef.current?.focus();
          }
          return;
        }
      }

      // 1. Buscador
      if (active.id === 'buscador-detalle-caja') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          const firstRow = document.querySelector('#tabla-movimientos-caja tr[data-row="true"]') as HTMLElement;
          if (firstRow) {
            firstRow.focus();
            firstRow.scrollIntoView({ block: 'nearest' });
          } else {
            document.getElementById('btn-ver-ticket-caja')?.focus();
          }
        } else if (e.key === 'ArrowRight') {
          const input = active as HTMLInputElement;
          if (input.selectionStart === input.value.length) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('filtro-categoria-detalle-caja')?.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          document.getElementById('btn-cerrar-modal-detalle-caja')?.focus();
        }
        return;
      }

      // 2. Selects de filtros (Patrón filtros Evicamp)
      if (['filtro-categoria-detalle-caja', 'filtro-estado-detalle-caja', 'filtro-deuda-detalle-caja'].includes(active.id)) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          const firstRow = document.querySelector('#tabla-movimientos-caja tr[data-row="true"]') as HTMLElement;
          if (firstRow) {
            firstRow.focus();
            firstRow.scrollIntoView({ block: 'nearest' });
          } else {
            document.getElementById('btn-ver-ticket-caja')?.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          document.getElementById('btn-cerrar-modal-detalle-caja')?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          if (active.id === 'filtro-categoria-detalle-caja') searchInputRef.current?.focus();
          else if (active.id === 'filtro-estado-detalle-caja') document.getElementById('filtro-categoria-detalle-caja')?.focus();
          else if (active.id === 'filtro-deuda-detalle-caja') document.getElementById('filtro-estado-detalle-caja')?.focus();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          if (active.id === 'filtro-categoria-detalle-caja') document.getElementById('filtro-estado-detalle-caja')?.focus();
          else if (active.id === 'filtro-estado-detalle-caja') document.getElementById('filtro-deuda-detalle-caja')?.focus();
        }
        return;
      }

      // 3. Fila de la tabla o botón dentro de la fila (Patrón selector de Evicamp)
      const currentRow = active.closest('#tabla-movimientos-caja tr[data-row="true"]') as HTMLElement;
      if (currentRow) {
        const rows = Array.from(document.querySelectorAll('#tabla-movimientos-caja tr[data-row="true"]')) as HTMLElement[];
        const rowIndex = rows.indexOf(currentRow);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          if (rowIndex < rows.length - 1) {
            rows[rowIndex + 1].focus();
            rows[rowIndex + 1].scrollIntoView({ block: 'nearest' });
          } else {
            document.getElementById('btn-ver-ticket-caja')?.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          if (rowIndex > 0) {
            rows[rowIndex - 1].focus();
            rows[rowIndex - 1].scrollIntoView({ block: 'nearest' });
          } else {
            // Fila 0: Subir al buscador y seleccionar texto para no quedar atrapado en la tabla
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else if (e.key === 'ArrowRight') {
          const buttons = Array.from(currentRow.querySelectorAll('button:not([disabled])')) as HTMLElement[];
          if (buttons.length > 0) {
            const btnIndex = buttons.indexOf(active);
            if (btnIndex === -1) {
              e.preventDefault();
              e.stopPropagation();
              buttons[0].focus();
            } else if (btnIndex < buttons.length - 1) {
              e.preventDefault();
              e.stopPropagation();
              buttons[btnIndex + 1].focus();
            }
          }
        } else if (e.key === 'ArrowLeft') {
          const buttons = Array.from(currentRow.querySelectorAll('button:not([disabled])')) as HTMLElement[];
          const btnIndex = buttons.indexOf(active);
          if (btnIndex > 0) {
            e.preventDefault();
            e.stopPropagation();
            buttons[btnIndex - 1].focus();
          } else if (btnIndex === 0) {
            e.preventDefault();
            e.stopPropagation();
            currentRow.focus();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
        return;
      }

      // 4. Botón inferior "Ver Ticket para Imprimir / Descargar"
      if (active.id === 'btn-ver-ticket-caja') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          const rows = Array.from(document.querySelectorAll('#tabla-movimientos-caja tr[data-row="true"]')) as HTMLElement[];
          if (rows.length > 0) {
            rows[rows.length - 1].focus();
            rows[rows.length - 1].scrollIntoView({ block: 'nearest' });
          } else {
            searchInputRef.current?.focus();
          }
        } else if (e.key === 'ArrowDown') {
          // 🛡️ TOPE INFERIOR: No escapar del botón inferior
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // 5. Botón cerrar
      if (active.id === 'btn-cerrar-modal-detalle-caja') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          // 🛡️ TOPE: No escapar del botón cerrar
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, { capture: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleModalKeyDown, { capture: true });
    };
  }, [isOpen, vista, ticketSeleccionado, loading]);

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
          const { data } = await supabase.from('sale_details').select('sale_id, product_name, quantity').in('sale_id', chunk);
          if (data) {
            allDetails.push(...data);
          }
        }
        allDetails.forEach(d => {
          if (!detailsBySale[d.sale_id]) detailsBySale[d.sale_id] = [];
          const qty = Number(d.quantity);
          const qtyStr = formatearCantidadDetalle(d.quantity);
          const str = qty > 1 ? `${qtyStr}x ${d.product_name}` : d.product_name;
          detailsBySale[d.sale_id].push(str);
        });
      }
      
      sales.forEach(s => {
        s.productosStr = detailsBySale[s.id]?.join(', ') || '';
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

  // Devoluciones por ticket (igual que en Finanzas): el ticket anulado muestra cuánto se devolvió y quién
  const devolucionesPorTicket = new Map<string, { monto: number; autor: string | null }>();
  movimientos.forEach((m: any) => {
    if (m.flujo !== 'DEVOLUCION') return;
    const ticket = numeroTicketDe(m.description);
    if (!ticket) return;
    const previa = devolucionesPorTicket.get(ticket);
    devolucionesPorTicket.set(ticket, { monto: (previa?.monto || 0) + Number(m.amount || 0), autor: previa?.autor || autorDe(m.description) });
  });

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
      total: t.total,
      vendedor: t.vendedor || null,
      devolucion: esAnulada(t) ? devolucionesPorTicket.get(String(t.id).slice(-6)) || null : null
    });
  });

  const anuladasDeEstaCaja = new Set(tickets.filter((t: any) => t.sunat_status === 'ANULADO' || t.status === 'ANULADO').map((t: any) => String(t.id).slice(-6)));

  movimientos.forEach((m: any) => {
    if (m.flujo === 'DEVOLUCION') {
      const ticket = numeroTicketDe(m.description);
      if (ticket && anuladasDeEstaCaja.has(ticket)) return; // Ocultar para evitar "duplicado" visual
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
    <div 
      id="modal-detalle-caja-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalle-caja-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 font-mono"
    >
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-6xl h-[calc(var(--alto-pantalla)*0.95)] sm:h-[calc(var(--alto-pantalla)*0.92)] flex flex-col rounded-none animate-fade-in overflow-hidden">

        <div className="bg-[var(--color-info)] p-3 sm:p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-white gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {vista === 'TICKET' && (
              <button
                id="btn-volver-detalle-caja"
                onClick={() => setVista('DETALLE')}
                className="flex items-center gap-1 bg-white text-[var(--color-ink)] px-2.5 py-1.5 border-2 border-[var(--color-ink)] font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shrink-0 rounded-none"
                title="Volver al detalle"
              >
                <ChevronLeft size={16} strokeWidth={3} /> Volver
              </button>
            )}
            <h2 id="modal-detalle-caja-title" className="font-black uppercase tracking-widest flex items-center gap-2 text-base sm:text-lg truncate">
              <Receipt size={22} className="shrink-0" /> <span className="truncate">{vista === 'DETALLE' ? 'Detalle de Caja' : 'Ticket'} #{caja.id}</span>
            </h2>
          </div>
          <button 
            id="btn-cerrar-modal-detalle-caja"
            onClick={onClose} 
            title="Cerrar modal (Esc)"
            aria-label="Cerrar modal"
            className="p-1 hover:text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-white focus:bg-[var(--color-ink)] focus:text-white transition-all cursor-pointer shrink-0 rounded-none"
          >
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
            {/* VISTA CLARA: todo lo que hubo, con mayor espacio vertical para la tabla */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col min-h-0">
              {/* Tarjetas resumen compactas para dar más espacio a la tabla */}
              <div className="p-3 sm:p-4 pb-2 flex flex-col gap-2 shrink-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="border-2 border-[var(--color-border)] p-2.5 bg-[var(--color-bg)]">
                    <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-wider">Apertura</p>
                    <p className="text-xs sm:text-sm font-black text-[var(--color-ink)] truncate">{new Date(caja.opened_at).toLocaleString('es-PE')}</p>
                  </div>
                  <div className="border-2 border-[var(--color-border)] p-2.5 bg-[var(--color-bg)]">
                    <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-wider">Cierre</p>
                    <p className="text-xs sm:text-sm font-black text-[var(--color-ink)] truncate">{caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE') : '---'}</p>
                  </div>
                  <div className="border-2 border-[var(--color-border)] p-2.5 bg-[var(--color-bg)]">
                    <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-wider">Fondo Inicial</p>
                    <p className="text-xs sm:text-sm font-black text-[var(--color-ink)] whitespace-nowrap">S/ {Number(caja.opening_balance).toFixed(2)}</p>
                  </div>
                  <div className="border-2 border-[var(--color-border)] p-2.5 bg-[var(--color-bg)]">
                    <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-wider">Saldo Final Contado</p>
                    <p className="text-xs sm:text-sm font-black text-[var(--color-ink)] whitespace-nowrap">S/ {(Number(caja.closing_balance || 0) + Number(caja.closing_yape || 0) + Number(caja.closing_card || 0)).toFixed(2)}</p>
                  </div>
                </div>

                {caja.justification && (
                  <div className="border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-2">
                    <p className="text-[10px] font-black text-[var(--color-warning-dark)] uppercase mb-0.5">Justificación de la diferencia</p>
                    <p className="text-xs font-bold text-[var(--color-ink)]">{caja.justification}</p>
                  </div>
                )}
              </div>

              {/* Barra de Filtros con navegación espacial */}
              <div className="px-3 sm:px-4 pb-2.5 shrink-0">
                <div className="p-2 sm:p-2.5 bg-[var(--color-bg)] border-2 border-[var(--color-ink)] grid grid-cols-2 lg:flex lg:flex-wrap gap-2 items-center">
                  <div className="relative col-span-2 lg:flex-1 lg:min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-[var(--color-ink)] text-white w-9 justify-center">
                      <Search size={14} />
                    </div>
                    <input
                      id="buscador-detalle-caja"
                      ref={searchInputRef}
                      type="text"
                      placeholder="BUSCAR POR CLIENTE, N° TICKET O DETALLE"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-3 py-2 text-xs font-bold uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] bg-white rounded-none"
                    />
                  </div>
                  <select
                    id="filtro-categoria-detalle-caja"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="px-2.5 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] cursor-pointer bg-white lg:flex-1 min-w-0 lg:min-w-[130px] rounded-none"
                  >
                    <option value="TODOS">Categoría: TODAS</option>
                    <option value="VENTAS">Solo Ventas</option>
                    <option value="PAGOS_DEUDAS">Pagos de Deudas</option>
                    <option value="MOV_INTERNOS">Mov. Internos</option>
                    <option value="MOV_EXTERNOS">Mov. Externos</option>
                  </select>
                  <select
                    id="filtro-estado-detalle-caja"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-2.5 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] cursor-pointer bg-white lg:flex-1 min-w-0 lg:min-w-[130px] rounded-none"
                  >
                    <option value="TODOS">Estado: TODOS</option>
                    <option value="COMPLETADO">COMPLETADOS</option>
                    <option value="ANULADO">ANULADOS</option>
                  </select>
                  <select
                    id="filtro-deuda-detalle-caja"
                    value={filtroDeuda}
                    onChange={(e) => setFiltroDeuda(e.target.value)}
                    className="col-span-2 px-2.5 py-2 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] cursor-pointer bg-white lg:flex-1 min-w-0 lg:min-w-[130px] rounded-none"
                  >
                    <option value="TODOS">Deuda: TODAS</option>
                    <option value="CON_DEUDA">CON DEUDA</option>
                    <option value="SIN_DEUDA">SIN DEUDA</option>
                  </select>
                </div>
              </div>

              {/* Contenedor ampliado para la tabla */}
              <div className="shrink-0 lg:shrink lg:flex-1 overflow-x-auto lg:overflow-auto bg-[var(--color-bg-2)] lg:min-h-0 custom-scrollbar border-t-2 border-[var(--color-ink)]">
                <TablaMovimientos 
                  movimientos={unificados.filter(m => {
                    // SEARCH
                    if (searchTerm && searchTerm.trim()) {
                       const ticketId = m.isTicket ? ('#' + String(m.id).slice(-6)) : '';
                       const match = coincideBusqueda(
                         [m.descripcion, m.cliente_nombre, m.productosStr, ticketId, String(m.monto)],
                         searchTerm
                       );
                       if (!match) return false;
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

            <div className="p-3 sm:p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] shrink-0">
              <button
                id="btn-ver-ticket-caja"
                onClick={() => setVista('TICKET')}
                className="w-full bg-[var(--color-ink)] text-white p-3 sm:p-3.5 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-info)] focus:outline-none focus:ring-4 focus:ring-[var(--color-info)] transition-all border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 cursor-pointer rounded-none"
              >
                <FileText size={18} /> Ver Ticket para Imprimir / Descargar
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



