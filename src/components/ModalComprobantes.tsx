import React, { useCallback, useEffect, useState } from 'react';
import { X, FileText, RefreshCw, Printer, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '../db/supabase';
import { avisar } from '../utils/dialogos';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { fechaLocalPeru, haceNDiasPeru, primerDiaMesPeru, rangoUTCPeru } from '../utils/ingresos';
import { nombreComprobante, numeroComprobante } from '../utils/comprobante';
import { ModalDetalleTicket } from './ModalDetalleTicket';

// Pantalla "Comprobantes" (fase 11.4): boletas y facturas electrónicas con su estado ante SUNAT,
// para revisar, reenviar las que quedaron con error y reimprimir. Se abre desde Finanzas,
// Ajustes > Facturación y el aviso de la Caja.

type Filtro = 'HOY' | 'SEMANA' | 'MES' | 'PROBLEMAS';
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: 'HOY', nombre: 'Hoy' },
  { id: 'SEMANA', nombre: '7 días' },
  { id: 'MES', nombre: 'Este mes' },
  { id: 'PROBLEMAS', nombre: 'Con problema' },
];

interface Comprobante {
  id: number;
  created_at: string;
  doc_type: number;
  doc_serial: string | null;
  doc_number: string | null;
  cpe_cliente_tipo_doc: string | null;
  cpe_cliente_num_doc: string | null;
  cpe_cliente_nombre: string | null;
  total: number;
  cpe_estado: string | null;
  cpe_mensaje: string | null;
  cpe_modo: string | null;
  cpe_intentos: number | null;
  cpe_pdf: string | null;
  cpe_xml: string | null;
  cpe_cdr: string | null;
  sunat_status: string | null;
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

const fecha = (f: string) => new Date(f).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** ¿Hay comprobantes con problema? (error, rechazado, o pendiente hace más de 10 minutos). Para el aviso de la Caja. */
export const contarComprobantesConProblema = async (): Promise<number> => {
  try {
    const hace10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [{ count: malos }, { count: atascados }] = await Promise.all([
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', PROBLEMA),
      supabase.from('sales').select('id', { count: 'exact', head: true }).in('cpe_estado', ['PENDIENTE', 'ENVIANDO']).lt('created_at', hace10),
    ]);
    return (malos || 0) + (atascados || 0);
  } catch {
    return 0;
  }
};

export const ModalComprobantes: React.FC<{ isOpen: boolean; onClose: () => void; filtroInicial?: Filtro }> = ({ isOpen, onClose, filtroInicial = 'HOY' }) => {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [lista, setLista] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [reimprimir, setReimprimir] = useState<string | null>(null);

  useCerrarConEscape(isOpen && !detalle && !reimprimir, onClose);
  // En el detalle, Escape vuelve a la lista (no cierra la ventana)
  useCerrarConEscape(isOpen && !!detalle && !reimprimir, () => setDetalle(null));

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    let q = supabase.from('sales')
      .select('id, created_at, doc_type, doc_serial, doc_number, cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre, total, cpe_estado, cpe_mensaje, cpe_modo, cpe_intentos, cpe_pdf, cpe_xml, cpe_cdr, sunat_status')
      .not('doc_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    if (filtro === 'PROBLEMAS') {
      q = q.in('cpe_estado', [...PROBLEMA, 'PENDIENTE', 'ENVIANDO']);
    } else {
      const hoy = fechaLocalPeru();
      const desde = filtro === 'HOY' ? hoy : filtro === 'SEMANA' ? haceNDiasPeru(7) : primerDiaMesPeru();
      const { inicioUTC, finUTC } = rangoUTCPeru(desde, hoy);
      q = q.gte('created_at', inicioUTC).lte('created_at', finUTC);
    }
    const { data } = await q;
    setLista((data as Comprobante[]) || []);
    setDetalle((d) => (d ? ((data as Comprobante[]) || []).find((x) => x.id === d.id) || d : d));
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
    setTimeout(() => document.getElementById(`comp-filtro-${filtroInicial}`)?.focus(), 60);
  }, [isOpen, filtroInicial]);

  if (!isOpen) return null;

  const contar = (estados: string[]) => lista.filter((c) => estados.includes(c.cpe_estado || '')).length;
  const filas = () => Array.from(document.querySelectorAll<HTMLElement>('#lista-comprobantes [data-row="true"]'));

  const abrirDetalle = (c: Comprobante) => {
    setDetalle(c);
    setTimeout(() => document.getElementById('btn-comp-reimprimir')?.focus(), 50);
  };
  const volverALista = () => {
    const id = detalle?.id;
    setDetalle(null);
    setTimeout(() => (document.querySelector(`#lista-comprobantes [data-id="${id}"]`) as HTMLElement | null)?.focus(), 50);
  };
  const reenviar = async (c: Comprobante) => {
    const { error } = await supabase.rpc('fn_reenviar_comprobante', { p_sale_id: c.id });
    if (error) return avisar(error.message);
    await cargar(true);
    avisar(`${numeroComprobante(c.doc_serial, c.doc_number)}: se volverá a enviar en unos segundos.`);
  };

  const teclasFiltro = (e: React.KeyboardEvent, i: number) => {
    const ir = (el?: HTMLElement | null) => { if (el) { e.preventDefault(); el.focus(); } };
    if (e.key === 'ArrowRight') ir(document.getElementById(`comp-filtro-${FILTROS[i + 1]?.id}`));
    else if (e.key === 'ArrowLeft') ir(document.getElementById(`comp-filtro-${FILTROS[i - 1]?.id}`));
    else if (e.key === 'ArrowDown') ir(filas()[0] || null);
    else if (e.key === 'ArrowUp') ir(document.getElementById('btn-cerrar-comprobantes'));
  };

  const acciones = detalle ? [
    { id: 'btn-comp-reimprimir', texto: 'Reimprimir', Icono: Printer, hacer: () => setReimprimir(String(detalle.id)) },
    ...(detalle.cpe_estado === 'ERROR' || detalle.cpe_estado === 'PENDIENTE'
      ? [{ id: 'btn-comp-reenviar', texto: 'Reenviar', Icono: RefreshCw, hacer: () => reenviar(detalle) }] : []),
    ...(detalle.cpe_pdf ? [{ id: 'btn-comp-pdf', texto: 'Ver PDF', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_pdf!, '_blank') }] : []),
    ...(detalle.cpe_xml ? [{ id: 'btn-comp-xml', texto: 'XML', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_xml!, '_blank') }] : []),
    ...(detalle.cpe_cdr ? [{ id: 'btn-comp-cdr', texto: 'Constancia (CDR)', Icono: ExternalLink, hacer: () => window.open(detalle.cpe_cdr!, '_blank') }] : []),
  ] : [];

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
              <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Boletas y facturas con su estado ante SUNAT</p>
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
                    {filtro === 'PROBLEMAS' ? 'No hay comprobantes con problema' : 'No hay boletas ni facturas en estas fechas'}
                  </p>
                </div>
              ) : (
                <div id="lista-comprobantes" className="flex flex-col gap-1.5">
                  {lista.map((c) => {
                    const est = ESTADO[c.cpe_estado || ''] || { texto: c.cpe_estado || '—', clase: 'border-[var(--color-border)]' };
                    return (
                      <div
                        key={c.id}
                        data-row="true"
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
                        className="border border-[var(--color-border)] p-2.5 grid grid-cols-[6.5rem_1fr_auto] sm:grid-cols-[7rem_10rem_1fr_6rem_auto] items-center gap-2 hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] cursor-pointer rounded-none"
                      >
                        <span className="text-[12px] font-bold text-[var(--color-muted)]">{fecha(c.created_at)}</span>
                        <span className="text-[12px] font-black text-[var(--color-ink)]">
                          {c.doc_type === 1 ? 'F' : 'B'} · {numeroComprobante(c.doc_serial, c.doc_number) || 'Por numerar'}
                        </span>
                        <span className="hidden sm:block text-[12px] font-bold text-[var(--color-ink)] uppercase truncate">
                          {c.cpe_cliente_num_doc ? `${c.cpe_cliente_tipo_doc} ${c.cpe_cliente_num_doc} · ` : ''}{c.cpe_cliente_nombre || 'Clientes varios'}
                        </span>
                        <span className="hidden sm:block text-[12px] font-black text-right">S/ {Number(c.total).toFixed(2)}</span>
                        <span className={`text-[11px] font-black uppercase px-2 py-1 border text-center ${est.clase}`}>{est.texto}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
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
                else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); volverALista(); }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--color-border)] text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] hover:border-[var(--color-ink)]"
            >
              <ArrowLeft size={14} /> Volver a la lista
            </button>

            <div className="border-2 border-[var(--color-ink)] p-3 space-y-1.5 text-[13px]">
              <p className="font-black uppercase text-[var(--color-ink)]">
                {nombreComprobante(detalle.doc_type)} {numeroComprobante(detalle.doc_serial, detalle.doc_number) || '(por numerar)'}
              </p>
              <p className="text-[var(--color-muted)] font-bold">{new Date(detalle.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · Ticket #{String(detalle.id).slice(-6)}</p>
              <p className="font-bold uppercase">
                {detalle.cpe_cliente_num_doc ? `${detalle.cpe_cliente_tipo_doc} ${detalle.cpe_cliente_num_doc} · ` : ''}{detalle.cpe_cliente_nombre || 'Clientes varios'}
              </p>
              <p className="font-black">Total: S/ {Number(detalle.total).toFixed(2)}</p>
              <p className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-black uppercase px-2 py-1 border ${(ESTADO[detalle.cpe_estado || ''] || { clase: '' }).clase}`}>
                  {(ESTADO[detalle.cpe_estado || ''] || { texto: detalle.cpe_estado }).texto}
                </span>
                {detalle.cpe_modo && detalle.cpe_modo !== 'REAL' && <span className="text-[11px] font-black uppercase text-[var(--color-warning-dark)]">Modo {detalle.cpe_modo.toLowerCase()}: sin valor ante SUNAT</span>}
                {detalle.sunat_status === 'ANULADO' && <span className="text-[11px] font-black uppercase text-[var(--color-danger)]">Venta anulada</span>}
              </p>
              {detalle.cpe_mensaje && <p className="text-[12px] font-bold text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-border)] p-2">{detalle.cpe_mensaje}</p>}
              {detalle.cpe_estado === 'RECHAZADO' && (
                <p className="text-[12px] font-bold text-[var(--color-danger)]">SUNAT lo rechazó: revisa el mensaje. Este comprobante no tiene valor; corrige los datos y emite uno nuevo.</p>
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
                    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); volverALista(); }
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
    </div>
  );
};
