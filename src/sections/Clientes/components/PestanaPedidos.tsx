import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Printer, MessageCircle, CheckCircle2, X, Calendar, Clock, AlertCircle, AlertTriangle, ArrowUpDown, DollarSign } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { PedidoCliente, DetallePedido } from '../types';
import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda } from '../../../utils/busqueda';
import { useEmpleado } from '../../../utils/permisos';

export const PestanaPedidos: React.FC = () => {
  const empleado = useEmpleado();
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO'>('TODOS');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoCliente | null>(null);
  const [detallesModal, setDetallesModal] = useState<DetallePedido[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [metodoCobroSaldo, setMetodoCobroSaldo] = useState<'EFECTIVO' | 'YAPE' | 'TARJETA'>('EFECTIVO');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await traerTodo(() =>
        supabase
          .from('pedidos_clientes')
          .select('*')
          .order('id', { ascending: false })
      );

      if (error) throw error;

      if (data) {
        setPedidos(data.map((p: any) => ({
          id: p.id,
          numero: p.numero,
          cliente_id: p.cliente_id,
          cliente_nombre: p.cliente_nombre,
          cliente_documento: p.cliente_documento,
          cliente_telefono: p.cliente_telefono,
          fecha_entrega: p.fecha_entrega,
          estado: p.estado,
          total: Number(p.total) || 0,
          adelanto: Number(p.adelanto) || 0,
          saldo_pendiente: Number(p.saldo_pendiente) || 0,
          metodo_adelanto: p.metodo_adelanto,
          observaciones: p.observaciones,
          sale_id: p.sale_id,
          vendedor: p.vendedor
        })));
      }
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const coincideTexto = coincideBusqueda([p.numero, p.cliente_nombre, p.cliente_documento, p.cliente_telefono], search);
      const coincideEst = filtroEstado === 'TODOS' || p.estado === filtroEstado;
      return coincideTexto && coincideEst;
    });
  }, [pedidos, search, filtroEstado]);

  const abrirDetalle = async (ped: PedidoCliente) => {
    setPedidoSeleccionado(ped);
    setCargandoDetalles(true);
    try {
      const { data, error } = await supabase
        .from('pedido_detalles')
        .select('*')
        .eq('pedido_id', ped.id)
        .order('id');

      if (!error && data) {
        setDetallesModal(data.map((d: any) => ({
          id: d.id,
          pedido_id: d.pedido_id,
          product_id: d.product_id,
          product_name: d.product_name,
          quantity: Number(d.quantity),
          price: Number(d.price),
          subtotal: Number(d.subtotal),
          es_mayorista: d.es_mayorista
        })));
      }
    } catch (err) {
      console.error('Error cargando detalles del pedido:', err);
    } finally {
      setCargandoDetalles(false);
    }
  };

  // Entregar pedido y cobrar saldo pendiente
  const handleEntregarPedido = async () => {
    if (!pedidoSeleccionado) return;
    setProcesandoAccion(true);
    try {
      const saldo = pedidoSeleccionado.saldo_pendiente;

      // Si había saldo pendiente y se cobró en efectivo, registrar en caja abierta
      if (saldo > 0 && metodoCobroSaldo === 'EFECTIVO') {
        const { data: sesionActiva } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('status', 'OPEN')
          .maybeSingle();

        if (sesionActiva) {
          await supabase.from('cash_movements').insert({
            session_id: sesionActiva.id,
            type: 'INCOME',
            amount: saldo,
            description: `Liquidación Pedido ${pedidoSeleccionado.numero} · ${pedidoSeleccionado.cliente_nombre}`,
            user_id: empleado?.id
          });
        }
      }

      // Marcar pedido como ENTREGADO y saldo en 0
      const { error: updErr } = await supabase
        .from('pedidos_clientes')
        .update({
          estado: 'ENTREGADO',
          saldo_pendiente: 0
        })
        .eq('id', pedidoSeleccionado.id);

      if (updErr) throw updErr;

      // Actualizar en el estado local
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoSeleccionado.id ? { ...p, estado: 'ENTREGADO', saldo_pendiente: 0 } : p
        )
      );
      setPedidoSeleccionado((prev) =>
        prev ? { ...prev, estado: 'ENTREGADO', saldo_pendiente: 0 } : null
      );
      setModalEntregaAbierto(false);

      alert(`✅ Pedido ${pedidoSeleccionado.numero} entregado exitosamente.${saldo > 0 ? ` Se registró el cobro de S/ ${saldo.toFixed(2)} (${metodoCobroSaldo}).` : ''}`);
    } catch (err: any) {
      console.error('Error al entregar pedido:', err);
      alert(`No se pudo procesar la entrega: ${err.message || 'Error desconocido'}`);
    } finally {
      setProcesandoAccion(false);
    }
  };

  // Cancelar pedido y restaurar stock reservado
  const handleCancelarPedido = async () => {
    if (!pedidoSeleccionado) return;
    const ok = confirm(
      `¿Está seguro de CANCELAR el pedido ${pedidoSeleccionado.numero}?\n\n⚠️ Esta acción devolverá automáticamente la mercadería reservada al inventario.`
    );
    if (!ok) return;

    setProcesandoAccion(true);
    try {
      // 1. Obtener detalles para saber qué devolver
      let items = detallesModal;
      if (items.length === 0) {
        const { data } = await supabase
          .from('pedido_detalles')
          .select('*')
          .eq('pedido_id', pedidoSeleccionado.id);
        if (data) {
          items = data.map((d: any) => ({
            id: d.id,
            product_id: d.product_id,
            product_name: d.product_name,
            quantity: Number(d.quantity),
            price: Number(d.price),
            subtotal: Number(d.subtotal)
          }));
        }
      }

      // 2. Restaurar stock de cada producto
      for (const item of items) {
        if (item.product_id) {
          const { data: prodDb } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', item.product_id)
            .single();

          if (prodDb) {
            const stockRestaurado = Number(prodDb.quantity || 0) + item.quantity;
            await supabase
              .from('products')
              .update({ quantity: stockRestaurado })
              .eq('id', item.product_id);

            // Registrar movimiento de devolución de stock
            await supabase.from('inventory_movements').insert({
              product_id: item.product_id,
              product_name: item.product_name,
              change_amount: item.quantity,
              operation_type: 'CANCELACION_PEDIDO',
              reason: `Devolución Stock - Pedido #${pedidoSeleccionado.numero}`,
              notes: `Cancelado · Cliente: ${pedidoSeleccionado.cliente_nombre}`,
              user: empleado?.nombre || 'Sistema',
              is_synced: 1
            });
          }
        }
      }

      // 3. Marcar pedido como CANCELADO
      const { error: updErr } = await supabase
        .from('pedidos_clientes')
        .update({ estado: 'CANCELADO' })
        .eq('id', pedidoSeleccionado.id);

      if (updErr) throw updErr;

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoSeleccionado.id ? { ...p, estado: 'CANCELADO' } : p))
      );
      setPedidoSeleccionado((prev) => (prev ? { ...prev, estado: 'CANCELADO' } : null));

      alert(`✅ Pedido ${pedidoSeleccionado.numero} cancelado. Los productos se restauraron al inventario.`);
    } catch (err: any) {
      console.error('Error cancelando pedido:', err);
      alert(`No se pudo cancelar el pedido: ${err.message || 'Error desconocido'}`);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleWhatsApp = (ped: PedidoCliente, items: DetallePedido[]) => {
    const tel = (ped.cliente_telefono || '').replace(/[^0-9]/g, '');
    const telefonoDestino = tel.length === 9 ? `51${tel}` : tel;

    const fechaStr = new Date(ped.fecha_entrega).toLocaleDateString();
    const horaStr = new Date(ped.fecha_entrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const lineas = items
      .map((d) => `• ${d.quantity}x ${d.product_name}`)
      .join('\n');

    let textoEstado = `¡Su pedido ya está listo para recojo!`;
    if (ped.estado === 'ENTREGADO') {
      textoEstado = `¡Muchas gracias por su compra! Su pedido ha sido entregado exitosamente.`;
    }

    const mensaje = encodeURIComponent(
      `*PEDIDO ${ped.numero}*\n` +
      `Estimado(a) ${ped.cliente_nombre}:\n` +
      `${textoEstado}\n\n` +
      `Artículos:\n${lineas}\n\n` +
      `*Total:* S/ ${ped.total.toFixed(2)}\n` +
      `*Adelanto registrado:* S/ ${ped.adelanto.toFixed(2)}\n` +
      `*Saldo pendiente:* S/ ${ped.saldo_pendiente.toFixed(2)}\n` +
      `Fecha acordada: ${fechaStr} a las ${horaStr}`
    );

    const url = telefonoDestino
      ? `https://wa.me/${telefonoDestino}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;

    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-[var(--color-ink)]">
      
      {/* BARRA SUPERIOR: BUSCADOR Y FILTROS */}
      <div className="p-3 bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="buscador-pedidos"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Nro, Cliente, DNI, Teléfono..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-black uppercase border-2 border-[var(--color-ink)] outline-none bg-white focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-2 py-1 text-xs font-bold border-2 border-[var(--color-ink)] bg-white hover:bg-gray-100"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* FILTROS DE ESTADO */}
        <div className="flex gap-1 overflow-x-auto">
          {(['TODOS', 'PENDIENTE', 'ENTREGADO', 'CANCELADO'] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-[var(--color-ink)] transition-all cursor-pointer ${
                filtroEstado === est
                  ? 'bg-[var(--color-ink)] text-white shadow-[2px_2px_0_0_black]'
                  : 'bg-white text-[var(--color-ink)] hover:bg-gray-100'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">
            Cargando pedidos...
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-[var(--color-muted)]">
            <Package size={32} />
            <span className="text-xs font-black uppercase tracking-widest">
              No hay pedidos registrados con estos filtros
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {pedidosFiltrados.map((ped, idx) => {
              const entregaDate = new Date(ped.fecha_entrega);
              const entregaStr = entregaDate.toLocaleDateString();
              const entregaHora = entregaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              const hoy = new Date().toISOString().split('T')[0];
              const fechaIso = ped.fecha_entrega.split('T')[0];
              const esHoy = hoy === fechaIso && ped.estado === 'PENDIENTE';
              const estaVencido = new Date() > entregaDate && ped.estado === 'PENDIENTE';

              const badgeEstado = {
                PENDIENTE: 'bg-amber-100 text-amber-900 border-amber-500',
                ENTREGADO: 'bg-emerald-100 text-emerald-800 border-emerald-500',
                CANCELADO: 'bg-red-100 text-red-800 border-red-500'
              }[ped.estado] || 'bg-gray-100 text-gray-800 border-gray-400';

              return (
                <div
                  key={ped.id}
                  id={`ped-row-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => abrirDetalle(ped)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      abrirDetalle(ped);
                    }
                  }}
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer transition-colors ${
                    esHoy ? 'bg-amber-50/80 border-l-4 border-l-amber-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[var(--color-ink)] tracking-wider">
                        {ped.numero}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${badgeEstado}`}>
                        {ped.estado}
                      </span>
                      {esHoy && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                          ¡ENTREGA HOY!
                        </span>
                      )}
                      {estaVencido && !esHoy && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-700 border border-red-400">
                          FECHA PASADA
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black uppercase text-[var(--color-ink)] truncate">
                      {ped.cliente_nombre}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--color-muted)] flex items-center gap-2">
                      <span>Entrega: {entregaStr} {entregaHora}</span>
                      {ped.cliente_telefono && (
                        <>
                          <span>·</span>
                          <span>Tel: {ped.cliente_telefono}</span>
                        </>
                      )}
                      {ped.vendedor && (
                        <>
                          <span>·</span>
                          <span>Atendido por: {ped.vendedor}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-[var(--color-muted)] flex items-center gap-1 justify-end">
                        Total: S/ {ped.total.toFixed(2)} · Adelanto: S/ {ped.adelanto.toFixed(2)}
                      </div>
                      <div className={`text-base font-black ${ped.saldo_pendiente > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {ped.saldo_pendiente > 0 ? `Saldo: S/ ${ped.saldo_pendiente.toFixed(2)}` : 'PAGADO COMPLETO'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirDetalle(ped);
                      }}
                      className="px-3 py-1.5 border-2 border-[var(--color-ink)] bg-white hover:bg-[var(--color-accent)] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_black]"
                    >
                      Ver Pedido
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE PEDIDO */}
      {pedidoSeleccionado && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4"
        >
          <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[92vh] w-full max-w-xl animate-fade-in">
            
            {/* CABECERA */}
            <div className="bg-[var(--color-ink)] text-white p-3 sm:p-4 flex justify-between items-center border-b-2 border-[var(--color-ink)]">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                  <Package size={18} className="text-amber-400" />
                  {pedidoSeleccionado.numero} · Ficha de Pedido por Encargo
                </h3>
                <span className="text-[11px] font-bold text-gray-300">
                  Estado: <strong>{pedidoSeleccionado.estado}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPedidoSeleccionado(null)}
                className="p-1 hover:rotate-90 transition-transform cursor-pointer text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* CUERPO */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
              
              {/* DATOS CLIENTE Y ENTREGA */}
              <div className="bg-[var(--color-bg)] p-3 border-2 border-[var(--color-border)] text-xs flex flex-col gap-1">
                <div>Cliente: <strong className="uppercase">{pedidoSeleccionado.cliente_nombre}</strong></div>
                {pedidoSeleccionado.cliente_documento && <div>Doc: <strong>{pedidoSeleccionado.cliente_documento}</strong></div>}
                {pedidoSeleccionado.cliente_telefono && <div>Teléfono: <strong>{pedidoSeleccionado.cliente_telefono}</strong></div>}
                <div>
                  📅 Fecha Prometida de Entrega:{' '}
                  <strong className="text-amber-800">
                    {new Date(pedidoSeleccionado.fecha_entrega).toLocaleString()}
                  </strong>
                </div>
                {pedidoSeleccionado.observaciones && (
                  <div className="mt-1 pt-1 border-t border-[var(--color-border)] text-[11px] italic">
                    Notas: {pedidoSeleccionado.observaciones}
                  </div>
                )}
              </div>

              {/* LISTA DE PRODUCTOS RESERVADOS */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1 block">
                  Mercadería Reservada en Inventario
                </span>
                {cargandoDetalles ? (
                  <div className="p-6 text-center text-xs font-bold text-gray-500">
                    Cargando productos...
                  </div>
                ) : (
                  <div className="border-2 border-[var(--color-ink)] divide-y divide-[var(--color-border)] max-h-44 overflow-y-auto">
                    {detallesModal.map((det, i) => (
                      <div key={i} className="p-2 flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-black uppercase text-[var(--color-ink)] truncate">
                            {det.product_name}
                          </p>
                          <span className="text-[10px] text-[var(--color-muted)] font-bold">
                            {det.quantity} x S/ {det.price.toFixed(2)}
                            {det.es_mayorista && <span className="ml-1 text-amber-600 font-black">⭐ MAYORISTA</span>}
                          </span>
                        </div>
                        <span className="font-black text-sm text-[var(--color-ink)] shrink-0">
                          S/ {det.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CUENTAS DEL PEDIDO */}
              <div className="bg-amber-50 p-3 border-2 border-amber-300 flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Pedido:</span>
                  <strong className="text-sm">S/ {pedidoSeleccionado.total.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Adelanto Pagado:</span>
                  <strong>S/ {pedidoSeleccionado.adelanto.toFixed(2)} {pedidoSeleccionado.metodo_adelanto ? `(${pedidoSeleccionado.metodo_adelanto})` : ''}</strong>
                </div>
                <div className="flex justify-between text-base font-black text-amber-900 pt-1 border-t border-amber-200">
                  <span>Saldo Pendiente al Recoger:</span>
                  <span>S/ {pedidoSeleccionado.saldo_pendiente.toFixed(2)}</span>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {pedidoSeleccionado.estado === 'PENDIENTE' && (
                  <button
                    type="button"
                    onClick={() => setModalEntregaAbierto(true)}
                    disabled={procesandoAccion}
                    className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 size={16} /> Entregar y Cobrar Saldo
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleWhatsApp(pedidoSeleccionado, detallesModal)}
                  className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-green-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-green-600 cursor-pointer"
                >
                  <MessageCircle size={16} /> WhatsApp Cliente
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-white text-[var(--color-ink)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-gray-100 cursor-pointer"
                >
                  <Printer size={16} /> Imprimir Comprobante
                </button>

                {pedidoSeleccionado.estado === 'PENDIENTE' && (
                  <button
                    type="button"
                    onClick={handleCancelarPedido}
                    disabled={procesandoAccion}
                    className="py-2.5 px-3 border-2 border-red-600 bg-white text-red-600 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_red] hover:bg-red-50 cursor-pointer"
                  >
                    <X size={16} /> Cancelar (Devolver Stock)
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL COBRAR SALDO Y CONFIRMAR ENTREGA */}
      {modalEntregaAbierto && pedidoSeleccionado && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-3"
        >
          <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_black] p-5 w-full max-w-md flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] pb-2">
              <h4 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={18} className="text-emerald-600" /> Confirmar Entrega de Mercadería
              </h4>
              <button
                type="button"
                onClick={() => setModalEntregaAbierto(false)}
                className="p-1 hover:rotate-90 transition-transform cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--color-ink)] font-bold">
              Se va a registrar la entrega del pedido <strong>{pedidoSeleccionado.numero}</strong> para <strong>{pedidoSeleccionado.cliente_nombre}</strong>.
            </p>

            {pedidoSeleccionado.saldo_pendiente > 0 ? (
              <div className="bg-amber-50 border-2 border-amber-300 p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-amber-900">Saldo a Cobrar:</span>
                  <span className="text-lg font-black text-amber-900">
                    S/ {pedidoSeleccionado.saldo_pendiente.toFixed(2)}
                  </span>
                </div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-muted)]">
                  Medio de Pago del Saldo
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['EFECTIVO', 'YAPE', 'TARJETA'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoCobroSaldo(m)}
                      className={`py-2 text-[10px] font-black uppercase border border-[var(--color-ink)] transition-colors cursor-pointer ${
                        metodoCobroSaldo === m
                          ? 'bg-[var(--color-ink)] text-white shadow-[2px_2px_0_0_black]'
                          : 'bg-white text-[var(--color-ink)] hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border-2 border-emerald-300 p-3 text-xs font-bold text-emerald-800">
                El pedido ya fue pagado en su totalidad (Saldo: S/ 0.00). Solo confirme la entrega física.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalEntregaAbierto(false)}
                className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEntregarPedido}
                disabled={procesandoAccion}
                className="flex-1 py-2.5 border-2 border-[var(--color-ink)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_0_black] cursor-pointer"
              >
                {procesandoAccion ? 'Registrando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
