import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRightLeft, Plus, Trash2, Printer, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2, Store as StoreIcon } from 'lucide-react';
import type { Store, StoreTransfer } from '../../../types/stores';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { ModalValeTraspaso } from './ModalValeTraspaso';
import { coincideBusqueda } from '../../../utils/busqueda';

interface ModalTraspasoProps {
  onClose: () => void;
  onTraspasoExitoso?: () => void;
}

interface ItemTraspasoLocal {
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_name?: string | null;
  cantidad: number;
  stock_disponible: number;
  cost_price: number;
}

export const ModalTraspaso: React.FC<ModalTraspasoProps> = ({ onClose, onTraspasoExitoso }) => {
  useCerrarConEscape(true, () => onClose());

  const [tabActiva, setTabActiva] = useState<'NUEVO' | 'HISTORIAL'>('NUEVO');
  const [tiendas, setTiendas] = useState<Store[]>([]);
  const [cargandoTiendas, setCargandoTiendas] = useState(true);

  // Formulario Nuevo Traspaso
  const [origenId, setOrigenId] = useState<number>(1);
  const [destinoId, setDestinoId] = useState<number>(2);
  const [notas, setNotas] = useState('');
  const [recibirInmediato, setRecibirInmediato] = useState(true);
  const [items, setItems] = useState<ItemTraspasoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Buscador de productos
  const [busqueda, setBusqueda] = useState('');
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);

  // Historial
  const [historial, setHistorial] = useState<StoreTransfer[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [traspasoSeleccionadoParaVale, setTraspasoSeleccionadoParaVale] = useState<any | null>(null);

  // Cargar tiendas disponibles
  useEffect(() => {
    const fetchTiendas = async () => {
      setCargandoTiendas(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('activo', true)
          .order('id', { ascending: true });

        if (error) throw error;
        const lista = data || [];
        setTiendas(lista);

        if (lista.length > 0) {
          setOrigenId(lista[0].id);
          if (lista.length > 1) {
            setDestinoId(lista[1].id);
          } else {
            setDestinoId(lista[0].id);
          }
        }
      } catch (err) {
        console.error('Error al cargar tiendas:', err);
      } finally {
        setCargandoTiendas(false);
      }
    };

    fetchTiendas();
  }, []);

  // Cargar productos del almacén origen
  useEffect(() => {
    const fetchProductosOrigen = async () => {
      try {
        // Obtenemos los lotes del almacén origen
        const { data: batchesData } = await supabase
          .from('batches')
          .select('id, product_id, variant_id, variant_name, quantity, cost_unit, is_active')
          .eq('store_id', origenId)
          .gt('quantity', 0);

        const { data: prodsData } = await supabase
          .from('products')
          .select('id, name, code, barcode, cost_price, price, unit')
          .eq('is_active', 1);

        const prodsMap = new Map((prodsData || []).map((p: any) => [p.id, p]));

        // Consolidar stock por producto / variante en la tienda de origen
        const stockMap = new Map<string, { product: any; variant_id: any; variant_name: any; stock: number; cost: number }>();

        (batchesData || []).forEach((b: any) => {
          const prod = prodsMap.get(b.product_id);
          if (!prod) return;

          const key = `${b.product_id}_${b.variant_id || 'null'}`;
          const current = stockMap.get(key) || {
            product: prod,
            variant_id: b.variant_id,
            variant_name: b.variant_name,
            stock: 0,
            cost: Number(b.cost_unit || prod.cost_price || 0),
          };

          current.stock += Number(b.quantity || 0);
          stockMap.set(key, current);
        });

        // Si no hay lotes en el almacén 1 pero hay stock global en products, mostrar como fallback
        if (origenId === 1 && stockMap.size === 0) {
          (prodsData || []).forEach((p: any) => {
            if (Number(p.quantity || 0) > 0) {
              stockMap.set(`${p.id}_null`, {
                product: p,
                variant_id: null,
                variant_name: null,
                stock: Number(p.quantity || 0),
                cost: Number(p.cost || 0),
              });
            }
          });
        }

        setProductosDisponibles(Array.from(stockMap.values()));
      } catch (err) {
        console.error('Error al cargar productos origen:', err);
      }
    };

    if (origenId) {
      fetchProductosOrigen();
    }
  }, [origenId]);

  // Cargar historial
  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const { data: transData, error } = await supabase
        .from('store_transfers')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Enlazar nombres de tiendas
      const tiendasMap = new Map(tiendas.map((t) => [t.id, t.nombre]));
      const transfersConNombres = (transData || []).map((t: any) => ({
        ...t,
        origen_nombre: tiendasMap.get(t.origen_store_id) || `Local ${t.origen_store_id}`,
        destino_nombre: tiendasMap.get(t.destino_store_id) || `Local ${t.destino_store_id}`,
      }));

      setHistorial(transfersConNombres);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (tabActiva === 'HISTORIAL') {
      cargarHistorial();
    }
  }, [tabActiva, tiendas]);

  // Sugerencias filtradas
  const sugerencias = busqueda.trim()
    ? productosDisponibles.filter((item) =>
        coincideBusqueda(
          `${item.product.name} ${item.variant_name || ''} ${item.product.barcode || ''} ${item.product.code || ''}`,
          busqueda
        )
      ).slice(0, 8)
    : [];

  const agregarProductoAlTraspaso = (item: any) => {
    const yaExiste = items.find(
      (it) => it.product_id === item.product.id && it.variant_id === item.variant_id
    );

    if (yaExiste) {
      avisar('Este producto ya está en la lista del traspaso.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: item.product.id,
        product_name: item.product.name,
        variant_id: item.variant_id,
        variant_name: item.variant_name,
        cantidad: 1,
        stock_disponible: item.stock,
        cost_price: item.cost,
      },
    ]);

    setBusqueda('');
    setBusquedaAbierta(false);
  };

  const handleCantidadChange = (index: number, valor: string) => {
    const num = Number(valor);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          cantidad: isNaN(num) || num <= 0 ? 1 : Math.min(num, it.stock_disponible),
        };
      })
    );
  };

  const eliminarItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmarTraspaso = async () => {
    if (origenId === destinoId) {
      avisar('El almacén de origen y destino no pueden ser el mismo.');
      return;
    }

    if (items.length === 0) {
      avisar('Agrega al menos un producto a la lista de traspaso.');
      return;
    }

    const itemsPayload = items.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      cantidad: it.cantidad,
      cost_price: it.cost_price || 0,
    }));

    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc('fn_crear_traspaso', {
        p_origen_id: origenId,
        p_destino_id: destinoId,
        p_items: itemsPayload,
        p_notas: notas.trim() || null,
        p_usuario: 'Administrador',
        p_recibir_inmediato: recibirInmediato,
      });

      if (error) throw error;

      const origenNombre = tiendas.find((t) => t.id === origenId)?.nombre || 'Origen';
      const destinoNombre = tiendas.find((t) => t.id === destinoId)?.nombre || 'Destino';

      setTraspasoSeleccionadoParaVale({
        codigo: data?.codigo || 'TR-0001',
        fecha: new Date().toLocaleString(),
        origen_nombre: origenNombre,
        destino_nombre: destinoNombre,
        creado_por: 'Administrador',
        notas: notas.trim(),
        items: items.map((it) => ({
          product_name: it.product_name,
          variant_name: it.variant_name,
          cantidad: it.cantidad,
        })),
      });

      setItems([]);
      setNotas('');
      avisar(`Se registró el traslado ${data?.codigo} de ${origenNombre} a ${destinoNombre}.`);
      onTraspasoExitoso?.();
    } catch (err: any) {
      console.error('Error al crear traspaso:', err);
      avisar(err.message || 'No se pudo registrar el traspaso.');
    } finally {
      setEnviando(false);
    }
  };

  const verValeDesdeHistorial = async (traspaso: StoreTransfer) => {
    try {
      const { data: itemsData } = await supabase
        .from('store_transfer_items')
        .select('*')
        .eq('transfer_id', traspaso.id);

      setTraspasoSeleccionadoParaVale({
        codigo: traspaso.codigo,
        fecha: traspaso.fecha_envio ? new Date(traspaso.fecha_envio).toLocaleString() : '',
        origen_nombre: traspaso.origen_nombre || `Local ${traspaso.origen_store_id}`,
        destino_nombre: traspaso.destino_nombre || `Local ${traspaso.destino_store_id}`,
        creado_por: traspaso.creado_por,
        notas: traspaso.notas,
        items: itemsData || [],
      });
    } catch (err) {
      console.error('Error al ver vale:', err);
    }
  };

  const recibirTraspasoEnTransito = async (traspasoId: number) => {
    const ok = await confirmar('¿Deseas confirmar la recepción física de esta mercadería en el almacén de destino?');
    if (!ok) return;

    try {
      const { error } = await supabase.rpc('fn_recibir_traspaso', {
        p_transfer_id: traspasoId,
        p_usuario: 'Administrador',
      });

      if (error) throw error;
      avisar('El stock ha ingresado correctamente al almacén destino.');
      cargarHistorial();
      onTraspasoExitoso?.();
    } catch (err: any) {
      avisar(err.message || 'No se pudo confirmar la recepción.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        role="dialog"
        aria-modal="true"
        id="modal-traspasos"
        className="ventana-sobria w-full max-w-4xl bg-[var(--color-bg)] border-2 border-[var(--color-ink)] flex flex-col max-h-[92vh] overflow-hidden text-[var(--color-ink)] font-mono"
      >
        {/* Cabecera */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera flex items-center justify-between px-4 py-3 bg-[var(--color-ink)] text-white border-b-2 border-[var(--color-ink)] select-none">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[var(--color-accent)]" />
            <h2 className="ventana-cabecera__titulo text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">
              Traspaso de Mercadería entre Almacenes / Tiendas (Fase 9)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ventana-cerrar p-1 hover:bg-white/20 text-white rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b-2 border-[var(--color-ink)] bg-[var(--color-surface)]">
          <button
            id="tab-nuevo-traspaso"
            onClick={() => setTabActiva('NUEVO')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border-r-2 border-[var(--color-ink)] ${
              tabActiva === 'NUEVO'
                ? 'bg-[var(--color-ink)] text-[var(--color-accent)]'
                : 'hover:bg-[var(--color-bg)] text-[var(--color-muted)]'
            }`}
          >
            <Plus size={14} /> Nuevo Traspaso
          </button>
          <button
            id="tab-historial-traspasos"
            onClick={() => setTabActiva('HISTORIAL')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border-r-2 border-[var(--color-ink)] ${
              tabActiva === 'HISTORIAL'
                ? 'bg-[var(--color-ink)] text-[var(--color-accent)]'
                : 'hover:bg-[var(--color-bg)] text-[var(--color-muted)]'
            }`}
          >
            <Clock size={14} /> Historial de Traspasos
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {tabActiva === 'NUEVO' ? (
            tiendas.length < 2 ? (
              <div className="p-8 text-center border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
                <StoreIcon size={36} className="mx-auto text-[var(--color-muted)] mb-3" />
                <h3 className="font-bold text-sm uppercase mb-1">
                  Se necesitan al menos 2 locales para realizar traspasos
                </h3>
                <p className="text-xs text-[var(--color-muted)] font-sans max-w-md mx-auto">
                  Actualmente tienes registrada solo una tienda. Ve a <strong>Ajustes &gt; Tiendas y Almacenes</strong> para dar de alta tu segunda sucursal o tu depósito central.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ruta de Origen a Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-[var(--color-surface)] border-2 border-[var(--color-ink)]">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-red-600">
                      Desde (Almacén de Origen / Salida)
                    </label>
                    <select
                      id="select-traspaso-origen"
                      value={origenId}
                      onChange={(e) => setOrigenId(Number(e.target.value))}
                      className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] font-bold text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    >
                      {tiendas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.es_almacen_principal ? '(Almacén Principal)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-emerald-600">
                      Hacia (Almacén de Destino / Entrada)
                    </label>
                    <select
                      id="select-traspaso-destino"
                      value={destinoId}
                      onChange={(e) => setDestinoId(Number(e.target.value))}
                      className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] font-bold text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    >
                      {tiendas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.es_almacen_principal ? '(Almacén Principal)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Buscador de Productos */}
                <div className="relative">
                  <label className="block text-xs font-black uppercase mb-1">
                    Buscar Producto a Traspasar (con stock en origen)
                  </label>
                  <input
                    id="buscador-producto-traspaso"
                    type="text"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setBusquedaAbierta(true);
                      setIndiceSugerencia(0);
                    }}
                    onFocus={() => setBusquedaAbierta(true)}
                    placeholder="Escribe el nombre del producto, código de barras o variante..."
                    className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />

                  {/* Dropdown de sugerencias */}
                  {busquedaAbierta && sugerencias.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-20 max-h-60 overflow-y-auto divide-y divide-[var(--color-border)]">
                      {sugerencias.map((item, idx) => (
                        <button
                          key={`${item.product.id}_${item.variant_id}`}
                          type="button"
                          onClick={() => agregarProductoAlTraspaso(item)}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--color-ink)] hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div>
                            <span className="font-bold text-xs block uppercase">
                              {item.product.name}
                            </span>
                            {item.variant_name && (
                              <span className="text-[11px] text-[var(--color-muted)] group-hover:text-[var(--color-accent)]">
                                🏷️ Talla/Color: {item.variant_name}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Stock: {item.stock}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabla de Productos a Traspasar */}
                <div className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-ink)] text-white">
                        <th className="p-2 font-bold uppercase">Producto</th>
                        <th className="p-2 font-bold uppercase">Variante</th>
                        <th className="p-2 font-bold uppercase text-center">Stock Origen</th>
                        <th className="p-2 font-bold uppercase text-center w-32">Cant. a Enviar</th>
                        <th className="p-2 font-bold uppercase text-right">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[var(--color-muted)] uppercase text-xs">
                            No hay productos agregados al traspaso. Busca arriba para agregar.
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-bg)]">
                            <td className="p-2 font-bold uppercase">{it.product_name}</td>
                            <td className="p-2 text-[11px] text-[var(--color-muted)]">
                              {it.variant_name || '—'}
                            </td>
                            <td className="p-2 text-center font-bold text-emerald-700">
                              {it.stock_disponible}
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min={1}
                                max={it.stock_disponible}
                                value={it.cantidad}
                                onChange={(e) => handleCantidadChange(idx, e.target.value)}
                                className="w-20 px-2 py-1 text-center font-bold font-mono border-2 border-[var(--color-ink)] bg-[var(--color-bg)]"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => eliminarItem(idx)}
                                className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notas y Opciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">
                      Observaciones / Motivo del Traspaso (Opcional)
                    </label>
                    <input
                      type="text"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Ej. Reposición de fin de semana, pedido especial..."
                      className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-xs font-sans"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={recibirInmediato}
                        onChange={(e) => setRecibirInmediato(e.target.checked)}
                        className="w-4 h-4 text-[var(--color-accent)]"
                      />
                      <span className="text-xs font-bold uppercase">
                        Recepción Inmediata (Ingresar stock en destino de una vez)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Botón de Confirmación */}
                <div className="flex justify-end pt-3 border-t-2 border-[var(--color-ink)]">
                  <button
                    type="button"
                    id="btn-confirmar-traspaso"
                    onClick={handleConfirmarTraspaso}
                    disabled={enviando || items.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50"
                  >
                    {enviando ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Procesando Traspaso...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft size={16} /> Confirmar y Emitir Vale de Traspaso
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Tab Historial */
            <div className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-ink)] text-white">
                    <th className="p-2 font-bold uppercase">Código</th>
                    <th className="p-2 font-bold uppercase">Fecha Envío</th>
                    <th className="p-2 font-bold uppercase">Origen</th>
                    <th className="p-2 font-bold uppercase">Destino</th>
                    <th className="p-2 font-bold uppercase">Estado</th>
                    <th className="p-2 font-bold uppercase">Creado Por</th>
                    <th className="p-2 font-bold uppercase text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {cargandoHistorial ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[var(--color-muted)] uppercase">
                        Cargando historial de traspasos...
                      </td>
                    </tr>
                  ) : historial.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[var(--color-muted)] uppercase">
                        No hay traspasos registrados aún.
                      </td>
                    </tr>
                  ) : (
                    historial.map((tr) => (
                      <tr key={tr.id} className="hover:bg-[var(--color-bg)]">
                        <td className="p-2 font-bold font-mono">{tr.codigo}</td>
                        <td className="p-2 text-[11px]">
                          {tr.fecha_envio ? new Date(tr.fecha_envio).toLocaleString() : '—'}
                        </td>
                        <td className="p-2 font-bold uppercase text-red-700">{tr.origen_nombre}</td>
                        <td className="p-2 font-bold uppercase text-emerald-700">{tr.destino_nombre}</td>
                        <td className="p-2">
                          {tr.estado === 'RECIBIDO' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] uppercase bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                              <CheckCircle size={11} /> Recibido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] uppercase bg-amber-100 px-2 py-0.5 border border-amber-300">
                              <Clock size={11} /> En Tránsito
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs">{tr.creado_por || 'Sistema'}</td>
                        <td className="p-2 text-right space-x-2">
                          {tr.estado === 'EN_TRANSITO' && (
                            <button
                              onClick={() => recibirTraspasoEnTransito(tr.id)}
                              className="btn-recibir-traspaso px-2 py-1 bg-emerald-600 text-white font-bold text-[10px] uppercase hover:bg-emerald-700 cursor-pointer"
                            >
                              Recibir
                            </button>
                          )}
                          <button
                            onClick={() => verValeDesdeHistorial(tr)}
                            className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--color-ink)] font-bold text-[10px] uppercase hover:bg-[var(--color-ink)] hover:text-white cursor-pointer"
                          >
                            <Printer size={12} /> Vale
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Vale Imprimible */}
      {traspasoSeleccionadoParaVale && (
        <ModalValeTraspaso
          traspaso={traspasoSeleccionadoParaVale}
          onClose={() => setTraspasoSeleccionadoParaVale(null)}
        />
      )}
    </div>
  );
};
