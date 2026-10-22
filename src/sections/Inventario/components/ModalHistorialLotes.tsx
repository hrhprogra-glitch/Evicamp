// src/sections/Inventario/components/ModalHistorialLotes.tsx
// Botón del reloj (Productos y Lotes): ventana flotante con dos pestañas.
//  - LOTES: todos los lotes del producto, primero con stock y luego agotados. Es el único lugar donde se ven
//    los agotados que ya tienen un lote más nuevo (en la pestaña Lotes se ocultan solos, ver TablaLotes).
//  - MOVIMIENTOS (kardex): cada entrada y salida (compras, ventas, mermas, ajustes, devoluciones) con quién
//    la hizo (lo guarda el servidor con la sesión, ver fn_registrar_autor_inventario).
// Solo para ver: editar y retirar lotes se hace en la pestaña Lotes.
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

interface Movimiento {
  id: string;
  created_at: string;
  operation_type: string;
  reason: string;
  notes: string;
  change_amount: number;
  user: string;
}

type Pestana = 'LOTES' | 'MOVIMIENTOS';
const LIMITE_MOVIMIENTOS = 300;

const fecha = (valor: string | null) => (valor ? new Date(valor).toLocaleDateString('es-PE') : '—');
const fechaHora = (valor: string) => new Date(valor).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
const hoyISO = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const haceDiasISO = (dias: number) => { const d = new Date(); d.setDate(d.getDate() - dias); return d.toLocaleDateString('en-CA'); };

const TIPOS: Record<string, string> = {
  COMPRA: 'Ingreso', VENTA: 'Venta', MERMA: 'Merma', AJUSTE: 'Ajuste',
  ANULACION: 'Devolución', DEVOLUCION: 'Devolución', ERROR: 'Error',
};
// Movimientos antiguos guardados sin el nombre real ("postgres") o por el servidor ("Sistema")
const quien = (u: string) => (!u || u === 'postgres' ? 'Sin registro' : u);

