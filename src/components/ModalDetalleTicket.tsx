import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Printer, Receipt, ListFilter, ArrowLeftRight, Undo2, RefreshCw, ExternalLink, FileMinus } from 'lucide-react';
import { supabase } from '../db/supabase';
import { formatearCantidadDetalle } from '../utils/formato';
import { useImprimir, estaImprimiendo } from '../utils/impresion';
import { avisar } from '../utils/dialogos';
import { TicketImprimible, type ComprobanteTicket } from '../sections/Punto-de-venta/components/TicketImprimible';
import { calcularTotalesCPE, comprobanteEmitido, nombreComprobante, numeroComprobante } from '../utils/comprobante';
import { InsigniaCpe } from './InsigniaCpe';
import { TicketNotaCredito, type NotaCredito } from './TicketNotaCredito';

interface Props {
  ticketId: string | null;
  onClose: () => void;
  /** modo 'DEVOLVER': abre la ventana del cambio en "Solo devolver" (boleta/factura) */
  onCambiarProducto?: (ticketId: string, modo?: 'CAMBIO' | 'DEVOLVER') => void;
}

// Estado ante SUNAT de una venta con boleta/factura (se refresca mientras el ticket está abierto)
interface EstadoSunat {
  docType: number; numero: string; estado: string | null; mensaje: string | null; modo: string | null;
  pdf: string | null; xml: string | null; cdr: string | null; anulada: boolean; fiado: boolean;
}

