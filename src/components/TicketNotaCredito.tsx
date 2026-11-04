import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { supabase } from '../db/supabase';
import { useImprimir } from '../utils/impresion';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { calcularTotalesCPE, MOTIVO_NOTA_CREDITO, numeroComprobante } from '../utils/comprobante';
import { TicketImprimible } from '../sections/Punto-de-venta/components/TicketImprimible';

/** Fila de `notas_credito` (lo que necesita el ticket). */
export interface NotaCredito {
  id: number;
  sale_id: number;
  created_at: string;
  doc_serial: string | null;
  doc_number: string | null;
  total: number;
  motivo?: string;
  descripcion?: string | null;
  ref_doc_type?: number | null;
  ref_serial?: string | null;
  ref_number?: string | null;
  cpe_estado: string | null;
  cpe_mensaje?: string | null;
  cpe_modo: string | null;
  sunat_hash?: string | null;
  items?: { detail_id: number; product_name: string; variant_name?: string | null; quantity: number; subtotal: number; tipo_igv?: string; es_bolsa?: boolean }[];
}

/** Ticket imprimible de una nota de crédito (con el cliente de la venta que corrige). */
export const TicketNotaCredito: React.FC<{ nota: NotaCredito; onClose: () => void }> = ({ nota, onClose }) => {
  const [cliente, setCliente] = useState<{ cpe_cliente_tipo_doc?: string; cpe_cliente_num_doc?: string; cpe_cliente_nombre?: string }>({});
  const ref = useRef<HTMLDivElement>(null);
  const imprimir = useImprimir(ref, 'Nota-de-credito');
  useCerrarConEscape(true, onClose);

  useEffect(() => {
    supabase.from('sales').select('cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre').eq('id', nota.sale_id).maybeSingle()
      .then(({ data }) => setCliente((data as typeof cliente) || {}));
    setTimeout(() => document.getElementById('btn-imprimir-nota')?.focus(), 80);
  }, [nota.sale_id]);

  // En un portal: dentro de otra ventana (con desenfoque de fondo) se dibujaba cortada a un costado
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Nota de crédito" className="fixed inset-0 bg-black/60 z-[260] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-md max-h-[calc(var(--alto-pantalla)*0.94)] flex flex-col">
        <div className="overflow-y-auto p-4 flex-1 custom-scrollbar">
          <TicketImprimible
            ref={ref}
            cart={(nota.items || []).map((it, i) => ({
              id: String(i), name: [it.product_name, it.variant_name].filter(Boolean).join(' '),
              price: Number(it.quantity) ? Number(it.subtotal) / Number(it.quantity) : 0, cartQuantity: Number(it.quantity), subtotal: Number(it.subtotal),
            }))}
            total={Number(nota.total)}
            pagos={{ efectivo: 0, yape: 0, tarjeta: 0 }}
            vuelto={0}
            nroBoleta={numeroComprobante(nota.doc_serial, nota.doc_number)}
            comprobante={{
              docType: 7,
              serie: nota.doc_serial,
              numero: nota.doc_number,
              modo: nota.cpe_modo,
              clienteTipoDoc: (cliente.cpe_cliente_tipo_doc as 'DNI' | 'RUC' | 'CE' | 'SIN') || 'SIN',
              clienteNumDoc: cliente.cpe_cliente_num_doc || '',
              clienteNombre: cliente.cpe_cliente_nombre || '',
              fecha: nota.created_at,
              hash: nota.sunat_hash || null,
              totales: calcularTotalesCPE((nota.items || []).map((it) => ({ subtotal: Number(it.subtotal), cantidad: Number(it.quantity), tipoIgv: it.tipo_igv, esBolsa: it.es_bolsa }))),
              referencia: { docType: Number(nota.ref_doc_type), serie: nota.ref_serial || null, numero: nota.ref_number || null },
              motivo: MOTIVO_NOTA_CREDITO[nota.motivo || ''] || nota.motivo || null,
            }}
          />
        </div>
        <div className="flex gap-2 p-3 border-t-2 border-[var(--color-ink)]">
          <button
            id="btn-cerrar-nota"
            type="button"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-imprimir-nota')?.focus(); } }}
            className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-white text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
          >
            Cerrar (Esc)
          </button>
          <button
            id="btn-imprimir-nota"
            type="button"
            onClick={() => imprimir()}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-cerrar-nota')?.focus(); } }}
            className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] inline-flex items-center justify-center gap-1.5"
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
