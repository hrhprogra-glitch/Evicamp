import React, { useState, useEffect, useMemo } from 'react';
import { Package, Layers, Box, AlertTriangle, LayoutGrid } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Product } from './types';

// Componentes importados
import { HeaderInventario } from './components/HeaderInventario';
import { FiltrosInventario } from './components/FiltrosInventario';
import { TablaProductos } from './components/TablaProductos';
import { ModalProducto } from './components/ModalProducto';
import { TablaLotes } from './components/TablaLotes';
import { ModalMerma } from './components/ModalMerma';
import { TarjetaMetrica } from './components/TarjetaMetrica';
import { ModalLote } from './components/ModalLote';

interface InventarioProps {
  onNavigate?: (view: string) => void;
}
export const Inventario: React.FC<InventarioProps> = ({ onNavigate }) => {
  const [vistaActiva, setVistaActiva] = useState<'PRODUCTOS' | 'LOTES'>('PRODUCTOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMermaOpen, setIsModalMermaOpen] = useState(false);
  const [isModalLoteOpen, setIsModalLoteOpen] = useState(false); // <-- ESTADO DEL NUEVO MODAL
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [preselectedLoteProduct, setPreselectedLoteProduct] = useState<Product | null>(null);
  const [nuevoLoteRealtime, setNuevoLoteRealtime] = useState<any>(null);
  const [loteToEdit, setLoteToEdit] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DE LOS FILTROS
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroOrden, setFiltroOrden] = useState('NOMBRE_ASC');

  // ESTADO DE LA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50; // <--- Cortamos de 50 en 50

  // Reiniciar a la página 1 si el usuario usa un filtro o busca algo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filtroCategoria, filtroEstado, filtroOrden]);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        
        if (data) {
          const mapeados: Product[] = data.map((p: any) => {
            // RADAR ABSOLUTO: Convierte TODA la fila del producto (todas sus columnas) a texto mayúscula
            const registroCompleto = JSON.stringify(p).toUpperCase();
            
            // Si en cualquier rincón del producto dice alguna de estas palabras, es Consumo.
            const esConsumo = registroCompleto.includes('"CONSUMO"') || 
                              registroCompleto.includes('"SERVICE"') || 
                              registroCompleto.includes('"USO INTERNO"') ||
                              registroCompleto.includes('"CONSUMPTION"');

            return {
              id: p.id,
              name: p.name || 'SIN NOMBRE',
              price: Number(p.price) || 0,
              cost: Number(p.cost_price) || 0,
              quantity: Number(p.quantity) || 0,
              minStock: Number(p.min_stock) || 0,
              code: p.code || 'NO-SKU',
              barcode: p.barcode || '',
              category: p.category || 'GENERAL',
              // Si el radar detectó consumo, fuerza la etiqueta, sino usa la que traiga de BD
              unit: esConsumo ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
              imageUrl: p.image_url || p.image_path || null
            };
          });
          setProducts(mapeados);
        }
      } catch (error) {
        console.error("Error cargando inventario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const categoriasUnicas = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [products]);

  // LÓGICA MAESTRA DE FILTRADO Y ORDENAMIENTO
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim(); // <-- Limpiamos espacios basura
      result = result.filter(p => {
        if (!p) return false;
        const name = String(p.name || '').toLowerCase();
        const code = String(p.code || '').toLowerCase();
        return name.includes(query) || code.includes(query);
      });
    }

    if (filtroCategoria) {
      result = result.filter(p => p.category === filtroCategoria);
    }

    if (filtroEstado === 'CON_STOCK') {
      result = result.filter(p => p.quantity > 0);
    } else if (filtroEstado === 'SIN_STOCK') {
      result = result.filter(p => p.quantity <= 0);
    } else if (filtroEstado === 'CRITICO') {
      result = result.filter(p => p.unit !== 'CONSUMO' && p.quantity <= p.minStock && p.quantity > 0);
    }

    result.sort((a, b) => {
      if (filtroOrden === 'NOMBRE_ASC') return a.name.localeCompare(b.name);
      if (filtroOrden === 'NOMBRE_DESC') return b.name.localeCompare(a.name);
      if (filtroOrden === 'STOCK_ASC') return a.quantity - b.quantity;
      if (filtroOrden === 'STOCK_DESC') return b.quantity - a.quantity;
      if (filtroOrden === 'PRECIO_ASC') return a.price - b.price;
      if (filtroOrden === 'PRECIO_DESC') return b.price - a.price;
      return 0;
    });

    return result;
  }, [products, searchQuery, filtroCategoria, filtroEstado, filtroOrden]);

  // === MATEMÁTICA DE LA PAGINACIÓN ===
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setFiltroCategoria('');
    setFiltroEstado('');
    setFiltroOrden('NOMBRE_ASC');
  };

  const lowStockCount = products.filter(p => p.unit !== 'CONSUMO' && p.quantity <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.quantity), 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10 text-[#1E293B] font-mono h-full bg-white relative z-0">
      
      <HeaderInventario 
        onIngresoStock={() => setIsModalLoteOpen(true)} 
        onNuevoSKU={() => setIsModalOpen(true)}
        onRegistrarMerma={() => setIsModalMermaOpen(true)}
      />

      <div className="px-8 shrink-0 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="flex border-2 border-[#1E293B] p-0.5 bg-[#F8FAFC]">
          <button onClick={() => setVistaActiva('PRODUCTOS')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer ${vistaActiva === 'PRODUCTOS' ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'}`}>
            <Package size={14} /> Inventario General
          </button>
          <button onClick={() => setVistaActiva('LOTES')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer ${vistaActiva === 'LOTES' ? 'bg-[#1E293B] text-[#10B981]' : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'}`}>
            <Layers size={14} /> Control de Lotes
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 custom-scrollbar">
          <TarjetaMetrica label="Total SKUs" value={products.length} icon={<Box size={14}/>} />
          <TarjetaMetrica label="Nivel Crítico" value={lowStockCount} icon={<AlertTriangle size={14}/>} isAlert={lowStockCount > 0} />
          <TarjetaMetrica label="Valor Total" value={`S/ ${totalValue.toFixed(2)}`} icon={<LayoutGrid size={14}/>} isGreen />
        </div>
      </div>

      <FiltrosInventario 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        matchCount={filteredProducts.length}
        categorias={categoriasUnicas}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        filtroOrden={filtroOrden}
        setFiltroOrden={setFiltroOrden}
        onClearFilters={handleClearFilters}
      />

      <div className="flex-1 px-8 min-h-0 flex flex-col relative pb-8">
        <div className={`flex-1 min-h-0 ${vistaActiva === 'PRODUCTOS' ? 'flex flex-col' : 'hidden'}`}>
          {/* PASAMOS LOS DATOS PAGINADOS A LA TABLA */}
          <TablaProductos 
  loading={loading} 
  productos={paginatedProducts} 
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
  onEditProduct={(p) => {
    setProductToEdit(p);
    setIsModalOpen(true);
  }}
  onDeleteProduct={(productToDelete) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));
  }}
  // === NUEVA CONEXIÓN AQUÍ ===
  onViewHistory={(producto) => {
    setVistaActiva('LOTES'); // Cambia a la pestaña de Lotes
    setSearchQuery(producto.name); // Busca automáticamente el nombre del producto
  }}
  // ===========================
/>
        </div>
        <div className={`flex-1 min-h-0 ${vistaActiva === 'LOTES' ? 'flex flex-col' : 'hidden'}`}>
          <TablaLotes 
            searchQuery={searchQuery}
            filtroCategoria={filtroCategoria}
            filtroEstado={filtroEstado}
            filtroOrden={filtroOrden}
            nuevoLoteInyectado={nuevoLoteRealtime}
            onViewMermas={() => {
              if (onNavigate) onNavigate('mermas'); // VIAJA AL MÓDULO MERMAS
            }}
            onEditLote={(lote) => {
              setLoteToEdit(lote);
              setIsModalLoteOpen(true);
            }}
          />
        </div>
      </div>

      <ModalProducto 
        isOpen={isModalOpen} 
        initialData={productToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setProductToEdit(null);
        }} 
        onGoToLotes={(productoRecienCreado) => {
          setIsModalOpen(false);
          setProductToEdit(null);
          setVistaActiva('LOTES');
          
          // Si nos llega un producto, lo metemos en memoria y abrimos el modal de Lotes
          if (productoRecienCreado) {
            setPreselectedLoteProduct(productoRecienCreado);
            setIsModalLoteOpen(true);
          }
        }}
        onProductSaved={(nuevoProducto: any) => {
          // RADAR DE IMAGEN: Forzamos a que el frontend reciba la URL correcta al instante
          const imagenAlInstante = nuevoProducto.imageUrl || nuevoProducto.image_url || nuevoProducto.image_path || null;

          if (productToEdit) {
            // MODO EDICIÓN
            setProducts(prev => prev.map(p => p.id === productToEdit.id ? { ...p, ...nuevoProducto, imageUrl: imagenAlInstante } : p));
          } else {
            // MODO CREACIÓN
            setProducts(prev => [{ ...nuevoProducto, imageUrl: imagenAlInstante }, ...prev]);
            setCurrentPage(1);
          }
        }}
      />
      <ModalMerma isOpen={isModalMermaOpen} onClose={() => setIsModalMermaOpen(false)} productos={products} />
      {/* INVOCACIÓN DEL NUEVO MODAL DE LOTES */}
      <ModalLote 
        isOpen={isModalLoteOpen} 
        onClose={() => {
          setIsModalLoteOpen(false);
          setPreselectedLoteProduct(null);
          setLoteToEdit(null); // <-- LIMPIAR MEMORIA
        }} 
        productos={products} 
        initialProduct={preselectedLoteProduct}
        initialLote={loteToEdit} // <-- PASAMOS EL LOTE A EDITAR
        onLoteSaved={(lote) => {
          setNuevoLoteRealtime(lote); // Guardamos el lote para inyectarlo/actualizarlo
          setLoteToEdit(null); // Limpiar memoria tras guardar
          // Si fue una edición, no borramos la búsqueda para que no se pierda el contexto
          if (!loteToEdit) setSearchQuery(''); 
        }}
      />
    </div>
  );
};