export const ModalDetalleTicket: React.FC<Props> = ({ ticketId, onClose, onCambiarProducto }) => {
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
    comprobante?: ComprobanteTicket | null; // fase 11.4: boleta o factura electrónica de la venta
    nroComprobante?: string;
  } | null>(null);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);
  const [vista, setVista] = useState<'TICKET' | 'TABLA'>('TICKET');
  // Boleta/factura: estado ante SUNAT, sus notas de crédito y la que se está reimprimiendo
  const [sunat, setSunat] = useState<EstadoSunat | null>(null);
  const [notas, setNotas] = useState<NotaCredito[]>([]);
  const [notaAbierta, setNotaAbierta] = useState<NotaCredito | null>(null);
  const notaAbiertaRef = useRef(false);
  notaAbiertaRef.current = Boolean(notaAbierta);

  const cargarSunat = useCallback(async (v?: any) => {
    if (!ticketId) return;
    const venta = v ?? (await supabase.from('sales').select('*').eq('id', ticketId).maybeSingle()).data;
    if (!venta?.doc_type) { setSunat(null); setNotas([]); return; }
    setSunat({
      docType: Number(venta.doc_type), numero: numeroComprobante(venta.doc_serial, venta.doc_number) || 'POR NUMERAR',
      estado: venta.cpe_estado || null, mensaje: venta.cpe_mensaje || null, modo: venta.cpe_modo || null,
      pdf: venta.cpe_pdf || null, xml: venta.cpe_xml || null, cdr: venta.cpe_cdr || null,
      anulada: venta.sunat_status === 'ANULADO', fiado: Number(venta.amount_credit || 0) > 0,
    });
    const { data } = await supabase.from('notas_credito').select('*').eq('sale_id', ticketId).order('id');
    setNotas((data as NotaCredito[]) || []);
  }, [ticketId]);

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
            .select('*')
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
            montoDeuda: Number(fiado.amount ?? fiado.total ?? 0) - Number(fiado.paid_amount || 0),
            fechaVencimiento: (fiado.expected_pay_date || fiado.due_date) ? new Date(fiado.expected_pay_date || fiado.due_date).toLocaleDateString('es-PE') : 'Sin fecha',
            clienteNombre: clienteNombre || 'CLIENTE',
            clienteDni: fiado.customer_dni || '',
            clienteTelefono: fiado.customer_phone || ''
          };
        }

        const totalCalc = detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
        const v: any = ventaRes.data || {};
        const comprobante: ComprobanteTicket | null = v.doc_type ? {
          docType: Number(v.doc_type),
          serie: v.doc_serial || null,
          numero: v.doc_number || null,
          modo: v.cpe_modo || null,
          clienteTipoDoc: v.cpe_cliente_tipo_doc || 'SIN',
          clienteNumDoc: v.cpe_cliente_num_doc || '',
          clienteNombre: v.cpe_cliente_nombre || '',
          clienteDireccion: v.cpe_cliente_direccion || '',
          fecha: v.created_at,
          hash: v.sunat_hash || null,
          totales: calcularTotalesCPE(detalles.map((d: any) => ({ subtotal: Number(d.subtotal), cantidad: Number(d.quantity), tipoIgv: d.tipo_igv, esBolsa: d.es_bolsa }))),
        } : null;

        setVentaInfo({
          clienteNombre: clienteNombre || null,
          metodoPago: ventaRes.data?.payment_type || null,
          vendedor: (ventaRes.data as any)?.seller_name || null,
          fecha: ventaRes.data?.created_at || null,
          efectivo: Number(ventaRes.data?.amount_cash || (ventaRes.data?.payment_type === 'EFECTIVO' ? totalCalc : 0)),
          yape: Number(ventaRes.data?.amount_yape || (ventaRes.data?.payment_type === 'YAPE' ? totalCalc : 0)),
          tarjeta: Number(ventaRes.data?.amount_card || (ventaRes.data?.payment_type === 'TARJETA' ? totalCalc : 0)),
          fiadoData,
          comprobante,
          nroComprobante: comprobante ? (numeroComprobante(comprobante.serie, comprobante.numero) || 'POR NUMERAR') : undefined,
        });
        await cargarSunat(v);
      } catch (error) {
        console.error('Error fetching ticket details:', error);
      } finally {
        setIsLoadingDetalles(false);
      }
    };
    fetchDetalles();
  }, [ticketId, cargarSunat]);

  // El facturador cambia el estado solo (cada pocos segundos): se refresca mientras está abierto
  const tieneComprobante = Boolean(sunat);
  useEffect(() => {
    if (!ticketId || !tieneComprobante) return;
    const t = setInterval(() => void cargarSunat(), 8000);
    return () => clearInterval(t);
  }, [ticketId, tieneComprobante, cargarSunat]);

  const reenviar = async (nota?: NotaCredito) => {
    const { error } = nota
      ? await supabase.rpc('fn_reenviar_nota_credito', { p_id: nota.id })
      : await supabase.rpc('fn_reenviar_comprobante', { p_sale_id: Number(ticketId) });
    if (error) return avisar(error.message);
    await cargarSunat();
    avisar(`${nota ? numeroComprobante(nota.doc_serial, nota.doc_number) : sunat?.numero}: se volverá a enviar en unos segundos.`);
  };

  // Solo una boleta/factura ya ACEPTADA se corrige con nota de crédito (con error, primero se reenvía)
  const puedeDevolver = Boolean(onCambiarProducto && sunat && comprobanteEmitido(sunat.estado, sunat.pdf) && !sunat.anulada && !sunat.fiado);
  const puedeDevolverRef = useRef(false);
  puedeDevolverRef.current = puedeDevolver;
  const accionesSunat = sunat ? [
    ...((sunat.estado === 'ERROR' || sunat.estado === 'PENDIENTE') && !sunat.anulada ? [{ id: 'btn-sunat-reenviar', texto: 'Reenviar a SUNAT', Icono: RefreshCw, hacer: () => reenviar() }] : []),
    ...(sunat.pdf ? [{ id: 'btn-sunat-pdf', texto: 'PDF', Icono: ExternalLink, hacer: () => window.open(sunat.pdf!, '_blank') }] : []),
    ...(sunat.xml ? [{ id: 'btn-sunat-xml', texto: 'XML', Icono: ExternalLink, hacer: () => window.open(sunat.xml!, '_blank') }] : []),
    ...(sunat.cdr ? [{ id: 'btn-sunat-cdr', texto: 'Constancia (CDR)', Icono: ExternalLink, hacer: () => window.open(sunat.cdr!, '_blank') }] : []),
    ...notas.flatMap((n) => [
      { id: `btn-sunat-nc-${n.id}`, texto: `Nota de crédito ${numeroComprobante(n.doc_serial, n.doc_number)}`, Icono: FileMinus, hacer: () => setNotaAbierta(n) },
      ...(n.cpe_estado === 'ERROR' || n.cpe_estado === 'PENDIENTE'
        ? [{ id: `btn-sunat-nc-reenviar-${n.id}`, texto: `Reenviar ${numeroComprobante(n.doc_serial, n.doc_number)}`, Icono: RefreshCw, hacer: () => reenviar(n) }] : []),
    ]),
  ] : [];

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
      // Mientras la ventana de impresion este abierta, el teclado es del dialogo de la impresora
      if (estaImprimiendo()) return;
      // Con el ticket de una nota de crédito abierto encima, el teclado es de esa ventana
      if (notaAbiertaRef.current) return;

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
      // Filas: cabecera (pestañas y X) → acciones SUNAT (si es boleta/factura) → pie (Reimprimir, Cambiar, Devolver)
      const active = document.activeElement as HTMLElement | null;
      const btnPrint = document.getElementById('btn-reimprimir-ticket');
      const btnCerrar = closeBtnRef.current;
      const tabTicket = document.getElementById('btn-tab-ticket');
      const tabTabla = document.getElementById('btn-tab-tabla');
      const cabecera = [tabTicket, tabTabla, btnCerrar].filter(Boolean) as HTMLElement[];
      const filaSunat = Array.from(document.querySelectorAll<HTMLElement>('#bloque-sunat [data-sunat]'));
      const pie = Array.from(document.querySelectorAll<HTMLElement>('[data-pie-ticket]'));
      const fila = [cabecera, filaSunat, pie].find((f) => active && f.includes(active));
      const ir = (el?: HTMLElement | null) => { e.preventDefault(); e.stopPropagation(); el?.focus(); };

      if (e.key === 'ArrowDown') {
        if (fila === cabecera) ir(filaSunat[0] || btnPrint);
        else if (fila === filaSunat) ir(btnPrint);
        else { e.preventDefault(); e.stopPropagation(); if (scrollContainerRef.current) scrollContainerRef.current.scrollTop += 60; }
      } else if (e.key === 'ArrowUp') {
        if (fila === pie) ir(filaSunat[0] || tabTicket);
        else if (fila === filaSunat) ir(tabTicket);
        else { e.preventDefault(); e.stopPropagation(); if (scrollContainerRef.current) scrollContainerRef.current.scrollTop -= 60; }
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && fila && active) {
        const destino = fila[fila.indexOf(active) + (e.key === 'ArrowRight' ? 1 : -1)];
        if (destino) ir(destino);
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
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-lg flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.88)]"
      >
        {/* CABECERA */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 sm:p-4 shrink-0">
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
            <h2 id="modal-ticket-title" className="ventana-cabecera__titulo text-[var(--color-ink)] font-black text-base sm:text-lg uppercase tracking-widest">
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

        {/* BOLETA/FACTURA: estado ante SUNAT, sus notas de crédito y acciones (antes en la ventana "Comprobantes") */}
        {sunat && (
          <div id="bloque-sunat" className="border-b-2 border-[var(--color-ink)] p-3 bg-white space-y-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-black uppercase text-[var(--color-ink)]">{nombreComprobante(sunat.docType)} {sunat.numero}</span>
              <InsigniaCpe estado={sunat.estado} generado={Boolean(sunat.pdf)} chica />
              {sunat.modo && sunat.modo !== 'REAL' && <span className="text-[10px] font-black uppercase text-[var(--color-warning-dark)]">Modo {sunat.modo.toLowerCase()}: sin valor ante SUNAT</span>}
              {sunat.anulada && <span className="text-[10px] font-black uppercase text-[var(--color-danger)]">Venta anulada</span>}
            </div>
            {sunat.mensaje && <p id="sunat-mensaje" className="text-[11px] font-bold text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-border)] p-1.5">{sunat.mensaje}</p>}
            {sunat.estado === 'NO_EMITIDO' && (
              <p className="text-[11px] font-bold text-[var(--color-muted)]">La venta se anuló antes de que SUNAT aceptara este comprobante: no se emitió y no necesita nota de crédito.</p>
            )}
            {sunat.estado === 'ANULANDO' && (
              <p className="text-[11px] font-bold text-[var(--color-info)]">Venta anulada: se está confirmando con el proveedor que el comprobante no se emitió (unos segundos).</p>
            )}
            {sunat.estado === 'RECHAZADO' && (
              <p className="text-[11px] font-bold text-[var(--color-danger)]">SUNAT lo rechazó: revisa el mensaje. Este comprobante no tiene valor; corrige los datos y emite uno nuevo.</p>
            )}
            {notas.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase">
                Notas de crédito:
                {notas.map((n) => (
                  <span key={n.id} className="inline-flex items-center gap-1">{numeroComprobante(n.doc_serial, n.doc_number)} · S/ {Number(n.total).toFixed(2)} <InsigniaCpe estado={n.cpe_estado} chica /></span>
                ))}
              </div>
            )}
            {sunat.fiado && !sunat.anulada && (
              <p className="text-[11px] font-bold text-[var(--color-muted)]">Venta al crédito: para devolver, anúlala completa (emite la nota de crédito).</p>
            )}
            {accionesSunat.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {accionesSunat.map((a) => (
                  <button
                    key={a.id}
                    id={a.id}
                    type="button"
                    data-sunat="true"
                    onClick={a.hacer}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border-2 border-[var(--color-ink)] bg-white text-[11px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white hover:bg-[var(--color-bg)]"
                  >
                    <a.Icono size={13} /> {a.texto}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTENEDOR CENTRAL */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 bg-[var(--color-bg)] relative flex items-start justify-center"
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
            <div className="transform sm:scale-105 origin-top pb-6 w-full flex items-start justify-center">
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
                nroBoleta={ventaInfo?.nroComprobante || String(ticketId).slice(-6)}
                fiadoData={ventaInfo?.fiadoData}
                cliente={ventaInfo?.clienteNombre ? { nombre: ventaInfo.clienteNombre } : null}
                vendedor={ventaInfo?.vendedor}
                comprobante={ventaInfo?.comprobante}
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
             <div className="flex flex-wrap items-center gap-2">
               <button
                 ref={printBtnRef}
                 id="btn-reimprimir-ticket"
                 type="button"
                 data-pie-ticket="true"
                 onClick={() => void ejecutarImpresion()}
                 className="flex items-center gap-2 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black focus:bg-[var(--color-accent)] focus:text-black focus:outline-none focus:ring-4 focus:ring-black font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                 title="Reimprimir Ticket de Venta (tecla Enter o P)"
               >
                 <Printer size={16} /> [ENTER / P] REIMPRIMIR
               </button>

               
             </div>
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
              nroBoleta={ventaInfo?.nroComprobante || String(ticketId).slice(-6)}
              fiadoData={ventaInfo?.fiadoData}
              cliente={ventaInfo?.clienteNombre ? { nombre: ventaInfo.clienteNombre } : null}
              vendedor={ventaInfo?.vendedor}
              comprobante={ventaInfo?.comprobante}
            />
          </div>
        )}
      </div>

      {notaAbierta && (
        <div onClick={(e) => e.stopPropagation()}>
          <TicketNotaCredito
            nota={notaAbierta}
            onClose={() => {
              const id = `btn-sunat-nc-${notaAbierta.id}`;
              setNotaAbierta(null);
              setTimeout(() => document.getElementById(id)?.focus(), 50);
            }}
          />
        </div>
      )}
    </div>
  );
};

