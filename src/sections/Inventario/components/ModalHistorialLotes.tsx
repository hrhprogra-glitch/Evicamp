// src/sections/Inventario/components/ModalHistorialLotes.tsx
// Botón del reloj (Productos y Lotes): ventana flotante con dos pestañas.
//  - LOTES: todos los lotes del producto, primero con stock y luego agotados. Es el único lugar donde se ven
//    los agotados que ya tienen un lote más nuevo (en la pestaña Lotes se ocultan solos, ver TablaLotes).
//  - MOVIMIENTOS (kardex): cada entrada y salida (compras, ventas, mermas, ajustes, devoluciones) con quién
//    la hizo (lo guarda el servidor con la sesión, ver fn_registrar_autor_inventario).
// En LOTES cada fila tiene Editar y Eliminar (pedido del usuario 23/10, "para que sea más rápido"): editar abre la
// misma ventana que en la pestaña Lotes (ModalLote, la abre Inventario) y eliminar retira el lote igual que allá
// (fn_soft_delete_batch). ← → en una fila recorren sus botones.
import React, { useEffect, useRef, useState } from 'react';
import { X, History, Loader2, Package, ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { usePermiso, avisarSinPermiso } from '../../../utils/permisos';
import { confirmar, avisar } from '../../../utils/dialogos';
import { ventanaSuperior } from '../../../utils/ventanas';
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
  onEditarLote?: (lote: Record<string, unknown>) => void; // abre ModalLote para editar (Inventario)
  onRetirado?: (productId: string, cantidad: number) => void; // para actualizar el stock y la pestaña Lotes
  recarga?: number; // al cambiar (se guardó o cerró la edición), vuelve a leer los lotes
}

interface LoteHistorial {
  id: string;
  created_at: string;
  initial_quantity: number;
  quantity: number;
  cost_unit: number;
  supplier: string;
  provider_id: string | null;
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
  SOBRANTE: 'Sobrante', CONTEO: 'Conteo', ENTRADA: 'Entrada', SALIDA: 'Salida',
};
// Movimientos antiguos guardados sin el nombre real ("postgres") o por el servidor ("Sistema")
const quien = (u: string) => (!u || u === 'postgres' ? 'Sin registro' : u);

