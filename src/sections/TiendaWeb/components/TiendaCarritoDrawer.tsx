import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';
import type { ItemCarrito } from '../types';

interface TiendaCarritoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onCambiarCantidad: (index: number, delta: number) => void;
  onEliminarItem: (index: number) => void;
  onVaciarCarrito: () => void;
  onProcederAlPago: () => void;
  ocultarPrecios: boolean;
}

export const TiendaCarritoDrawer: React.FC<TiendaCarritoDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onCambiarCantidad,
  onEliminarItem,
  onVaciarCarrito,
  onProcederAlPago,
  ocultarPrecios,
}) => {
  if (!isOpen) return null;

  const totalMonto = items.reduce(
    (acc, it) => acc + (it.precioUnitario * it.cantidad),
    0
  );
  const totalArticulos = items.reduce((acc, it) => acc + it.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div id="drawer-carrito-tienda" className="w-screen max-w-md bg-white shadow-2xl flex flex-col font-sans">
          {/* Header Carrito */}
          <div className="p-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Tu Carrito de Compras ({totalArticulos})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lista de Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="text-sm font-bold text-gray-800 uppercase">
                  Tu carrito está vacío
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Agrega productos de nuestro catálogo para armar tu pedido y solicitarlo por WhatsApp.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  Ver Catálogo
                </button>
              </div>
            ) : (
              items.map((it, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-start gap-3">
                  {/* Foto miniatura o placeholder */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                    {it.producto.image_url ? (
                      <img
                        src={it.producto.image_url}
                        alt={it.producto.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ShoppingBag size={20} className="text-gray-400" />
                    )}
                  </div>

                  {/* Detalle */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 uppercase truncate">
                      {it.producto.name}
                    </h4>
                    {it.variante && (
                      <span className="text-[11px] text-gray-500 font-medium block">
                        Opción: {it.variante.nombre_variante || it.variante.talla}
                      </span>
                    )}
                    {!ocultarPrecios && (
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        S/ {it.precioUnitario.toFixed(2)} c/u
                      </span>
                    )}

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-gray-50 text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => onCambiarCantidad(idx, -1)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 text-gray-700 font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">
                          {it.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => onCambiarCantidad(idx, 1)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 text-gray-700 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEliminarItem(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Quitar del carrito"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal del item */}
                  {!ocultarPrecios && (
                    <div className="text-right shrink-0 font-mono font-bold text-sm text-gray-900">
                      S/ {(it.precioUnitario * it.cantidad).toFixed(2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer con Resumen y Checkout */}
          {items.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
              {!ocultarPrecios && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold">S/ {totalMonto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Envío</span>
                    <span className="text-emerald-700 font-bold">A coordinar por WhatsApp</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                    <span>Total Estimado</span>
                    <span className="font-mono font-black text-lg text-emerald-700">
                      S/ {totalMonto.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onVaciarCarrito}
                  className="px-3 py-2.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-xl transition-colors cursor-pointer"
                >
                  Vaciar
                </button>
                <button
                  id="btn-proceder-pedido-web"
                  type="button"
                  onClick={onProcederAlPago}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
                >
                  <span>Continuar Pedido</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
