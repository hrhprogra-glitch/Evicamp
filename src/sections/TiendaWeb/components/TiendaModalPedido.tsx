import React, { useState } from 'react';
import { X, Send, CheckCircle2, ShoppingBag, MapPin, Phone, User, Bike, Store as StoreIcon, Loader2 } from 'lucide-react';
import type { ItemCarrito, TiendaEmpresaConfig } from '../types';
import { supabase } from '../../../db/supabase';

interface TiendaModalPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  empresa: TiendaEmpresaConfig;
  onPedidoCompletado: () => void;
  ocultarPrecios: boolean;
}

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
  const [pedidoExitoso, setPedidoExitoso] = useState<any | null>(null);

  if (!isOpen) return null;

  const totalMonto = items.reduce(
    (acc, it) => acc + (it.precioUnitario * it.cantidad),
    0
  );

  const handleEnviarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }
    if (!telefono.trim()) {
      alert('Por favor ingresa tu número de WhatsApp para contactarte');
      return;
    }
    if (tipoEntrega === 'DELIVERY' && !direccion.trim()) {
      alert('Por favor ingresa tu dirección para el delivery');
      return;
    }

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

      // 1. Guardar pedido en el sistema
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

      // 2. Construir mensaje estructurado para WhatsApp
      let msg = `¡Hola *${empresa.nombre_empresa || 'Tienda'}*! 👋\n`;
      msg += `Quiero confirmar el siguiente pedido desde su *Tienda Web*:\n\n`;
      msg += `📦 *Pedido:* #${numeroPedido}\n`;
      msg += `👤 *Cliente:* ${nombre.trim()}\n`;
      msg += `📞 *WhatsApp:* ${telefono.trim()}\n`;
      msg += `🚚 *Entrega:* ${tipoEntrega === 'DELIVERY' ? `Delivery (${direccion.trim()})` : 'Recojo en Tienda'}\n\n`;
      msg += `📋 *Productos solicitados:*\n`;

      items.forEach((it) => {
        const descVariante = it.variante ? ` (${it.variante.nombre_variante || it.variante.talla})` : '';
        const precioTxt = !ocultarPrecios ? ` - S/ ${(it.precioUnitario * it.cantidad).toFixed(2)}` : '';
        msg += `• ${it.cantidad}x ${it.producto.name}${descVariante}${precioTxt}\n`;
      });

      if (!ocultarPrecios) {
        msg += `\n💰 *Total Estimado:* S/ ${totalMonto.toFixed(2)}\n`;
      }

      if (notas.trim()) {
        msg += `📝 *Nota:* ${notas.trim()}\n`;
      }

      msg += `\n¡Quedo a la espera de su confirmación! Muchas gracias.`;

      // 3. Abrir WhatsApp
      const rawPhone = empresa.catalogo_whatsapp || empresa.telefono || '987654321';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const phoneFinal = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
      const urlWhatsapp = `https://api.whatsapp.com/send?phone=${phoneFinal}&text=${encodeURIComponent(msg)}`;

      window.open(urlWhatsapp, '_blank');

      setPedidoExitoso({
        numero: numeroPedido,
        cliente: nombre.trim(),
        total: totalMonto,
      });

      onPedidoCompletado();
    } catch (err: any) {
      console.error('Error al registrar pedido web:', err);
      alert('Ocurrió un error al procesar el pedido: ' + (err.message || 'Error'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div id="modal-pedido-tienda"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {pedidoExitoso ? '¡Pedido Registrado con Éxito!' : 'Finalizar Pedido por WhatsApp'}
            </h2>
          </div>
          <button
            id="btn-cerrar-modal-pedido"
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {pedidoExitoso ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">
                  ¡Gracias por tu pedido, {pedidoExitoso.cliente}!
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Tu orden ha sido registrada con el código:
                </p>
                <div className="inline-block mt-2 px-4 py-1.5 bg-gray-900 text-emerald-400 font-mono font-black text-lg rounded-xl tracking-wider">
                  #{pedidoExitoso.numero}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <Send size={14} /> Tu mensaje ha sido enviado a WhatsApp
                </p>
                <p className="text-gray-600 font-sans">
                  Nuestro personal ya tiene tu pedido en pantalla y te responderá en breve para coordinar el despacho.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Volver a la Tienda
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnviarPedido} className="space-y-4 text-xs font-sans">
              <p className="text-gray-500">
                Completa tus datos para enviar tu pedido directamente al WhatsApp de la tienda:
              </p>

              {/* Nombre */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Tu Nombre y Apellidos <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    id="input-pedido-nombre"
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Número de WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    id="input-pedido-telefono"
                    placeholder="Ej. 987654321"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Modalidad de Entrega */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1.5">
                  Modalidad de Entrega
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-entrega-recojo"
                    type="button"
                    onClick={() => setTipoEntrega('RECOJO')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      tipoEntrega === 'RECOJO'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <StoreIcon size={18} className={tipoEntrega === 'RECOJO' ? 'text-emerald-600' : 'text-gray-400'} />
                    <div>
                      <span className="block font-bold text-xs uppercase">Recojo en Tienda</span>
                      <span className="text-[10px] text-gray-500">Pasa por el local</span>
                    </div>
                  </button>

                  <button
                    id="btn-entrega-delivery"
                    type="button"
                    onClick={() => setTipoEntrega('DELIVERY')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      tipoEntrega === 'DELIVERY'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Bike size={18} className={tipoEntrega === 'DELIVERY' ? 'text-emerald-600' : 'text-gray-400'} />
                    <div>
                      <span className="block font-bold text-xs uppercase">Envío a Domicilio</span>
                      <span className="text-[10px] text-gray-500">Delivery coordinado</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dirección (si es delivery) */}
              {tipoEntrega === 'DELIVERY' && (
                <div className="animate-in fade-in">
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Dirección de Entrega y Referencia <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      id="input-pedido-direccion"
                      placeholder="Ej. Av. Las Flores 456, dpto 302 (Frente al parque)"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none"
                    />
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Notas opcionales */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Instrucciones o Notas Especiales (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. Pagaré con billete de 100, llamar al llegar..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Botón de Enviar Pedido a WhatsApp */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Procesando Pedido...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Enviar Pedido por WhatsApp
                    </>
                  )}
                </button>
                <span className="block text-center text-[11px] text-gray-400 mt-2 font-sans">
                  Se abrirá WhatsApp con el resumen listo para enviar.
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
