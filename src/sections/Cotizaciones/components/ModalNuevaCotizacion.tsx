// Nueva / editar cotización (SiuMax Nego, paso 3h; base: la de SiuMax Servic). Líneas con sección, unidad, cantidad y
// precio; soles o dólares; condiciones y datos del banco. Con "Talleres y servicios" también "lo que se atiende".
// Cambios frente a Servic: número correlativo COT-0001 (como la Caja), conserva el producto de las líneas que vienen
// de la Caja (para poder convertirla en venta), Enter nunca pasa al siguiente campo (enterSeQueda) y sin datos de
// banco inventados por defecto.
import React, { useEffect, useState } from 'react';
import { X, Save, Plus, Trash2, FileText, Search } from 'lucide-react';
import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda, puntajeBusqueda } from '../../../utils/busqueda';
import { unidadDe } from '../../../utils/unidades';
import { BotonEscanerCelular } from '../../../components/BotonEscanerCelular';
import { buscarProductoPorCodigo } from '../../../utils/decodificarBarras';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { useEmpleado } from '../../../utils/permisos';
import { formatearMonto } from '../../../utils/formato';
import type { Cotizacion, CotizacionItem, MonedaCotizacion } from '../types';
import { aCampoFecha, hoyCampo, simbolo } from '../types';

interface Props {
  cotizacionEditar?: Cotizacion | null;
  detallesEditar?: CotizacionItem[];
  conServicios: boolean;
  onClose: (guardado?: boolean, id?: number) => void;
}

// Producto del inventario que se puede seleccionar en una línea
interface ProductoCoti {
  id: number; name: string; code?: string | null; barcode?: string | null; price: number; quantity: number;
  unit?: string | null; control_type?: string | null; sunat_unit_code?: string | null;
  marca?: string | null; modelo?: string | null; is_active?: number | null; presentaciones?: unknown;
}

const lineaNueva = (seccion = ''): CotizacionItem => ({ product_name: '', seccion, unidad: 'UND', quantity: 1, price: 0, subtotal: 0 });
const claseCampo = 'w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] rounded-none';
const claseLinea = 'w-full h-8 px-2 bg-transparent border border-[var(--color-border)] text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] rounded-none';
const Etiqueta: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">{children}</label>
);

// Siguiente número: COT-0001, COT-0002… (igual que la Caja, ModalCotizacionPOS)
const siguienteNumero = async () => {
  const { data } = await supabase.from('cotizaciones').select('id, numero').order('id', { ascending: false }).limit(1);
  if (!data || data.length === 0) return 'COT-0001';
  const m = String(data[0].numero || '').match(/COT-(\d+)/);
  return `COT-${String(m ? parseInt(m[1], 10) + 1 : Number(data[0].id) + 1).padStart(4, '0')}`;
};

