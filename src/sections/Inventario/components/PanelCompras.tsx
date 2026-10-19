// src/sections/Inventario/components/PanelCompras.tsx
// Inventario > Compras: listas de lo que hay que pedir a cada proveedor.
//  - Nueva lista: proveedor + productos (botón "Agregar stock bajo" con cantidad sugerida) o búsqueda.
//  - Enviar por WhatsApp al proveedor.
//  - Recibir pedido: se confirma lo que llegó y su costo, y se crean TODOS los lotes de una vez
//    (igual que "Ingresar lote": lote + movimiento COMPRA + stock del producto recalculado).
// Tablas compras / compras_detalle (servidor/sql/seguridad-sesion.sql). Permiso: almacen_ingresar_lotes.
import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Truck, Send, PackageCheck, Trash2, X, Search, AlertTriangle, Loader2, Ban } from 'lucide-react';
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
const claseBoton = 'px-3 py-2 border-2 border-[var(--color-ink)] text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer disabled:opacity-50';

interface Props {
  productos: Product[];
  // Al recibir un pedido: stock nuevo de cada producto (para refrescar la pantalla sin recargar)
  onStockActualizado: (cambios: { id: string; quantity: number }[]) => void;
}

export const PanelCompras: React.FC<Props> = ({ productos, onStockActualizado }) => {
  const puede = usePermiso('almacen_ingresar_lotes');
  const empleado = useEmpleado();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'PENDIENTE' | 'RECIBIDO' | 'TODAS'>('PENDIENTE');
  const [editando, setEditando] = useState<Compra | 'nueva' | null>(null);
  const [recibiendo, setRecibiendo] = useState<Compra | null>(null);

  const cargar = async () => {
    setCargando(true);
    const [c, p] = await Promise.all([
      supabase.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('providers').select('id, razon_social, telefono').eq('estado', 'ACTIVO').order('razon_social'),
    ]);
    if (c.error) void avisar(`No se pudieron cargar las compras: ${c.error.message}`);
    setCompras((c.data as Compra[]) || []);
    setProveedores((p.data as Proveedor[]) || []);
    setCargando(false);
  };
  useEffect(() => { void cargar(); }, []);

  const visibles = compras.filter((c) => filtro === 'TODAS' || c.estado === filtro);
  const stockBajo = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));

  const conPermiso = (accion: string, hacer: () => void) => (puede ? hacer() : avisarSinPermiso(accion));

  const enviarWhatsApp = (c: Compra) => {
    const prov = proveedores.find((p) => p.id === c.provider_id);
    const lineas = c.compras_detalle.map((d) => `• ${d.cantidad} x ${d.product_name}`).join('\n');
    const texto = `Hola${c.proveedor ? ` ${c.proveedor}` : ''}, le escribo para hacer este pedido:\n\n${lineas}${c.notas ? `\n\nNota: ${c.notas}` : ''}\n\nGracias.`;
    const numero = String(prov?.telefono || '').replace(/\D/g, '');
    const destino = numero.length === 9 ? `51${numero}` : numero; // celular peruano sin código de país
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const anular = async (c: Compra) => {
    if (!await confirmar(`¿Anular esta lista de compras${c.proveedor ? ` de ${c.proveedor}` : ''}? No se ingresa nada al inventario.`)) return;
    const { error } = await supabase.from('compras').update({ estado: 'ANULADO' }).eq('id', c.id);
    if (error) { void avisar(`No se pudo anular: ${error.message}`); return; }
    void cargar();
  };

  return (
    <div id="panel-compras" className="flex flex-col gap-4 font-mono">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-3 sm:p-4">
        <div>
          <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2"><ShoppingCart size={18} /> Listas de compras</h2>
          <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">
            Arma el pedido para tu proveedor y, cuando llegue, recíbelo: los lotes se crean solos.
            {stockBajo.length > 0 && <span className="text-[var(--color-danger)]"> · {stockBajo.length} producto(s) con stock bajo.</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['PENDIENTE', 'RECIBIDO', 'TODAS'] as const).map((f) => (
            <button key={f} id={`btn-compras-filtro-${f}`} type="button" onClick={() => setFiltro(f)}
              className={`${claseBoton} ${filtro === f ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'bg-white text-[var(--color-ink)]'}`}>
              {f === 'PENDIENTE' ? 'Pendientes' : f === 'RECIBIDO' ? 'Recibidas' : 'Todas'}
            </button>
          ))}
          <button id="btn-nueva-compra" type="button" onClick={() => conPermiso('armar listas de compras', () => setEditando('nueva'))}
            className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[3px_3px_0_0_var(--color-ink)]`}>
            <Plus size={14} /> Nueva lista
          </button>
        </div>
      </div>

      {/* Listas */}
      {cargando ? (
        <div className="p-6 text-center text-xs font-black uppercase text-[var(--color-muted)]"><Loader2 className="inline animate-spin" size={16} /> Cargando...</div>
      ) : visibles.length === 0 ? (
        <div className="p-6 bg-white border-2 border-dashed border-[var(--color-border)] text-center text-xs font-black uppercase text-[var(--color-muted)]">
          {filtro === 'PENDIENTE' ? 'No hay pedidos pendientes. Crea una lista con "Nueva lista".' : 'No hay listas aquí.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visibles.map((c) => {
            const total = totalDe(c.compras_detalle);
            const colorEstado = c.estado === 'PENDIENTE' ? 'border-[var(--color-warning)] text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)]'
              : c.estado === 'RECIBIDO' ? 'border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-accent-bg)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-bg)]';
            return (
              <div key={c.id} className="bg-white border-2 border-[var(--color-ink)] p-3 flex flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase text-[var(--color-ink)] truncate flex items-center gap-2"><Truck size={14} /> {c.proveedor || 'Sin proveedor'}</p>
                    <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
                      Pedido #{String(c.id).slice(-6)} · {fecha(c.created_at)}{c.autor ? ` · por ${c.autor}` : ''}
                      {c.estado === 'RECIBIDO' && ` · recibido ${fecha(c.recibido_at)}${c.documento ? ` (${c.documento})` : ''}`}
                    </p>
                  </div>
                  <span className={`shrink-0 self-start px-2 py-0.5 border-2 text-[10px] font-black uppercase ${colorEstado}`}>{c.estado}</span>
                </div>
                <ul className="text-xs font-bold text-[var(--color-ink)] border-t border-[var(--color-border)] pt-2 space-y-0.5 max-h-32 overflow-auto custom-scrollbar">
                  {c.compras_detalle.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.estado === 'RECIBIDO' ? (d.cantidad_recibida ?? 0) : d.cantidad} x {d.product_name}</span>
                      <span className="text-[var(--color-muted)] shrink-0">{soles(d.costo_unit)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2">
                  <span className="text-xs font-black text-[var(--color-ink)]">{c.compras_detalle.length} producto(s) · Total aprox. {soles(total)}</span>
                  {c.estado === 'PENDIENTE' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => enviarWhatsApp(c)} title="Enviar el pedido por WhatsApp"
                        className={`${claseBoton} bg-white text-[var(--color-success)] border-[var(--color-success)]`}><Send size={13} /> WhatsApp</button>
                      {!c.compras_detalle.some((d) => d.batch_id != null) && ( // recibida a medias: ya no se edita
                      <button type="button" onClick={() => conPermiso('editar listas de compras', () => setEditando(c))}
                        className={`${claseBoton} bg-white text-[var(--color-ink)]`}>Editar</button>)}
                      <button type="button" onClick={() => conPermiso('anular listas de compras', () => void anular(c))} title="Anular"
                        className={`${claseBoton} bg-white text-[var(--color-muted)]`}><Ban size={13} /></button>
                      <button type="button" onClick={() => conPermiso('recibir pedidos', () => setRecibiendo(c))}
                        className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)]`}><PackageCheck size={14} /> Recibir</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <EditorCompra
          compra={editando === 'nueva' ? null : editando}
          productos={productos}
          proveedores={proveedores}
          autor={empleado?.nombre || ''}
          onCerrar={(guardado) => { setEditando(null); if (guardado) void cargar(); }}
        />
      )}
      {recibiendo && (
        <RecibirCompra
          compra={recibiendo}
          productos={productos}
          receptor={empleado?.nombre || ''}
          onCerrar={(cambios) => {
            setRecibiendo(null);
            if (cambios) { onStockActualizado(cambios); void cargar(); }
          }}
        />
      )}
    </div>
  );
};

