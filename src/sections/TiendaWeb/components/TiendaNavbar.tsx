import React from 'react';
import { ShoppingBag, Search, ShoppingCart, MapPin, Phone, Lock, X } from 'lucide-react';
import type { TiendaEmpresaConfig } from '../types';

interface TiendaNavbarProps {
  empresa: TiendaEmpresaConfig;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  totalItemsCarrito: number;
  totalMontoCarrito: number;
  onAbrirCarrito: () => void;
  onIrAlSistema?: () => void;
  ocultarPrecios: boolean;
}

export const TiendaNavbar: React.FC<TiendaNavbarProps> = ({
  empresa,
  busqueda,
  onBusquedaChange,
  totalItemsCarrito,
  totalMontoCarrito,
  onAbrirCarrito,
  onIrAlSistema,
  ocultarPrecios,
}) => {
  return (
    <header id="tienda-navbar" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      {/* Barra superior de información */}
      <div className="bg-gray-900 text-gray-300 text-[11px] px-3 py-1.5 font-sans">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Tienda Abierta para Pedidos
            </span>
            {empresa.direccion && (
              <span className="hidden sm:inline-flex items-center gap-1 text-gray-400 truncate max-w-xs">
                <MapPin size={12} /> {empresa.direccion}
              </span>
            )}
            {empresa.telefono && (
              <span className="hidden md:inline-flex items-center gap-1 text-gray-400">
                <Phone size={12} /> {empresa.telefono}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onIrAlSistema}
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Acceso para personal de la tienda"
            >
              <Lock size={11} /> Acceso Personal
            </button>
          </div>
        </div>
      </div>

      {/* Barra principal de navegación */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6">
        {/* Logo e Identidad */}
        <div className="flex items-center gap-3 shrink-0">
          {empresa.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={empresa.nombre_empresa}
              className="w-10 h-10 object-contain rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              <ShoppingBag size={20} />
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-none uppercase">
              {empresa.nombre_empresa || 'Tienda Web'}
            </h1>
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
              Catálogo Oficial • Pedidos por WhatsApp
            </span>
          </div>
        </div>

        {/* Buscador Central (en PC destacado, en móvil compacto) */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <input
              id="buscador-tienda-web"
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Buscar por producto, marca o categoría..."
              className="w-full pl-10 pr-9 py-2 bg-gray-100 hover:bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 rounded-full border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm transition-all outline-none"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            {busqueda && (
              <button
                onClick={() => onBusquedaChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Botón Carrito de Compras */}
        <button
          id="btn-abrir-carrito-navbar"
          onClick={onAbrirCarrito}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <div className="relative">
            <ShoppingCart size={18} />
            {totalItemsCarrito > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 text-gray-950 font-black text-[10px] flex items-center justify-center ring-2 ring-emerald-600 animate-pulse">
                {totalItemsCarrito}
              </span>
            )}
          </div>
          <span className="hidden sm:inline font-sans">
            {totalItemsCarrito === 0 ? 'Carrito Vacío' : `Carrito (${totalItemsCarrito})`}
          </span>
          {!ocultarPrecios && totalMontoCarrito > 0 && (
            <span className="hidden lg:inline font-mono font-bold pl-1 border-l border-emerald-500">
              S/ {totalMontoCarrito.toFixed(2)}
            </span>
          )}
        </button>
      </div>

      {/* Buscador para móviles (abajo de la barra en celulares) */}
      <div className="px-3 pb-3 md:hidden">
        <div className="relative">
          <input
            id="buscador-tienda-web-movil"
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-9 pr-8 py-2 bg-gray-100 text-gray-900 rounded-full border border-gray-200 text-xs outline-none focus:border-emerald-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {busqueda && (
            <button
              onClick={() => onBusquedaChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
