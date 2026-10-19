// src/sections/Inventario/components/PanelCompras.tsx
// Inventario > Compras: listas de lo que hay que pedir a cada proveedor.
//  - Nueva lista: proveedor + productos (botón "Agregar stock bajo" con cantidad sugerida) o búsqueda.
//  - Enviar por WhatsApp al proveedor.
//  - Recibir pedido: se confirma lo que llegó y su costo, y se crean TODOS los lotes de una vez
//    (igual que "Ingresar lote": lote + movimiento COMPRA + stock del producto recalculado).
// Tablas compras / compras_detalle (servidor/sql/seguridad-sesion.sql). Permiso: almacen_ingresar_lotes.
//
// Teclado (patrón "selector" del sistema): cada elemento navegable lleva data-nav="fila,columna" y las
// flechas van al vecino más cercano en esa dirección (moverEnGrilla). En los campos de número ↑ ↓ ya no
// cambian el valor sin querer; Enter pasa al siguiente campo. Esc cierra las ventanas.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Plus, Truck, Send, PackageCheck, Trash2, X, Search, AlertTriangle, Loader2, Ban, Undo2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { usePermiso, useEmpleado, avisarSinPermiso } from '../../../utils/permisos';
import { avisar, confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';
import type { Product } from '../types';

interface Proveedor { id: string; razon_social: string; telefono?: string | null }
interface Item { product_id: string; product_name: string; cantidad: number; costo_unit: number; unidad?: string }
interface Compra {
  id: number; provider_id: string | null; proveedor: string | null; estado: 'PENDIENTE' | 'RECIBIDO' | 'ANULADO';
  notas: string | null; documento: string | null; autor: string | null; recibido_por: string | null;
  created_at: string; recibido_at: string | null; compras_detalle: (Item & { id: number; cantidad_recibida: number | null; batch_id: number | null })[];
}

const soles = (n: number) => `S/ ${(Number(n) || 0).toFixed(2)}`;
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
const esPeso = (p?: Pick<Product, 'unit' | 'control_type'>) => !!p && (['KG', 'GR', 'LT', 'ML'].includes(p.unit) || p.control_type === 'WEIGHT');
// Cantidad sugerida: llegar al doble del stock mínimo
const sugerida = (p: Product) => {
  const falta = Math.max(0, (Number(p.minStock) || 0) * 2 - (Number(p.quantity) || 0));
  return esPeso(p) ? Math.max(1, Math.round(falta * 100) / 100) : Math.max(1, Math.ceil(falta));
};
const totalDe = (items: Pick<Item, 'cantidad' | 'costo_unit'>[]) => items.reduce((t, i) => t + (Number(i.cantidad) || 0) * (Number(i.costo_unit) || 0), 0);

const claseInput = 'w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
const claseBoton = 'px-3 py-2 border-2 border-[var(--color-ink)] text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1 cursor-pointer disabled:opacity-50';

// ======================================================= Navegación con flechas
const FILA_PIE = 1000; // los botones de abajo de cada ventana siempre son la última fila

const enfocar = (el: HTMLElement | null | undefined) => {
  if (!el) return false;
  el.focus();
  if (el instanceof HTMLInputElement && ['text', 'number', 'search', 'tel'].includes(el.type)) el.select();
  return true;
};

/** Mueve el foco al vecino [data-nav] en la dirección de la flecha. Devuelve true si se movió. */
const moverEnGrilla = (e: React.KeyboardEvent, contenedor: HTMLElement | null) => {
  const t = e.target as HTMLElement;
  const pos = t.dataset?.nav;
  if (!pos || !contenedor || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return false;
  const tipo = t instanceof HTMLInputElement ? t.type : '';
  // En texto, ← → mueven el cursor salvo en el borde; en fechas, ← → cambian día/mes/año
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && t instanceof HTMLInputElement) {
    if (tipo === 'date') return false;
    if (tipo !== 'number' && t.value) {
      const enBorde = e.key === 'ArrowLeft' ? t.selectionStart === 0 && t.selectionEnd === 0 : t.selectionEnd === t.value.length;
      if (!enBorde) return false;
    }
  }
  const [fila, col] = pos.split(',').map(Number);
  const todos = Array.from(contenedor.querySelectorAll<HTMLElement>('[data-nav]'))
    .filter((el) => el.offsetParent !== null && !(el as HTMLButtonElement).disabled)
    .map((el) => { const [f, c] = el.dataset.nav!.split(',').map(Number); return { el, f, c }; });
  let destino: { el: HTMLElement } | undefined;
  if (e.key === 'ArrowRight') destino = todos.filter((x) => x.f === fila && x.c > col).sort((a, b) => a.c - b.c)[0];
  if (e.key === 'ArrowLeft') destino = todos.filter((x) => x.f === fila && x.c < col).sort((a, b) => b.c - a.c)[0];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const otras = todos.filter((x) => (e.key === 'ArrowDown' ? x.f > fila : x.f < fila));
    if (otras.length) {
      const filaDestino = e.key === 'ArrowDown' ? Math.min(...otras.map((x) => x.f)) : Math.max(...otras.map((x) => x.f));
      const enFila = otras.filter((x) => x.f === filaDestino);
      // Al bajar a los botones de abajo se llega al principal (Guardar / Ingresar), nunca a "Cancelar"
      destino = filaDestino === FILA_PIE
        ? enFila.sort((a, b) => b.c - a.c)[0]
        : enFila.sort((a, b) => Math.abs(a.c - col) - Math.abs(b.c - col) || a.c - b.c)[0];
    }
  }
  // number y select: ↑ ↓ siempre se interceptan (no cambian el valor sin querer)
  if (destino || tipo === 'number' || t.tagName === 'SELECT') e.preventDefault();
  return destino ? enfocar(destino.el) : false;
};

