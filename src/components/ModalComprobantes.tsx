import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, FileText, RefreshCw, Printer, ArrowLeft, ExternalLink, Undo2 } from 'lucide-react';
import { supabase } from '../db/supabase';
import { avisar, confirmar } from '../utils/dialogos';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { useImprimir } from '../utils/impresion';
import { fechaLocalPeru, haceNDiasPeru, primerDiaMesPeru, rangoUTCPeru } from '../utils/ingresos';
import { calcularTotalesCPE, MOTIVO_NOTA_CREDITO, nombreComprobante, numeroComprobante } from '../utils/comprobante';
import { TicketImprimible } from '../sections/Punto-de-venta/components/TicketImprimible';
import { ModalDetalleTicket } from './ModalDetalleTicket';

// Pantalla "Comprobantes" (fases 11.4 y 11.5): boletas, facturas y notas de crédito con su estado ante
// SUNAT, para revisar, reenviar las que quedaron con error, reimprimir y DEVOLVER productos (emite la
// nota de crédito). Se abre desde Finanzas, Ajustes > Facturación y el aviso de la Caja.

type Filtro = 'HOY' | 'SEMANA' | 'MES' | 'PROBLEMAS';
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: 'HOY', nombre: 'Hoy' },
  { id: 'SEMANA', nombre: '7 días' },
  { id: 'MES', nombre: 'Este mes' },
  { id: 'PROBLEMAS', nombre: 'Con problema' },
];

