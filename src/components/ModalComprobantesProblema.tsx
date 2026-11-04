import React, { useCallback, useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../db/supabase';
import { avisar, confirmar } from '../utils/dialogos';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { PROBLEMA_CPE, numeroComprobante } from '../utils/comprobante';
import { InsigniaCpe } from './InsigniaCpe';
import { ModalDetalleTicket } from './ModalDetalleTicket';

// "Comprobantes con problema": SOLO las boletas, facturas y notas de crédito con error, rechazadas o
// atascadas (las demás se ven en las tablas de Finanzas, con su estado). Se abre desde el aviso rojo
// de la Caja y de Finanzas. Una venta se abre en su ticket (ahí se reenvía); una nota se reenvía aquí.

interface FilaProblema {
  clave: string;
  esNota: boolean;
  id: number;
  sale_id: number;
  created_at: string;
  doc_type: number;
  doc_serial: string | null;
  doc_number: string | null;
  cliente: string;
  total: number;
  cpe_estado: string | null;
  cpe_mensaje: string | null;
}

const fecha = (f: string) => new Date(f).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const ModalComprobantesProblema: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [lista, setLista] = useState<FilaProblema[]>([]);
  const [cargando, setCargando] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  useCerrarConEscape(isOpen && !ticket, onClose);

  const cargar = useCallback(async () => {
    const hace10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const cols = 'id, created_at, doc_type, doc_serial, doc_number, cpe_cliente_num_doc, cpe_cliente_nombre, total, cpe_estado, cpe_mensaje';
    const [{ data: malas }, { data: atascadas }, { data: notas }] = await Promise.all([
      supabase.from('sales').select(cols).in('cpe_estado', PROBLEMA_CPE).order('created_at', { ascending: false }).limit(200),
      supabase.from('sales').select(cols).in('cpe_estado', ['PENDIENTE', 'ENVIANDO', 'ANULANDO']).is('cpe_pdf', null).lt('created_at', hace10).order('created_at', { ascending: false }).limit(200),
      supabase.from('notas_credito').select('id, sale_id, created_at, doc_serial, doc_number, ref_serial, ref_number, total, cpe_estado, cpe_mensaje').in('cpe_estado', PROBLEMA_CPE).order('created_at', { ascending: false }).limit(200),
    ]);
    const filas: FilaProblema[] = [
      ...[...((malas as any[]) || []), ...((atascadas as any[]) || [])].map((v) => ({
        clave: `v-${v.id}`, esNota: false, id: v.id, sale_id: v.id, created_at: v.created_at, doc_type: v.doc_type, doc_serial: v.doc_serial,
        doc_number: v.doc_number, cliente: [v.cpe_cliente_num_doc, v.cpe_cliente_nombre || 'Clientes varios'].filter(Boolean).join(' · '),
        total: Number(v.total), cpe_estado: v.cpe_estado, cpe_mensaje: v.cpe_mensaje,
      })),
      ...((notas as any[]) || []).map((n) => ({
        clave: `nc-${n.id}`, esNota: true, id: n.id, sale_id: n.sale_id, created_at: n.created_at, doc_type: 7, doc_serial: n.doc_serial,
        doc_number: n.doc_number, cliente: `Corrige ${numeroComprobante(n.ref_serial, n.ref_number)}`, total: -Number(n.total),
        cpe_estado: n.cpe_estado, cpe_mensaje: n.cpe_mensaje,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLista(filas);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCargando(true);
    setTicket(null);
    cargar().then(() => setTimeout(() => (document.querySelector('#lista-problemas [data-row="true"]') as HTMLElement | null || document.getElementById('btn-cerrar-problemas'))?.focus(), 60));
    // El facturador trabaja cada pocos segundos: se refresca mientras está abierta
    const t = setInterval(cargar, 8000);
    return () => clearInterval(t);
  }, [isOpen, cargar]);

  if (!isOpen) return null;

  const filas = () => Array.from(document.querySelectorAll<HTMLElement>('#lista-problemas [data-row="true"]'));
  const abrir = async (c: FilaProblema) => {
    if (!c.esNota) { setTicket(String(c.sale_id)); return; }
    if (!(await confirmar(`¿Volver a enviar la nota de crédito ${numeroComprobante(c.doc_serial, c.doc_number)} a SUNAT?`))) return;
    const { error } = await supabase.rpc('fn_reenviar_nota_credito', { p_id: c.id });
    if (error) return avisar(error.message);
    await cargar();
    avisar('Se volverá a enviar en unos segundos.');
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-problemas" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-3xl max-h-[calc(var(--alto-pantalla)*0.94)] flex flex-col rounded-none">
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-danger)] flex items-center justify-center border border-[var(--color-ink)]">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <h3 id="titulo-problemas" className="text-sm font-black uppercase tracking-widest text-[var(--color-ink)]">Comprobantes con problema</h3>
              <p className="text-[12px] font-bold text-[var(--color-muted)]">Con error, rechazados por SUNAT o sin enviar hace más de 10 minutos. Enter abre el ticket para reenviarlo.</p>
            </div>
          </div>
          <button
            id="btn-cerrar-problemas"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); filas()[0]?.focus(); } }}
            className="text-[var(--color-muted)] hover:text-white hover:bg-red-600 border border-[var(--color-border)] p-1.5 rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1 custom-scrollbar">
          {cargando ? (
            <p className="text-xs font-bold uppercase text-[var(--color-muted)] text-center py-8">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="text-xs font-bold uppercase text-[var(--color-muted)] text-center py-8 border border-[var(--color-border)] bg-[var(--color-bg)]">No hay comprobantes con problema</p>
          ) : (
            <div id="lista-problemas" className="flex flex-col gap-1.5">
              {lista.map((c) => (
                <div
                  key={c.clave}
                  data-row="true"
                  data-clave={c.clave}
                  role="button"
                  tabIndex={0}
                  onClick={() => abrir(c)}
                  onKeyDown={(e) => {
                    const todas = filas();
                    const i = todas.indexOf(e.currentTarget);
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(c); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); todas[Math.min(i + 1, todas.length - 1)]?.focus(); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? todas[i - 1] : document.getElementById('btn-cerrar-problemas'))?.focus(); }
                  }}
                  className="border border-[var(--color-border)] p-2.5 hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] cursor-pointer rounded-none"
                >
                  <div className="grid grid-cols-[6.5rem_1fr_auto] sm:grid-cols-[7rem_11rem_1fr_6rem_auto] items-center gap-2">
                    <span className="text-[12px] font-bold text-[var(--color-muted)]">{fecha(c.created_at)}</span>
                    <span className="text-[12px] font-black text-[var(--color-ink)]">
                      {c.esNota ? 'NC' : c.doc_type === 1 ? 'F' : 'B'} · {numeroComprobante(c.doc_serial, c.doc_number) || 'Por numerar'}
                    </span>
                    <span className="hidden sm:block text-[12px] font-bold uppercase truncate">{c.cliente}</span>
                    <span className="hidden sm:block text-[12px] font-black text-right">S/ {c.total.toFixed(2)}</span>
                    <InsigniaCpe estado={c.cpe_estado} />
                  </div>
                  {c.cpe_mensaje && <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1 truncate">{c.cpe_mensaje}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {ticket && (
        <ModalDetalleTicket
          ticketId={ticket}
          onClose={() => {
            const clave = `v-${ticket}`;
            setTicket(null);
            void cargar();
            setTimeout(() => (document.querySelector(`#lista-problemas [data-clave="${clave}"]`) as HTMLElement | null || filas()[0])?.focus(), 80);
          }}
        />
      )}
    </div>
  );
};