/** Enter en un campo: pasa al siguiente campo [data-nav] (en orden de lectura); al final, al botón principal. */
const siguienteCampo = (e: React.KeyboardEvent, contenedor: HTMLElement | null, principal: string) => {
  const t = e.target as HTMLElement;
  if (e.key !== 'Enter' || !(t instanceof HTMLInputElement) || !contenedor) return;
  e.preventDefault();
  const campos = Array.from(contenedor.querySelectorAll<HTMLElement>('input[data-nav], select[data-nav]')).filter((el) => el.offsetParent !== null);
  const i = campos.indexOf(t);
  if (!enfocar(campos[i + 1])) enfocar(document.getElementById(principal));
};

const abrirLista = (e: React.KeyboardEvent<HTMLSelectElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    try { (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sin showPicker */ }
  }
};

interface Props {
  productos: Product[];
  // Al recibir un pedido: stock nuevo de cada producto (para refrescar la pantalla sin recargar)
  onStockActualizado: (cambios: { id: string; quantity: number }[]) => void;
}

export const PanelCompras: React.FC<Props> = ({ productos, onStockActualizado }) => {
  const puede = usePermiso('almacen_ingresar_lotes');
  const empleado = useEmpleado();
  const panel = useRef<HTMLDivElement>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'PENDIENTE' | 'RECIBIDO' | 'TODAS'>('PENDIENTE');
  const [editando, setEditando] = useState<Compra | 'nueva' | null>(null);
  const [recibiendo, setRecibiendo] = useState<Compra | null>(null);
  const [viendo, setViendo] = useState<Compra | null>(null); // detalle abierto (Enter sobre una lista)
  const [empresa, setEmpresa] = useState({ nombre: '', telefono: '' }); // WhatsApp de Ajustes

  const cargar = async () => {
    setCargando(true);
    const [c, p, e] = await Promise.all([
      supabase.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('providers').select('id, razon_social, telefono').eq('estado', 'ACTIVO').order('razon_social'),
      supabase.from('empresa_config').select('nombre_empresa, telefono').limit(1).maybeSingle(),
    ]);
    setEmpresa({ nombre: String(e.data?.nombre_empresa || ''), telefono: String(e.data?.telefono || '') });
    if (c.error) void avisar(`No se pudieron cargar las compras: ${c.error.message}`);
    setCompras((c.data as Compra[]) || []);
    setProveedores((p.data as Proveedor[]) || []);
    setCargando(false);
  };
  useEffect(() => { void cargar(); }, []);

  // El selector no se pierde al volver de otra ventana (p. ej. WhatsApp) ni al hacer clic en un espacio vacío:
  // se vuelve a marcar el último elemento elegido de Compras (o "Nueva lista")
  const ultimo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const recordar = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t?.dataset?.nav && panel.current?.contains(t) && !t.closest('[role="dialog"]')) ultimo.current = t;
    };
    const recuperar = () => setTimeout(() => {
      const activo = document.activeElement;
      if (activo && activo !== document.body) return;                       // ya hay algo seleccionado
      if (document.querySelector('[role="dialog"], [data-dialogo-sistema]')) return;
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;
      const destino = ultimo.current?.isConnected && ultimo.current.offsetParent !== null ? ultimo.current : document.getElementById('btn-nueva-compra');
      enfocar(destino);
    }, 80);
    document.addEventListener('focusin', recordar);
    window.addEventListener('focus', recuperar);
    document.addEventListener('click', recuperar);
    return () => {
      document.removeEventListener('focusin', recordar);
      window.removeEventListener('focus', recuperar);
      document.removeEventListener('click', recuperar);
    };
  }, []);

  const visibles = compras.filter((c) => filtro === 'TODAS' || c.estado === filtro);
  const stockBajo = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));

  const conPermiso = (accion: string, hacer: () => void) => (puede ? hacer() : avisarSinPermiso(accion));
  // Al cerrar una ventana el foco vuelve a la lista (o a "Nueva lista")
  const volverFoco = (compraId?: number) => setTimeout(() => {
    enfocar((compraId && document.querySelector<HTMLElement>(`[data-compra="${compraId}"]`)) || document.getElementById('btn-nueva-compra'));
  }, 350); // después de que los avisos devuelvan su foco (navegacionSesion), para que no lo pisen

  // WhatsApp de Ajustes > Datos de la empresa (Teléfono): el detalle se envía a ESE número
  const enviarWhatsApp = (c: Compra) => {
    const recibida = c.estado === 'RECIBIDO';
    const lineas = c.compras_detalle.map((d) => {
      const cant = recibida ? (d.cantidad_recibida ?? 0) : d.cantidad;
      return `• ${cant} x ${d.product_name}  (S/ ${(Number(d.costo_unit) || 0).toFixed(2)} c/u)`;
    }).join('\n');
    const total = totalDe(c.compras_detalle.map((d) => ({ cantidad: recibida ? Number(d.cantidad_recibida ?? 0) : d.cantidad, costo_unit: d.costo_unit })));
    const texto = [
      `*${recibida ? 'Compra recibida' : 'Pedido de compra'} #${String(c.id).slice(-6)}*${empresa.nombre ? ` · ${empresa.nombre}` : ''}`,
      `Proveedor: ${c.proveedor || 'Sin proveedor'}`,
      `Fecha: ${fecha(c.created_at)}${recibida ? ` · recibido ${fecha(c.recibido_at)}${c.documento ? ` (${c.documento})` : ''}` : ''}`,
      '', lineas, '', `Total aprox.: ${soles(total)}`,
      ...(c.notas ? ['', `Nota: ${c.notas}`] : []),
    ].join('\n');
    const numero = empresa.telefono.replace(/\D/g, '');
    const destino = numero.length === 9 ? `51${numero}` : numero; // celular peruano sin código de país
    if (!destino) void avisar('📱 No hay un número de WhatsApp en Ajustes > Datos de la empresa (Teléfono). Se abrirá WhatsApp para que elijas el chat; si lo registras en Ajustes, se enviará siempre a ese número.');
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const anular = async (c: Compra) => {
    if (!await confirmar(`¿Anular esta lista de compras${c.proveedor ? ` de ${c.proveedor}` : ''}? No se ingresa nada al inventario.`)) return false;
    const { error } = await supabase.from('compras').update({ estado: 'ANULADO' }).eq('id', c.id);
    if (error) { void avisar(`No se pudo anular: ${error.message}`); return false; }
    await cargar();
    volverFoco();
    return true;
  };

  // "Devolver lo ingresado": la compra recibida vuelve a PENDIENTE y sus lotes se retiran (fn_soft_delete_batch,
  // la misma función de "Retirar lote"). Solo si esa mercadería no se movió (vendida o mermada): si no, el
  // stock quedaría mal.
  const devolver = async (c: Compra) => {
    const conLote = c.compras_detalle.filter((d) => d.batch_id != null);
    if (!conLote.length) { void avisar('Esta compra no tiene lotes ingresados.'); return false; }
    const { data: lotes, error } = await supabase.from('batches').select('id, quantity, initial_quantity, is_active').in('id', conLote.map((d) => d.batch_id!));
    if (error) { void avisar(`No se pudo revisar los lotes: ${error.message}`); return false; }
    const movidos = conLote.filter((d) => {
      const l = (lotes || []).find((x: any) => String(x.id) === String(d.batch_id));
      return !l || Number(l.is_active) !== 1 || Number(l.quantity) < Number(d.cantidad_recibida ?? 0);
    });
    if (movidos.length) {
      void avisar(`⚠️ No se puede devolver esta compra.\n\nEstos productos ya se vendieron, se mermaron o su lote se retiró:\n${movidos.map((d) => `• ${d.product_name}`).join('\n')}\n\nSi hubo un error, corrige el stock desde Inventario > Lotes.`);
      return false;
    }
    if (!await confirmar(
      `↩️ DEVOLVER LO INGRESADO\n\nUsa esto si te equivocaste al recibir (cantidades, costos o el pedido equivocado):\n\n`
      + `• Se retirarán del inventario los ${conLote.length} lote(s) que se crearon.\n`
      + `• El stock vuelve a como estaba antes de recibir.\n`
      + `• La compra vuelve a PENDIENTES: puedes editarla y recibirla de nuevo.\n\n¿Devolver?`,
    )) return false;
    const fallidos: string[] = [];
    const cambios: { id: string; quantity: number }[] = [];
    for (const d of conLote) {
      const { error: e1 } = await supabase.rpc('fn_soft_delete_batch', { p_batch_id: String(d.batch_id), p_user_name: `${empleado?.nombre || 'Sistema'} (devolución compra #${String(c.id).slice(-6)})` });
      if (e1) { fallidos.push(`${d.product_name}: ${e1.message}`); continue; }
      await supabase.from('compras_detalle').update({ cantidad_recibida: null, batch_id: null }).eq('id', d.id);
      const { data: p } = await supabase.from('products').select('quantity').eq('id', d.product_id).single();
      cambios.push({ id: String(d.product_id), quantity: Number(p?.quantity || 0) });
    }
    if (!fallidos.length) {
      await supabase.from('compras').update({ estado: 'PENDIENTE', recibido_at: null, recibido_por: null, documento: null }).eq('id', c.id);
      await supabase.from('compras_detalle').update({ cantidad_recibida: null }).eq('compra_id', c.id);
    }
    if (cambios.length) onStockActualizado(cambios);
    await cargar();
    await avisar(fallidos.length
      ? `⚠️ Se devolvieron ${cambios.length} de ${conLote.length}. No se pudo con:\n${fallidos.join('\n')}`
      : `✅ Compra devuelta. Los lotes se retiraron y la compra volvió a PENDIENTES (pedido #${String(c.id).slice(-6)}).`);
    setFiltro('PENDIENTE');
    volverFoco(c.id);
    return true;
  };

  // ↑ desde la primera fila vuelve a la pestaña "Compras"
  const teclasPanel = (e: React.KeyboardEvent) => {
    if (editando || recibiendo || viendo) return;
    const fila = Number((e.target as HTMLElement).dataset?.nav?.split(',')[0]);
    if (e.key === 'ArrowUp' && fila === 0) { e.preventDefault(); enfocar(document.getElementById('btn-tab-compras')); return; }
    moverEnGrilla(e, panel.current);
  };

  // Las tarjetas se ven en 2 columnas en pantalla ancha: las flechas siguen esa misma grilla
  const [columnas, setColumnas] = useState(() => (window.matchMedia('(min-width: 1024px)').matches ? 2 : 1));
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const cambiar = () => setColumnas(mq.matches ? 2 : 1);
    mq.addEventListener('change', cambiar);
    return () => mq.removeEventListener('change', cambiar);
  }, []);

  const filtros = [['PENDIENTE', 'Pendientes'], ['RECIBIDO', 'Recibidas'], ['TODAS', 'Todas']] as const;

  return (
    <div id="panel-compras" ref={panel} onKeyDown={teclasPanel} className="flex flex-col gap-4 font-mono">
      {/* Cabecera (fila 0) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-3 sm:p-4">
        <div>
          <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2"><ShoppingCart size={18} /> Listas de compras</h2>
          <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">
            Arma el pedido para tu proveedor y, cuando llegue, recíbelo: los lotes se crean solos. Enter sobre una lista para ver su detalle.
            {stockBajo.length > 0 && <span className="text-[var(--color-danger)]"> · {stockBajo.length} producto(s) con stock bajo.</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtros.map(([f, nombre], i) => (
            <button key={f} id={`btn-compras-filtro-${f}`} type="button" data-nav={`0,${i}`} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
              className={`${claseBoton} ${filtro === f ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'bg-white text-[var(--color-ink)]'}`}>
              {nombre}
            </button>
          ))}
          <button id="btn-nueva-compra" type="button" data-nav="0,3" onClick={() => conPermiso('armar listas de compras', () => setEditando('nueva'))}
            className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[3px_3px_0_0_var(--color-ink)]`}>
            <Plus size={14} /> Nueva lista
          </button>
        </div>
      </div>

      {/* Listas: solo proveedor y datos del pedido; Enter abre el detalle */}
      {cargando ? (
        <div className="p-6 text-center text-xs font-black uppercase text-[var(--color-muted)]"><Loader2 className="inline animate-spin" size={16} /> Cargando...</div>
      ) : visibles.length === 0 ? (
        <div className="p-6 bg-white border-2 border-dashed border-[var(--color-border)] text-center text-xs font-black uppercase text-[var(--color-muted)]">
          {filtro === 'PENDIENTE' ? 'No hay pedidos pendientes. Crea una lista con "Nueva lista".' : 'No hay listas aquí.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visibles.map((c, n) => {
            const colorEstado = c.estado === 'PENDIENTE' ? 'border-[var(--color-warning)] text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)]'
              : c.estado === 'RECIBIDO' ? 'border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-accent-bg)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-bg)]';
            return (
              <div key={c.id} data-compra={c.id} role="button" tabIndex={0}
                data-nav={`${1 + Math.floor(n / columnas)},${n % columnas}`}
                aria-label={`Pedido ${String(c.id).slice(-6)} de ${c.proveedor || 'sin proveedor'}, ${c.estado}. Enter para ver el detalle`}
                onClick={() => setViendo(c)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViendo(c); } }}
                className="bg-white border-2 border-[var(--color-ink)] p-3 flex justify-between gap-2 cursor-pointer hover:bg-[var(--color-bg)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:bg-[var(--color-accent-bg)]">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase text-[var(--color-ink)] truncate flex items-center gap-2"><Truck size={14} /> {c.proveedor || 'Sin proveedor'}</p>
                  <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
                    Pedido #{String(c.id).slice(-6)} · {fecha(c.created_at)}{c.autor ? ` · por ${c.autor}` : ''}
                    {c.estado === 'RECIBIDO' && ` · recibido ${fecha(c.recibido_at)}${c.documento ? ` (${c.documento})` : ''}`}
                  </p>
                </div>
                <span className={`shrink-0 self-start px-2 py-0.5 border-2 text-[10px] font-black uppercase ${colorEstado}`}>{c.estado}</span>
              </div>
            );
          })}
        </div>
      )}

      {viendo && (
        <DetalleCompra
          compra={viendo}
          onCerrar={() => { const id = viendo.id; setViendo(null); volverFoco(id); }}
          onWhatsApp={() => enviarWhatsApp(viendo)}
          onEditar={() => conPermiso('editar listas de compras', () => { const c = viendo; setViendo(null); setEditando(c); })}
          onAnular={() => conPermiso('anular listas de compras', () => { const c = viendo; void anular(c).then((ok) => { if (ok) setViendo(null); }); })}
          onRecibir={() => conPermiso('recibir pedidos', () => { const c = viendo; setViendo(null); setRecibiendo(c); })}
          onDevolver={() => conPermiso('devolver compras', () => { const c = viendo; void devolver(c).then((ok) => { if (ok) setViendo(null); }); })}
        />
      )}

      {editando && (
        <EditorCompra
          compra={editando === 'nueva' ? null : editando}
          productos={productos}
          proveedores={proveedores}
          autor={empleado?.nombre || ''}
          onCerrar={async (guardadoId) => {
            const anterior = editando === 'nueva' ? undefined : editando.id;
            setEditando(null);
            if (guardadoId) { setFiltro('PENDIENTE'); await cargar(); }
            volverFoco(guardadoId || anterior);
          }}
        />
      )}
      {recibiendo && (
        <RecibirCompra
          compra={recibiendo}
          productos={productos}
          receptor={empleado?.nombre || ''}
          onCerrar={async (cambios) => {
            const id = recibiendo.id;
            setRecibiendo(null);
            if (cambios) { onStockActualizado(cambios); await cargar(); }
            volverFoco(id);
          }}
        />
      )}
    </div>
  );
};

