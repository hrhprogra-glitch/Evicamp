import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../db/supabase';
import type { TiendaEmpresaConfig, TiendaProducto, TiendaVariante, ItemCarrito, TiendaStore } from './types';
import { TiendaNavbar } from './components/TiendaNavbar';
import { TiendaCategorias } from './components/TiendaCategorias';
import { TiendaProductoCard } from './components/TiendaProductoCard';
import { TiendaCarritoDrawer } from './components/TiendaCarritoDrawer';
import { TiendaModalPedido } from './components/TiendaModalPedido';
import { coincideBusqueda } from '../../utils/busqueda';
import { ShoppingBag, Loader2, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';

interface TiendaWebProps {
  onIrAlSistema?: () => void;
}

export const TiendaWeb: React.FC<TiendaWebProps> = ({ onIrAlSistema }) => {
  const [empresa, setEmpresa] = useState<TiendaEmpresaConfig>({
    nombre_empresa: 'Tienda Oficial',
    catalogo_activo: true,
    catalogo_ocultar_precios: false,
    catalogo_mensaje_bienvenida: '¡Bienvenido a nuestra Tienda Web!',
  });
  const [tiendas, setTiendas] = useState<TiendaStore[]>([]);
  const [productos, setProductos] = useState<TiendaProducto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Estados de interacción
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODOS');
  const [carrito, setCarrito] = useState<ItemCarrito[]>(() => {
    try {
      const guardado = localStorage.getItem('siumax_tienda_carrito');
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [isCarritoOpen, setIsCarritoOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Guardar carrito en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('siumax_tienda_carrito', JSON.stringify(carrito));
    } catch {
      /* sin almacenamiento */
    }
  }, [carrito]);

  // Cargar catálogo público desde PostgREST RPC
  useEffect(() => {
    const fetchCatalogo = async () => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const { data, error } = await supabase.rpc('fn_catalogo_publico', {});
        if (error) throw error;

        if (data) {
          if (data.empresa) setEmpresa(data.empresa);
          if (data.tiendas) setTiendas(data.tiendas);
          if (data.productos) setProductos(data.productos);

          // Extraer nombres de categorías únicas
          const catsUnicas = Array.from(
            new Set((data.productos || []).map((p: TiendaProducto) => p.category).filter(Boolean))
          ) as string[];
          setCategorias(catsUnicas);
        }
      } catch (err: any) {
        console.error('Error al cargar catálogo de Tienda Web:', err);
        setErrorCarga('No se pudo conectar con la tienda. Por favor intenta de nuevo.');
      } finally {
        setCargando(false);
      }
    };

    fetchCatalogo();
  }, []);

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      // Filtro por categoría
      if (categoriaSeleccionada !== 'TODOS' && p.category !== categoriaSeleccionada) {
        return false;
      }

      // Filtro por búsqueda
      if (busqueda.trim()) {
        const textoBusqueda = `${p.name} ${p.marca || ''} ${p.modelo || ''} ${p.category} ${p.code || ''} ${p.barcode || ''}`;
        if (!coincideBusqueda(textoBusqueda, busqueda)) {
          return false;
        }
      }

      return true;
    });
  }, [productos, categoriaSeleccionada, busqueda]);

  // Totales del carrito
  const totalArticulos = carrito.reduce((acc, it) => acc + it.cantidad, 0);
  const totalMonto = carrito.reduce(
    (acc, it) => acc + (it.precioUnitario * it.cantidad),
    0
  );

  const handleAgregarAlCarrito = (
    producto: TiendaProducto,
    variante: TiendaVariante | null,
    cantidad: number
  ) => {
    const precio = variante ? Number(variante.price || producto.price) : Number(producto.price);

    setCarrito((prev) => {
      const idx = prev.findIndex(
        (it) => it.producto.id === producto.id && it.variante?.id === variante?.id
      );

      if (idx >= 0) {
        const nuevo = [...prev];
        nuevo[idx] = {
          ...nuevo[idx],
          cantidad: nuevo[idx].cantidad + cantidad,
        };
        return nuevo;
      } else {
        return [
          ...prev,
          {
            producto,
            variante,
            cantidad,
            precioUnitario: precio,
          },
        ];
      }
    });
  };

  const handleCambiarCantidad = (index: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((it, idx) => {
          if (idx !== index) return it;
          const nuevaCant = it.cantidad + delta;
          return nuevaCant > 0 ? { ...it, cantidad: nuevaCant } : null;
        })
        .filter(Boolean) as ItemCarrito[]
    );
  };

  const handleEliminarItem = (index: number) => {
    setCarrito((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVaciarCarrito = () => {
    setCarrito([]);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 font-sans text-gray-700">
          <Loader2 size={24} className="animate-spin text-emerald-600" />
          <span className="text-sm font-bold uppercase tracking-wider">
            Cargando Tienda Web...
          </span>
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-200 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-amber-500" />
          <h2 className="text-base font-bold text-gray-900 uppercase">
            No se pudo cargar la Tienda
          </h2>
          <p className="text-xs text-gray-500">{errorCarga}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header & Barra de Navegación */}
      <TiendaNavbar
        empresa={empresa}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        totalItemsCarrito={totalArticulos}
        totalMontoCarrito={totalMonto}
        onAbrirCarrito={() => setIsCarritoOpen(true)}
        onIrAlSistema={onIrAlSistema}
        ocultarPrecios={empresa.catalogo_ocultar_precios}
      />

      {/* 2. Hero Banner de Bienvenida */}
      {empresa.catalogo_mensaje_bienvenida && (
        <section className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-6 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest block mb-1">
                Catálogo en Línea y Pedidos Directos
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                {empresa.catalogo_mensaje_bienvenida}
              </h2>
            </div>
            {empresa.catalogo_whatsapp && (
              <a
                href={`https://api.whatsapp.com/send?phone=51${empresa.catalogo_whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent('¡Hola! Me gustaría hacer una consulta.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Consultar por WhatsApp</span>
                <ArrowRight size={14} />
              </a>
            )}
          </div>
        </section>
      )}

      {/* 3. Barra de Categorías */}
      <TiendaCategorias
        categorias={categorias}
        categoriaSeleccionada={categoriaSeleccionada}
        onSelectCategoria={setCategoriaSeleccionada}
        totalProductos={productos.length}
      />

      {/* 4. Vitrina de Productos (Catálogo) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 flex-1 w-full">
        {productosFiltrados.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-gray-200 p-8">
            <ShoppingBag size={40} className="mx-auto text-gray-300" />
            <h3 className="text-base font-bold text-gray-800 uppercase">
              No se encontraron productos
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {busqueda
                ? `No hay coincidencias para "${busqueda}". Prueba con otra palabra clave.`
                : 'No hay productos disponibles en esta categoría por el momento.'}
            </p>
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Limpiar Buscador
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {productosFiltrados.map((prod) => (
              <TiendaProductoCard
                key={prod.id}
                producto={prod}
                ocultarPrecios={empresa.catalogo_ocultar_precios}
                onAgregarAlCarrito={handleAgregarAlCarrito}
              />
            ))}
          </div>
        )}
      </main>

      {/* Barra Flotante Inferior en Móviles cuando hay items en carrito */}
      {totalArticulos > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <button
            id="btn-carrito-flotante-movil"
            onClick={() => setIsCarritoOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-sm cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center text-xs font-black">
                {totalArticulos}
              </div>
              <span className="uppercase text-xs tracking-wider">Ver Mi Carrito</span>
            </div>
            {!empresa.catalogo_ocultar_precios && (
              <span className="font-mono font-black text-base">
                S/ {totalMonto.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 5. Cajón de Carrito (Sidebar Drawer) */}
      <TiendaCarritoDrawer
        isOpen={isCarritoOpen}
        onClose={() => setIsCarritoOpen(false)}
        items={carrito}
        onCambiarCantidad={handleCambiarCantidad}
        onEliminarItem={handleEliminarItem}
        onVaciarCarrito={handleVaciarCarrito}
        onProcederAlPago={() => {
          setIsCarritoOpen(false);
          setIsCheckoutOpen(true);
        }}
        ocultarPrecios={empresa.catalogo_ocultar_precios}
      />

      {/* 6. Modal de Checkout / Envío por WhatsApp */}
      <TiendaModalPedido
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={carrito}
        empresa={empresa}
        onPedidoCompletado={() => {
          setCarrito([]);
        }}
        ocultarPrecios={empresa.catalogo_ocultar_precios}
      />

      {/* 7. Footer Oficial */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 text-center text-xs text-gray-500 font-sans mt-auto">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-bold text-gray-700 uppercase">
            {empresa.nombre_empresa} • Todos los derechos reservados
          </p>
          {empresa.direccion && <p>{empresa.direccion}</p>}
          <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
            Powered by SiuMax Comerc — Tienda Web Oficial
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TiendaWeb;
