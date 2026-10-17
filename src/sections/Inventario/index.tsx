import { traerTodo } from '../../utils/traerTodo';
import { coincideBusqueda } from '../../utils/busqueda';
import React, { useState, useEffect, useMemo } from 'react';
import { Package, Layers, Box, AlertTriangle, LayoutGrid, Plus, Database, Activity, Users } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { usePermiso, avisarSinPermiso } from '../../utils/permisos';
import { useConexion } from '../../layout/BarraConexion';
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
  // Permisos de almacén (el servidor también los exige)
  const puedeEditarProductos = usePermiso('almacen_crear_editar_productos');
  const puedeEliminarProductos = usePermiso('almacen_eliminar_productos');
  const puedeIngresarLotes = usePermiso('almacen_ingresar_lotes');
  const puedeProveedores = usePermiso('almacen_gestionar_proveedores');
  const { enLinea } = useConexion(); // sin internet, Inventario es solo para ver
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
          traerTodo(() => supabase.from('products').select('*').eq('is_active', 1).order('id')),
          traerTodo(() => supabase.from('batches').select('id, product_id, quantity, cost_unit').order('id')),
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

  const handleViewHistory = (item: any) => {
    const nombre = item.product_name || item.name || '';
    setVistaActiva('LOTES');
    setSearchQuery(nombre);

    // 🛡️ EVICAMP: Enfocar el buscador de inmediato con el texto seleccionado, listo para navegar
    setTimeout(() => {
      const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const lowStockCount = products.filter(p => p.unit !== 'CONSUMO' && p.quantity <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.quantity), 0);

  // Auto-Focus Magnet para Inventario (Foco inicial en buscador)
  useEffect(() => {
    const isModalOpenActive = isModalOpen || isModalLoteOpen || isModalProveedoresOpen;
    const enforceFocus = () => {
      if (isModalOpenActive || document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) return;
      const active = document.activeElement;

      // 🛡️ NO SECUESTRAR FOCO SI EL SIDEBAR ESTÁ ABIERTO
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const activeTag = active?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'SELECT' || active?.getAttribute('role') === 'button') return;

      const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    const forceMountFocus = () => {
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      if (!isModalOpenActive && !document.querySelector('.fixed.inset-0.z-50')) {
        const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleWindowFocus = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    const timer = setTimeout(forceMountFocus, 100);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
      clearTimeout(timer);
    };
  }, [isModalOpen, isModalLoteOpen, isModalProveedoresOpen]);

  // Navegación de Grilla con Teclado (Patrón Selector de Evicamp)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abortar si hay modal abierto
      if (isModalOpen || isModalLoteOpen || isModalProveedoresOpen || document.querySelector('.fixed.inset-0.z-50')) return;

      const active = document.activeElement as HTMLElement;

      // 🛡️ PRIORIDAD DEL SIDEBAR: Si el sidebar está abierto o el foco está en el menú lateral, Inventario no interfiere
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') {
        return;
      }
      if (active && (active.id === 'evicamp-sidebar' || active.closest('#evicamp-sidebar') || sidebar?.contains(active))) {
        return;
      }

      // Ignorar si el foco o target es un campo de texto / input
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const rowSelector = 'div[data-row="true"][role="button"]';
      const currentRow = active ? (active.closest(rowSelector) as HTMLElement) : null;
      // La paginación con id es la de Productos: en la vista Lotes está escondida y no se puede enfocar
      const visible = (el: HTMLElement | null) => (el && !el.closest('.hidden') && el.offsetParent !== null ? el : null);

      const getRows = () => {
        return Array.from(document.querySelectorAll(rowSelector))
          .filter((el): el is HTMLElement => {
            const htmlEl = el as HTMLElement;
            return !htmlEl.closest('.hidden');
          });
      };

      if (currentRow) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          const rows = getRows();
          const rowIndex = rows.indexOf(currentRow);

          if (e.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) {
              nextRow.focus();
              nextRow.scrollIntoView({ block: 'nearest' });
            } else {
              // Última fila: bajar a la paginación inferior o superior
              const btnNext = visible(document.getElementById('btn-pag-bottom-next-inventario')) || visible(document.getElementById('btn-pag-bottom-next-lotes'))
                || visible(document.getElementById('btn-pag-next-inventario')) || visible(document.getElementById('btn-pag-next-lotes'));
              const btnPrev = visible(document.getElementById('btn-pag-bottom-prev-inventario')) || visible(document.getElementById('btn-pag-bottom-prev-lotes'))
                || visible(document.getElementById('btn-pag-prev-inventario')) || visible(document.getElementById('btn-pag-prev-lotes'));
              if (btnNext && btnNext.getAttribute('aria-disabled') !== 'true') {
                btnNext.focus();
              } else if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
                btnPrev.focus();
              } else {
                (btnNext || btnPrev)?.focus();
              }
            }
          } else if (e.key === 'ArrowUp') {
            // Si hay una fila previa, subir a ella
            if (rowIndex > 0) {
              const prevRow = rows[rowIndex - 1];
              if (prevRow) {
                prevRow.focus();
                prevRow.scrollIntoView({ block: 'nearest' });
              }
            } else {
              // Fila 0 (primera fila): SUBIR A LA PAGINACIÓN SUPERIOR
              const btnPrev = visible(document.getElementById('btn-pag-prev-inventario')) || visible(document.getElementById('btn-pag-prev-lotes'));
              const btnNext = visible(document.getElementById('btn-pag-next-inventario')) || visible(document.getElementById('btn-pag-next-lotes'));
              if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
                btnPrev.focus();
              } else if (btnNext) {
                btnNext.focus();
              } else if (btnPrev) {
                btnPrev.focus();
              } else {
                const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            // Navegación horizontal DENTRO de la fila (hacia botones de acción)
            const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll('button:not([disabled])'))] as HTMLElement[];
            const focusIndex = focusables.indexOf(active);

            if (e.key === 'ArrowRight') {
              const nextTarget = focusables[focusIndex + 1];
              if (nextTarget) nextTarget.focus();
            } else if (e.key === 'ArrowLeft') {
              const prevTarget = focusables[focusIndex - 1];
              if (prevTarget) prevTarget.focus();
            }
          }
        } else if (e.key === 'Escape') {
          // Escape en la fila sube al buscador y lo selecciona
          const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
          }
        }
      } else {
        // 🛡️ RESCATE DE FOCO PERDIDO: Si el foco quedó en document.body o fuera de la grilla
        if (e.key === 'ArrowUp') {
          // 🛡️ TOPE: Si el foco está en un botón o control superior, actuar como límite y no devolver el foco abajo
          if (active && (active.tagName === 'BUTTON' || active.closest('button'))) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const rows = getRows();
          if (rows.length > 0) {
            rows[0].focus();
            rows[0].scrollIntoView({ block: 'nearest' });
          } else {
            const searchInput = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
            if (searchInput) searchInput.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, isModalLoteOpen, isModalProveedoresOpen, vistaActiva, refreshLotesKey]);

  return (
    <div className="flex flex-col gap-6 pb-10 text-[var(--color-ink)] font-mono h-full bg-[var(--color-bg)] relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-[var(--color-surface)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        </div>
      )}
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
                id="btn-tab-productos"
                onClick={() => setVistaActiva('PRODUCTOS')} 
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-tab-lotes')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('buscador-global-inventario')?.focus();
                  }
                }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${vistaActiva === 'PRODUCTOS' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}`}
              >
                <Package size={14} /> Productos
              </button>
              <button 
                id="btn-tab-lotes"
                onClick={() => setVistaActiva('LOTES')} 
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-tab-productos')?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-nuevo-producto')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('buscador-global-inventario')?.focus();
                  }
                }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer border-l-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${vistaActiva === 'LOTES' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}`}
              >
                <Layers size={14} /> Lotes
              </button>
            </div>
          </div>

          {/* LADO DERECHO: METRICAS Y BOTONES DE ACCIÓN */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 lg:gap-6 w-full xl:w-auto pb-1 pr-1">
            

            {/* Botones de Acción */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 shrink-0">
              <button
                id="btn-nuevo-producto"
                onClick={() => (puedeEditarProductos ? setIsModalOpen(true) : avisarSinPermiso('crear productos'))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-tab-lotes')?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-ingresar-lote')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('filtro-categoria-inventario')?.focus();
                  }
                }}
                className="bg-[var(--color-accent)] text-[var(--color-ink)] px-1 sm:px-4 lg:px-6 py-3 lg:py-4 min-w-0 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-normal sm:tracking-widest flex items-center justify-center gap-1 sm:gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> Producto
              </button>
              <button
                id="btn-ingresar-lote"
                onClick={() => (puedeIngresarLotes ? setIsModalLoteOpen(true) : avisarSinPermiso('ingresar lotes'))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-nuevo-producto')?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-proveedores')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('filtro-estado-inventario')?.focus();
                  }
                }}
                className="bg-[var(--color-ink)] text-[var(--color-accent)] px-1 sm:px-4 lg:px-6 py-3 lg:py-4 min-w-0 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-normal sm:tracking-widest flex items-center justify-center gap-1 sm:gap-2 hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-accent)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Database size={16} /> <span className="hidden sm:inline">Ingresar</span> Lote
              </button>
              <button
                id="btn-proveedores"
                onClick={() => (puedeProveedores ? setIsModalProveedoresOpen(true) : avisarSinPermiso('gestionar proveedores'))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-ingresar-lote')?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('filtro-orden-inventario')?.focus();
                  }
                }}
                className="bg-[var(--color-bg)] text-[var(--color-info)] px-1 sm:px-4 lg:px-6 py-3 lg:py-4 min-w-0 border-2 border-[var(--color-info)] font-black text-[10px] lg:text-xs uppercase tracking-normal sm:tracking-widest flex items-center justify-center gap-1 sm:gap-2 hover:bg-[var(--color-info)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-info)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Users size={16} className="shrink-0" /> <span className="truncate">Proveedores</span>
              </button>
            </div>
          </div>
        </div>

      {!enLinea && (
        <div role="status" className="mx-2 sm:mx-8 px-3 py-2 border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] font-mono text-xs font-bold">
          🔌 SIN INTERNET: Inventario es solo para ver. No edites productos ni ingreses lotes hasta que vuelva la conexión (las mermas sí se pueden registrar).
        </div>
      )}

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
    if (!puedeEditarProductos) { avisarSinPermiso('editar productos'); return; }
    setProductToEdit(p);
    setIsModalOpen(true);
  }}
  onDeleteProduct={async (productToDelete) => {
    if (!puedeEliminarProductos) { avisarSinPermiso('eliminar productos'); return; }
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
    handleViewHistory(producto);
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
            onViewHistory={(lote) => {
              handleViewHistory(lote);
            }}
            onEditLote={(lote) => {
              if (!puedeIngresarLotes) { avisarSinPermiso('editar lotes'); return; }
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