// ======================================================= Ventana base (Esc cierra)
const Ventana: React.FC<{ titulo: string; onCerrar: () => void; children: React.ReactNode; pie: React.ReactNode; cuerpo: React.RefObject<HTMLDivElement | null> }> = ({ titulo, onCerrar, children, pie, cuerpo }) => {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo-sistema]')) return;
      // Esc en un buscador con texto: primero borra la búsqueda (lo maneja el buscador)
      const activo = document.activeElement as HTMLInputElement | null;
      if (activo?.dataset?.escLimpia) return; // el buscador cierra primero su desplegable / borra su texto
      e.preventDefault(); e.stopPropagation(); onCerrar();
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onCerrar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div ref={cuerpo} className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-3xl max-h-[calc(var(--alto-pantalla,100vh)*0.94)] flex flex-col"
        onKeyDown={(e) => moverEnGrilla(e, cuerpo.current)}>
        <div className="bg-[var(--color-ink)] text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">{titulo}</h3>
          <button type="button" data-nav="-1,0" onClick={onCerrar} aria-label="Cerrar (Esc)" title="Cerrar (Esc)" className="p-1 hover:text-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">{children}</div>
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex flex-wrap justify-end gap-2 shrink-0">{pie}</div>
      </div>
    </div>
  );
};

