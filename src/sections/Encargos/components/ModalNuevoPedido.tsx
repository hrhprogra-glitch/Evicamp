// src/sections/Encargos/components/ModalNuevoPedido.tsx
// Ventana para crear pedidos directamente desde la sección Encargos (14/11/2026, pedido del dueño).
// Estilo SiuMax Sobrio: 0px bordes redondeados, enterSeQueda, useCerrarConEscape, selector de cliente,
// buscador de productos del inventario con escáner por celular y cálculo de adelanto/saldo.

import React, { useEffect, useState } from 'react';
import { X, Save, Plus, Trash2, Package, Search } from 'lucide-react';
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

interface Props {
  isOpen: boolean;
  onClose: (guardado?: boolean) => void;
}

interface ItemPedido {
  product_id?: number | null;
  product_name: string;
  unidad: string;
  quantity: number;
  price: number;
  subtotal: number;
  es_mayorista?: boolean;
}

interface ProductoInventario {
  id: number;
  name: string;
  code?: string | null;
  barcode?: string | null;
  price: number;
  quantity: number;
  unit?: string | null;
  control_type?: string | null;
  marca?: string | null;
  modelo?: string | null;
  is_active?: number | null;
  presentaciones?: unknown;
}

const siguienteNumeroPedido = async (): Promise<string> => {
  try {
    const { data } = await supabase
      .from('pedidos_clientes')
      .select('id, numero')
      .order('id', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return 'PED-0001';
    const match = String(data[0].numero || '').match(/PED-(\d+)/);
    const next = match ? parseInt(match[1], 10) + 1 : Number(data[0].id) + 1;
    return `PED-${String(next).padStart(4, '0')}`;
  } catch {
    return 'PED-0001';
  }
};

const defaultFechaEntrega = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const lineaVacia = (): ItemPedido => ({
  product_name: '',
  unidad: 'UND',
  quantity: 1,
  price: 0,
  subtotal: 0,
});

export const ModalNuevoPedido: React.FC<Props> = ({ isOpen, onClose }) => {
  useCerrarConEscape(isOpen, () => onClose());
  const empleado = useEmpleado();

  const [numero, setNumero] = useState('PED-....');
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteTel, setClienteTel] = useState('');

  const [fechaEntrega, setFechaEntrega] = useState(defaultFechaEntrega());
  const [horaEntrega, setHoraEntrega] = useState('18:00');

  const [items, setItems] = useState<ItemPedido[]>([lineaVacia()]);
  const [adelanto, setAdelanto] = useState('0');
  const [metodoAdelanto, setMetodoAdelanto] = useState<'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [clientes, setClientes] = useState<{ id: number; name: string; dni?: string; ruc?: string; telefono?: string }[]>([]);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [busProd, setBusProd] = useState('');
  const [marcadoProd, setMarcadoProd] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    siguienteNumeroPedido().then(setNumero);
    setFechaEntrega(defaultFechaEntrega());
    setHoraEntrega('18:00');
    setItems([lineaVacia()]);
    setAdelanto('0');
    setMetodoAdelanto('EFECTIVO');
    setObservaciones('');
    setClienteId('');
    setClienteNombre('');
    setClienteDoc('');
    setClienteTel('');
    setBusProd('');
    setGuardando(false);

    // Cargar productos y clientes
    (async () => {
      try {
        const { data: prods } = await traerTodo(() =>
          supabase
            .from('products')
            .select('id, name, code, barcode, price, quantity, unit, control_type, marca, modelo, is_active, presentaciones')
            .order('id')
        );
        if (prods) setProductos(((prods || []) as ProductoInventario[]).filter((p) => p.is_active !== 0));

        const { data: custs } = await supabase
          .from('customers')
          .select('id, name, dni, ruc, telefono')
          .order('name');
        if (custs) setClientes(custs as any);
      } catch (e) {
        console.error('Nuevo pedido: error al cargar datos auxiliares', e);
      }
    })();

    setTimeout(() => document.getElementById('input-cliente-nombre-pedido')?.focus(), 60);
  }, [isOpen]);

  if (!isOpen) return null;

  const elegirCliente = (cid: string) => {
    setClienteId(cid);
    const c = clientes.find((x) => String(x.id) === cid);
    if (c) {
      setClienteNombre(c.name);
      setClienteDoc(c.ruc || c.dni || '');
      setClienteTel(c.telefono || '');
    }
  };

  const cambiarLinea = (i: number, campo: keyof ItemPedido, valor: any) => {
    setItems((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [campo]: valor };
      if (campo === 'quantity' || campo === 'price') {
        const q = parseFloat(String(n[i].quantity)) || 0;
        const p = parseFloat(String(n[i].price)) || 0;
        n[i].subtotal = Number((q * p).toFixed(2));
      }
      return n;
    });
  };

  const agregarLineaManual = () => {
    setItems((prev) => [...prev, lineaVacia()]);
    setTimeout(() => document.getElementById(`input-item-nombre-${items.length}`)?.focus(), 40);
  };

  const quitarLinea = (i: number) => {
    if (items.length <= 1) {
      avisar('El pedido debe tener al menos un artículo.');
      return;
    }
    setItems((prev) => prev.filter((_, k) => k !== i));
  };

  const resultadosProd = busProd.trim()
    ? productos
        .filter((p) => coincideBusqueda([p.name, p.code, p.barcode, p.marca, p.modelo], busProd))
        .sort((a, b) => puntajeBusqueda([b.name, b.code, b.barcode, b.marca, b.modelo], busProd) - puntajeBusqueda([a.name, a.code, a.barcode, a.marca, a.modelo], busProd))
        .slice(0, 8)
    : [];

  const agregarProducto = (p: ProductoInventario) => {
    const un = unidadDe(p).corto || 'UND';
    const linea: ItemPedido = {
      product_id: Number(p.id),
      product_name: p.name,
      unidad: un,
      quantity: 1,
      price: Number(p.price) || 0,
      subtotal: Number(p.price) || 0,
      es_mayorista: false,
    };

    setItems((prev) => {
      const vacia = prev.length === 1 && !prev[0].product_name.trim() && !prev[0].product_id;
      return vacia ? [linea] : [...prev, linea];
    });

    setBusProd('');
    setMarcadoProd(0);
    setTimeout(() => document.getElementById('buscador-producto-pedido')?.focus(), 30);
  };

  const total = items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const montoAdelanto = Math.max(0, parseFloat(adelanto) || 0);
  const saldoPendiente = Math.max(0, total - montoAdelanto);

  const guardar = async () => {
    if (guardando) return;
    if (!clienteNombre.trim()) {
      avisar('Indica el nombre del cliente.');
      document.getElementById('input-cliente-nombre-pedido')?.focus();
      return;
    }
    if (!fechaEntrega) {
      avisar('Indica la fecha de entrega del pedido.');
      return;
    }
    if (items.some((it) => !it.product_name.trim())) {
      avisar('Todos los artículos deben tener una descripción.');
      return;
    }
    if (total <= 0) {
      avisar('El total del pedido debe ser mayor a S/ 0.00.');
      return;
    }
    if (montoAdelanto > total) {
      avisar(`El adelanto (S/ ${formatearMonto(montoAdelanto)}) no puede ser mayor al total (S/ ${formatearMonto(total)}).`);
      return;
    }

    setGuardando(true);
    try {
      const nro = await siguienteNumeroPedido();
      const fechaHoraIso = new Date(`${fechaEntrega}T${horaEntrega || '18:00'}:00`).toISOString();

      // 1. Insertar pedido
      const payloadPedido = {
        numero: nro,
        cliente_id: clienteId ? String(clienteId) : null,
        cliente_nombre: clienteNombre.trim(),
        cliente_documento: clienteDoc.trim() || null,
        cliente_telefono: clienteTel.trim() || null,
        fecha_entrega: fechaHoraIso,
        estado: 'PENDIENTE',
        total: Math.round(total * 100) / 100,
        adelanto: Math.round(montoAdelanto * 100) / 100,
        saldo_pendiente: Math.round(saldoPendiente * 100) / 100,
        metodo_adelanto: montoAdelanto > 0 ? metodoAdelanto : null,
        observaciones: observaciones.trim() || null,
        vendedor: empleado?.nombre || null,
      };

      const { data: pedData, error: pedErr } = await supabase
        .from('pedidos_clientes')
        .insert(payloadPedido)
        .select()
        .single();

      if (pedErr) throw pedErr;

      // 2. Insertar detalles
      const detalles = items.map((it) => ({
        pedido_id: pedData.id,
        product_id: it.product_id ? Number(it.product_id) : null,
        product_name: it.product_name.trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        subtotal: Number(it.subtotal) || 0,
        es_mayorista: Boolean(it.es_mayorista),
      }));

      const { error: detErr } = await supabase.from('pedido_detalles').insert(detalles);
      if (detErr) throw detErr;

      // 3. Si hay productos de inventario, registrar reserva de stock
      for (const it of items) {
        if (it.product_id) {
          try {
            const { data: prodActual } = await supabase
              .from('products')
              .select('quantity')
              .eq('id', it.product_id)
              .single();

            if (prodActual) {
              const nuevaCant = Math.max(0, (prodActual.quantity || 0) - (Number(it.quantity) || 1));
              await supabase.from('products').update({ quantity: nuevaCant }).eq('id', it.product_id);
              await supabase.from('inventory_movements').insert({
                product_id: it.product_id,
                type: 'RESERVA_PEDIDO',
                quantity: -(Number(it.quantity) || 1),
                notes: `Reserva por Pedido ${nro} · Cliente: ${clienteNombre.trim()}`,
              });
            }
          } catch (e) {
            console.warn('Reserva stock pedido:', e);
          }
        }
      }

      avisar(`✅ Pedido ${nro} registrado correctamente.`);
      onClose(true);
    } catch (err: any) {
      console.error('Error al guardar pedido:', err);
      avisar(`⚠️ No se pudo guardar el pedido: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-mono">
      <div className="ventana-sobria w-full max-w-4xl max-h-[94vh] flex flex-col bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] rounded-none">
        {/* Cabecera */}
        <div className="ventana-cabecera bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-4 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[2px_2px_0_0_var(--color-accent)] rounded-none">
              <Package size={18} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[var(--color-ink)]">
                NUEVO PEDIDO · <span className="text-[var(--color-accent)]">{numero}</span>
              </h2>
              <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                Registrar encargo o pedido de cliente
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-nuevo-pedido"
            type="button"
            onClick={() => onClose()}
            className="ventana-cerrar p-1 text-[var(--color-muted)] hover:text-white hover:bg-[var(--color-danger)] cursor-pointer rounded-none transition-colors"
            title="Cerrar (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
          onKeyDown={enterSeQueda}
          className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 text-xs text-[var(--color-ink)]"
        >
          {/* Bloque 1: Cliente y Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[var(--color-border)] p-3 sm:p-4 bg-[var(--color-bg)]">
            {/* Columna Izquierda: Datos del Cliente */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-accent)] border-b border-[var(--color-border)] pb-1">
                Datos del Cliente
              </span>

              {clientes.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                    Seleccionar cliente existente:
                  </label>
                  <select
                    id="select-cliente-existente-pedido"
                    value={clienteId}
                    onChange={(e) => elegirCliente(e.target.value)}
                    className="w-full h-9 px-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                  >
                    <option value="">-- CLIENTE NUEVO O MANUAL --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.ruc ? `(RUC: ${c.ruc})` : c.dni ? `(DNI: ${c.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                  Nombre completo <span className="text-red-500">*</span>:
                </label>
                <input
                  id="input-cliente-nombre-pedido"
                  type="text"
                  required
                  autoComplete="off"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="NOMBRE O RAZÓN SOCIAL..."
                  className="w-full h-9 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                    DNI / RUC:
                  </label>
                  <input
                    id="input-cliente-doc-pedido"
                    type="text"
                    autoComplete="off"
                    value={clienteDoc}
                    onChange={(e) => setClienteDoc(e.target.value)}
                    placeholder="DOCUMENTO..."
                    className="w-full h-9 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                    Teléfono / WhatsApp:
                  </label>
                  <input
                    id="input-cliente-tel-pedido"
                    type="text"
                    autoComplete="off"
                    value={clienteTel}
                    onChange={(e) => setClienteTel(e.target.value)}
                    placeholder="999..."
                    className="w-full h-9 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Fechas de Entrega */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-accent)] border-b border-[var(--color-border)] pb-1">
                Compromiso de Entrega
              </span>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                  Fecha prometida de entrega <span className="text-red-500">*</span>:
                </label>
                <input
                  id="input-fecha-entrega-pedido"
                  type="date"
                  required
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full h-9 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                  Hora aproximada:
                </label>
                <input
                  id="input-hora-entrega-pedido"
                  type="time"
                  value={horaEntrega}
                  onChange={(e) => setHoraEntrega(e.target.value)}
                  className="w-full h-9 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">
                  Observaciones / Especificaciones:
                </label>
                <textarea
                  id="input-observaciones-pedido"
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Detalles del pedido, color, indicaciones de entrega..."
                  className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-ink)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Productos / Artículos del Pedido */}
          <div className="flex flex-col gap-3 border border-[var(--color-border)] p-3 sm:p-4 bg-[var(--color-bg)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-accent)]">
                Artículos del Pedido ({items.length})
              </span>
              <button
                type="button"
                id="btn-agregar-linea-manual-pedido"
                onClick={agregarLineaManual}
                className="boton-cabecera px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white rounded-none cursor-pointer"
              >
                <Plus size={13} /> Agregar línea manual
              </button>
            </div>

            {/* Buscador de Producto del Inventario */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="buscador-sobrio flex-1 flex items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="px-2.5 text-[var(--color-muted)]">
                    <Search size={15} />
                  </div>
                  <input
                    id="buscador-producto-pedido"
                    type="text"
                    autoComplete="off"
                    value={busProd}
                    onChange={(e) => {
                      setBusProd(e.target.value);
                      setMarcadoProd(0);
                    }}
                    onKeyDown={(e) => {
                      if (resultadosProd.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        e.preventDefault();
                        setMarcadoProd((m) =>
                          e.key === 'ArrowDown' ? Math.min(m + 1, resultadosProd.length - 1) : Math.max(m - 1, 0)
                        );
                      } else if (e.key === 'Enter' && resultadosProd.length > 0) {
                        e.preventDefault();
                        agregarProducto(resultadosProd[marcadoProd]);
                      }
                    }}
                    placeholder="BUSCAR PRODUCTO DEL INVENTARIO O ESCANEAR CÓDIGO DE BARRAS..."
                    className="flex-1 h-9 px-1 text-xs bg-transparent outline-none text-[var(--color-ink)]"
                  />
                  {busProd && (
                    <button
                      type="button"
                      onClick={() => setBusProd('')}
                      className="px-2 text-[var(--color-muted)] hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <BotonEscanerCelular
                    id="btn-escaner-pedido"
                    variante="sobrio"
                    titulo="Escanear código de barras con la cámara"
                    onScan={(codigo: string) => {
                      const p = buscarProductoPorCodigo(productos as any[], codigo);
                      if (p) agregarProducto(p as any);
                      else {
                        setBusProd(codigo);
                        setMarcadoProd(0);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Lista desplegable de sugerencias de inventario */}
              {resultadosProd.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-30 max-h-56 overflow-y-auto">
                  {resultadosProd.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => agregarProducto(p)}
                      className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b border-[var(--color-border)] cursor-pointer ${
                        idx === marcadoProd ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      <div>
                        <div className="font-bold uppercase">{p.name}</div>
                        <div className="text-[10px] opacity-75">
                          Cód: {p.code || 'S/C'} · Stk: {p.quantity} {unidadDe(p).corto || 'UND'}
                        </div>
                      </div>
                      <div className="font-mono font-black text-sm">
                        S/ {formatearMonto(Number(p.price) || 0)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla de Artículos Agregados */}
            <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table data-tabla-campos="true" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--color-ink)] text-white text-[10px] uppercase font-black tracking-wider">
                    <th className="p-2 border-r border-white/20">Artículo / Descripción</th>
                    <th className="p-2 w-20 border-r border-white/20 text-center">Unidad</th>
                    <th className="p-2 w-24 border-r border-white/20 text-right">Cant.</th>
                    <th className="p-2 w-28 border-r border-white/20 text-right">Precio Unit.</th>
                    <th className="p-2 w-28 border-r border-white/20 text-right">Subtotal</th>
                    <th className="p-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/50">
                      <td className="p-1.5 border-r border-[var(--color-border)]">
                        <input
                          id={`input-item-nombre-${idx}`}
                          type="text"
                          required
                          value={it.product_name}
                          onChange={(e) => cambiarLinea(idx, 'product_name', e.target.value)}
                          placeholder="Descripción del artículo..."
                          className="w-full h-8 px-2 bg-transparent text-xs text-[var(--color-ink)] outline-none border border-transparent focus:border-[var(--color-ink)] rounded-none"
                        />
                      </td>
                      <td className="p-1.5 border-r border-[var(--color-border)] text-center">
                        <input
                          type="text"
                          value={it.unidad}
                          onChange={(e) => cambiarLinea(idx, 'unidad', e.target.value.toUpperCase())}
                          className="w-full h-8 text-center bg-transparent text-xs text-[var(--color-ink)] outline-none border border-transparent focus:border-[var(--color-ink)] rounded-none"
                        />
                      </td>
                      <td className="p-1.5 border-r border-[var(--color-border)]">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={it.quantity}
                          onChange={(e) => cambiarLinea(idx, 'quantity', e.target.value)}
                          className="w-full h-8 px-2 text-right bg-transparent text-xs text-[var(--color-ink)] outline-none border border-transparent focus:border-[var(--color-ink)] rounded-none font-mono font-bold"
                        />
                      </td>
                      <td className="p-1.5 border-r border-[var(--color-border)]">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={it.price}
                          onChange={(e) => cambiarLinea(idx, 'price', e.target.value)}
                          className="w-full h-8 px-2 text-right bg-transparent text-xs text-[var(--color-ink)] outline-none border border-transparent focus:border-[var(--color-ink)] rounded-none font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 border-r border-[var(--color-border)] text-right font-mono font-black text-sm">
                        S/ {formatearMonto(it.subtotal)}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => quitarLinea(idx)}
                          className="p-1 text-[var(--color-muted)] hover:text-red-600 cursor-pointer"
                          title="Eliminar línea"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fila de Totales y Liquidación */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-[var(--color-border)] p-3 bg-[var(--color-surface)] mt-2">
              {/* Total General */}
              <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg)]">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] block">
                  Total del Pedido
                </span>
                <span className="text-lg font-black font-mono text-[var(--color-ink)]">
                  S/ {formatearMonto(total)}
                </span>
              </div>

              {/* Adelanto */}
              <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                    Adelanto Dejado
                  </span>
                  <select
                    value={metodoAdelanto}
                    onChange={(e) => setMetodoAdelanto(e.target.value as any)}
                    className="text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] px-1 py-0.5 rounded-none outline-none"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-xs">S/</span>
                  <input
                    id="input-adelanto-pedido"
                    type="number"
                    step="0.10"
                    min="0"
                    max={total}
                    value={adelanto}
                    onChange={(e) => setAdelanto(e.target.value)}
                    className="w-full h-7 px-2 font-mono font-bold text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none outline-none focus:border-[var(--color-ink)]"
                  />
                </div>
              </div>

              {/* Saldo Pendiente */}
              <div
                className={`p-2 border ${
                  saldoPendiente > 0
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                    : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  {saldoPendiente > 0 ? 'Saldo por Cobrar en Entrega' : 'Liquidado Completo'}
                </span>
                <span className="text-lg font-black font-mono">
                  S/ {formatearMonto(saldoPendiente)}
                </span>
              </div>
            </div>
          </div>

          {/* Pie de Acciones */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t-2 border-[var(--color-border)] shrink-0">
            <button
              type="button"
              id="btn-cancelar-nuevo-pedido"
              onClick={() => onClose()}
              className="px-4 py-2.5 font-black text-xs uppercase tracking-wider border-2 border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-bg)] rounded-none cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-guardar-nuevo-pedido"
              disabled={guardando}
              className="px-5 py-2.5 font-black text-xs uppercase tracking-wider bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] border-2 border-[var(--color-ink)] rounded-none cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
