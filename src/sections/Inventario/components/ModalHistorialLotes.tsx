// src/sections/Inventario/components/ModalHistorialLotes.tsx
// Botón del reloj (Productos y Lotes): ventana flotante con dos pestañas.
//  - LOTES: todos los lotes del producto, primero con stock y luego agotados. Es el único lugar donde se ven
//    los agotados que ya tienen un lote más nuevo (en la pestaña Lotes se ocultan solos, ver TablaLotes).
//  - MOVIMIENTOS (kardex): cada entrada y salida (compras, ventas, mermas, ajustes, devoluciones) con quién
//    la hizo (lo guarda el servidor con la sesión, ver fn_registrar_autor_inventario).
// Solo para ver: editar y retirar lotes se hace en la pestaña Lotes.
import React, { useEffect, useState } from 'react';
import { X, History, Loader2, Package, ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { formatearCantidad } from '../../../utils/formato';
import { CuerpoVentana, BarraFiltros, claseBotonBarra, claseCampoBarra, TextoBarra, CajaLista, SeparadorLista, FilaLista, LineaDato, Etiqueta, DatoFila, type TonoEtiqueta } from '../../../components/ListaVentana';

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
      // ← → solo mueven el selector entre las pestañas; la pestaña cambia recién con Enter (o clic)
      if (enPestana && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById(e.key === 'ArrowRight' ? 'tab-hist-movimientos' : 'tab-hist-lotes')?.focus();
        return;
      }
      if (enPestana && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        setPestana(active?.id === 'tab-hist-movimientos' ? 'MOVIMIENTOS' : 'LOTES');
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
    const linea1 = `Doc: ${l.document_ref || '—'} | Prov: ${l.supplier || '—'}`;
    const linea2 = `Costo U.: S/ ${l.cost_unit.toFixed(2)} | Vence: ${l.expiration_date ? fecha(l.expiration_date) : '—'}`;
    const datos = <><LineaDato titulo={linea1}>{linea1}</LineaDato><LineaDato>{linea2}</LineaDato></>;
    return (
      <FilaLista
        key={l.id}
        data-hist-lote="true"
        tabIndex={0}
        atenuada={estado === 'AGOTADO'}
        icono={<Package size={32} />}
        titulo={`Ingreso ${fecha(l.created_at)}`}
        subtitulo={datos}
        centro={<Etiqueta tono={estado === 'VIGENTE' ? 'verde' : estado === 'CADUCADO' ? 'rojo' : 'gris'}>{estado}</Etiqueta>}
        derecha={<DatoFila etiqueta="Queda / Ingresó" valor={`${formatearCantidad(l.quantity, unidad)} / ${formatearCantidad(l.initial_quantity, unidad)} ${unidad}`} />}
      />
    );
  };

  const TONO_TIPO: Record<string, TonoEtiqueta> = {
    COMPRA: 'verde', ANULACION: 'verde', DEVOLUCION: 'verde', VENTA: 'azul', MERMA: 'rojo', AJUSTE: 'ambar', ERROR: 'rojo',
  };
  const filaMovimiento = (m: Movimiento) => {
    const esError = m.operation_type === 'ERROR';
    const entra = m.change_amount > 0;
    const detalle = [m.reason, m.notes].filter(Boolean).join(' · ') || '—';
    const cantidad = m.change_amount === 0 ? '—' : `${entra ? '+' : '−'}${formatearCantidad(Math.abs(m.change_amount), unidad)} ${unidad}`;
    return (
      <FilaLista
        key={m.id}
        data-hist-mov="true"
        tabIndex={0}
        tono={esError ? 'error' : 'normal'}
        icono={esError ? <AlertTriangle size={32} /> : entra ? <ArrowDownToLine size={32} /> : <ArrowUpFromLine size={32} />}
        titulo={fechaHora(m.created_at)}
        subtitulo={<><LineaDato titulo={detalle}>{detalle}</LineaDato><LineaDato>Por: {quien(m.user)}</LineaDato></>}
        centro={<Etiqueta tono={TONO_TIPO[m.operation_type] || 'gris'}>{TIPOS[m.operation_type] || m.operation_type || '—'}</Etiqueta>}
        derecha={<DatoFila valor={cantidad} tono={m.change_amount === 0 ? 'normal' : entra ? 'verde' : 'rojo'} />}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-historial-lotes"
        className="bg-[var(--color-surface)] animate-slide-up w-full max-w-6xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.85)]">

        {/* CABECERA (igual que el Directorio de clientes) */}
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <History size={20} className="text-[var(--color-info)] shrink-0" />
            <h2 id="titulo-historial-lotes" className="text-sm font-black uppercase tracking-widest truncate">
              Historial · {producto.nombre}
            </h2>
          </div>
          <button
            id="btn-cerrar-historial-lotes"
            onClick={onClose}
            className="hover:text-[var(--color-danger)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1"
            title="Cerrar (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* PESTAÑAS (← → mueven, Enter cambia), FECHAS Y RESUMEN */}
          <BarraFiltros>
            <div data-hist-tabs className="flex gap-2" role="tablist">
              <button id="tab-hist-lotes" data-hist-tab role="tab" aria-selected={pestana === 'LOTES'}
                onClick={() => setPestana('LOTES')} className={claseBotonBarra(pestana === 'LOTES')}>
                <Package size={14} /> Lotes
              </button>
              <button id="tab-hist-movimientos" data-hist-tab role="tab" aria-selected={pestana === 'MOVIMIENTOS'}
                onClick={() => setPestana('MOVIMIENTOS')} className={claseBotonBarra(pestana === 'MOVIMIENTOS')}>
                <ArrowDownUp size={14} /> Movimientos
              </button>
            </div>
            {pestana === 'LOTES' ? (
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <TextoBarra>Con stock: <span className="text-[var(--color-ink)]">{conStock.length} lote(s) · {formatearCantidad(stockTotal, unidad)} {unidad}</span></TextoBarra>
                <TextoBarra>Agotados: <span className="text-[var(--color-ink)]">{agotados.length}</span></TextoBarra>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2"><TextoBarra>Desde</TextoBarra>
                  <input id="hist-desde" data-hist-fecha type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className={claseCampoBarra} />
                </label>
                <label className="flex items-center gap-2"><TextoBarra>Hasta</TextoBarra>
                  <input id="hist-hasta" data-hist-fecha type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={claseCampoBarra} />
                </label>
                <TextoBarra>Entró: <span className="text-[var(--color-accent)]">{formatearCantidad(totalEntra, unidad)} {unidad}</span></TextoBarra>
                <TextoBarra>Salió: <span className="text-[var(--color-danger)]">{formatearCantidad(totalSale, unidad)} {unidad}</span></TextoBarra>
              </div>
            )}
          </BarraFiltros>

          {/* LISTA */}
          {pestana === 'LOTES' ? (
            <CajaLista
              vacia={cargando || !!error || lotes.length === 0}
              mensaje={cargando ? <><Loader2 size={16} className="animate-spin" /> Cargando...</>
                : error ? <span className="text-[var(--color-danger)]">No se pudo cargar el historial: {error}</span>
                : 'Este producto todavía no tiene lotes'}
            >
              {conStock.map(filaLote)}
              {agotados.length > 0 && <SeparadorLista>Agotados ({agotados.length})</SeparadorLista>}
              {agotados.map(filaLote)}
            </CajaLista>
          ) : (
            <CajaLista
              vacia={cargandoMovs || !!errorMovs || movimientos.length === 0}
              mensaje={cargandoMovs ? <><Loader2 size={16} className="animate-spin" /> Cargando...</>
                : errorMovs ? <span className="text-[var(--color-danger)]">No se pudieron cargar los movimientos: {errorMovs}</span>
                : 'No hay movimientos en estas fechas'}
            >
              {movimientos.map(filaMovimiento)}
              {movimientos.length >= LIMITE_MOVIMIENTOS && (
                <SeparadorLista>Se muestran los {LIMITE_MOVIMIENTOS} más recientes: acorta las fechas para ver el resto</SeparadorLista>
              )}
            </CajaLista>
          )}
        </CuerpoVentana>
      </div>
    </div>
  );
};
