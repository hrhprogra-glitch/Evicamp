import React, { useState } from 'react';
import { Plus, Minus, Star } from 'lucide-react';
import type { TiendaProducto, TiendaVariante } from '../types';
import { iniciales, nombreBonito, soles, tonoCategoria } from '../formato';

interface TiendaProductoCardProps {
  producto: TiendaProducto;
  ocultarPrecios: boolean;
  /** Cuántas unidades de este producto (y de la opción elegida) ya hay en el carrito. */
  cantidadEnCarrito: (varianteId: number | null) => number;
  /** Suma (+1) o resta (-1) en el carrito; con 0 el producto sale del carrito. */
  onCambiarCantidad: (producto: TiendaProducto, variante: TiendaVariante | null, delta: number) => void;
}

export const TiendaProductoCard: React.FC<TiendaProductoCardProps> = ({
  producto,
  ocultarPrecios,
  cantidadEnCarrito,
  onCambiarCantidad,
}) => {
  const tieneVariantes = Boolean(producto.variantes && producto.variantes.length > 0);
  const [variante, setVariante] = useState<TiendaVariante | null>(tieneVariantes ? producto.variantes![0] : null);
  const [fotoRota, setFotoRota] = useState(false);

  const stock = variante ? Number(variante.stock || 0) : Number(producto.stock_disponible || 0);
  const precio = variante ? Number(variante.price || producto.price) : Number(producto.price);
  const agotado = stock <= 0;
  const enCarrito = cantidadEnCarrito(variante?.id ?? null);
  const tono = tonoCategoria(producto.category);
  const unidad = producto.unit && producto.unit !== 'UND' ? producto.unit.toLowerCase() : '';

  return (
    <article className="group bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/60 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Foto, o un recuadro de color con las iniciales si el producto no tiene foto */}
      <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden" style={producto.image_url && !fotoRota ? { background: '#fff' } : { background: tono.fondo }}>
        {producto.image_url && !fotoRota ? (
          <img
            src={producto.image_url}
            alt={producto.name}
            loading="lazy"
            onError={() => setFotoRota(true)}
            className={`w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105 ${agotado ? 'opacity-50 grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl sm:text-5xl font-extrabold tracking-tight select-none" style={{ color: tono.letra, opacity: agotado ? 0.4 : 0.85 }}>
              {iniciales(producto.name)}
            </span>
          </div>
        )}

        {producto.destacado && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-gray-900 shadow-sm">
            <Star size={11} fill="currentColor" /> Destacado
          </span>
        )}
        {agotado ? (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-[11px] font-bold bg-gray-900/80 text-white">Agotado</span>
        ) : stock <= 5 ? (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
            ¡Quedan {Number(stock.toFixed(2))}!
          </span>
        ) : null}
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-gray-400 truncate">
            {producto.marca ? nombreBonito(producto.marca) : nombreBonito(producto.category)}
          </p>
          <h3 className="mt-0.5 text-sm sm:text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5em]">
            {nombreBonito(producto.name)}
          </h3>
        </div>

        {/* Opciones (tallas, colores...) */}
        {tieneVariantes && (
          <div className="flex flex-wrap gap-1.5">
            {producto.variantes!.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariante(v)}
                className={`px-2.5 h-7 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  variante?.id === v.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                } ${Number(v.stock || 0) <= 0 ? 'line-through opacity-50' : ''}`}
              >
                {v.nombre_variante || v.talla || v.color || `Opción ${v.id}`}
              </button>
            ))}
          </div>
        )}

        {/* Precio y botón */}
        <div className="mt-auto pt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div className="min-w-0">
            {ocultarPrecios ? (
              <span className="text-xs font-semibold text-emerald-700 leading-tight block">Precio por WhatsApp</span>
            ) : (
              <p className="text-gray-900 leading-none whitespace-nowrap">
                <span className="text-lg sm:text-xl font-extrabold tabular-nums">{soles(precio)}</span>
                {unidad && <span className="text-xs text-gray-400 font-medium"> /{unidad}</span>}
              </p>
            )}
          </div>

          {enCarrito > 0 ? (
            <div className="shrink-0 flex items-center justify-between h-9 rounded-full bg-emerald-600 text-white">
              <button type="button" aria-label="Quitar uno" onClick={() => onCambiarCantidad(producto, variante, -1)} className="w-9 h-9 flex items-center justify-center cursor-pointer active:scale-90">
                <Minus size={15} strokeWidth={2.5} />
              </button>
              <span className="min-w-5 text-center text-sm font-bold tabular-nums">{enCarrito}</span>
              <button
                type="button"
                aria-label="Agregar uno"
                disabled={enCarrito >= stock}
                onClick={() => onCambiarCantidad(producto, variante, 1)}
                className="w-9 h-9 flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={agotado}
              onClick={() => onCambiarCantidad(producto, variante, 1)}
              aria-label={`Agregar ${producto.name}`}
              className="btn-agregar-carrito shrink-0 flex items-center justify-center gap-1 h-9 pl-2.5 pr-3.5 rounded-full text-sm font-semibold transition-colors cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{agotado ? 'Agotado' : 'Agregar'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