export const ModalNuevaCotizacion: React.FC<Props> = ({ cotizacionEditar, detallesEditar, conServicios, onClose }) => {
  useCerrarConEscape(true, () => onClose());
  const empleado = useEmpleado();
  const ed = cotizacionEditar;

  const [asunto, setAsunto] = useState(ed?.observaciones || '');
  const [clienteId, setClienteId] = useState<string>(ed?.cliente_id || '');
  const [clienteNombre, setClienteNombre] = useState(ed?.cliente_nombre || '');
  const [clienteDoc, setClienteDoc] = useState(ed?.cliente_documento || '');
  const [clienteTel, setClienteTel] = useState(ed?.cliente_telefono || '');
  const [bienId, setBienId] = useState<string>(ed?.bien_id ? String(ed.bien_id) : '');
  const [moneda, setMoneda] = useState<MonedaCotizacion>(ed?.moneda || 'PEN');
  const [fechaEmision, setFechaEmision] = useState(ed?.fecha_emision ? aCampoFecha(ed.fecha_emision) : hoyCampo());
  const [fechaVencimiento, setFechaVencimiento] = useState(
    ed ? aCampoFecha(ed.fecha_vencimiento) : aCampoFecha(new Date(Date.now() + 15 * 86400000).toISOString())
  );
  const [condiciones, setCondiciones] = useState(ed ? ed.condiciones || '' : 'Validez de la oferta: 15 días calendario.');
  const [bancoInfo, setBancoInfo] = useState(ed?.banco_info || '');
  const [items, setItems] = useState<CotizacionItem[]>(
    detallesEditar && detallesEditar.length > 0 ? detallesEditar : [lineaNueva(conServicios ? 'Mano de obra y servicios' : '')]
  );
  const [clientes, setClientes] = useState<{ id: number; name: string; dni?: string; ruc?: string; telefono?: string }[]>([]);
  const [bienes, setBienes] = useState<{ id: number; customer_id: number; nombre: string; tipo: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [numero, setNumero] = useState(ed?.numero || 'COT-....');
  const [productos, setProductos] = useState<ProductoCoti[]>([]);
  const [busProd, setBusProd] = useState('');
  const [marcado, setMarcado] = useState(0);

  useEffect(() => {
    // Productos del inventario (para "Seleccionar producto"); los inactivos no salen
    traerTodo(() => supabase.from('products').select('id, name, code, barcode, price, quantity, unit, control_type, sunat_unit_code, marca, modelo, is_active, presentaciones').order('id'))
      .then(({ data }) => setProductos(((data || []) as ProductoCoti[]).filter((p) => p.is_active !== 0)))
      .catch((e) => console.error('Cotización: productos', e));
    (async () => {
      const [rc, rb] = await Promise.all([
        supabase.from('customers').select('id, name, dni, ruc, telefono').order('name'),
        conServicios ? supabase.from('bienes_cliente').select('id, customer_id, nombre, tipo').order('nombre') : Promise.resolve({ data: [] as any[] }),
      ]);
      if (rc.data) setClientes(rc.data as any);
      if (rb.data) setBienes(rb.data as any);
      if (!ed) setNumero(await siguienteNumero());
    })().catch((e) => console.error('Cotización: datos auxiliares', e));
    // Selector en el primer campo al abrir
    setTimeout(() => document.getElementById('input-asunto-cotizacion')?.focus(), 60);
  }, []);

  const elegirCliente = (cid: string) => {
    setClienteId(cid);
    const c = clientes.find((x) => String(x.id) === cid);
    if (c) { setClienteNombre(c.name); setClienteDoc(c.ruc || c.dni || ''); setClienteTel(c.telefono || ''); }
    setBienId('');
  };
  const cambiarLinea = (i: number, campo: keyof CotizacionItem, valor: any) => {
    setItems((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [campo]: valor };
      if (campo === 'quantity' || campo === 'price') {
        n[i].subtotal = Number(((parseFloat(String(n[i].quantity)) || 0) * (parseFloat(String(n[i].price)) || 0)).toFixed(2));
      }
      return n;
    });
  };
  const agregarLinea = () => {
    setItems((prev) => [...prev, lineaNueva(conServicios ? 'Materiales y repuestos' : prev[prev.length - 1]?.seccion || '')]);
    setTimeout(() => document.getElementById(`input-desc-item-${items.length}`)?.focus(), 40);
  };
  // Productos del inventario para seleccionar en las líneas (los activos; hasta 8 resultados)
  const resultados = busProd.trim()
    ? productos
        .filter((p) => coincideBusqueda([p.name, p.code, p.barcode, p.marca, p.modelo], busProd))
        .sort((a, b) => puntajeBusqueda([b.name, b.code, b.barcode, b.marca, b.modelo], busProd) - puntajeBusqueda([a.name, a.code, a.barcode, a.marca, a.modelo], busProd))
        .slice(0, 8)
    : [];
  const agregarProducto = (p: ProductoCoti) => {
    const linea: CotizacionItem = {
      product_id: Number(p.id), es_mayorista: false, product_name: p.name, seccion: '',
      unidad: unidadDe(p).corto || 'UND', quantity: 1, price: Number(p.price) || 0, subtotal: Number(p.price) || 0,
    };
    setItems((prev) => {
      // Si la única línea está vacía (la del inicio), se reemplaza; si no, se agrega al final
      const vacia = prev.length === 1 && !prev[0].product_name.trim() && !prev[0].product_id;
      return vacia ? [{ ...linea, seccion: prev[0].seccion || '' }] : [...prev, linea];
    });
    setBusProd(''); setMarcado(0);
    // El selector se queda en el buscador para seguir agregando productos
    setTimeout(() => document.getElementById('buscador-producto-coti')?.focus(), 30);
  };
  const quitarLinea = (i: number) => {
    if (items.length <= 1) { avisar('La cotización debe tener al menos una línea.'); return; }
    setItems((prev) => prev.filter((_, k) => k !== i));
    setTimeout(() => document.getElementById(`input-desc-item-${Math.max(0, i - 1)}`)?.focus(), 40);
  };
  const total = items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);

  const guardar = async () => {
    if (guardando) return;
    if (!clienteNombre.trim()) { avisar('Escribe o elige el cliente.'); document.getElementById('input-cliente-nombre-coti')?.focus(); return; }
    if (items.some((it) => !it.product_name.trim())) { avisar('Todas las líneas deben tener una descripción.'); return; }
    if (total <= 0) { avisar('El total de la cotización debe ser mayor a 0.'); return; }
    setGuardando(true);
    try {
      const nro = ed?.numero || (await siguienteNumero());
      const datos: Record<string, unknown> = {
        numero: nro,
        cliente_id: clienteId || null,
        cliente_nombre: clienteNombre.trim(),
        cliente_documento: clienteDoc.trim() || null,
        cliente_telefono: clienteTel.trim() || null,
        bien_id: conServicios && bienId ? Number(bienId) : (ed?.bien_id ?? null),
        fecha_emision: new Date(`${fechaEmision}T12:00:00`).toISOString(),
        fecha_vencimiento: fechaVencimiento ? new Date(`${fechaVencimiento}T23:59:59`).toISOString() : null,
        moneda,
        total: Number(total.toFixed(2)),
        saldo: Math.max(0, Number((total - (ed?.adelanto || 0)).toFixed(2))),
        estado: ed ? ed.estado_guardado : 'BORRADOR',
        observaciones: asunto.trim() || null,
        condiciones: condiciones.trim() || null,
        banco_info: bancoInfo.trim() || null,
      };
      let id = ed?.id;
      if (ed) {
        const { error } = await supabase.from('cotizaciones').update(datos).eq('id', ed.id);
        if (error) throw error;
        const { error: e2 } = await supabase.from('cotizacion_detalles').delete().eq('cotizacion_id', ed.id);
        if (e2) throw e2;
      } else {
        datos.vendedor = empleado?.nombre || 'Admin';
        const { data, error } = await supabase.from('cotizaciones').insert([datos]).select('id').single();
        if (error) throw error;
        id = data.id;
      }
      const filas = items.map((it) => ({
        cotizacion_id: id,
        product_id: it.product_id ?? null,
        es_mayorista: it.es_mayorista ?? false,
        product_name: it.product_name.trim(),
        seccion: it.seccion?.trim() || null,
        unidad: it.unidad || 'UND',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        subtotal: Number(it.subtotal) || 0,
      }));
      const { error: e3 } = await supabase.from('cotizacion_detalles').insert(filas);
      if (e3) throw e3;
      await avisar(ed ? `Cotización ${nro} actualizada.` : `Cotización ${nro} guardada como borrador.`);
      onClose(true, Number(id));
    } catch (err: any) {
      console.error('Error guardando cotización:', err);
      avisar('No se pudo guardar la cotización: ' + (err?.message || 'error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const bienesDelCliente = clienteId ? bienes.filter((b) => String(b.customer_id) === clienteId) : bienes;
  const s = simbolo(moneda);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-coti"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-5xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><FileText size={18} /></div>
            <div className="min-w-0">
              <h2 id="modal-titulo-coti" className="ventana-cabecera__titulo truncate">{ed ? `Editar cotización · ${numero}` : `Nueva cotización · ${numero}`}</h2>
              <p className="ventana-cabecera__subtitulo">Líneas, moneda, condiciones y datos para el pago</p>
            </div>
          </div>
          <button id="btn-cerrar-modal-coti" type="button" onClick={() => onClose()} className="ventana-cerrar" title="Cerrar (Esc)"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" onKeyDown={enterSeQueda}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Etiqueta>Asunto de la cotización</Etiqueta>
              <input id="input-asunto-cotizacion" type="text" autoComplete="off" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej.: Mantenimiento de bombas, pedido de útiles…" className={claseCampo} />
            </div>
            <div>
              <Etiqueta>Moneda</Etiqueta>
              <select id="select-moneda-cotizacion" value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCotizacion)} className={claseCampo}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </select>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-3 ${conServicios ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div>
              <Etiqueta>Cliente registrado</Etiqueta>
              <select id="select-cliente-cotizacion" value={clienteId} onChange={(e) => elegirCliente(e.target.value)} className={claseCampo}>
                <option value="">— Cliente casual / fuera de la lista —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Etiqueta>Nombre del cliente o empresa *</Etiqueta>
              <input id="input-cliente-nombre-coti" type="text" autoComplete="off" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre o razón social" className={claseCampo} />
            </div>
            {conServicios && (
              <div>
                <Etiqueta>Lo que se atiende (opcional)</Etiqueta>
                <select id="select-bien-cotizacion" value={bienId} onChange={(e) => setBienId(e.target.value)} className={claseCampo}>
                  <option value="">— Ninguno —</option>
                  {bienesDelCliente.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Etiqueta>DNI / RUC</Etiqueta>
              <input id="input-cliente-doc-coti" type="text" autoComplete="off" value={clienteDoc} onChange={(e) => setClienteDoc(e.target.value)} className={claseCampo} />
            </div>
            <div>
              <Etiqueta>Teléfono / WhatsApp</Etiqueta>
              <input id="input-cliente-tel-coti" type="text" autoComplete="off" value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} className={claseCampo} />
            </div>
            <div>
              <Etiqueta>Fecha de emisión</Etiqueta>
              <input id="input-fecha-emision-coti" type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={claseCampo} />
            </div>
            <div>
              <Etiqueta>Válida hasta</Etiqueta>
              <input id="input-fecha-venc-coti" type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className={claseCampo} />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <span className="block text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">Líneas de la cotización</span>
            {/* Seleccionar productos del inventario (dueño, 13/11/2026): escribir, elegir con ↑ ↓ y Enter agrega la línea
                con su precio y unidad (y su producto, para poder venderla en la Caja). "Agregar línea" sigue para escribir
                a mano un servicio o algo que no está en el inventario. */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <div className="relative flex-1">
                <div className="buscador-sobrio">
                  <div className="buscador-sobrio__icono"><Search size={16} /></div>
                  <input
                    id="buscador-producto-coti"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    data-lpignore="true"
                    role="combobox"
                    aria-expanded={resultados.length > 0}
                    aria-controls="lista-productos-coti"
                    value={busProd}
                    onChange={(e) => { setBusProd(e.target.value); setMarcado(0); }}
                    onKeyDown={(e) => {
                      if (resultados.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        e.preventDefault(); e.stopPropagation();
                        setMarcado((m) => (e.key === 'ArrowDown' ? Math.min(m + 1, resultados.length - 1) : Math.max(m - 1, 0)));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (resultados[marcado]) agregarProducto(resultados[marcado]);
                      } else if (e.key === 'Escape' && busProd) {
                        e.preventDefault(); e.stopPropagation(); setBusProd('');
                      }
                    }}
                    placeholder="SELECCIONAR PRODUCTO DEL INVENTARIO (NOMBRE O CÓDIGO)..."
                  />
                  <BotonEscanerCelular
                    id="btn-escaner-cotizacion"
                    variante="sobrio"
                    titulo="Escanear el código del producto con la cámara"
                    onScan={(codigo) => {
                      const p = buscarProductoPorCodigo(productos as any[], codigo);
                      if (p) agregarProducto(p as any); else { setBusProd(codigo); setMarcado(0); }
                    }}
                  />
                </div>
                {resultados.length > 0 && (
                  <ul id="lista-productos-coti" role="listbox" className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] max-h-64 overflow-y-auto">
                    {resultados.map((p, i) => (
                      <li
                        key={p.id}
                        id={`opcion-producto-coti-${i}`}
                        role="option"
                        aria-selected={i === marcado}
                        onMouseDown={(e) => { e.preventDefault(); agregarProducto(p); }}
                        onMouseEnter={() => setMarcado(i)}
                        className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer text-xs font-bold ${i === marcado ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-ink)]'}`}
                      >
                        <span className="truncate">{p.name}{p.code ? <span className="opacity-60"> · {p.code}</span> : null}</span>
                        <span className="shrink-0 whitespace-nowrap">{simbolo(moneda)} {formatearMonto(Number(p.price) || 0)} · stock {Number(p.quantity) || 0} {unidadDe(p).corto}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button id="btn-agregar-item-coti" type="button" onClick={agregarLinea} className="h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-ink)] text-xs font-black uppercase text-[var(--color-ink)] flex items-center justify-center gap-1.5 cursor-pointer rounded-none whitespace-nowrap">
                <Plus size={14} /> Agregar línea
              </button>
            </div>
            <div className="border border-[var(--color-border)] overflow-x-auto">
              {/* data-tabla-campos: son campos para escribir; las flechas se mueven entre ellos (flechasEspaciales) */}
              <table data-tabla-campos className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--color-ink)] text-white text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-2 w-40">Sección</th>
                    <th className="p-2">Descripción *</th>
                    <th className="p-2 w-20">Unidad</th>
                    <th className="p-2 w-24 text-right">Cantidad</th>
                    <th className="p-2 w-28 text-right">P. unit. ({s})</th>
                    <th className="p-2 w-28 text-right">Subtotal</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-1.5"><input id={`input-seccion-item-${i}`} type="text" autoComplete="off" value={it.seccion || ''} onChange={(e) => cambiarLinea(i, 'seccion', e.target.value)} placeholder="Opcional" className={claseLinea} /></td>
                      <td className="p-1.5">
                        <input id={`input-desc-item-${i}`} type="text" autoComplete="off" value={it.product_name} onChange={(e) => cambiarLinea(i, 'product_name', e.target.value)} className={claseLinea} />
                        {it.product_id ? <span className="text-[9px] font-bold text-[var(--color-muted)] uppercase">Producto del inventario</span> : null}
                      </td>
                      <td className="p-1.5"><input id={`input-unidad-item-${i}`} type="text" autoComplete="off" value={it.unidad} onChange={(e) => cambiarLinea(i, 'unidad', e.target.value)} className={`${claseLinea} text-center`} /></td>
                      <td className="p-1.5"><input id={`input-cant-item-${i}`} type="number" step="any" min="0" value={it.quantity} onChange={(e) => cambiarLinea(i, 'quantity', e.target.value)} className={`${claseLinea} text-right`} /></td>
                      <td className="p-1.5"><input id={`input-precio-item-${i}`} type="number" step="any" min="0" value={it.price} onChange={(e) => cambiarLinea(i, 'price', e.target.value)} className={`${claseLinea} text-right font-bold`} /></td>
                      <td className="p-1.5 text-right font-black whitespace-nowrap">{s} {formatearMonto(it.subtotal)}</td>
                      <td className="p-1.5 text-center">
                        <button id={`btn-quitar-item-${i}`} type="button" onClick={() => quitarLinea(i)} title="Quitar línea" className="p-1 text-[var(--color-muted)] hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] cursor-pointer rounded-none"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end p-3 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-sm font-bold text-[var(--color-muted)] uppercase mr-4">Total:</span>
              <span id="total-nueva-cotizacion" className="text-xl font-black text-[var(--color-ink)]">{s} {formatearMonto(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <Etiqueta>Condiciones</Etiqueta>
              <textarea id="input-condiciones-coti" rows={3} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Validez, forma de pago, garantía…" className="w-full p-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] resize-none rounded-none" />
            </div>
            <div>
              <Etiqueta>Datos para el pago (banco, Yape…)</Etiqueta>
              <textarea id="input-banco-coti" rows={3} value={bancoInfo} onChange={(e) => setBancoInfo(e.target.value)} placeholder="Ej.: BCP Soles 191-…  ·  Yape 9…" className="w-full p-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] resize-none rounded-none" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-3 flex items-center justify-end gap-2 shrink-0">
          <button id="btn-cancelar-cotizacion" type="button" onClick={() => onClose()} className="h-10 px-4 text-xs font-black uppercase tracking-wider border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)] cursor-pointer rounded-none">Cancelar</button>
          <button id="btn-guardar-cotizacion" type="button" aria-disabled={guardando} onClick={guardar} className="h-10 px-6 text-xs font-black uppercase tracking-widest bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] flex items-center gap-2 cursor-pointer rounded-none">
            <Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