// Una fila de la lista: una venta con boleta/factura o una nota de crédito
interface Comprobante {
  clave: string;                 // 'v-<id>' o 'nc-<id>'
  esNota: boolean;
  id: number;
  sale_id: number;               // venta (para la nota de crédito: la que corrige)
  created_at: string;
  doc_type: number;
  doc_serial: string | null;
  doc_number: string | null;
  cpe_cliente_tipo_doc?: string | null;
  cpe_cliente_num_doc?: string | null;
  cpe_cliente_nombre?: string | null;
  total: number;
  cpe_estado: string | null;
  cpe_mensaje: string | null;
  cpe_modo: string | null;
  cpe_pdf: string | null;
  cpe_xml: string | null;
  cpe_cdr: string | null;
  sunat_hash?: string | null;
  sunat_status?: string | null;
  amount_credit?: number | null;
  // Solo notas de crédito
  motivo?: string;
  descripcion?: string | null;
  ref_doc_type?: number | null;
  ref_serial?: string | null;
  ref_number?: string | null;
  items?: { detail_id: number; product_name: string; variant_name?: string | null; quantity: number; subtotal: number; tipo_igv?: string; es_bolsa?: boolean }[];
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  ACEPTADO: { texto: 'Aceptado', clase: 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' },
  OBSERVADO: { texto: 'Aceptado con observación', clase: 'border-[var(--color-warning)] text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)]' },
  PENDIENTE: { texto: 'Enviando…', clase: 'border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg-2)]' },
  ENVIANDO: { texto: 'Enviando…', clase: 'border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg-2)]' },
  ERROR: { texto: 'Error (se reintenta)', clase: 'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)]' },
  RECHAZADO: { texto: 'Rechazado por SUNAT', clase: 'border-[var(--color-danger)] text-white bg-[var(--color-danger)]' },
};
const PROBLEMA = ['ERROR', 'RECHAZADO'];
const COLS_VENTA = 'id, created_at, doc_type, doc_serial, doc_number, cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre, total, cpe_estado, cpe_mensaje, cpe_modo, cpe_pdf, cpe_xml, cpe_cdr, sunat_hash, sunat_status, amount_credit';

const fecha = (f: string) => new Date(f).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** ¿Hay comprobantes con problema? (error, rechazado, o pendiente hace más de 10 minutos). Para el aviso de la Caja. */
export const contarComprobantesConProblema = async (): Promise<number> => {
  try {
    const hace10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [{ count: malos }, { count: atascados }] = await Promise.all([
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', PROBLEMA),
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', ['PENDIENTE', 'ENVIANDO']).lt('created_at', hace10),
    ]);
    const { count: notasMal } = await supabase.from('notas_credito').select('id', { count: 'exact', head: true }).in('cpe_estado', PROBLEMA);
    return (malos || 0) + (atascados || 0) + (notasMal || 0);
  } catch {
    return 0;
  }
};

// Línea de la venta para "Devolver productos": cuánto se vendió y cuánto ya se devolvió
interface LineaDevolver { detail_id: number; nombre: string; vendido: number; devuelto: number; precio: number; cantidad: string }

export const ModalComprobantes: React.FC<{ isOpen: boolean; onClose: () => void; filtroInicial?: Filtro }> = ({ isOpen, onClose, filtroInicial = 'HOY' }) => {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [lista, setLista] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [reimprimir, setReimprimir] = useState<string | null>(null);
  const [notaParaImprimir, setNotaParaImprimir] = useState<{ nota: Comprobante; cliente: Partial<Comprobante> } | null>(null);
  const [devolver, setDevolver] = useState<LineaDevolver[] | null>(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const refNota = useRef<HTMLDivElement>(null);
  const imprimirNota = useImprimir(refNota, 'Nota-de-credito');

  useCerrarConEscape(isOpen && !detalle && !reimprimir && !notaParaImprimir, onClose);
  // En el detalle, Escape vuelve a la lista; en "Devolver productos", al detalle
  useCerrarConEscape(isOpen && !!detalle && !devolver && !reimprimir && !notaParaImprimir, () => setDetalle(null));
  useCerrarConEscape(isOpen && !!devolver && !guardando, () => { setDevolver(null); setTimeout(() => document.getElementById('btn-comp-devolver')?.focus(), 50); });
  useCerrarConEscape(!!notaParaImprimir, () => { setNotaParaImprimir(null); setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50); });

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    let qVentas = supabase.from('sales').select(COLS_VENTA).not('doc_type', 'is', null).order('created_at', { ascending: false }).limit(500);
    let qNotas = supabase.from('notas_credito').select('*').order('created_at', { ascending: false }).limit(500);
    if (filtro === 'PROBLEMAS') {
      qVentas = qVentas.in('cpe_estado', [...PROBLEMA, 'PENDIENTE', 'ENVIANDO']);
      qNotas = qNotas.in('cpe_estado', [...PROBLEMA, 'PENDIENTE', 'ENVIANDO']);
    } else {
      const hoy = fechaLocalPeru();
      const desde = filtro === 'HOY' ? hoy : filtro === 'SEMANA' ? haceNDiasPeru(7) : primerDiaMesPeru();
      const { inicioUTC, finUTC } = rangoUTCPeru(desde, hoy);
      qVentas = qVentas.gte('created_at', inicioUTC).lte('created_at', finUTC);
      qNotas = qNotas.gte('created_at', inicioUTC).lte('created_at', finUTC);
    }
    const [{ data: ventas }, { data: notas }] = await Promise.all([qVentas, qNotas]);
    const filas: Comprobante[] = [
      ...((ventas as any[]) || []).map((v) => ({ ...v, clave: `v-${v.id}`, esNota: false, sale_id: v.id })),
      ...((notas as any[]) || []).map((n) => ({ ...n, clave: `nc-${n.id}`, esNota: true })), // (sin la fase 11.5: notas = null)
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLista(filas);
    setDetalle((d) => (d ? filas.find((x) => x.clave === d.clave) || d : d));
    if (!silencioso) setCargando(false);
  }, [filtro]);