// ======================================================= Detalle (Enter sobre una lista). Tamaño de letra normal: Ajustes > Apariencia lo agranda
const DetalleCompra: React.FC<{
  compra: Compra; onCerrar: () => void; onWhatsApp: () => void; onEditar: () => void;
  onAnular: () => void; onRecibir: () => void; onDevolver: () => void;
}> = ({ compra: c, onCerrar, onWhatsApp, onEditar, onAnular, onRecibir, onDevolver }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const recibida = c.estado === 'RECIBIDO';
  const parcial = c.compras_detalle.some((d) => d.batch_id != null);
  const filas = c.compras_detalle.map((d) => ({ ...d, mostrar: recibida ? Number(d.cantidad_recibida ?? 0) : Number(d.cantidad) }));
  const total = totalDe(filas.map((f) => ({ cantidad: f.mostrar, costo_unit: f.costo_unit })));
  // Botones: el principal va al final (↓ llega a él y es el que queda marcado al abrir)
  const botones = c.estado === 'PENDIENTE'
    ? [
      { clave: 'whatsapp', contenido: <><Send size={16} /> WhatsApp</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', hacer: onWhatsApp },
      ...(!parcial ? [{ clave: 'editar', contenido: <>Editar</>, clase: 'bg-white text-[var(--color-ink)]', hacer: onEditar }] : []),
      { clave: 'anular', contenido: <><Ban size={16} /> Anular</>, clase: 'bg-white text-[var(--color-muted)]', hacer: onAnular },
      { clave: 'recibir', contenido: <><PackageCheck size={16} /> Recibir</>, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]', hacer: onRecibir },
    ]
    : recibida
      ? [
        { clave: 'devolver', contenido: <><Undo2 size={16} /> Devolver lo ingresado</>, clase: 'bg-white text-[var(--color-danger)] border-[var(--color-danger)]', hacer: onDevolver },
        { clave: 'whatsapp', contenido: <><Send size={16} /> WhatsApp</>, clase: 'bg-[var(--color-success)] text-white border-[var(--color-success)]', hacer: onWhatsApp },
      ]
      : [{ clave: 'whatsapp', contenido: <><Send size={16} /> WhatsApp</>, clase: 'bg-[var(--color-success)] text-white border-[var(--color-success)]', hacer: onWhatsApp }];

  useEffect(() => { setTimeout(() => enfocar(document.getElementById(`btn-detalle-${botones[botones.length - 1].clave}`)), 30); }, []);

  return (
    <Ventana cuerpo={cuerpo} titulo={`Pedido #${String(c.id).slice(-6)} · ${c.estado}`} onCerrar={onCerrar}
      pie={<>{botones.map((b, i) => (
        <button key={b.clave} id={`btn-detalle-${b.clave}`} type="button" data-nav={`${FILA_PIE},${i}`} onClick={b.hacer}
          className={`${claseBoton} ${b.clase}`}>{b.contenido}</button>
      ))}</>}>
      <div className="flex flex-col gap-1">
        <p className="text-sm sm:text-base font-black uppercase text-[var(--color-ink)] flex items-center gap-2"><Truck size={16} /> {c.proveedor || 'Sin proveedor'}</p>
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
          {fecha(c.created_at)}{c.autor ? ` · armado por ${c.autor}` : ''}
          {recibida && ` · recibido ${fecha(c.recibido_at)}${c.recibido_por ? ` por ${c.recibido_por}` : ''}${c.documento ? ` · ${c.documento}` : ''}`}
        </p>
        {c.notas && <p className="text-xs font-bold text-[var(--color-ink)] mt-1">📝 {c.notas}</p>}
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)] border-b-2 border-[var(--color-ink)]">
          <th className="py-2 pr-2">Producto</th><th className="py-2 px-2 text-right">{recibida ? 'Llegó' : 'Pedir'}</th><th className="py-2 px-2 text-right">Costo u.</th><th className="py-2 pl-2 text-right">Subtotal</th>
        </tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-[var(--color-border)]">
              <td className="py-2 pr-2 font-black text-[var(--color-ink)]">{f.product_name}
                {recibida && Number(f.cantidad_recibida ?? 0) !== Number(f.cantidad) && <span className="block text-xs font-bold text-[var(--color-warning-dark)]">pedido: {f.cantidad}</span>}
              </td>
              <td className="py-2 px-2 text-right font-black">{f.mostrar}</td>
              <td className="py-2 px-2 text-right font-bold text-[var(--color-muted)]">{soles(f.costo_unit)}</td>
              <td className="py-2 pl-2 text-right font-black">{soles(f.mostrar * Number(f.costo_unit))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-sm font-black text-[var(--color-ink)]">Total aprox. {soles(total)}</p>
    </Ventana>
  );
};

