import React from 'react';
import { Search, ShoppingBag, X } from 'lucide-react';
import type { TiendaEmpresaConfig } from '../types';
import { iniciales, soles } from '../formato';

interface TiendaNavbarProps {
  empresa: TiendaEmpresaConfig;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  totalItemsCarrito: number;
  totalMontoCarrito: number;
  onAbrirCarrito: () => void;
  ocultarPrecios: boolean;
}

// Buscador reutilizado en PC (dentro de la barra) y en celular (debajo de ella).
const Buscador: React.FC<{ id: string; valor: string; onCambio: (v: string) => void; texto: string }> = ({ id, valor, onCambio, texto }) => (
  <div className="relative">
    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    <input
      id={id}
      type="search"
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      placeholder={texto}
      className="w-full pl-10 pr-9 py-2.5 bg-gray-100 focus:bg-white text-gray-900 placeholder-gray-400 rounded-full border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 text-sm transition-all outline-none"
    />
    {valor && (
      <button
        type="button"
        onClick={() => onCambio('')}
        aria-label="Limpiar búsqueda"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300/70 text-gray-700 flex items-center justify-center cursor-pointer"
      >
        <X size={13} />
      </button>
    )}
  </div>
);

export const TiendaNavbar: React.FC<TiendaNavbarProps> = ({
  empresa,
  busqueda,
  onBusquedaChange,
  totalItemsCarrito,
  totalMontoCarrito,
  onAbrirCarrito,
  ocultarPrecios,
}) => {
  const nombre = empresa.nombre_empresa || 'Tienda';
  return (
    <header id="tienda-navbar" className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 sm:gap-8">
        {/* Logo e identidad del negocio */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt={nombre} className="w-10 h-10 object-contain rounded-xl bg-white border border-gray-200 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-base shrink-0">
              {iniciales(nombre)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight truncate">{nombre}</h1>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 leading-tight">
              <span className="relative flex w-2 h-2 shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate">Recibiendo pedidos por WhatsApp</span>
            </p>
          </div>
        </div>

        {/* Buscador (PC) */}
        <div className="flex-1 max-w-xl hidden md:block">
          <Buscador id="buscador-tienda-web" valor={busqueda} onCambio={onBusquedaChange} texto="Buscar productos, marcas o categorías" />
        </div>

        {/* Carrito */}
        <button
          id="btn-abrir-carrito-navbar"
          onClick={onAbrirCarrito}
          aria-label="Ver carrito"
          className="relative shrink-0 flex items-center gap-2 h-11 pl-3.5 pr-4 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm font-semibold transition-colors cursor-pointer active:scale-95"
        >
          <ShoppingBag size={18} />
          <span className="hidden sm:inline">
            {totalItemsCarrito === 0 ? 'Carrito' : !ocultarPrecios ? soles(totalMontoCarrito) : `Carrito`}
          </span>
          {totalItemsCarrito > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
              {totalItemsCarrito}
            </span>
          )}
        </button>
      </div>

      {/* Buscador (celular) */}
      <div className="px-4 pb-3 md:hidden">
        <Buscador id="buscador-tienda-web-movil" valor={busqueda} onCambio={onBusquedaChange} texto="Buscar productos" />
      </div>
    </header>
  );
};