  useEffect(() => { if (isOpen) cargar(); }, [isOpen, cargar]);
  // Los estados cambian solos (el facturador trabaja cada pocos segundos): se refresca mientras está abierta
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => cargar(true), 8000);
    return () => clearInterval(t);
  }, [isOpen, cargar]);

  useEffect(() => {
    if (!isOpen) return;
    setFiltro(filtroInicial);
    setDetalle(null);
    setDevolver(null);
    setTimeout(() => document.getElementById(`comp-filtro-${filtroInicial}`)?.focus(), 60);
  }, [isOpen, filtroInicial]);

  if (!isOpen) return null;

  const contar = (estados: string[]) => lista.filter((c) => estados.includes(c.cpe_estado || '')).length;
  const filas = () => Array.from(document.querySelectorAll<HTMLElement>('#lista-comprobantes [data-row="true"]'));
  const notasDe = (saleId: number) => lista.filter((c) => c.esNota && c.sale_id === saleId);

  const abrirDetalle = (c: Comprobante) => {
    setDetalle(c);
    setDevolver(null);
    setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50);
  };
  const volverALista = () => {
    const clave = detalle?.clave;
    setDetalle(null);
    setDevolver(null);
    setTimeout(() => (document.querySelector(`#lista-comprobantes [data-clave="${clave}"]`) as HTMLElement | null)?.focus(), 50);
  };
  const reenviar = async (c: Comprobante) => {
    const { error } = c.esNota
      ? await supabase.rpc('fn_reenviar_nota_credito', { p_id: c.id })
      : await supabase.rpc('fn_reenviar_comprobante', { p_sale_id: c.id });
    if (error) return avisar(error.message);
    await cargar(true);
    avisar(`${numeroComprobante(c.doc_serial, c.doc_number)}: se volverá a enviar en unos segundos.`);
  };

  // Reimprimir: la venta usa el ticket de siempre; la nota de crédito, su propio ticket
  const reimprimirFila = async (c: Comprobante) => {
    if (!c.esNota) return setReimprimir(String(c.id));
    const { data } = await supabase.from('sales').select('cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre, cpe_cliente_direccion').eq('id', c.sale_id).maybeSingle();
    setNotaParaImprimir({ nota: c, cliente: (data as Partial<Comprobante>) || {} });
    setTimeout(() => document.getElementById('btn-imprimir-nota')?.focus(), 80);
  };

  // "Devolver productos": líneas de la venta con lo que queda por devolver
  const abrirDevolver = async (c: Comprobante) => {
    const { data: detalles } = await supabase.from('sale_details').select('id, product_name, variant_name, quantity, subtotal').eq('sale_id', c.id).order('id');
    const devueltoPor: Record<number, number> = {};
    for (const n of notasDe(c.id)) for (const it of n.items || []) devueltoPor[it.detail_id] = (devueltoPor[it.detail_id] || 0) + Number(it.quantity || 0);
    const lineas: LineaDevolver[] = ((detalles as any[]) || []).map((d) => ({
      detail_id: d.id,
      nombre: [d.product_name, d.variant_name].filter(Boolean).join(' '),
      vendido: Number(d.quantity) || 0,
      devuelto: devueltoPor[d.id] || 0,
      precio: Number(d.quantity) ? Number(d.subtotal) / Number(d.quantity) : 0,
      cantidad: '',
    }));
    setDevolver(lineas);
    setMotivoDevolucion('');
    setTimeout(() => { const el = document.getElementById('dev-cant-0') as HTMLInputElement | null; el?.focus(); el?.select(); }, 60);
  };
  const totalDevolver = (devolver || []).reduce((t, l) => t + Math.round(l.precio * (Number(l.cantidad) || 0) * 100) / 100, 0);
  const emitirNotaCredito = async () => {
    if (!detalle || !devolver || guardando) return;
    const items = devolver.filter((l) => Number(l.cantidad) > 0).map((l) => ({ detail_id: l.detail_id, cantidad: Number(l.cantidad) }));
    if (!items.length) return avisar('Escribe cuántas unidades se devuelven de al menos un producto.');
    const exceso = devolver.find((l) => Number(l.cantidad) > l.vendido - l.devuelto);
    if (exceso) return avisar(`De "${exceso.nombre}" solo quedan ${exceso.vendido - exceso.devuelto} por devolver.`);
    if (!(await confirmar(`Se emitirá una nota de crédito por S/ ${totalDevolver.toFixed(2)}, el stock vuelve y se registra la devolución del dinero en la caja abierta. ¿Continuar?`))) return;
    setGuardando(true);
    const { data: sesion } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').maybeSingle();
    const { data, error } = await supabase.rpc('fn_devolver_con_nota_credito', {
      p_sale_id: detalle.id, p_items: items, p_sesion_caja: sesion ? String((sesion as { id: number }).id) : null, p_motivo: motivoDevolucion.trim() || null,
    });
    setGuardando(false);
    if (error) return avisar(error.message);
    await avisar(`Nota de crédito ${(data as { nota_credito?: string })?.nota_credito || ''} emitida por S/ ${totalDevolver.toFixed(2)}. Se envía a SUNAT sola.${sesion ? '' : '\nNo hay caja abierta: registra la devolución del dinero a mano.'}`);
    setDevolver(null);
    await cargar(true);
    setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50);
  };

  const teclasFiltro = (e: React.KeyboardEvent, i: number) => {
    const ir = (el?: HTMLElement | null) => { if (el) { e.preventDefault(); el.focus(); } };
    if (e.key === 'ArrowRight') ir(document.getElementById(`comp-filtro-${FILTROS[i + 1]?.id}`));
    else if (e.key === 'ArrowLeft') ir(document.getElementById(`comp-filtro-${FILTROS[i - 1]?.id}`));
    else if (e.key === 'ArrowDown') ir(filas()[0] || null);
    else if (e.key === 'ArrowUp') ir(document.getElementById('btn-cerrar-comprobantes'));
  };

  // Solo una boleta/factura ya ACEPTADA por SUNAT se corrige con nota de crédito (con error, primero se reenvía)
  const puedeDevolver = detalle && !detalle.esNota && ['ACEPTADO', 'OBSERVADO'].includes(detalle.cpe_estado || '')
    && detalle.sunat_status !== 'ANULADO' && !Number(detalle.amount_credit || 0);
  const acciones = detalle ? [
    { id: 'btn-comp-reimprimir', texto: 'Reimprimir', Icono: Printer, hacer: () => reimprimirFila(detalle) },
    ...(puedeDevolver ? [{ id: 'btn-comp-devolver', texto: 'Devolver productos', Icono: Undo2, hacer: () => abrirDevolver(detalle) }] : []),
    ...(detalle.cpe_estado === 'ERROR' || detalle.cpe_estado === 'PENDIENTE'
      ? [{ id: 'btn-comp-reenviar', texto: 'Reenviar', Icono: RefreshCw, hacer: () => reenviar(detalle) }] : []),
    ...(detalle.cpe_pdf ? [{ id: 'btn-comp-pdf', texto: 'Ver PDF', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_pdf!, '_blank') }] : []),
    ...(detalle.cpe_xml ? [{ id: 'btn-comp-xml', texto: 'XML', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_xml!, '_blank') }] : []),
    ...(detalle.cpe_cdr ? [{ id: 'btn-comp-cdr', texto: 'Constancia (CDR)', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_cdr!, '_blank') }] : []),
  ] : [];

  const insignia = (estado: string | null) => {
    const est = ESTADO[estado || ''] || { texto: estado || '—', clase: 'border-[var(--color-border)]' };
    return <span className={`text-[11px] font-black uppercase px-2 py-1 border text-center ${est.clase}`}>{est.texto}</span>;
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-comprobantes" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-4xl max-h-[calc(var(--alto-pantalla)*0.94)] flex flex-col rounded-none">
        {/* Cabecera */}
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent-shadow)] flex items-center justify-center border border-[var(--color-ink)]">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h3 id="titulo-comprobantes" className="text-sm font-black uppercase tracking-widest text-[var(--color-ink)]">Comprobantes electrónicos</h3>
              <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Boletas, facturas y notas de crédito con su estado ante SUNAT</p>
            </div>
          </div>
          <button
            id="btn-cerrar-comprobantes"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); (document.getElementById(detalle ? 'btn-comp-volver' : `comp-filtro-${filtro}`))?.focus(); } }}
            className="text-[var(--color-muted)] hover:text-white hover:bg-red-600 border border-[var(--color-border)] p-1.5 rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {!detalle ? (
          <>
            {/* Filtros y resumen */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 shrink-0">
              <div className="flex flex-wrap gap-2">
                {FILTROS.map((f, i) => (
                  <button
                    key={f.id}
                    id={`comp-filtro-${f.id}`}
                    type="button"
                    aria-pressed={filtro === f.id}
                    onClick={() => setFiltro(f.id)}
                    onKeyDown={(e) => teclasFiltro(e, i)}
                    className={`px-3 py-1.5 border-2 text-[12px] font-black uppercase tracking-wider cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:ring-offset-1 ${
                      filtro === f.id ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                    }`}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
              <p className="text-[12px] font-bold uppercase text-[var(--color-muted)]">
                {lista.length} · <span className="text-[var(--color-accent-shadow)]">{contar(['ACEPTADO', 'OBSERVADO'])} aceptados</span>
                {' · '}<span className="text-[var(--color-info)]">{contar(['PENDIENTE', 'ENVIANDO'])} enviando</span>
                {' · '}<span className="text-[var(--color-danger)]">{contar(PROBLEMA)} con problema</span>
              </p>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto p-4 pt-3 flex-1 custom-scrollbar">
              {cargando && lista.length === 0 ? (
                <p className="text-xs font-bold uppercase text-[var(--color-muted)] text-center py-8">Cargando…</p>
              ) : lista.length === 0 ? (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-6 text-center">
                  <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">
                    {filtro === 'PROBLEMAS' ? 'No hay comprobantes con problema' : 'No hay comprobantes en estas fechas'}
                  </p>
                </div>
              ) : (
                <div id="lista-comprobantes" className="flex flex-col gap-1.5">
                  {lista.map((c) => (
                    <div
                      key={c.clave}
                      data-row="true"
                      data-clave={c.clave}
                      data-id={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => abrirDetalle(c)}
                      onKeyDown={(e) => {
                        const todas = filas();
                        const i = todas.indexOf(e.currentTarget);
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDetalle(c); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); todas[Math.min(i + 1, todas.length - 1)]?.focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) todas[i - 1].focus(); else document.getElementById(`comp-filtro-${filtro}`)?.focus(); }
                      }}
                      className="border border-[var(--color-border)] p-2.5 grid grid-cols-[6.5rem_1fr_auto] sm:grid-cols-[7rem_11rem_1fr_6rem_auto] items-center gap-2 hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] cursor-pointer rounded-none"
                    >
                      <span className="text-[12px] font-bold text-[var(--color-muted)]">{fecha(c.created_at)}</span>
                      <span className="text-[12px] font-black text-[var(--color-ink)]">
                        {c.esNota ? 'NC' : c.doc_type === 1 ? 'F' : 'B'} · {numeroComprobante(c.doc_serial, c.doc_number) || 'Por numerar'}
                      </span>
                      <span className="hidden sm:block text-[12px] font-bold text-[var(--color-ink)] uppercase truncate">
                        {c.esNota
                          ? `Corrige ${numeroComprobante(c.ref_serial, c.ref_number)} · ${MOTIVO_NOTA_CREDITO[c.motivo || ''] || ''}`
                          : `${c.cpe_cliente_num_doc ? `${c.cpe_cliente_tipo_doc} ${c.cpe_cliente_num_doc} · ` : ''}${c.cpe_cliente_nombre || 'Clientes varios'}`}
                      </span>
                      <span className="hidden sm:block text-[12px] font-black text-right">{c.esNota ? '-' : ''}S/ {Number(c.total).toFixed(2)}</span>
                      {insignia(c.cpe_estado)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : devolver ? (
          /* Devolver productos: nota de crédito por lo devuelto */
          <div className="overflow-y-auto p-4 flex-1 custom-scrollbar space-y-3">
            <p className="text-[13px] font-black uppercase">Devolver productos · {numeroComprobante(detalle.doc_serial, detalle.doc_number)}</p>
            <p className="text-[12px] font-bold text-[var(--color-muted)]">Escribe cuántas unidades devuelve el cliente. Se emite la nota de crédito, el stock vuelve y la devolución del dinero queda en la caja abierta.</p>
            <div className="flex flex-col gap-1.5">
              {devolver.map((l, i) => {
                const queda = l.vendido - l.devuelto;
                return (
                  <div key={l.detail_id} className="border border-[var(--color-border)] p-2 grid grid-cols-[1fr_auto_6rem] items-center gap-2">
                    <span className="text-[12px] font-black uppercase">{l.nombre}<span className="block text-[11px] font-bold text-[var(--color-muted)]">Vendido {l.vendido}{l.devuelto ? ` · ya devuelto ${l.devuelto}` : ''} · S/ {l.precio.toFixed(2)} c/u</span></span>
                    <span className="text-[11px] font-bold text-[var(--color-muted)]">máx. {queda}</span>
                    <input
                      id={`dev-cant-${i}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={queda <= 0}
                      value={l.cantidad}
                      placeholder="0"
                      onChange={(e) => setDevolver(devolver.map((x, j) => (j === i ? { ...x, cantidad: e.target.value.replace(/[^0-9.]/g, '') } : x)))}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        const ir = (id: string) => { e.preventDefault(); const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); el?.select?.(); };
                        if (e.key === 'ArrowDown' || e.key === 'Enter') ir(document.getElementById(`dev-cant-${i + 1}`) ? `dev-cant-${i + 1}` : 'dev-motivo');
                        else if (e.key === 'ArrowUp') ir(i > 0 ? `dev-cant-${i - 1}` : 'btn-comp-volver');
                      }}
                      className="w-full border-2 border-[var(--color-border)] p-1.5 text-sm font-black text-right outline-none focus:border-[var(--color-ink)] disabled:bg-[var(--color-bg)] rounded-none"
                    />
                  </div>
                );
              })}
            </div>
            <input
              id="dev-motivo"
              type="text"
              autoComplete="off"
              value={motivoDevolucion}
              onChange={(e) => setMotivoDevolucion(e.target.value.toUpperCase())}
              placeholder="MOTIVO (OPCIONAL): PRODUCTO FALLADO, NO ERA EL MODELO..."
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-emitir-nc')?.focus(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); (document.getElementById(`dev-cant-${devolver.length - 1}`) as HTMLInputElement | null)?.focus(); }
              }}
              className="w-full border-2 border-[var(--color-border)] p-2 text-xs font-black uppercase outline-none focus:border-[var(--color-ink)] rounded-none"
            />
            <div className="flex items-center justify-between gap-3 border-t-2 border-[var(--color-ink)] pt-3">
              <span className="text-sm font-black">A devolver: S/ {totalDevolver.toFixed(2)}</span>
              <button
                id="btn-emitir-nc"
                type="button"
                aria-disabled={guardando}
                onClick={emitirNotaCredito}
                onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('dev-motivo')?.focus(); } }}
                className="px-5 py-2.5 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white text-[12px] font-black uppercase tracking-wider cursor-pointer rounded-none shadow-[3px_3px_0_0_var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {guardando ? 'Emitiendo…' : 'Emitir nota de crédito'}
              </button>
            </div>
          </div>
        ) : (
          /* Detalle de un comprobante */
          <div className="overflow-y-auto p-4 flex-1 custom-scrollbar space-y-4">
            <button
              id="btn-comp-volver"
              type="button"
              onClick={volverALista}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('btn-comp-reimprimir')?.focus(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-comprobantes')?.focus(); }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--color-border)] text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] hover:border-[var(--color-ink)]"
            >
              <ArrowLeft size={14} /> Volver a la lista
            </button>

            <div className="border-2 border-[var(--color-ink)] p-3 space-y-1.5 text-[13px]">
              <p className="font-black uppercase text-[var(--color-ink)]">
                {nombreComprobante(detalle.esNota ? 7 : detalle.doc_type)} {numeroComprobante(detalle.doc_serial, detalle.doc_number) || '(por numerar)'}
              </p>
              <p className="text-[var(--color-muted)] font-bold">{new Date(detalle.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · Ticket #{String(detalle.sale_id).slice(-6)}</p>
              {detalle.esNota ? (
                <>
                  <p className="font-bold uppercase">Corrige: {nombreComprobante(detalle.ref_doc_type)} {numeroComprobante(detalle.ref_serial, detalle.ref_number)}</p>
                  <p className="font-bold uppercase">Motivo: {MOTIVO_NOTA_CREDITO[detalle.motivo || ''] || detalle.motivo}{detalle.descripcion ? ` · ${detalle.descripcion}` : ''}</p>
                  <ul className="text-[12px] font-bold uppercase list-disc pl-5">
                    {(detalle.items || []).map((it, i) => <li key={i}>{it.quantity} × {it.product_name}{it.variant_name ? ` ${it.variant_name}` : ''} · S/ {Number(it.subtotal).toFixed(2)}</li>)}
                  </ul>
                </>
              ) : (
                <p className="font-bold uppercase">
                  {detalle.cpe_cliente_num_doc ? `${detalle.cpe_cliente_tipo_doc} ${detalle.cpe_cliente_num_doc} · ` : ''}{detalle.cpe_cliente_nombre || 'Clientes varios'}
                </p>
              )}
              <p className="font-black">{detalle.esNota ? 'Total devuelto' : 'Total'}: S/ {Number(detalle.total).toFixed(2)}</p>
              <p className="flex flex-wrap items-center gap-2">
                {insignia(detalle.cpe_estado)}
                {detalle.cpe_modo && detalle.cpe_modo !== 'REAL' && <span className="text-[11px] font-black uppercase text-[var(--color-warning-dark)]">Modo {detalle.cpe_modo.toLowerCase()}: sin valor ante SUNAT</span>}
                {detalle.sunat_status === 'ANULADO' && <span className="text-[11px] font-black uppercase text-[var(--color-danger)]">Venta anulada</span>}
              </p>
              {detalle.cpe_mensaje && <p className="text-[12px] font-bold text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-border)] p-2">{detalle.cpe_mensaje}</p>}
              {detalle.cpe_estado === 'RECHAZADO' && (
                <p className="text-[12px] font-bold text-[var(--color-danger)]">SUNAT lo rechazó: revisa el mensaje. Este comprobante no tiene valor; corrige los datos y emite uno nuevo.</p>
              )}
              {!detalle.esNota && notasDe(detalle.id).length > 0 && (
                <p className="text-[12px] font-bold uppercase">
                  Notas de crédito: {notasDe(detalle.id).map((n) => `${numeroComprobante(n.doc_serial, n.doc_number)} (S/ ${Number(n.total).toFixed(2)})`).join(', ')}
                </p>
              )}
              {!detalle.esNota && Number(detalle.amount_credit || 0) > 0 && detalle.sunat_status !== 'ANULADO' && (
                <p className="text-[12px] font-bold text-[var(--color-muted)]">Venta al crédito: para devolver, anúlala completa en Finanzas (emite la nota de crédito).</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {acciones.map((a, i) => (
                <button
                  key={a.id}
                  id={a.id}
                  type="button"
                  onClick={a.hacer}
                  onKeyDown={(e) => {
                    const ir = (id?: string) => { if (id) { e.preventDefault(); document.getElementById(id)?.focus(); } };
                    if (e.key === 'ArrowRight') ir(acciones[i + 1]?.id);
                    else if (e.key === 'ArrowLeft') ir(acciones[i - 1]?.id);
                    else if (e.key === 'ArrowUp') ir('btn-comp-volver');
                    else if (e.key === 'ArrowDown') e.preventDefault();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-[var(--color-ink)] bg-white text-[12px] font-black uppercase tracking-wider cursor-pointer rounded-none shadow-[3px_3px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white hover:bg-[var(--color-bg)]"
                >
                  <a.Icono size={14} /> {a.texto}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {reimprimir && (
        <ModalDetalleTicket
          ticketId={reimprimir}
          onClose={() => {
            setReimprimir(null);
            setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50);
          }}
        />
      )}

      {/* Ticket de la nota de crédito */}
      {notaParaImprimir && (
        <div role="dialog" aria-modal="true" aria-label="Nota de crédito" className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-md max-h-[calc(var(--alto-pantalla)*0.94)] flex flex-col">
            <div className="overflow-y-auto p-4 flex-1 custom-scrollbar">
              <TicketImprimible
                ref={refNota}
                cart={(notaParaImprimir.nota.items || []).map((it, i) => ({
                  id: String(i), name: [it.product_name, it.variant_name].filter(Boolean).join(' '),
                  price: Number(it.quantity) ? Number(it.subtotal) / Number(it.quantity) : 0, cartQuantity: Number(it.quantity), subtotal: Number(it.subtotal),
                }))}
                total={Number(notaParaImprimir.nota.total)}
                pagos={{ efectivo: 0, yape: 0, tarjeta: 0 }}
                vuelto={0}
                nroBoleta={numeroComprobante(notaParaImprimir.nota.doc_serial, notaParaImprimir.nota.doc_number)}
                comprobante={{
                  docType: 7,
                  serie: notaParaImprimir.nota.doc_serial,
                  numero: notaParaImprimir.nota.doc_number,
                  modo: notaParaImprimir.nota.cpe_modo,
                  clienteTipoDoc: notaParaImprimir.cliente.cpe_cliente_tipo_doc || 'SIN',
                  clienteNumDoc: notaParaImprimir.cliente.cpe_cliente_num_doc || '',
                  clienteNombre: notaParaImprimir.cliente.cpe_cliente_nombre || '',
                  fecha: notaParaImprimir.nota.created_at,
                  hash: notaParaImprimir.nota.sunat_hash || null,
                  totales: calcularTotalesCPE((notaParaImprimir.nota.items || []).map((it) => ({ subtotal: Number(it.subtotal), cantidad: Number(it.quantity), tipoIgv: it.tipo_igv, esBolsa: it.es_bolsa }))),
                  referencia: { docType: Number(notaParaImprimir.nota.ref_doc_type), serie: notaParaImprimir.nota.ref_serial || null, numero: notaParaImprimir.nota.ref_number || null },
                  motivo: MOTIVO_NOTA_CREDITO[notaParaImprimir.nota.motivo || ''] || notaParaImprimir.nota.motivo || null,
                }}
              />
            </div>
            <div className="flex gap-2 p-3 border-t-2 border-[var(--color-ink)]">
              <button
                id="btn-cerrar-nota"
                type="button"
                onClick={() => { setNotaParaImprimir(null); setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50); }}
                onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-imprimir-nota')?.focus(); } }}
                className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-white text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
              >
                Cerrar (Esc)
              </button>
              <button
                id="btn-imprimir-nota"
                type="button"
                onClick={() => imprimirNota()}
                onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-cerrar-nota')?.focus(); } }}
                className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] inline-flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