// ======================================================= Crear / editar una lista
const EditorCompra: React.FC<{
  compra: Compra | null; productos: Product[]; proveedores: Proveedor[]; autor: string; onCerrar: (guardadoId: number | null) => void;
}> = ({ compra, productos, proveedores, autor, onCerrar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const [proveedorId, setProveedorId] = useState(compra?.provider_id || '');
  const [notas, setNotas] = useState(compra?.notas || '');
  const [items, setItems] = useState<Item[]>(compra?.compras_detalle.map((d) => ({
    product_id: String(d.product_id), product_name: d.product_name, cantidad: Number(d.cantidad), costo_unit: Math.round(Number(d.costo_unit) * 100) / 100,
  })) || []);
  const [busqueda, setBusqueda] = useState('');
  const [marcado, setMarcado] = useState(-1); // resultado marcado con ↑ ↓ (-1 = escribiendo)
  const [guardando, setGuardando] = useState(false);
  const ocupado = useRef(false); // un segundo Enter mientras guarda no hace nada
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  // Al abrir: una lista nueva empieza por el proveedor; una existente, por el buscador
  useEffect(() => { setTimeout(() => enfocar(document.getElementById(compra ? 'compra-buscar' : 'compra-proveedor')), 30); }, []);

  const agregar = (p: Product, cantidad = 1) => setItems((prev) => (prev.some((i) => i.product_id === String(p.id))
    ? prev
    : [...prev, { product_id: String(p.id), product_name: p.name, cantidad, costo_unit: Math.round((Number(p.cost) || 0) * 100) / 100, unidad: p.unit }]));
  const agregarStockBajo = () => {
    const bajos = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));
    if (!bajos.length) { void avisar('No hay productos con stock bajo. 👍'); return; }
    bajos.forEach((p) => agregar(p, sugerida(p)));
  };
  const cambiar = (id: string, campo: 'cantidad' | 'costo_unit', valor: string) =>
    setItems((prev) => prev.map((i) => (i.product_id === id ? { ...i, [campo]: Math.max(0, Number(valor) || 0) } : i)));
  const quitar = (id: string, fila: number) => {
    setItems((prev) => prev.filter((x) => x.product_id !== id));
    // El foco pasa a la fila que quedó en su lugar (o al buscador si ya no hay)
    setTimeout(() => enfocar(cuerpo.current?.querySelector<HTMLElement>(`[data-nav="${fila},2"]`)
      || cuerpo.current?.querySelector<HTMLElement>(`[data-nav="${fila - 1},2"]`) || document.getElementById('compra-buscar')), 30);
  };

  // Desplegable: se abre al escribir (desde la 1ra letra) o con ↓ en el buscador vacío (todos, stock bajo primero)
  const [abierto, setAbierto] = useState(false);
  const disponibles = productos.filter((p) => !items.some((i) => i.product_id === String(p.id)));
  const resultados = !abierto ? [] : busqueda.trim()
    ? disponibles.filter((p) => coincideBusqueda([p.name, p.code, p.barcode], busqueda)).slice(0, 50)
    : [...disponibles].sort((a, b) => Number(b.unit !== 'CONSUMO' && Number(b.quantity) <= Number(b.minStock)) - Number(a.unit !== 'CONSUMO' && Number(a.quantity) <= Number(a.minStock))
      || a.name.localeCompare(b.name)).slice(0, 50);
  useEffect(() => { setMarcado(-1); }, [busqueda]);
  // El marcado siempre a la vista
  useEffect(() => { if (marcado >= 0) document.getElementById(`compra-resultado-${marcado}`)?.scrollIntoView({ block: 'nearest' }); }, [marcado]);
  const elegir = (p: Product) => {
    agregar(p);
    setBusqueda('');
    setAbierto(false);
    // Queda listo para escribir la cantidad del producto recién agregado
    setTimeout(() => enfocar(cuerpo.current?.querySelector<HTMLElement>(`[data-producto="${p.id}"] input`)), 30);
  };

  const teclasBuscador = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(true); setMarcado(0); return; }
    if (e.key === 'Escape' && abierto && !busqueda) { e.preventDefault(); setAbierto(false); return; }
    if (resultados.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setMarcado((m) => Math.min(resultados.length - 1, m + 1)); return; }
      if (e.key === 'ArrowUp' && marcado >= 0) { e.preventDefault(); e.stopPropagation(); setMarcado((m) => m - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); elegir(resultados[Math.max(0, marcado)]); return; }
    }
    if (e.key === 'Escape' && busqueda) { e.preventDefault(); setBusqueda(''); setAbierto(false); return; }
    // Sin resultados: Enter pasa a la primera cantidad de la lista (o a Guardar)
    if (e.key === 'Enter') {
      e.preventDefault();
      enfocar(cuerpo.current?.querySelector<HTMLElement>('[data-producto] input') || document.getElementById('btn-guardar-compra'));
    }
  };

  const guardar = async () => {
    if (ocupado.current) return;
    const validos = items.filter((i) => i.cantidad > 0);
    if (!validos.length) { void avisar('Agrega al menos un producto con cantidad.'); return; }
    ocupado.current = true;
    setGuardando(true);
    try {
      const prov = proveedores.find((p) => p.id === proveedorId);
      const id = compra?.id ?? Date.now();
      const cabecera = { provider_id: prov?.id || null, proveedor: prov?.razon_social || null, notas: notas.trim() || null };
      const r1 = compra
        ? await supabase.from('compras').update(cabecera).eq('id', id)
        : await supabase.from('compras').insert([{ id, ...cabecera, estado: 'PENDIENTE', autor: autor || null }]);
      if (r1.error) throw r1.error;
      if (compra) {
        const r2 = await supabase.from('compras_detalle').delete().eq('compra_id', id);
        if (r2.error) throw r2.error;
      }
      const r3 = await supabase.from('compras_detalle').insert(validos.map((i) => ({
        compra_id: id, product_id: Number(i.product_id), product_name: i.product_name, cantidad: i.cantidad, costo_unit: i.costo_unit,
      })));
      if (r3.error) throw r3.error;
      onCerrar(id);
    } catch (e: any) {
      void avisar(`No se pudo guardar la lista: ${e?.message || e}`);
    } finally {
      ocupado.current = false;
      setGuardando(false);
    }
  };

  return (
    <Ventana cuerpo={cuerpo} titulo={compra ? `Editar pedido #${String(compra.id).slice(-6)}` : 'Nueva lista de compras'} onCerrar={() => onCerrar(null)}
      pie={<>
        <span className="mr-auto self-center text-[10px] font-bold text-[var(--color-muted)] uppercase hidden sm:inline">Flechas para moverte · Enter siguiente · Esc o X para cerrar</span>
        <button id="btn-guardar-compra" type="button" data-nav={`${FILA_PIE},1`} aria-disabled={guardando} onClick={() => void guardar()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)] ${guardando ? 'opacity-60' : ''}`}>{guardando ? 'Guardando...' : 'Guardar lista'}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Proveedor (Enter para elegir)</span>
          <select id="compra-proveedor" data-nav="0,0" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} onKeyDown={abrirLista} className={claseInput}>
            <option value="">— Sin proveedor —</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Nota para el proveedor (opcional)</span>
          <input id="compra-notas" data-nav="0,1" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej: entregar el lunes en la mañana"
            onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')} className={claseInput} />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input id="compra-buscar" data-nav="1,0" data-esc-limpia={abierto || busqueda ? '1' : undefined} value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            placeholder="Escribe para buscar o ↓ para ver todos..." onKeyDown={teclasBuscador} autoComplete="off"
            role="combobox" aria-expanded={abierto} aria-controls="compra-resultados"
            aria-activedescendant={marcado >= 0 ? `compra-resultado-${marcado}` : undefined}
            className={`${claseInput} pl-7`} />
        </div>
        <button type="button" data-nav="1,1" onClick={agregarStockBajo} className={`${claseBoton} bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] border-[var(--color-warning)]`}>
          <AlertTriangle size={14} /> Agregar stock bajo
        </button>
      </div>
      {abierto && (
        <ul id="compra-resultados" role="listbox" aria-label="Productos" className="-mt-2 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] max-h-64 overflow-auto custom-scrollbar">
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-xs font-black uppercase text-[var(--color-muted)]">Sin resultados para "{busqueda}"</li>
          ) : resultados.map((p, i) => (
            <li key={p.id} id={`compra-resultado-${i}`} role="option" aria-selected={marcado === i}
              onMouseDown={(e) => { e.preventDefault(); elegir(p); }}
              className={`px-3 py-2 text-sm font-bold flex justify-between gap-2 cursor-pointer border-b border-[var(--color-border)] ${marcado === i ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-bg)]'}`}>
              <span className="truncate">{p.name}</span>
              <span className={`shrink-0 text-xs ${marcado === i ? '' : Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>stock {p.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="p-4 border-2 border-dashed border-[var(--color-border)] text-center text-xs font-black uppercase text-[var(--color-muted)]">
          Busca productos o usa "Agregar stock bajo".
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              <th className="p-1">Producto</th><th className="p-1 w-20">Stock</th><th className="p-1 w-24">Pedir</th><th className="p-1 w-24">Costo u.</th><th className="p-1 w-24 text-right">Subtotal</th><th className="w-8" />
            </tr></thead>
            <tbody>
              {items.map((i, n) => {
                const p = porId.get(i.product_id);
                const fila = 2 + n;
                return (
                  <tr key={i.product_id} data-producto={i.product_id} className="border-t border-[var(--color-border)]">
                    <td className="p-1 font-black">{i.product_name}</td>
                    <td className={`p-1 font-bold ${p && Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{p ? `${p.quantity} / mín ${p.minStock}` : '-'}</td>
                    <td className="p-1"><input type="number" data-nav={`${fila},0`} min="0" step={esPeso(p) ? '0.01' : '1'} value={i.cantidad}
                      onChange={(e) => cambiar(i.product_id, 'cantidad', e.target.value)} onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')}
                      className={claseInput} aria-label={`Cantidad de ${i.product_name}`} /></td>
                    <td className="p-1"><input type="number" data-nav={`${fila},1`} min="0" step="0.01" value={i.costo_unit}
                      onChange={(e) => cambiar(i.product_id, 'costo_unit', e.target.value)} onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')}
                      className={claseInput} aria-label={`Costo de ${i.product_name}`} /></td>
                    <td className="p-1 text-right font-black">{soles(i.cantidad * i.costo_unit)}</td>
                    <td className="p-1"><button type="button" data-nav={`${fila},2`} onClick={() => quitar(i.product_id, fila)} aria-label={`Quitar ${i.product_name}`} title="Quitar (Enter)"
                      className="p-1 text-[var(--color-muted)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] cursor-pointer"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-right text-sm font-black text-[var(--color-ink)] mt-2">Total aprox. {soles(totalDe(items))}</p>
        </div>
      )}
    </Ventana>
  );
};

