import React, { useEffect } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Plus, Minus } from 'lucide-react';
import type { ItemCarrito } from '../types';
import { iniciales, nombreBonito, soles, tonoCategoria } from '../formato';

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
  // Escape cierra el carrito
  useEffect(() => {
    if (!isOpen) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalMonto = items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);
  const totalArticulos = items.reduce((acc, it) => acc + it.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" />

      <aside id="drawer-carrito-tienda" className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col tienda-entrar-derecha">
        <div className="px-5 h-16 flex items-center justify-between border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-extrabold text-gray-900">
            Tu pedido {totalArticulos > 0 && <span className="text-gray-400 font-semibold">· {totalArticulos}</span>}
          </h2>
          <button onClick={onClose} aria-label="Cerrar carrito" className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Tu carrito está vacío</h3>
              <p className="text-sm text-gray-500 max-w-xs">Agrega productos del catálogo y envía tu pedido por WhatsApp.</p>
              <button onClick={onClose} className="mt-1 px-5 h-10 rounded-full bg-gray-900 text-white text-sm font-semibold cursor-pointer">
                Ver productos
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it, idx) => {
                const tono = tonoCategoria(it.producto.category);
                return (
                  <li key={idx} className="py-3.5 first:pt-0 flex gap-3">
                    <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-gray-100" style={{ background: it.producto.image_url ? '#fff' : tono.fondo }}>
                      {it.producto.image_url ? (
                        <img src={it.producto.image_url} alt={it.producto.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg font-extrabold" style={{ color: tono.letra }}>{iniciales(it.producto.name)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{nombreBonito(it.producto.name)}</h4>
                        {!ocultarPrecios && (
                          <span className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">{soles(it.precioUnitario * it.cantidad)}</span>
                        )}
                      </div>
                      {it.variante && (
                        <p className="text-xs text-gray-500">{it.variante.nombre_variante || it.variante.talla}</p>
                      )}
                      {!ocultarPrecios && <p className="text-xs text-gray-400 tabular-nums">{soles(it.precioUnitario)} c/u</p>}

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center h-8 rounded-full border border-gray-200">
                          <button type="button" aria-label="Quitar uno" onClick={() => onCambiarCantidad(idx, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 cursor-pointer">
                            <Minus size={14} />
                          </button>
                          <span className="min-w-6 text-center text-sm font-bold tabular-nums">{it.cantidad}</span>
                          <button type="button" aria-label="Agregar uno" onClick={() => onCambiarCantidad(idx, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 cursor-pointer">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button type="button" onClick={() => onEliminarItem(idx)} title="Quitar del carrito" aria-label="Quitar del carrito" className="w-8 h-8 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 pt-4 pb-5 border-t border-gray-100 bg-gray-50/80 space-y-3 shrink-0">
            {!ocultarPrecios && (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Envío</span>
                  <span>Se coordina por WhatsApp</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-gray-900 tabular-nums">{soles(totalMonto)}</span>
                </div>
              </div>
            )}
            <button
              id="btn-proceder-pedido-web"
              type="button"
              onClick={onProcederAlPago}
              className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
            >
              Continuar pedido <ArrowRight size={18} />
            </button>
            <button type="button" onClick={onVaciarCarrito} className="w-full text-sm text-gray-400 hover:text-red-600 cursor-pointer">
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
