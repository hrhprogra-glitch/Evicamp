import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../db/supabase';
import type { TiendaEmpresaConfig, TiendaProducto, TiendaVariante, ItemCarrito, TiendaStore } from './types';
import { TiendaNavbar } from './components/TiendaNavbar';
import { TiendaCategorias } from './components/TiendaCategorias';
import { TiendaProductoCard } from './components/TiendaProductoCard';
import { TiendaCarritoDrawer } from './components/TiendaCarritoDrawer';
import { TiendaModalPedido } from './components/TiendaModalPedido';
import { coincideBusqueda } from '../../utils/busqueda';
import { numeroWhatsapp, soles } from './formato';
import { ShoppingBag, Loader2, AlertCircle, MapPin, Phone, MessageCircle, Lock, SearchX, ChevronRight } from 'lucide-react';

interface TiendaWebProps {
  onIrAlSistema?: () => void;
}

// Stock máximo que se puede pedir de un producto (o de su opción elegida).
const stockDe = (producto: TiendaProducto, variante: TiendaVariante | null | undefined) =>
  variante ? Number(variante.stock || 0) : Number(producto.stock_disponible || 0);

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

  // La tienda es una página para los CLIENTES del negocio: no usa el tema (oscuro, colores) que el
  // dueño eligió para su sistema en esta computadora. Se quita mientras la tienda está abierta.
  // Va en un setTimeout porque App aplica el tema guardado en su propio efecto, que corre DESPUÉS de este.
  useEffect(() => {
    const html = document.documentElement;
    let tema: string | null = null;
    let monocromo = false;
    const t = setTimeout(() => {
      tema = html.getAttribute('data-theme');
      monocromo = html.classList.contains('theme-monochrome');
      html.removeAttribute('data-theme');
      html.classList.remove('theme-monochrome');
    }, 0);
    return () => {
      clearTimeout(t);
      if (tema) html.setAttribute('data-theme', tema);
      if (monocromo) html.classList.add('theme-monochrome');
    };
  }, []);

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

  // Filtrado de productos (los destacados primero)
  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p) => {
        if (categoriaSeleccionada !== 'TODOS' && p.category !== categoriaSeleccionada) return false;
        if (busqueda.trim()) {
          const textoBusqueda = `${p.name} ${p.marca || ''} ${p.modelo || ''} ${p.category} ${p.code || ''} ${p.barcode || ''}`;
          if (!coincideBusqueda(textoBusqueda, busqueda)) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.destacado) - Number(a.destacado));
  }, [productos, categoriaSeleccionada, busqueda]);

  // Totales del carrito
  const totalArticulos = carrito.reduce((acc, it) => acc + it.cantidad, 0);
  const totalMonto = carrito.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);

  const cantidadEnCarrito = (productoId: number, varianteId: number | null) =>
    carrito.find((it) => it.producto.id === productoId && (it.variante?.id ?? null) === varianteId)?.cantidad || 0;

  // Suma o resta desde la tarjeta del producto (sin pasar el stock disponible).
  const handleCambiarProducto = (producto: TiendaProducto, variante: TiendaVariante | null, delta: number) => {
    const precio = variante ? Number(variante.price || producto.price) : Number(producto.price);
    const tope = stockDe(producto, variante);
    setCarrito((prev) => {
      const idx = prev.findIndex((it) => it.producto.id === producto.id && (it.variante?.id ?? null) === (variante?.id ?? null));
      if (idx < 0) {
        return delta > 0 && tope > 0 ? [...prev, { producto, variante, cantidad: Math.min(delta, tope), precioUnitario: precio }] : prev;
      }
      const nuevaCant = Math.min(prev[idx].cantidad + delta, tope);
      if (nuevaCant <= 0) return prev.filter((_, i) => i !== idx);
      const nuevo = [...prev];
      nuevo[idx] = { ...nuevo[idx], cantidad: nuevaCant };
      return nuevo;
    });
  };

  // Suma o resta desde el carrito (por posición)
  const handleCambiarCantidad = (index: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((it, idx) => {
          if (idx !== index) return it;
          const nuevaCant = Math.min(it.cantidad + delta, Math.max(stockDe(it.producto, it.variante), it.cantidad));
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

  const telefonoWhatsapp = numeroWhatsapp(empresa.catalogo_whatsapp, empresa.telefono);
  const linkWhatsapp = telefonoWhatsapp
    ? `https://api.whatsapp.com/send?phone=${telefonoWhatsapp}&text=${encodeURIComponent('¡Hola! Me gustaría hacer una consulta.')}`
    : '';
  const direccion = empresa.direccion || tiendas[0]?.direccion || '';
  const telefonoVisible = empresa.telefono || tiendas[0]?.telefono || '';

  if (cargando) {
    return (
      <div className="tienda-web min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={22} className="animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Cargando tienda…</span>
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="tienda-web min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">No se pudo cargar la tienda</h2>
          <p className="text-sm text-gray-500">{errorCarga}</p>
          <button onClick={() => window.location.reload()} className="px-6 h-11 bg-gray-900 text-white rounded-full text-sm font-semibold cursor-pointer">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hayFiltro = Boolean(busqueda.trim()) || categoriaSeleccionada !== 'TODOS';

  return (
    <div className="tienda-web min-h-screen bg-[#F6F7F9] flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-white">
      {/* 1. Barra superior: logo, buscador y carrito */}
      <TiendaNavbar
        empresa={empresa}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        totalItemsCarrito={totalArticulos}
        totalMontoCarrito={totalMonto}
        onAbrirCarrito={() => setIsCarritoOpen(true)}
        ocultarPrecios={empresa.catalogo_ocultar_precios}
      />

      {/* 2. Bienvenida (se oculta mientras el cliente busca, para que vea los resultados enseguida) */}
      {!busqueda.trim() && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-4 py-4 sm:px-8 sm:py-8">
            <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10" aria-hidden />
            <div className="absolute right-24 -bottom-20 w-40 h-40 rounded-full bg-white/5" aria-hidden />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-3xl font-extrabold leading-tight tracking-tight">
                  {empresa.catalogo_mensaje_bienvenida || `Bienvenido a ${empresa.nombre_empresa}`}
                </h2>
                <p className="hidden sm:block mt-1.5 text-base text-emerald-50/90">
                  Elige tus productos y envía tu pedido por WhatsApp. Recojo en tienda o delivery.
                </p>
                {(direccion || telefonoVisible) && (
                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-emerald-50/90">
                    {direccion && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {direccion}</span>}
                    {telefonoVisible && <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {telefonoVisible}</span>}
                  </div>
                )}
              </div>
              {linkWhatsapp && (
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 self-start sm:self-auto inline-flex items-center gap-2 h-9 sm:h-11 px-4 sm:px-5 rounded-full bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle size={18} /> Escríbenos
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Categorías */}
      {productos.length > 0 && (
        <div className="pt-4 sm:pt-6">
          <TiendaCategorias
            categorias={categorias}
            categoriaSeleccionada={categoriaSeleccionada}
            onSelectCategoria={setCategoriaSeleccionada}
            totalProductos={productos.length}
          />
        </div>
      )}

      {/* 4. Vitrina de productos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-28 md:pb-12 flex-1 w-full">
        {productos.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-gray-200/80">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag size={30} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Muy pronto verás nuestros productos aquí</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">Mientras tanto, escríbenos y te ayudamos con tu pedido.</p>
            {linkWhatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-emerald-600 text-white font-bold text-sm">
                <MessageCircle size={18} /> Escribir por WhatsApp
              </a>
            )}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="py-14 px-6 text-center bg-white rounded-3xl border border-gray-200/80">
            <SearchX size={36} className="mx-auto text-gray-300" />
            <h3 className="mt-3 text-base font-bold text-gray-900">
              {busqueda ? `No encontramos "${busqueda}"` : 'No hay productos en esta categoría'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Prueba con otra palabra o mira todo el catálogo.</p>
            <button
              onClick={() => { setBusqueda(''); setCategoriaSeleccionada('TODOS'); }}
              className="mt-4 h-10 px-5 rounded-full bg-gray-900 text-white text-sm font-semibold cursor-pointer"
            >
              Ver todo
            </button>
          </div>
        ) : (
          <>
            {hayFiltro && (
              <p className="mb-3 text-sm text-gray-500">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
              {productosFiltrados.map((prod) => (
                <TiendaProductoCard
                  key={prod.id}
                  producto={prod}
                  ocultarPrecios={empresa.catalogo_ocultar_precios}
                  cantidadEnCarrito={(varianteId) => cantidadEnCarrito(prod.id, varianteId)}
                  onCambiarCantidad={handleCambiarProducto}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Barra flotante del carrito en celulares */}
      {totalArticulos > 0 && !isCarritoOpen && !isCheckoutOpen && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            id="btn-carrito-flotante-movil"
            onClick={() => setIsCarritoOpen(true)}
            className="w-full h-14 pl-2 pr-5 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-900/20 flex items-center justify-between cursor-pointer active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">{totalArticulos}</span>
              <span className="text-sm font-semibold">Ver mi pedido</span>
            </span>
            <span className="flex items-center gap-1 font-bold tabular-nums">
              {!empresa.catalogo_ocultar_precios && soles(totalMonto)}
              <ChevronRight size={18} />
            </span>
          </button>
        </div>
      )}

      {/* 5. Carrito */}
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

      {/* 6. Datos del cliente y envío por WhatsApp */}
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

      {/* 7. Pie de página */}
      <footer className="bg-white border-t border-gray-200/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-bold text-gray-900">{empresa.nombre_empresa}</p>
            {direccion && <p className="text-gray-500 flex items-center gap-1.5"><MapPin size={14} /> {direccion}</p>}
            {telefonoVisible && <p className="text-gray-500 flex items-center gap-1.5"><Phone size={14} /> {telefonoVisible}</p>}
          </div>
          <div className="flex flex-col sm:items-end gap-2 text-xs text-gray-400">
            {onIrAlSistema && (
              <button onClick={onIrAlSistema} title="Acceso para el personal de la tienda" className="inline-flex items-center gap-1 hover:text-gray-700 cursor-pointer">
                <Lock size={12} /> Acceso del personal
              </button>
            )}
            <span>Tienda hecha con SiuMax Comerc</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TiendaWeb;