// ======================================================= Recibir: crea los lotes
const RecibirCompra: React.FC<{
  compra: Compra; productos: Product[]; receptor: string; onCerrar: (cambios: { id: string; quantity: number }[] | null) => void;
}> = ({ compra, productos, receptor, onCerrar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  // Lo que ya entró en un intento anterior (tiene lote) no se vuelve a ingresar
  const [filas, setFilas] = useState(compra.compras_detalle.filter((d) => d.batch_id == null).map((d) => ({
    detalle_id: d.id, product_id: String(d.product_id), product_name: d.product_name,
    pedida: Number(d.cantidad), llego: String(d.cantidad), costo: String(d.costo_unit), vence: '',
  })));
  const [documento, setDocumento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const ocupado = useRef(false); // un segundo Enter mientras ingresa no hace nada (no duplica lotes)
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);
  const cambiar = (i: number, campo: 'llego' | 'costo' | 'vence', valor: string) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const total = filas.reduce((t, f) => t + (Number(f.llego) || 0) * (Number(f.costo) || 0), 0);

  useEffect(() => { setTimeout(() => enfocar(document.getElementById('compra-documento')), 30); }, []);

  const recibir = async () => {
    if (ocupado.current) return;
    const llegan = filas.filter((f) => Number(f.llego) > 0);
    if (!llegan.length) { void avisar('Escribe cuánto llegó de al menos un producto.'); return; }
    ocupado.current = true;
    if (!await confirmar(`¿Ingresar al inventario ${llegan.length} producto(s) por ${soles(total)}?\nSe creará un lote por cada producto.`)) { ocupado.current = false; return; }
    setGuardando(true);
    const doc = documento.trim() || `COMPRA #${String(compra.id).slice(-6)}`;
    const cambios: { id: string; quantity: number }[] = [];
    const fallidos: string[] = [];
    let base = Date.now();
    for (const f of llegan) {
      try {
        const cantidad = Number(f.llego);
        const costo = Number(f.costo) || 0;
        const batchId = String(base++);
        // Igual que "Ingresar lote" (ModalLote): lote + movimiento COMPRA + stock real del producto
        const { error: e1 } = await supabase.from('batches').insert([{
          id: batchId, product_id: Number(f.product_id), quantity: cantidad, initial_quantity: cantidad,
          expiration_date: f.vence || null, cost_total: Math.round(cantidad * costo * 100) / 100, cost_unit: costo,
          document_ref: doc, supplier: compra.proveedor || null, provider_id: compra.provider_id || null,
          is_synced: '1', is_active: 1,
        }]);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from('inventory_movements').insert([{
          batch_id: batchId, product_id: Number(f.product_id), product_name: f.product_name,
          change_amount: cantidad, previous_quantity: 0, new_quantity: cantidad,
          operation_type: 'COMPRA', reason: 'Ingreso Lote', notes: `Doc: ${doc} · Pedido #${String(compra.id).slice(-6)}`,
          user: receptor || 'Sistema', is_synced: '1',
        }]);
        if (e2) throw e2;
        const { data: lotes } = await supabase.from('batches').select('quantity').eq('product_id', f.product_id).eq('is_active', 1);
        const stock = (lotes || []).reduce((s, l: any) => s + Number(l.quantity || 0), 0);
        await supabase.from('products').update({ quantity: stock }).eq('id', f.product_id);
        await supabase.from('compras_detalle').update({ cantidad_recibida: cantidad, costo_unit: costo, batch_id: Number(batchId) }).eq('id', f.detalle_id);
        cambios.push({ id: f.product_id, quantity: stock });
      } catch (e: any) {
        fallidos.push(`${f.product_name}: ${e?.message || e}`);
      }
    }
    // Lo que no llegó queda en 0 recibido
    for (const f of filas.filter((x) => !(Number(x.llego) > 0))) {
      await supabase.from('compras_detalle').update({ cantidad_recibida: 0 }).eq('id', f.detalle_id);
    }
    if (!fallidos.length) {
      await supabase.from('compras').update({
        estado: 'RECIBIDO', documento: doc, recibido_por: receptor || null, recibido_at: new Date().toISOString(),
      }).eq('id', compra.id);
    }
    setGuardando(false);
    ocupado.current = false;
    if (fallidos.length) {
      await avisar(`⚠️ Se ingresaron ${cambios.length} de ${llegan.length}. No se pudieron ingresar:\n${fallidos.join('\n')}\n\nEl pedido sigue PENDIENTE: al volver a "Recibir" solo aparecerá lo que faltó.`);
    } else {
      await avisar(`✅ Pedido recibido: ${cambios.length} lote(s) creado(s). El stock ya está actualizado.`);
    }
    onCerrar(cambios);
  };

  return (
    <Ventana cuerpo={cuerpo} titulo={`Recibir pedido #${String(compra.id).slice(-6)} · ${compra.proveedor || 'Sin proveedor'}`} onCerrar={() => onCerrar(null)}
      pie={<>
        <span className="mr-auto self-center text-sm font-black text-[var(--color-ink)]">Total: {soles(total)}</span>
        <button id="btn-confirmar-recepcion" type="button" data-nav={`${FILA_PIE},1`} aria-disabled={guardando} onClick={() => void recibir()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)] ${guardando ? 'opacity-60' : ''}`}>
          {guardando ? <><Loader2 size={14} className="animate-spin" /> Ingresando...</> : <><PackageCheck size={14} /> Ingresar al inventario</>}
        </button>
      </>}>
      <p className="text-[11px] font-bold text-[var(--color-muted)]">
        Revisa lo que llegó. Si algo no vino, déjalo en 0. Puedes corregir el costo según la factura. Flechas para moverte · Enter siguiente.
      </p>
      <label className="space-y-1 max-w-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">N° de factura o boleta (opcional)</span>
        <input id="compra-documento" data-nav="0,0" value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={40} placeholder="Ej: F001-000123"
          onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-confirmar-recepcion')} className={claseInput} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            <th className="p-1">Producto</th><th className="p-1 w-16">Pedido</th><th className="p-1 w-24">Llegó</th><th className="p-1 w-24">Costo u.</th><th className="p-1 w-36">Vence (opcional)</th>
          </tr></thead>
          <tbody>
            {filas.map((f, i) => {
              const p = porId.get(f.product_id);
              const fila = 1 + i;
              const enter = (e: React.KeyboardEvent) => siguienteCampo(e, cuerpo.current, 'btn-confirmar-recepcion');
              return (
                <tr key={f.detalle_id} className="border-t border-[var(--color-border)]">
                  <td className="p-1 font-black">{f.product_name}</td>
                  <td className="p-1 font-bold text-[var(--color-muted)]">{f.pedida}</td>
                  <td className="p-1"><input type="number" data-nav={`${fila},0`} min="0" step={esPeso(p) ? '0.01' : '1'} value={f.llego} onChange={(e) => cambiar(i, 'llego', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Llegó de ${f.product_name}`} /></td>
                  <td className="p-1"><input type="number" data-nav={`${fila},1`} min="0" step="0.01" value={f.costo} onChange={(e) => cambiar(i, 'costo', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Costo de ${f.product_name}`} /></td>
                  <td className="p-1"><input type="date" data-nav={`${fila},2`} value={f.vence} onChange={(e) => cambiar(i, 'vence', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Vencimiento de ${f.product_name}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Ventana>
  );
};