export const ModalHistorialLotes: React.FC<Props> = ({ producto, onClose }) => {
  const [pestana, setPestana] = useState<Pestana>('LOTES');
  const [lotes, setLotes] = useState<LoteHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargandoMovs, setCargandoMovs] = useState(false);
  const [errorMovs, setErrorMovs] = useState('');
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());

  useCerrarConEscape(!!producto, onClose);

  // Cada vez que se abre para un producto: empieza en LOTES y con los últimos 30 días
  useEffect(() => {
    if (!producto) return;
    setPestana('LOTES');
    setDesde(haceDiasISO(30));
    setHasta(hoyISO());
  }, [producto]);

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

  // Kardex: se carga al entrar a MOVIMIENTOS y cada vez que cambian las fechas
  useEffect(() => {
    if (!producto || pestana !== 'MOVIMIENTOS' || !desde || !hasta) return;
    let vigente = true;
    setCargandoMovs(true);
    setErrorMovs('');
    (async () => {
      const { data, error: e } = await supabase
        .from('inventory_movements')
        .select('id, created_at, operation_type, reason, notes, change_amount, user')
        .eq('product_id', producto.id)
        .gte('created_at', new Date(`${desde}T00:00:00`).toISOString())
        .lte('created_at', new Date(`${hasta}T23:59:59.999`).toISOString())
        .order('created_at', { ascending: false })
        .limit(LIMITE_MOVIMIENTOS);
      if (!vigente) return;
      if (e) setErrorMovs(e.message);
      setMovimientos(((data || []) as any[]).map((m) => ({
        id: String(m.id),
        created_at: m.created_at,
        operation_type: String(m.operation_type || ''),
        reason: m.reason || '',
        notes: m.notes || '',
        change_amount: Number(m.change_amount) || 0,
        user: m.user || '',
      })));
      setCargandoMovs(false);
    })();
    return () => { vigente = false; };
  }, [producto, pestana, desde, hasta]);

  // Al terminar de cargar LOTES: el selector va a la primera fila (o a la X si no hay lotes)
  useEffect(() => {
    if (!producto || cargando || pestana !== 'LOTES') return;
    const t = setTimeout(() => {
      if (document.activeElement?.closest?.('[data-hist-tabs]')) return; // está eligiendo pestaña
      const primera = document.querySelector('[data-hist-lote="true"]') as HTMLElement | null;
      (primera || document.getElementById('btn-cerrar-historial-lotes'))?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [producto, cargando, pestana]);

  // Teclado: ↑ ↓ recorren X, pestañas, fechas y filas; ← → cambian de pestaña; Tab encerrado en la ventana
  useEffect(() => {
    if (!producto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-dialogo-sistema]')) return;
      const active = document.activeElement as HTMLElement | null;
      const elementos = (Array.from(document.querySelectorAll(
        '#btn-cerrar-historial-lotes, [data-hist-tab], [data-hist-fecha], [data-hist-lote="true"], [data-hist-mov="true"]',
      )) as HTMLElement[]);
      const i = active ? elementos.indexOf(active) : -1;
      const enPestana = !!active?.hasAttribute('data-hist-tab');

      if (e.key === 'Tab') {
        e.stopPropagation();
        e.preventDefault();
        if (!elementos.length) return;
        const siguiente = e.shiftKey ? (i <= 0 ? elementos.length - 1 : i - 1) : (i === -1 || i >= elementos.length - 1 ? 0 : i + 1);
        elementos[siguiente].focus();
        return;
      }
      if (enPestana && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        const nueva: Pestana = e.key === 'ArrowRight' ? 'MOVIMIENTOS' : 'LOTES';
        setPestana(nueva);
        setTimeout(() => document.getElementById(nueva === 'LOTES' ? 'tab-hist-lotes' : 'tab-hist-movimientos')?.focus(), 0);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (i === -1) { elementos[0]?.focus(); return; }
        const destino = e.key === 'ArrowDown' ? Math.min(i + 1, elementos.length - 1) : Math.max(i - 1, 0);
        elementos[destino].focus();
        elementos[destino].scrollIntoView({ block: 'nearest' });
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && active?.id === 'btn-cerrar-historial-lotes') {
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
  const totalEntra = movimientos.reduce((s, m) => s + (m.change_amount > 0 ? m.change_amount : 0), 0);
  const totalSale = movimientos.reduce((s, m) => s + (m.change_amount < 0 ? -m.change_amount : 0), 0);

  const filaLote = (l: LoteHistorial) => {
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

  const filaMovimiento = (m: Movimiento) => {
    const esError = m.operation_type === 'ERROR';
    const detalle = [m.reason, m.notes].filter(Boolean).join(' · ');
    return (
      <div
        key={m.id}
        data-hist-mov="true"
        tabIndex={0}
        className={`grid grid-cols-12 items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] text-xs font-bold outline-none focus:bg-amber-50/60 focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] ${
          esError ? 'bg-[#FEF2F2] text-[var(--color-danger)]' : 'text-[var(--color-ink)]'
        }`}
      >
        <span className="col-span-2">{fechaHora(m.created_at)}</span>
        <span className="col-span-1 uppercase font-black">{TIPOS[m.operation_type] || m.operation_type || '—'}</span>
        <span className="col-span-5 truncate" title={detalle}>{detalle || '—'}</span>
        <span className="col-span-1 text-right text-[var(--color-success)] font-black">{m.change_amount > 0 ? formatearCantidad(m.change_amount, unidad) : ''}</span>
        <span className="col-span-1 text-right text-[var(--color-danger)] font-black">{m.change_amount < 0 ? formatearCantidad(-m.change_amount, unidad) : ''}</span>
        <span className="col-span-2 truncate uppercase" title={quien(m.user)}>{quien(m.user)}</span>
      </div>
    );
  };

  const clasePestana = (activa: boolean) => `px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-ink)] cursor-pointer ${
    activa ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[#E2E8F0] hover:border-[var(--color-ink)]'
  }`;
  const claseFecha = 'border-2 border-[#E2E8F0] bg-[var(--color-surface)] px-2 py-1 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-historial-lotes"
        className="bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">

        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <History size={22} className="text-[var(--color-success)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-historial-lotes" className="text-sm font-black uppercase tracking-widest text-[var(--color-success)]">Historial del producto</h2>
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

        {/* PESTAÑAS (← → cambian) Y RESUMEN */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b-2 border-[#E2E8F0] flex flex-wrap items-center gap-x-6 gap-y-2 shrink-0">
          <div data-hist-tabs className="flex gap-2" role="tablist">
            <button id="tab-hist-lotes" data-hist-tab role="tab" aria-selected={pestana === 'LOTES'}
              onClick={() => setPestana('LOTES')} className={clasePestana(pestana === 'LOTES')}>Lotes</button>
            <button id="tab-hist-movimientos" data-hist-tab role="tab" aria-selected={pestana === 'MOVIMIENTOS'}
              onClick={() => setPestana('MOVIMIENTOS')} className={clasePestana(pestana === 'MOVIMIENTOS')}>Movimientos</button>
          </div>
          {pestana === 'LOTES' ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
              <span>Con stock: <span className="text-[var(--color-ink)]">{conStock.length} lote(s) · {formatearCantidad(stockTotal, unidad)} {unidad}</span></span>
              <span>Agotados: <span className="text-[var(--color-ink)]">{agotados.length}</span></span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
              <label className="flex items-center gap-2">Desde
                <input id="hist-desde" data-hist-fecha type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className={claseFecha} />
              </label>
              <label className="flex items-center gap-2">Hasta
                <input id="hist-hasta" data-hist-fecha type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={claseFecha} />
              </label>
              <span>Entró: <span className="text-[var(--color-success)]">{formatearCantidad(totalEntra, unidad)}</span></span>
              <span>Salió: <span className="text-[var(--color-danger)]">{formatearCantidad(totalSale, unidad)}</span></span>
            </div>
          )}
        </div>

        {/* TABLA */}
        <div className="overflow-auto custom-scrollbar">
          {pestana === 'LOTES' ? (
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
                  {conStock.map(filaLote)}
                  {agotados.length > 0 && (
                    <div className="px-4 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                      Agotados ({agotados.length})
                    </div>
                  )}
                  {agotados.map(filaLote)}
                </>
              )}
            </div>
          ) : (
            <div className="min-w-[860px]">
              <div className="grid grid-cols-12 gap-2 bg-[#1E293B] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest sticky top-0">
                <span className="col-span-2">Fecha y hora</span>
                <span className="col-span-1">Tipo</span>
                <span className="col-span-5">Detalle</span>
                <span className="col-span-1 text-right">Entra</span>
                <span className="col-span-1 text-right">Sale</span>
                <span className="col-span-2">Quién</span>
              </div>
              {cargandoMovs ? (
                <div className="p-10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                  <Loader2 size={16} className="animate-spin" /> Cargando...
                </div>
              ) : errorMovs ? (
                <div className="p-10 text-center text-xs font-bold text-[var(--color-danger)]">No se pudieron cargar los movimientos: {errorMovs}</div>
              ) : movimientos.length === 0 ? (
                <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">No hay movimientos en estas fechas.</div>
              ) : (
                <>
                  {movimientos.map(filaMovimiento)}
                  {movimientos.length >= LIMITE_MOVIMIENTOS && (
                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                      Se muestran los {LIMITE_MOVIMIENTOS} más recientes: acorta las fechas para ver el resto.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
