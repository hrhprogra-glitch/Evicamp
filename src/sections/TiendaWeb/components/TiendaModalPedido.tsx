import React, { useState } from 'react';
import { X, Send, CheckCircle2, MapPin, Phone, User, Bike, Store as StoreIcon, Loader2, AlertCircle } from 'lucide-react';
import type { ItemCarrito, TiendaEmpresaConfig } from '../types';
import { supabase } from '../../../db/supabase';
import { nombreBonito, numeroWhatsapp, soles } from '../formato';
import { formatearMonto } from '../../../utils/formato';

interface TiendaModalPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  empresa: TiendaEmpresaConfig;
  onPedidoCompletado: () => void;
  ocultarPrecios: boolean;
}

const campo = 'w-full h-12 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all';

export const TiendaModalPedido: React.FC<TiendaModalPedidoProps> = ({
  isOpen,
  onClose,
  items,
  empresa,
  onPedidoCompletado,
  ocultarPrecios,
}) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'RECOJO' | 'DELIVERY'>('RECOJO');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [pedidoExitoso, setPedidoExitoso] = useState<{ numero: string; cliente: string; total: number; whatsapp: boolean } | null>(null);

  if (!isOpen) return null;

  const totalMonto = items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);
  const totalArticulos = items.reduce((acc, it) => acc + it.cantidad, 0);

  const cerrar = () => {
    // Al cerrar después de un pedido exitoso, la ventana queda lista para el siguiente.
    if (pedidoExitoso) setPedidoExitoso(null);
    setAviso('');
    onClose();
  };

  const handleEnviarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setAviso('Escribe tu nombre.');
    if (!telefono.trim()) return setAviso('Escribe tu número de WhatsApp para contactarte.');
    if (tipoEntrega === 'DELIVERY' && !direccion.trim()) return setAviso('Escribe la dirección para el delivery.');
    setAviso('');

    setEnviando(true);
    try {
      const itemsPayload = items.map((it) => ({
        product_id: it.producto.id,
        product_name: it.producto.name,
        variant_id: it.variante?.id || null,
        variant_name: it.variante?.nombre_variante || null,
        cantidad: it.cantidad,
        precio: it.precioUnitario,
      }));

      // 1. Guardar el pedido en el sistema (le aparece al negocio)
      const { data: respPedido, error } = await supabase.rpc('fn_crear_pedido_web', {
        p_cliente_nombre: nombre.trim(),
        p_cliente_telefono: telefono.trim(),
        p_tipo_entrega: tipoEntrega,
        p_direccion: tipoEntrega === 'DELIVERY' ? direccion.trim() : 'Recojo en tienda',
        p_store_id: 1,
        p_items: itemsPayload,
        p_notas: notas.trim() || null,
      });
      if (error) throw error;

      const numeroPedido = respPedido?.numero || 'PED-WEB';

      // 2. Mensaje para WhatsApp
      let msg = `¡Hola *${empresa.nombre_empresa || 'Tienda'}*! 👋\n`;
      msg += `Quiero confirmar el siguiente pedido desde su *Tienda Web*:\n\n`;
      msg += `📦 *Pedido:* #${numeroPedido}\n`;
      msg += `👤 *Cliente:* ${nombre.trim()}\n`;
      msg += `📞 *WhatsApp:* ${telefono.trim()}\n`;
      msg += `🚚 *Entrega:* ${tipoEntrega === 'DELIVERY' ? `Delivery (${direccion.trim()})` : 'Recojo en Tienda'}\n\n`;
      msg += `📋 *Productos solicitados:*\n`;
      items.forEach((it) => {
        const descVariante = it.variante ? ` (${it.variante.nombre_variante || it.variante.talla})` : '';
        const precioTxt = !ocultarPrecios ? ` - S/ ${formatearMonto((it.precioUnitario * it.cantidad))}` : '';
        msg += `• ${it.cantidad}x ${it.producto.name}${descVariante}${precioTxt}\n`;
      });
      if (!ocultarPrecios) msg += `\n💰 *Total Estimado:* S/ ${formatearMonto(totalMonto)}\n`;
      if (notas.trim()) msg += `📝 *Nota:* ${notas.trim()}\n`;
      msg += `\n¡Quedo a la espera de su confirmación! Muchas gracias.`;

      // 3. Abrir WhatsApp del negocio. Si el negocio no configuró su número, NO se inventa uno:
      //    el pedido igual queda guardado en su sistema.
      const telefonoNegocio = numeroWhatsapp(empresa.catalogo_whatsapp, empresa.telefono);
      if (telefonoNegocio) {
        window.open(`https://api.whatsapp.com/send?phone=${telefonoNegocio}&text=${encodeURIComponent(msg)}`, '_blank');
      }

      setPedidoExitoso({ numero: numeroPedido, cliente: nombre.trim(), total: totalMonto, whatsapp: Boolean(telefonoNegocio) });
      onPedidoCompletado();
    } catch (err: any) {
      console.error('Error al registrar pedido web:', err);
      setAviso('No se pudo enviar el pedido. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center sm:p-4">
      <div onClick={cerrar} className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" />
      <div
        id="modal-pedido-tienda"
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] tienda-subir"
      >
        <div className="px-5 sm:px-6 h-16 flex items-center justify-between border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-extrabold text-gray-900">{pedidoExitoso ? '¡Pedido enviado!' : 'Finalizar pedido'}</h2>
          <button id="btn-cerrar-modal-pedido" onClick={cerrar} aria-label="Cerrar" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">
          {pedidoExitoso ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">¡Gracias, {nombreBonito(pedidoExitoso.cliente)}!</h3>
                <p className="text-sm text-gray-500 mt-1">Tu pedido quedó registrado con el código</p>
                <p className="inline-block mt-2 px-4 py-1.5 rounded-full bg-gray-900 text-white font-bold tracking-wide">#{pedidoExitoso.numero}</p>
              </div>
              <p className="text-sm text-gray-600 bg-emerald-50 rounded-2xl p-4 text-left">
                {pedidoExitoso.whatsapp
                  ? 'Se abrió WhatsApp con tu pedido listo. Solo presiona enviar y el negocio te responderá para coordinar.'
                  : 'El negocio ya tiene tu pedido en su sistema y te contactará a tu WhatsApp para coordinar.'}
              </p>
              <button type="button" onClick={cerrar} className="w-full h-12 rounded-full bg-gray-900 text-white font-bold cursor-pointer">
                Volver a la tienda
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnviarPedido} noValidate className="space-y-5">
              {/* Resumen corto */}
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-600">{totalArticulos} {totalArticulos === 1 ? 'producto' : 'productos'}</span>
                {!ocultarPrecios && <span className="font-extrabold text-gray-900 text-base tabular-nums">{soles(totalMonto)}</span>}
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input id="input-pedido-nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={campo} />
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input id="input-pedido-telefono" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu WhatsApp (ej. 987 654 321)" className={campo} />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">¿Cómo lo recibes?</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'btn-entrega-recojo', valor: 'RECOJO', titulo: 'Recojo en tienda', sub: 'Pasas por el local', Icono: StoreIcon },
                    { id: 'btn-entrega-delivery', valor: 'DELIVERY', titulo: 'Delivery', sub: 'Te lo llevamos', Icono: Bike },
                  ] as const).map(({ id, valor, titulo, sub, Icono }) => (
                    <button
                      key={id}
                      id={id}
                      type="button"
                      onClick={() => setTipoEntrega(valor)}
                      className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                        tipoEntrega === valor ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icono size={20} className={tipoEntrega === valor ? 'text-emerald-600' : 'text-gray-400'} />
                      <span>
                        <span className="block text-sm font-bold text-gray-900">{titulo}</span>
                        <span className="block text-xs text-gray-500">{sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {tipoEntrega === 'DELIVERY' && (
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input id="input-pedido-direccion" type="text" autoComplete="street-address" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección y referencia" className={campo} />
                </div>
              )}

              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Nota para el negocio (opcional): pago con S/ 100, llamar al llegar..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none resize-none"
              />

              {aviso && (
                <p className="flex items-center gap-2 text-sm font-medium text-red-700 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="shrink-0" /> {aviso}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full h-13 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-60"
                >
                  {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando…</> : <><Send size={18} /> Enviar pedido por WhatsApp</>}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Se abrirá WhatsApp con tu pedido listo para enviar.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
