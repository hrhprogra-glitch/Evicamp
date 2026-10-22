// src/sections/Inventario/components/ModalHistorialLotes.tsx
// Botón del reloj (Productos y Lotes): ventana flotante con TODOS los lotes de un producto, primero los
// que tienen stock y luego los agotados. Es el único lugar donde se ven los agotados que ya tienen un
// lote más nuevo (en la pestaña Lotes se ocultan solos, ver TablaLotes). Solo para ver: editar y retirar
// lotes se hace en la pestaña Lotes.
import React, { useEffect, useState } from 'react';
import { X, History, Loader2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { formatearCantidad } from '../../../utils/formato';

export interface ProductoHistorial {
  id: string;
  nombre: string;
  unidad?: string;
}

interface Props {
  producto: ProductoHistorial | null;
  onClose: () => void;
}

interface LoteHistorial {
  id: string;
  created_at: string;
  initial_quantity: number;
  quantity: number;
  cost_unit: number;
  supplier: string;
  document_ref: string;
  expiration_date: string | null;
}

const fecha = (valor: string | null) => (valor ? new Date(valor).toLocaleDateString('es-PE') : '—');

export const ModalHistorialLotes: React.FC<Props> = ({ producto, onClose }) => {
  const [lotes, setLotes] = useState<LoteHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useCerrarConEscape(!!producto, onClose);

  useEffect(() => {
    if (!producto) return;
    let vigente = true;
    setCargando(true);
    setError('');
    setLotes([]);
    (async () => {
      const { data, error: e } = await supabase
        .from('batches')
        .select('id, created_at, initial_quantity, quantity, cost_unit, supplier, document_ref, expiration_date')
        .eq('product_id', producto.id)
        .neq('is_active', 0) // los retirados (borrados) no se muestran, igual que en la pestaña Lotes
        .order('created_at', { ascending: false });
      if (!vigente) return;
      if (e) setError(e.message);
      // Primero los que tienen stock, luego los agotados (cada grupo del más nuevo al más antiguo)
      const filas = ((data || []) as any[]).map((b) => ({
        id: String(b.id),
        created_at: b.created_at,
        initial_quantity: Number(b.initial_quantity) || 0,
        quantity: Number(b.quantity) || 0,
        cost_unit: Number(b.cost_unit) || 0,
        supplier: b.supplier || '',
        document_ref: b.document_ref || '',
        expiration_date: b.expiration_date || null,
      }));
      setLotes([...filas.filter((l) => l.quantity > 0), ...filas.filter((l) => l.quantity <= 0)]);
      setCargando(false);
    })();
    return () => { vigente = false; };
  }, [producto]);

  // Al terminar de cargar: el selector va a la primera fila (o a la X si no hay lotes)
  useEffect(() => {
    if (!producto || cargando) return;
    const t = setTimeout(() => {
      const primera = document.querySelector('[data-hist-lote="true"]') as HTMLElement | null;
      (primera || document.getElementById('btn-cerrar-historial-lotes'))?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [producto, cargando]);

  // Teclado: ↑ ↓ entre las filas y la X; Tab encerrado dentro de la ventana
  useEffect(() => {
    if (!producto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-dialogo-sistema]')) return;
      const active = document.activeElement as HTMLElement | null;
      const filas = Array.from(document.querySelectorAll('[data-hist-lote="true"]')) as HTMLElement[];
      const cerrar = document.getElementById('btn-cerrar-historial-lotes');
      const elementos = [cerrar, ...filas].filter(Boolean) as HTMLElement[];
      const i = active ? elementos.indexOf(active) : -1;

      if (e.key === 'Tab') {
        e.stopPropagation();
        e.preventDefault();
        if (!elementos.length) return;
        const siguiente = e.shiftKey ? (i <= 0 ? elementos.length - 1 : i - 1) : (i === -1 || i >= elementos.length - 1 ? 0 : i + 1);
        elementos[siguiente].focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (i === -1) { (filas[0] || cerrar)?.focus(); return; }
        const destino = e.key === 'ArrowDown' ? Math.min(i + 1, elementos.length - 1) : Math.max(i - 1, 0);
        elementos[destino].focus();
        elementos[destino].scrollIntoView({ block: 'nearest' });
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && active === cerrar) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [producto, onClose]);

  if (!producto) return null;

  const conStock = lotes.filter((l) => l.quantity > 0);
  const agotados = lotes.filter((l) => l.quantity <= 0);
  const unidad = producto.unidad || 'UND';
  const stockTotal = conStock.reduce((s, l) => s + l.quantity, 0);

  const fila = (l: LoteHistorial) => {
    const vencido = !!l.expiration_date && new Date(l.expiration_date) < new Date();
    const estado = l.quantity <= 0 ? 'AGOTADO' : vencido ? 'CADUCADO' : 'VIGENTE';
    return (
      <div
        key={l.id}
        data-hist-lote="true"
        tabIndex={0}
        className={`grid grid-cols-12 items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] text-xs font-bold outline-none focus:bg-amber-50/60 focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] ${
          estado === 'AGOTADO' ? 'text-[#94A3B8]' : 'text-[var(--color-ink)]'
        }`}
      >
        <span className="col-span-2">{fecha(l.created_at)}</span>
        <span className="col-span-2 truncate uppercase" title={l.document_ref}>{l.document_ref || '—'}</span>
        <span className="col-span-2 truncate uppercase" title={l.supplier}>{l.supplier || '—'}</span>
        <span className="col-span-1 text-right">{formatearCantidad(l.initial_quantity, unidad)}</span>
        <span className="col-span-1 text-right font-black">{formatearCantidad(l.quantity, unidad)}</span>
        <span className="col-span-1 text-right">S/ {l.cost_unit.toFixed(2)}</span>
        <span className="col-span-1 text-center">{l.expiration_date ? fecha(l.expiration_date) : '—'}</span>
        <span className="col-span-2 flex justify-center">
          <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 ${
            estado === 'VIGENTE'
              ? 'bg-[#ECFDF5] text-[var(--color-success)] border-[var(--color-success)]'
              : 'bg-[#FEF2F2] text-[var(--color-danger)] border-[var(--color-danger)]'
          }`}>{estado}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-historial-lotes"
        className="bg-[var(--color-surface)] w-full max-w-4xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">

        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <History size={22} className="text-[var(--color-success)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-historial-lotes" className="text-sm font-black uppercase tracking-widest text-[var(--color-success)]">Historial de Lotes</h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest truncate">{producto.nombre}</p>
            </div>
          </div>
          <button
            id="btn-cerrar-historial-lotes"
            onClick={onClose}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* RESUMEN */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b-2 border-[#E2E8F0] flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-black uppercase tracking-widest text-[#64748B] shrink-0">
          <span>Con stock: <span className="text-[var(--color-ink)]">{conStock.length} lote(s) · {formatearCantidad(stockTotal, unidad)} {unidad}</span></span>
          <span>Agotados: <span className="text-[var(--color-ink)]">{agotados.length}</span></span>
        </div>

        {/* TABLA */}
        <div className="overflow-auto custom-scrollbar">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-12 gap-2 bg-[#1E293B] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest sticky top-0">
              <span className="col-span-2">Ingreso</span>
              <span className="col-span-2">Documento</span>
              <span className="col-span-2">Proveedor</span>
              <span className="col-span-1 text-right">Ingresó</span>
              <span className="col-span-1 text-right">Queda</span>
              <span className="col-span-1 text-right">Costo U.</span>
              <span className="col-span-1 text-center">Vence</span>
              <span className="col-span-2 text-center">Estado</span>
            </div>

            {cargando ? (
              <div className="p-10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                <Loader2 size={16} className="animate-spin" /> Cargando...
              </div>
            ) : error ? (
              <div className="p-10 text-center text-xs font-bold text-[var(--color-danger)]">No se pudo cargar el historial: {error}</div>
            ) : lotes.length === 0 ? (
              <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Este producto todavía no tiene lotes.</div>
            ) : (
              <>
                {conStock.map(fila)}
                {agotados.length > 0 && (
                  <div className="px-4 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                    Agotados ({agotados.length})
                  </div>
                )}
                {agotados.map(fila)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
