import React, { useState } from 'react';
import { Package, Plus, Check, Star, AlertCircle, ShoppingBag } from 'lucide-react';
import type { TiendaProducto, TiendaVariante } from '../types';

interface TiendaProductoCardProps {
  producto: TiendaProducto;
  ocultarPrecios: boolean;
  onAgregarAlCarrito: (producto: TiendaProducto, variante: TiendaVariante | null, cantidad: number) => void;
}

export const TiendaProductoCard: React.FC<TiendaProductoCardProps> = ({
  producto,
  ocultarPrecios,
  onAgregarAlCarrito,
}) => {
  const tieneVariantes = Boolean(producto.variantes && producto.variantes.length > 0);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<TiendaVariante | null>(
    tieneVariantes ? producto.variantes![0] : null
  );
  const [cantidad, setCantidad] = useState(1);
  const [agregadoAnim, setAgregadoAnim] = useState(false);

  const stockActual = tieneVariantes && varianteSeleccionada
    ? Number(varianteSeleccionada.stock || 0)
    : Number(producto.stock_disponible || 0);

  const precioActual = tieneVariantes && varianteSeleccionada
    ? Number(varianteSeleccionada.price || producto.price)
    : Number(producto.price);

  const agotado = stockActual <= 0;

  const handleAgregar = () => {
    if (agotado) return;
    onAgregarAlCarrito(producto, varianteSeleccionada, cantidad);
    setAgregadoAnim(true);
    setTimeout(() => setAgregadoAnim(false), 900);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Imagen / Badge de portada */}
      <div className="relative aspect-4/3 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
        {producto.image_url ? (
          <img
            src={producto.image_url}
            alt={producto.name}
            loading="lazy"
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
            <Package size={32} />
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {producto.destacado && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-gray-950 shadow-xs">
              <Star size={10} fill="currentColor" /> Destacado
            </span>
          )}
          {producto.category && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-900/80 text-white backdrop-blur-xs">
              {producto.category}
            </span>
          )}
        </div>

        {/* Badge Stock */}
        <div className="absolute bottom-2 right-2">
          {agotado ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
              Agotado
            </span>
          ) : stockActual <= 5 ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Últimos {stockActual}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Disponible
            </span>
          )}
        </div>
      </div>

      {/* Contenido / Información */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 font-sans">
        <div>
          {/* Marca / Unidad */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium mb-1">
            <span>{producto.marca || 'Genérico'}</span>
            {producto.unit && <span>{producto.unit}</span>}
          </div>

          {/* Nombre */}
          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors uppercase">
            {producto.name}
          </h3>

          {/* Selector de Variantes (Tallas / Colores) */}
          {tieneVariantes && (
            <div className="mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Elegir Opción / Talla:
              </span>
              <div className="flex flex-wrap gap-1">
                {producto.variantes!.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVarianteSeleccionada(v)}
                    className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      varianteSeleccionada?.id === v.id
                        ? 'bg-gray-900 text-white shadow-xs scale-102'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {v.nombre_variante || v.talla || `Opción ${v.id}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Precio y Acción de Compra */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block">
                {ocultarPrecios ? 'Precio' : 'Precio Unitario'}
              </span>
              {ocultarPrecios ? (
                <span className="text-xs font-bold text-emerald-700">
                  Consultar por WhatsApp
                </span>
              ) : (
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xs font-bold text-gray-500">S/</span>
                  <span className="text-lg font-black text-gray-900 tracking-tight">
                    {precioActual.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Selector de cantidad compacto */}
            {!agotado && (
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 text-gray-700 font-bold"
                >
                  -
                </button>
                <span className="w-7 text-center font-bold text-gray-900">
                  {cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.min(stockActual, c + 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 text-gray-700 font-bold"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Botón Agregar al Carrito */}
          <button
            type="button"
            disabled={agotado}
            onClick={handleAgregar}
            className={`btn-agregar-carrito w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              agotado
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : agregadoAnim
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md active:scale-98'
            }`}
          >
            {agregadoAnim ? (
              <>
                <Check size={14} className="animate-bounce" /> ¡Agregado!
              </>
            ) : (
              <>
                <Plus size={14} /> Agregar al Carrito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
