import { coincideBusqueda } from '../../utils/busqueda';
import React, { useState, useEffect, useMemo } from 'react';
import { Package, Layers, Box, AlertTriangle, LayoutGrid, Plus, Database, Activity, Users } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Product } from './types';

// Componentes importados
import { FiltrosInventario } from './components/FiltrosInventario';
import { TablaProductos } from './components/TablaProductos';
import { ModalProducto } from './components/ModalProducto';
import { TablaLotes } from './components/TablaLotes';
import { ModalGestionProveedores } from './components/ModalGestionProveedores';
import { ModalLote } from './components/ModalLote';

interface InventarioProps {
  onNavigate?: (view: string) => void;
}
export const Inventario: React.FC<InventarioProps> = ({ onNavigate }) => {
  const [vistaActiva, setVistaActiva] = useState<'PRODUCTOS' | 'LOTES'>('PRODUCTOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalProveedoresOpen, setIsModalProveedoresOpen] = useState(false);
  const [mermaAEditar, setMermaAEditar] = useState<any>(null);
  const [isModalLoteOpen, setIsModalLoteOpen] = useState(false); // <-- ESTADO DEL NUEVO MODAL
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [preselectedLoteProduct, setPreselectedLoteProduct] = useState<Product | null>(null);
  const [nuevoLoteRealtime, setNuevoLoteRealtime] = useState<any>(null);
  const [loteToEdit, setLoteToEdit] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbCategories, setDbCategories] = useState<string[]>([]); // 🔥 NUEVO: Memoria para tu tabla categories
  const [refreshLotesKey, setRefreshLotesKey] = useState(0); // 🛡️ EVICAMP: Llave maestra para forzar actualización de Lotes

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
        // [ RETORNO TÉCNICO ]: Consultas paralelas independientes para blindar la carga de datos y evitar colisiones SQL
        const [ 
          { data: productsData, error: productsError }, 
          { data: batchesData, error: batchesError },
          { data: catData, error: catError } // 🔥 NUEVO: Traemos tu tabla
        ] = await Promise.all([
          // 🛡️ EVICAMP: Solo descargar productos activos para evitar productos fantasma
          supabase.from('products').select('*').eq('is_active', 1).limit(15000),
          supabase.from('batches').select('id, product_id, quantity, cost_unit').limit(15000),
          supabase.from('categories').select('name') // 🔥 CONEXIÓN A TU TABLA
        ]);

        if (productsError) throw productsError;
        if (batchesError) throw batchesError;
        if (catError) console.error("Error cargando categorías:", catError); // 🔥 NUEVO: Ahora sí leemos el error

        if (catData) {
          setDbCategories(catData.map((c: any) => c.name?.trim().toUpperCase()).filter(Boolean));
        }
        
        if (productsData) {
          const mapeados: Product[] = productsData.map((p: any) => {
            // RADAR ABSOLUTO: Convierte TODA la fila del producto (todas sus columnas) a texto mayúscula
            const registroCompleto = JSON.stringify(p).toUpperCase();
            
            // Si en cualquier rincón del producto dice alguna de estas palabras, es Consumo.
            const esConsumo = registroCompleto.includes('"CONSUMO"') || 
                              registroCompleto.includes('"SERVICE"') || 
                              registroCompleto.includes('"USO INTERNO"') ||
                              registroCompleto.includes('"CONSUMPTION"');

            // [ SUMA GLOBAL ]: Filtramos los lotes de este producto
            const lotesDelProducto = batchesData?.filter(b => b.product_id === p.id) || [];
            
            // [ COSTO RECIENTE ]: Ordenamos por ID de forma NUMÉRICA para obtener el costo del lote más nuevo.
            // 🚨 CORRECCIÓN: Antes se comparaban los IDs como texto (localeCompare), lo que hacía que
            // lotes antiguos con ID corto (ej. "947") se leyeran como "mayores" que lotes nuevos con
            // ID largo tipo timestamp (ej. "1785512128146"), tomando costos viejos e incorrectos.
            const loteMasReciente = lotesDelProducto.length > 0
              ? [...lotesDelProducto].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]
              : null;
            // [ RETORNO TÉCNICO ]: Si el producto tiene seguimiento por lotes, la suma debe ser 0 si no hay lotes.
            // Solo mostramos p.quantity si el producto es de "Consumo" o no usa lotes.
            const stockRealGlobal = lotesDelProducto.length > 0
              ? lotesDelProducto.reduce((total: number, lote: any) => total + (Number(lote.quantity) || 0), 0)
              : 0; // <--- Cambiamos el fallback a 0

            return {
              id: p.id,
              name: p.name || 'SIN NOMBRE',
              price: Number(p.price) || 0,
              // Usamos el costo del lote reciente, si no hay, usamos el del producto
              cost: loteMasReciente ? Number(loteMasReciente.cost_unit) : (Number(p.cost_price) || 0),
              quantity: stockRealGlobal,
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
    // 🔥 Mezclamos las que ya tienen productos con TODAS las de tu tabla
    return Array.from(new Set([...cats, ...dbCategories])).sort();
  }, [products, dbCategories]);

  // LÓGICA MAESTRA DE FILTRADO Y ORDENAMIENTOñ
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery && searchQuery.trim()) {
      result = result.filter(p => {
        if (!p) return false;
        return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
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
    <div className="flex flex-col gap-6 pb-10 text-[var(--color-ink)] font-mono h-full bg-[var(--color-bg)] relative">
      
      
        {/* ENCABEZADO UNIFICADO NEOBRUTALISTA */}
        <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] p-4 sm:p-6 lg:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shrink-0">
          
          {/* LADO IZQUIERDO: TITULO Y SWITCH */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 w-full xl:w-auto">
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
                <Package size={20} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
                  Inventario
                </h1>
              </div>
            </div>

            {/* Switch de Vista */}
            <div className="flex border-2 border-[var(--color-ink)] bg-[var(--color-bg)] shadow-[4px_4px_0_0_var(--color-ink)] shrink-0 w-full md:w-auto">
              <button 
                onClick={() => setVistaActiva('PRODUCTOS')} 
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer ${vistaActiva === 'PRODUCTOS' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}`}
              >
                <Package size={14} /> Productos
              </button>
              <button 
                onClick={() => setVistaActiva('LOTES')} 
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer border-l-2 border-[var(--color-ink)] ${vistaActiva === 'LOTES' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}`}
              >
                <Layers size={14} /> Lotes
              </button>
            </div>
          </div>

          {/* LADO DERECHO: METRICAS Y BOTONES DE ACCIÓN */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 lg:gap-6 w-full xl:w-auto pb-1 pr-1">
            

            {/* Botones de Acción */}
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[var(--color-accent)] text-[var(--color-ink)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> Producto
              </button>
              <button
                onClick={() => setIsModalLoteOpen(true)}
                className="bg-[var(--color-ink)] text-[var(--color-accent)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-accent)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Database size={16} /> <span className="hidden sm:inline">Ingresar</span> Lote
              </button>
              <button
                onClick={() => setIsModalProveedoresOpen(true)}
                className="bg-[var(--color-bg)] text-[var(--color-info)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-info)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-info)] hover:text-white transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-info)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Users size={16} /> Proveedores
              </button>
            </div>
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

      <div className="px-3 sm:px-6 lg:px-8 flex flex-col relative pb-3 sm:pb-6 lg:pb-8">
        <div className={`${vistaActiva === 'PRODUCTOS' ? 'flex flex-col' : 'hidden'}`}>
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
  onDeleteProduct={async (productToDelete) => {
    // 1. EJECUCIÓN DEL PROCEDIMIENTO ALMACENADO EN POSTGRESQL (RPC)
    // Conectamos con el nombre exacto de tu función SQL y blindamos el ID
    const { error } = await supabase.rpc('fn_soft_delete_product', {
      p_product_id: String(productToDelete.id),
      p_user_name: 'Admin'
    });

    if (error) {
      console.error("Error técnico de BD (Evicamp):", error);
      alert("⚠️ Fallo crítico: No se pudo retirar el producto.");
      return;
    }

    // 2. ACTUALIZACIÓN VISUAL INMEDIATA (Latencia 0ms)
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));
    
    // 3. 🛡️ EVICAMP: Recarga táctica de TablaLotes para eliminar los lotes del producto
    setRefreshLotesKey(prev => prev + 1);
  }}
  // === NUEVA CONEXIÓN AQUÍ ===
  onViewHistory={(producto) => {
    setVistaActiva('LOTES'); // Cambia a la pestaña de Lotes
    setSearchQuery(producto.name); // Busca automáticamente el nombre del producto
  }}
  // ===========================
/>
        </div>
        <div className={`${vistaActiva === 'LOTES' ? 'flex flex-col' : 'hidden'}`}>
          <TablaLotes 
            key={refreshLotesKey} // 🛡️ EVICAMP: Al cambiar esta variable, React destruye y vuelve a crear la tabla fresca
            searchQuery={searchQuery}
            filtroCategoria={filtroCategoria}
            filtroEstado={filtroEstado}
            filtroOrden={filtroOrden}
            nuevoLoteInyectado={nuevoLoteRealtime}
            onViewMermas={(_lote) => {
              // Aquí podrías filtrar las mermas por ese lote específico si lo deseas
              if (onNavigate) onNavigate('mermas');
            }}
            onEditLote={(lote) => {
              setLoteToEdit(lote);
              setIsModalLoteOpen(true);
            }}
            // [ RETORNO TÉCNICO ]: Si se borra un lote, actualizamos la memoria de productos
            onLoteDeleted={(productId, quantityRemoved) => {
              setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                  const nuevoStock = Math.max(0, p.quantity - quantityRemoved);
                  return {
                    ...p,
                    quantity: nuevoStock,
                    // Si el stock llega a 0, reseteamos el costo visual para que no confunda
                    cost: nuevoStock === 0 ? 0 : p.cost 
                  };
                }
                return p;
              }));
            }}
          />
        </div>
      </div>

      <ModalProducto 
        isOpen={isModalOpen} 
        initialData={productToEdit}
        productosExistentes={products}
        onClose={() => {
      setIsModalOpen(false);
      setTimeout(() => setProductToEdit(null), 200);
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
          // [ RETORNO TÉCNICO ]: Mapeo de integridad. Si es edición, preservamos el stock calculado actual.
          const stockActual = products.find(p => p.id === nuevoProducto.id)?.quantity;

          const productoFormateado: Product = {
            ...nuevoProducto,
            id: nuevoProducto.id,
            name: nuevoProducto.name,
            cost: Number(nuevoProducto.cost_price || nuevoProducto.cost || 0),
            price: Number(nuevoProducto.price || 0),
            quantity: stockActual !== undefined ? stockActual : Number(nuevoProducto.quantity || 0),
            minStock: Number(nuevoProducto.min_stock || nuevoProducto.minStock || 0),
            category: nuevoProducto.category,
            code: nuevoProducto.code,
            unit: nuevoProducto.unit,
            imageUrl: nuevoProducto.image_url || nuevoProducto.image_path || null
          };

          if (productToEdit) {
            setProducts(prev => prev.map(p => p.id === productToEdit.id ? productoFormateado : p));
            // 🛡️ EVICAMP: Si editamos el producto, forzamos recarga de Lotes para que muestre el nuevo nombre/datos
            setRefreshLotesKey(prev => prev + 1);
          } else {
            setProducts(prev => [productoFormateado, ...prev]);
            setCurrentPage(1);
          }
        }}
      />
      <ModalGestionProveedores isOpen={isModalProveedoresOpen} onClose={() => setIsModalProveedoresOpen(false)} />
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
          setNuevoLoteRealtime(lote);
          setLoteToEdit(null);
          if (!loteToEdit) setSearchQuery(''); 

          // 🛡️ PARCHE EVICAMP: Actualizamos la pantalla al instante tanto para LOTES NUEVOS como para EDICIONES
          const cantidadDiferencia = loteToEdit 
            ? Number(lote.quantity) - Number(loteToEdit.quantity || 0) 
            : Number(lote.initial_quantity || lote.quantity);

          setProducts(prevProducts => prevProducts.map(p => 
            p.id === lote.product_id 
              ? { 
                  ...p, 
                  quantity: Math.max(0, p.quantity + cantidadDiferencia),
                  cost: Number(lote.cost_unit) // <-- ACTUALIZA EL COSTO UNITARIO CON EL DEL NUEVO LOTE
                } 
              : p
          ));
        }}
      />
    </div>
  );
};