export const ModalHistorialLotes: React.FC<Props> = ({ producto, onClose, onEditarLote, onRetirado, recarga = 0 }) => {
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
  const ultimoEnBarra = useRef(''); // en qué parte de la barra estaba el selector antes de bajar a la lista
  const loteEnUso = useRef(''); // el lote que se editó o eliminó: al recargar, el selector vuelve ahí
  // Los mismos permisos que la pestaña Lotes: editar = ingresar lotes; eliminar = ingresar lotes o eliminar productos
  const puedeIngresarLotes = usePermiso('almacen_ingresar_lotes');
  const puedeEliminarProductos = usePermiso('almacen_eliminar_productos');
  const puedeRetirarLote = puedeIngresarLotes || puedeEliminarProductos;

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
        .select('id, created_at, initial_quantity, quantity, cost_unit, supplier, provider_id, document_ref, expiration_date')
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
        provider_id: b.provider_id ?? null,
        document_ref: b.document_ref || '',
        expiration_date: b.expiration_date || null,
      }));
      setLotes([...filas.filter((l) => l.quantity > 0), ...filas.filter((l) => l.quantity <= 0)]);
      setCargando(false);
    })();
    return () => { vigente = false; };
  }, [producto, recarga]);

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
      if (ventanaSuperior() && !ventanaSuperior()!.contains(document.getElementById('btn-cerrar-historial-lotes'))) return; // hay otra ventana encima
      // Tras editar o eliminar: el mismo lote (o el que quedó en su lugar); si no, la primera fila
      const usado = loteEnUso.current ? document.querySelector(`[data-hist-lote-id="${loteEnUso.current}"]`) as HTMLElement | null : null;
      const primera = document.querySelector('[data-hist-lote="true"]') as HTMLElement | null;
      (usado || primera || document.getElementById('btn-cerrar-historial-lotes'))?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [producto, cargando, pestana, lotes]);

  // Teclado: ↑ ↓ recorren X, pestañas, fechas y filas; ← → cambian de pestaña; Tab encerrado en la ventana
  useEffect(() => {
    if (!producto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-dialogo-sistema]')) return;
      // La ventana de editar lote (u otra) está encima: el teclado es de ella
      const arriba = ventanaSuperior();
      if (arriba && !arriba.contains(document.getElementById('btn-cerrar-historial-lotes'))) return;
      let active = document.activeElement as HTMLElement | null;
      // En un botón de una fila (Editar / Eliminar): ← → entre la fila y sus botones; ↑ ↓ como si estuviera en la fila
      const filaDelBoton = active?.hasAttribute('data-hist-accion') ? active.closest('[data-hist-lote="true"]') as HTMLElement | null : null;
      const filaActual = filaDelBoton || (active?.getAttribute('data-hist-lote') === 'true' ? active : null);
      if (filaActual && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        const partes = [filaActual, ...Array.from(filaActual.querySelectorAll('[data-hist-accion]'))] as HTMLElement[];
        const k = partes.indexOf(active!);
        partes[e.key === 'ArrowRight' ? Math.min(k + 1, partes.length - 1) : Math.max(k - 1, 0)]?.focus();
        return;
      }
      if (filaDelBoton && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab')) active = filaDelBoton;
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
      // La barra de arriba es una fila: pestañas y fechas (pedido del usuario 23/10: también ← →, no solo ↑ ↓).
      // ← → recorren la barra; ↓ baja a la lista; ↑ sube a la X. La pestaña cambia recién con Enter (o clic).
      const barra = elementos.filter((el) => el.hasAttribute('data-hist-tab') || el.hasAttribute('data-hist-fecha'));
      const filas = elementos.filter((el) => el.hasAttribute('data-hist-lote') || el.hasAttribute('data-hist-mov'));
      const enBarra = !!active && barra.includes(active);
      const enFecha = !!active?.hasAttribute('data-hist-fecha');
      if (enBarra && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        const j = barra.indexOf(active!);
        barra[e.key === 'ArrowRight' ? Math.min(j + 1, barra.length - 1) : Math.max(j - 1, 0)]?.focus();
        return;
      }
      if (enBarra && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        e.stopPropagation();
        ultimoEnBarra.current = active!.id;
        if (e.key === 'ArrowUp') document.getElementById('btn-cerrar-historial-lotes')?.focus();
        else filas[0]?.focus();
        return;
      }
      if (enPestana && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        setPestana(active?.id === 'tab-hist-movimientos' ? 'MOVIMIENTOS' : 'LOTES');
        return;
      }
      // Enter en una fecha abre el calendario; al elegir el día (Enter) el selector sigue en esa fecha
      if (enFecha && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        try { (active as HTMLInputElement).showPicker(); } catch { /* navegador sin calendario: se escribe la fecha */ }
        return;
      }
      // ↑ desde la primera fila vuelve a la barra, a donde estaba (o a la pestaña abierta)
      if (e.key === 'ArrowUp' && active && filas[0] === active) {
        e.preventDefault();
        e.stopPropagation();
        (document.getElementById(ultimoEnBarra.current) || document.getElementById(pestana === 'MOVIMIENTOS' ? 'tab-hist-movimientos' : 'tab-hist-lotes'))?.focus();
        return;
      }
      // ↓ desde la X va a la barra
      if (e.key === 'ArrowDown' && active?.id === 'btn-cerrar-historial-lotes') {
        e.preventDefault();
        e.stopPropagation();
        (document.getElementById(ultimoEnBarra.current) || document.getElementById(pestana === 'MOVIMIENTOS' ? 'tab-hist-movimientos' : 'tab-hist-lotes'))?.focus();
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
  }, [producto, onClose, pestana]);

  if (!producto) return null;

  const conStock = lotes.filter((l) => l.quantity > 0);
  const agotados = lotes.filter((l) => l.quantity <= 0);
  const unidad = producto.unidad || 'UND';
  const stockTotal = conStock.reduce((s, l) => s + l.quantity, 0);
  const totalEntra = movimientos.reduce((s, m) => s + (m.change_amount > 0 ? m.change_amount : 0), 0);
  const totalSale = movimientos.reduce((s, m) => s + (m.change_amount < 0 ? -m.change_amount : 0), 0);

  // Editar: la misma ventana que en la pestaña Lotes, con los datos que necesita (ModalLote → initialLote)
  const editarLote = (l: LoteHistorial) => {
    if (!puedeIngresarLotes) { avisarSinPermiso('editar lotes'); return; }
    loteEnUso.current = l.id;
    onEditarLote?.({ ...l, product_id: producto.id, product_name: producto.nombre, unit: unidad });
  };

  // Eliminar: igual que en la pestaña Lotes (el servidor descarga su stock y guarda el historial)
  const retirarLote = async (l: LoteHistorial) => {
    if (!puedeRetirarLote) { avisarSinPermiso('retirar lotes'); return; }
    const filas = Array.from(document.querySelectorAll('[data-hist-lote="true"]')) as HTMLElement[];
    const i = filas.findIndex((f) => f.getAttribute('data-hist-lote-id') === l.id);
    const vecina = filas[i + 1] || filas[i - 1];
    const texto = l.quantity > 0
      ? `¿Eliminar el lote del ${fecha(l.created_at)} de "${producto.nombre}"?

Se descargan sus ${formatearCantidad(l.quantity, unidad)} ${unidad} del stock. El historial de ventas y movimientos no se toca.`
      : `¿Eliminar el lote agotado del ${fecha(l.created_at)} de "${producto.nombre}"?

Ya no tiene stock; el historial de ventas y movimientos no se toca.`;
    if (!(await confirmar(texto))) { document.getElementById(`hist-retirar-${l.id}`)?.focus(); return; }
    const { error: e } = await supabase.rpc('fn_soft_delete_batch', { p_batch_id: String(l.id), p_user_name: 'Admin' });
    if (e) { await avisar(`No se pudo eliminar el lote: ${e.message}`); document.getElementById(`hist-retirar-${l.id}`)?.focus(); return; }
    loteEnUso.current = vecina?.getAttribute('data-hist-lote-id') || '';
    setLotes((lista) => lista.filter((x) => x.id !== l.id));
    onRetirado?.(producto.id, l.quantity);
  };

  // Botones de acción de cada fila (← → desde la fila)
  const claseAccion = 'p-1.5 border-2 border-transparent text-[var(--color-muted)] cursor-pointer focus:outline-none';

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
        data-hist-lote-id={l.id}
        tabIndex={0}
        atenuada={estado === 'AGOTADO'}
        icono={<Package size={32} />}
        titulo={`Ingreso ${fecha(l.created_at)}`}
        subtitulo={datos}
        centro={<Etiqueta tono={estado === 'VIGENTE' ? 'verde' : estado === 'CADUCADO' ? 'rojo' : 'gris'}>{estado}</Etiqueta>}
        derecha={<>
          <DatoFila etiqueta="Queda / Ingresó" valor={`${formatearCantidad(l.quantity, unidad)} / ${formatearCantidad(l.initial_quantity, unidad)} ${unidad}`} />
          {(onEditarLote || onRetirado) && (
            <div className="flex items-center gap-1 ml-3">
              <button id={`hist-editar-${l.id}`} data-hist-accion type="button" tabIndex={-1} title="Editar lote"
                onClick={() => editarLote(l)}
                className={`${claseAccion} hover:text-[var(--color-success)] hover:border-[var(--color-success)] focus:text-white focus:bg-[var(--color-success)]`}>
                <Edit size={18} />
              </button>
              <button id={`hist-retirar-${l.id}`} data-hist-accion type="button" tabIndex={-1} title="Eliminar lote"
                onClick={() => void retirarLote(l)}
                className={`${claseAccion} hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] focus:text-white focus:bg-[var(--color-danger)]`}>
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </>}
      />
    );
  };

  const TONO_TIPO: Record<string, TonoEtiqueta> = {
    COMPRA: 'verde', ANULACION: 'verde', DEVOLUCION: 'verde', VENTA: 'azul', MERMA: 'rojo', AJUSTE: 'ambar', ERROR: 'rojo',
    SOBRANTE: 'verde', CONTEO: 'gris', ENTRADA: 'verde', SALIDA: 'rojo',
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