// ======================================================= Ventana base (Esc cierra)
const Ventana: React.FC<{ titulo: string; onCerrar: () => void; children: React.ReactNode; pie: React.ReactNode }> = ({ titulo, onCerrar, children, pie }) => {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-dialogo-sistema]')) { e.preventDefault(); e.stopPropagation(); onCerrar(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onCerrar]);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-3xl max-h-[calc(var(--alto-pantalla,100vh)*0.94)] flex flex-col">
        <div className="bg-[var(--color-ink)] text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">{titulo}</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar (Esc)" className="p-1 hover:text-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">{children}</div>
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex flex-wrap justify-end gap-2 shrink-0">{pie}</div>
      </div>
    </div>
  );
};

// ======================================================= Crear / editar una lista
const EditorCompra: React.FC<{
  compra: Compra | null; productos: Product[]; proveedores: Proveedor[]; autor: string; onCerrar: (guardado: boolean) => void;
}> = ({ compra, productos, proveedores, autor, onCerrar }) => {
  const [proveedorId, setProveedorId] = useState(compra?.provider_id || '');
  const [notas, setNotas] = useState(compra?.notas || '');
  const [items, setItems] = useState<Item[]>(compra?.compras_detalle.map((d) => ({
    product_id: String(d.product_id), product_name: d.product_name, cantidad: Number(d.cantidad), costo_unit: Number(d.costo_unit),
  })) || []);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  const agregar = (p: Product, cantidad = 1) => setItems((prev) => (prev.some((i) => i.product_id === String(p.id))
    ? prev
    : [...prev, { product_id: String(p.id), product_name: p.name, cantidad, costo_unit: Number(p.cost) || 0, unidad: p.unit }]));
  const agregarStockBajo = () => {
    const bajos = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));
    if (!bajos.length) { void avisar('No hay productos con stock bajo. 👍'); return; }
    bajos.forEach((p) => agregar(p, sugerida(p)));
  };
  const cambiar = (id: string, campo: 'cantidad' | 'costo_unit', valor: string) =>
    setItems((prev) => prev.map((i) => (i.product_id === id ? { ...i, [campo]: Math.max(0, Number(valor) || 0) } : i)));

  const resultados = busqueda.trim().length >= 2
    ? productos.filter((p) => coincideBusqueda([p.name, p.code, p.barcode], busqueda) && !items.some((i) => i.product_id === String(p.id))).slice(0, 8)
    : [];

  const guardar = async () => {
    const validos = items.filter((i) => i.cantidad > 0);
    if (!validos.length) { void avisar('Agrega al menos un producto con cantidad.'); return; }
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
      onCerrar(true);
    } catch (e: any) {
      void avisar(`No se pudo guardar la lista: ${e?.message || e}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Ventana titulo={compra ? `Editar pedido #${String(compra.id).slice(-6)}` : 'Nueva lista de compras'} onCerrar={() => onCerrar(false)}
      pie={<>
        <button type="button" onClick={() => onCerrar(false)} className={`${claseBoton} bg-white text-[var(--color-ink)]`}>Cancelar</button>
        <button id="btn-guardar-compra" type="button" disabled={guardando} onClick={() => void guardar()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)]`}>{guardando ? 'Guardando...' : 'Guardar lista'}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Proveedor</span>
          <select id="compra-proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={claseInput}>
            <option value="">— Sin proveedor —</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Nota para el proveedor (opcional)</span>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej: entregar el lunes en la mañana" className={claseInput} />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input id="compra-buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto para agregar..."
            onKeyDown={(e) => { if (e.key === 'Enter' && resultados[0]) { e.preventDefault(); agregar(resultados[0]); setBusqueda(''); } }}
            className={`${claseInput} pl-7`} />
          {resultados.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] max-h-56 overflow-auto">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { agregar(p); setBusqueda(''); document.getElementById('compra-buscar')?.focus(); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-[var(--color-bg)] focus:bg-[var(--color-accent-bg)] focus:outline-none flex justify-between gap-2 cursor-pointer">
                    <span className="truncate">{p.name}</span>
                    <span className={`shrink-0 ${Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>stock {p.quantity}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={agregarStockBajo} className={`${claseBoton} bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] border-[var(--color-warning)]`}>
          <AlertTriangle size={14} /> Agregar stock bajo
        </button>
      </div>

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
              {items.map((i) => {
                const p = porId.get(i.product_id);
                return (
                  <tr key={i.product_id} className="border-t border-[var(--color-border)]">
                    <td className="p-1 font-black">{i.product_name}</td>
                    <td className={`p-1 font-bold ${p && Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{p ? `${p.quantity} / mín ${p.minStock}` : '-'}</td>
                    <td className="p-1"><input type="number" min="0" step={esPeso(p) ? '0.01' : '1'} value={i.cantidad} onChange={(e) => cambiar(i.product_id, 'cantidad', e.target.value)} className={claseInput} aria-label={`Cantidad de ${i.product_name}`} /></td>
                    <td className="p-1"><input type="number" min="0" step="0.01" value={i.costo_unit} onChange={(e) => cambiar(i.product_id, 'costo_unit', e.target.value)} className={claseInput} aria-label={`Costo de ${i.product_name}`} /></td>
                    <td className="p-1 text-right font-black">{soles(i.cantidad * i.costo_unit)}</td>
                    <td className="p-1"><button type="button" onClick={() => setItems((prev) => prev.filter((x) => x.product_id !== i.product_id))} aria-label={`Quitar ${i.product_name}`} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] cursor-pointer"><Trash2 size={14} /></button></td>
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
  // Lo que ya entró en un intento anterior (tiene lote) no se vuelve a ingresar
  const [filas, setFilas] = useState(compra.compras_detalle.filter((d) => d.batch_id == null).map((d) => ({
    detalle_id: d.id, product_id: String(d.product_id), product_name: d.product_name,
    pedida: Number(d.cantidad), llego: String(d.cantidad), costo: String(d.costo_unit), vence: '',
  })));
  const [documento, setDocumento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);
  const cambiar = (i: number, campo: 'llego' | 'costo' | 'vence', valor: string) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const total = filas.reduce((t, f) => t + (Number(f.llego) || 0) * (Number(f.costo) || 0), 0);

  const recibir = async () => {
    const llegan = filas.filter((f) => Number(f.llego) > 0);
    if (!llegan.length) { void avisar('Escribe cuánto llegó de al menos un producto.'); return; }
    if (!await confirmar(`¿Ingresar al inventario ${llegan.length} producto(s) por ${soles(total)}?\nSe creará un lote por cada producto.`)) return;
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
    if (fallidos.length) {
      await avisar(`⚠️ Se ingresaron ${cambios.length} de ${llegan.length}. No se pudieron ingresar:\n${fallidos.join('\n')}\n\nEl pedido sigue PENDIENTE: al volver a "Recibir" solo aparecerá lo que faltó.`);
    } else {
      await avisar(`✅ Pedido recibido: ${cambios.length} lote(s) creado(s). El stock ya está actualizado.`);
    }
    onCerrar(cambios);
  };

  return (
    <Ventana titulo={`Recibir pedido #${String(compra.id).slice(-6)} · ${compra.proveedor || 'Sin proveedor'}`} onCerrar={() => onCerrar(null)}
      pie={<>
        <span className="mr-auto self-center text-sm font-black text-[var(--color-ink)]">Total: {soles(total)}</span>
        <button type="button" onClick={() => onCerrar(null)} className={`${claseBoton} bg-white text-[var(--color-ink)]`}>Cancelar</button>
        <button id="btn-confirmar-recepcion" type="button" disabled={guardando} onClick={() => void recibir()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)]`}>
          {guardando ? <><Loader2 size={14} className="animate-spin" /> Ingresando...</> : <><PackageCheck size={14} /> Ingresar al inventario</>}
        </button>
      </>}>
      <p className="text-[11px] font-bold text-[var(--color-muted)]">
        Revisa lo que llegó. Si algo no vino, déjalo en 0. Puedes corregir el costo según la factura.
      </p>
      <label className="space-y-1 max-w-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">N° de factura o boleta (opcional)</span>
        <input id="compra-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={40} placeholder="Ej: F001-000123" className={claseInput} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            <th className="p-1">Producto</th><th className="p-1 w-16">Pedido</th><th className="p-1 w-24">Llegó</th><th className="p-1 w-24">Costo u.</th><th className="p-1 w-36">Vence (opcional)</th>
          </tr></thead>
          <tbody>
            {filas.map((f, i) => {
              const p = porId.get(f.product_id);
              return (
                <tr key={f.detalle_id} className="border-t border-[var(--color-border)]">
                  <td className="p-1 font-black">{f.product_name}</td>
                  <td className="p-1 font-bold text-[var(--color-muted)]">{f.pedida}</td>
                  <td className="p-1"><input type="number" min="0" step={esPeso(p) ? '0.01' : '1'} value={f.llego} onChange={(e) => cambiar(i, 'llego', e.target.value)} className={claseInput} aria-label={`Llegó de ${f.product_name}`} /></td>
                  <td className="p-1"><input type="number" min="0" step="0.01" value={f.costo} onChange={(e) => cambiar(i, 'costo', e.target.value)} className={claseInput} aria-label={`Costo de ${f.product_name}`} /></td>
                  <td className="p-1"><input type="date" value={f.vence} onChange={(e) => cambiar(i, 'vence', e.target.value)} className={claseInput} aria-label={`Vencimiento de ${f.product_name}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Ventana>
  );
};
