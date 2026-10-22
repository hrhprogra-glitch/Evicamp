import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Database, Search, Calculator, FileText, Calendar, Loader2, Truck } from 'lucide-react';
import type { Product } from '../types';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { useEmpleado } from '../../../utils/permisos';
interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Product[];
  initialProduct?: Product | null;
  initialLote?: any | null; // <-- NUEVO: EL LOTE A EDITAR
  onLoteSaved?: (lote: any) => void;
}

export const ModalLote: React.FC<Props> = ({ isOpen, onClose, productos, initialProduct, initialLote, onLoteSaved }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false); // <-- NUEVO ESTADO
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cantidad, setCantidad] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [sustento, setSustento] = useState(''); // N° de factura o guía (opcional)
  // Proveedor (opcional): el texto que se ve y, si se eligió de la lista, su id (igual que los lotes de Compras)
  const [proveedor, setProveedor] = useState('');
  const [proveedorId, setProveedorId] = useState<string | null>(null);
  const [expiration, setExpiration] = useState('');
  const empleado = useEmpleado();

  const prodContainerRef = useRef<HTMLDivElement>(null);
  const provContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (prodContainerRef.current && !prodContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (provContainerRef.current && !provContainerRef.current.contains(e.target as Node)) {
        setShowProviderDropdown(false);
      }
    };
    if (showDropdown || showProviderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showProviderDropdown]);

  // Limpiar memoria o Cargar Lote si es modo edición
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setShowDropdown(false);

      if (initialLote) {
        // === MODO EDICIÓN ===
        const prod = productos.find(p => p.id === initialLote.product_id) || null;
        setSelectedProduct(prod);
        setCantidad(initialLote.initial_quantity?.toString() || '');
        
        // Calculamos el costo total reverso (costo_unitario * cantidad_inicial)
        const cTotal = (Number(initialLote.cost_unit) * Number(initialLote.initial_quantity)).toFixed(2);
        setCostoTotal(cTotal);
        
        if (initialLote.document_ref === 'OMITIDO / SIN SUSTENTO' || initialLote.document_ref === 'SIN SUSTENTO') {
          setSustento('');
        } else {
          setSustento(initialLote.document_ref || '');
        }
        setProveedor(initialLote.supplier || '');
        setProveedorId(initialLote.provider_id ? String(initialLote.provider_id) : null);
        setExpiration(initialLote.expiration_date || '');

      } else {
        // === MODO CREACIÓN ===
        setSelectedProduct(initialProduct || null);
        setCantidad('');
        setCostoTotal('');
        setSustento('');
        setProveedor('');
        setProveedorId(null);
        setExpiration('');
      }

      // 🛡️ AUTO-FOCUS INTELIGENTE: Al abrir el modal, enfocar y seleccionar de inmediato el primer campo relevante
      setTimeout(() => {
        if (initialLote || initialProduct) {
          const inputCant = document.getElementById('input-cantidad-lote') as HTMLInputElement | null;
          if (inputCant) {
            inputCant.focus();
            inputCant.select();
          }
        } else {
          const inputBuscar = document.getElementById('input-buscar-producto-lote') as HTMLInputElement | null;
          if (inputBuscar) {
            inputBuscar.focus();
            inputBuscar.select();
          }
        }
      }, 50);
    }
  }, [isOpen, initialProduct, initialLote, productos]);

  // --- NUEVO: CARGAR PROVEEDORES DESDE LA BASE DE DATOS ---
  const [proveedoresActivos, setProveedoresActivos] = useState<any[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      const fetchProveedores = async () => {
        const { data } = await supabase
          .from('providers')
          .select('id, razon_social')
          .eq('estado', 'ACTIVO')
          .order('razon_social');
        if (data) setProveedoresActivos(data);
      };
      fetchProveedores();
    }
  }, [isOpen]);
  // --------------------------------------------------------

  useCerrarConEscape(isOpen, onClose);

  // Focus Trap para ModalLote y Navegación espacial con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 🛡️ RESCATE SI EL FOCO ESTÁ FUERA DEL MODAL
      const isInsideModal = active && active.closest('.fixed.inset-0.z-50');
      if (!isInsideModal) {
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          const target = (document.getElementById('input-cantidad-lote') as HTMLInputElement | null) ||
                         (document.getElementById('input-buscar-producto-lote') as HTMLInputElement | null);
          if (target) {
            target.focus();
            target.select?.();
          }
          return;
        }
      }

      if (e.key === 'Tab') {
        e.stopPropagation();
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled]), textarea, [role="option"]')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el => 
          el.closest('.fixed.inset-0.z-50') && 
          el.tabIndex !== -1 && 
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        if (modalFocusables.length > 0) {
          e.preventDefault();
          const currentIndex = modalFocusables.indexOf(active);
          if (e.shiftKey) {
            const prevIndex = currentIndex <= 0 ? modalFocusables.length - 1 : currentIndex - 1;
            modalFocusables[prevIndex]?.focus();
          } else {
            const nextIndex = currentIndex === -1 || currentIndex >= modalFocusables.length - 1 ? 0 : currentIndex + 1;
            modalFocusables[nextIndex]?.focus();
          }
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        if (active?.id === 'input-buscar-producto-lote' || active?.id === 'btn-cambiar-producto-lote') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-lote')?.focus();
          return;
        }
        if (active?.id === 'input-cantidad-lote') {
          e.preventDefault();
          const target = document.getElementById('btn-cambiar-producto-lote') || document.getElementById('input-buscar-producto-lote');
          target?.focus();
          return;
        }
        if (active?.id === 'input-costo-total-lote') {
          e.preventDefault();
          const target = document.getElementById('btn-cambiar-producto-lote') || document.getElementById('input-buscar-producto-lote');
          target?.focus();
          return;
        }
        if (active?.id === 'input-proveedor-lote') {
          e.preventDefault();
          setShowProviderDropdown(false);
          const target = document.getElementById('input-cantidad-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-sustento-lote') {
          e.preventDefault();
          const target = document.getElementById('input-costo-total-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-vencimiento-lote') {
          e.preventDefault();
          const target = document.getElementById('input-proveedor-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'btn-guardar-lote' || active?.id === 'btn-cancelar-lote') {
          e.preventDefault();
          document.getElementById('input-vencimiento-lote')?.focus();
          return;
        }
      }

      if (e.key === 'ArrowDown') {
        if (active?.id === 'btn-cerrar-modal-lote') {
          e.preventDefault();
          const target = document.getElementById('btn-cambiar-producto-lote') || document.getElementById('input-buscar-producto-lote') || document.getElementById('input-cantidad-lote');
          target?.focus();
          return;
        }
        if (active?.id === 'btn-cambiar-producto-lote') {
          e.preventDefault();
          const target = document.getElementById('input-cantidad-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-cantidad-lote') {
          e.preventDefault();
          const target = document.getElementById('input-proveedor-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-costo-total-lote') {
          e.preventDefault();
          const target = document.getElementById('input-sustento-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-proveedor-lote') {
          if (showProviderDropdown) {
            const first = document.querySelector('[data-lote-prov-item="true"]') as HTMLElement;
            if (first) {
              e.preventDefault();
              first.focus();
              return;
            }
          }
          e.preventDefault();
          setShowProviderDropdown(false);
          document.getElementById('input-vencimiento-lote')?.focus();
          return;
        }
        if (active?.id === 'input-sustento-lote') {
          e.preventDefault();
          document.getElementById('input-vencimiento-lote')?.focus();
          return;
        }
        if (active?.id === 'input-vencimiento-lote') {
          e.preventDefault();
          (document.getElementById('btn-guardar-lote') || document.getElementById('btn-cancelar-lote'))?.focus();
          return;
        }
      }

      if (e.key === 'ArrowRight') {
        if (active?.id === 'btn-cambiar-producto-lote') {
          e.preventDefault();
          const target = document.getElementById('input-cantidad-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-cantidad-lote') {
          e.preventDefault();
          const target = document.getElementById('input-costo-total-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-proveedor-lote') {
          e.preventDefault();
          setShowProviderDropdown(false);
          const target = document.getElementById('input-sustento-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'btn-cancelar-lote') {
          e.preventDefault();
          document.getElementById('btn-guardar-lote')?.focus();
          return;
        }
      }

      if (e.key === 'ArrowLeft') {
        if (active?.id === 'input-costo-total-lote') {
          e.preventDefault();
          const target = document.getElementById('input-cantidad-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'input-sustento-lote') {
          e.preventDefault();
          const target = document.getElementById('input-proveedor-lote') as HTMLInputElement | null;
          target?.focus();
          target?.select();
          return;
        }
        if (active?.id === 'btn-guardar-lote') {
          e.preventDefault();
          document.getElementById('btn-cancelar-lote')?.focus();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen, selectedProduct, showDropdown, showProviderDropdown]);

  if (!isOpen) return null;

  // Motor de filtrado ultra-rápido (EXCLUYE LOS PRODUCTOS DE CONSUMO INTERNO)
  const filteredProducts = productos.filter(p => {
    if (p.unit === 'CONSUMO') return false; // <-- BLOQUEO ESTRICTO: NO MOSTRAR CONSUMO AQUÍ
    if (!searchQuery.trim()) return true;
    return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
  });

  const filteredProveedores = proveedoresActivos.filter(p => {
    if (!proveedor.trim()) return true;
    return coincideBusqueda([p.razon_social], proveedor);
  });

  const elegirProveedor = (prov: { id: string | number; razon_social: string }) => {
    setProveedor(prov.razon_social);
    setProveedorId(String(prov.id));
    setShowProviderDropdown(false);
    const next = document.getElementById('input-sustento-lote') as HTMLInputElement | null;
    next?.focus();
    next?.select();
  };

  // 📡 SOPORTE DE ESCÁNER Y TECLADO: el lector escribe el código y envía "Enter" automáticamente.
  // Con flecha abajo se navega a la lista de resultados para seleccionar con Enter.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length > 0) {
        e.preventDefault();
        setSelectedProduct(filteredProducts[0]);
        setShowDropdown(false);
        setSearchQuery('');
        setTimeout(() => document.getElementById('input-cantidad-lote')?.focus(), 50);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown) {
        setShowDropdown(true);
      }
      setTimeout(() => {
        const first = document.querySelector('[data-lote-prod-item="true"]') as HTMLElement;
        if (first) first.focus();
        else document.getElementById('input-cantidad-lote')?.focus();
      }, 30);
    }
  };

  // FÓRMULA MATEMÁTICA AUTOMÁTICA (Costo Unitario)
  const costoUnitario = (Number(costoTotal) > 0 && Number(cantidad) > 0) 
    ? (Number(costoTotal) / Number(cantidad)).toFixed(2) 
    : '0.00';

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const documento = sustento.trim() || 'SIN SUSTENTO';
    // Proveedor opcional: si se escribió sin elegirlo de la lista pero coincide exacto con uno, se enlaza igual
    const nombreProveedor = proveedor.trim();
    const provEncontrado = proveedorId
      ? proveedoresActivos.find(p => String(p.id) === proveedorId)
      : proveedoresActivos.find(p => String(p.razon_social).trim().toUpperCase() === nombreProveedor.toUpperCase());
    const supplier = nombreProveedor ? (provEncontrado?.razon_social || nombreProveedor) : null;
    const providerId = nombreProveedor ? (provEncontrado ? String(provEncontrado.id) : proveedorId) : null;
    const usuario = empleado?.nombre || 'Sistema';

    try {
      if (initialLote) {
        // === MODO EDICIÓN EVICAMP ===
        const cantidadNueva = Number(cantidad) || 0;

        // 1. Guardar los campos secundarios (vencimiento, sustento tributario)
        const { error: metaError } = await supabase
          .from('batches')
          .update({
            initial_quantity: cantidadNueva,
            expiration_date: expiration || null,
            cost_total: Number(costoTotal) || 0,
            document_ref: documento,
            supplier,
            provider_id: providerId,
            is_active: 1
          })
          .eq('id', initialLote.id);

        if (metaError) throw metaError;

        // 🛡️ 2. RPC BLINDADO: El VPS hace toda la matemática, actualiza cantidad y stock en 0.001ms
        const { error: rpcError } = await supabase.rpc('fn_edit_batch', {
          p_batch_id: String(initialLote.id),
          p_new_qty: cantidadNueva,
          p_new_cost: Number(costoUnitario) || 0,
          p_user_name: usuario
        });

        if (rpcError) throw rpcError;

        if (onLoteSaved && selectedProduct) {
          onLoteSaved({ 
            ...initialLote, 
            quantity: cantidadNueva,
            initial_quantity: cantidadNueva,
            expiration_date: expiration, 
            cost_unit: Number(costoUnitario),
            cost_total: Number(costoTotal),
            document_ref: documento,
            supplier: supplier || '',
            provider_id: providerId
          });
        }
        onClose();
        void avisar(`✅ Lote actualizado y stock sincronizado.\nProducto: ${selectedProduct?.name}`);

      } else {
        // === MODO CREACIÓN (DELEGACIÓN DE IDs A POSTGRESQL) ===
        // RETORNO TÉCNICO: Generación de ID manual ya que la DB no tiene Auto-Increment activo en batches
        const generatedId = Date.now().toString();

        const { data: newBatch, error: batchError } = await supabase
          .from('batches')
          .insert([{
            id: generatedId, 
            product_id: selectedProduct?.id,
            quantity: Number(cantidad), 
            initial_quantity: Number(cantidad),
            expiration_date: expiration || null,
            cost_total: Number(costoTotal),
            cost_unit: Number(costoUnitario),
            document_ref: documento,
            supplier,
            provider_id: providerId,
            is_synced: '1',
            is_active: 1 // <--- 🔥 ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA!
          }])
          .select()
          .single();

        if (batchError) throw batchError;

        // === REGISTRO DE MOVIMIENTO USANDO EL ID REAL CREADO POR LA BASE DE DATOS ===
        const { error: movError } = await supabase
          .from('inventory_movements')
          .insert([{
            batch_id: newBatch.id, // ID Oficial generado por Supabase
            product_id: selectedProduct?.id,
            product_name: selectedProduct?.name,
            change_amount: Number(cantidad), // <-- ¡CLAVE! Enviar como número, no texto
            previous_quantity: 0,            // <-- Número, sin comillas
            new_quantity: Number(cantidad),  // <-- Número, sin comillas
            operation_type: 'COMPRA',
            reason: 'Ingreso Lote',
            notes: 'Doc: ' + documento + (supplier ? ' | Prov: ' + supplier : ''),
            user: usuario,
            is_synced: '1'
          }]);

        if (movError) throw movError;

        // 🛡️ SINCRONIZACIÓN MAESTRA EVICAMP: Al editar un lote manualmente, recalculamos el stock global del producto
        if (selectedProduct) {
          const { data: lotesActivos } = await supabase.from('batches').select('quantity').eq('product_id', selectedProduct.id).eq('is_active', 1);
          const stockReal = lotesActivos ? lotesActivos.reduce((sum, lote) => sum + Number(lote.quantity || 0), 0) : 0;
          await supabase.from('products').update({ quantity: stockReal }).eq('id', selectedProduct.id);
        }

        if (onLoteSaved && selectedProduct) {
          onLoteSaved({
            ...newBatch,
            product_name: selectedProduct.name,
            category: selectedProduct.category || 'GENERAL',
            unit: selectedProduct.unit
          });
        }
        onClose();
        void avisar(`✅ Lote registrado.\nCantidad sumada al stock: ${cantidad}`);
      }
    } catch (err: any) {
      console.error(err);
      void avisar(`❌ No se pudo guardar el lote. Revisa los datos e intenta de nuevo.\n\nDetalle: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-[var(--color-success)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-success)]">{initialLote ? 'Editar Lote de Stock' : 'Ingresar Lote de Stock'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{initialLote ? 'Modificar datos del lote registrado' : 'Añadir existencias al inventario'}</p>
            </div>
          </div>
          <button 
            id="btn-cerrar-modal-lote"
            onClick={onClose} 
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <div className="p-4 sm:p-6 overflow-y-auto sm:overflow-visible custom-scrollbar bg-[#F8FAFC] space-y-6">
          
          {/* 1. BUSCADOR DE PRODUCTO DESPLEGABLE */}
          <div ref={prodContainerRef} className="space-y-2 relative">
            <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
              <Search size={14} className="text-[var(--color-success)]"/> 1. Buscar Producto *
            </label>
            
            {selectedProduct ? (
              <div className="flex items-center justify-between border-2 border-[var(--color-success)] bg-[#ECFDF5] p-3 rounded-none">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--color-success)] uppercase tracking-wider">Producto Seleccionado:</span>
                  <span className="text-xs font-black text-[var(--color-ink)] uppercase mt-1">{selectedProduct.code} - {selectedProduct.name}</span>
                </div>
                <button 
                  id="btn-cambiar-producto-lote"
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowDropdown(true);
                    setTimeout(() => document.getElementById('input-buscar-producto-lote')?.focus(), 50);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedProduct(null);
                      setShowDropdown(true);
                      setTimeout(() => document.getElementById('input-buscar-producto-lote')?.focus(), 50);
                    }
                  }}
                  className="text-[var(--color-danger)] hover:bg-[#FECACA] focus:bg-red-500 focus:text-white focus:outline-none focus:ring-2 focus:ring-red-500 p-2 transition-colors cursor-pointer border-2 border-transparent hover:border-[var(--color-danger)]"
                  title="Cambiar Producto (Enter o Clic)"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="input-buscar-producto-lote"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="search_query_lote_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="ESCANEA O ESCRIBE CÓDIGO / NOMBRE DEL PRODUCTO..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] transition-colors"
                />
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 50).map(p => (
                        <div 
                          key={p.id} 
                          data-lote-prod-item="true"
                          role="option"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedProduct(p);
                            setShowDropdown(false);
                            setSearchQuery('');
                            setTimeout(() => document.getElementById('input-cantidad-lote')?.focus(), 50);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const items = Array.from(document.querySelectorAll('[data-lote-prod-item="true"]')) as HTMLElement[];
                              const currentIdx = items.indexOf(e.currentTarget);
                              if (currentIdx !== -1 && currentIdx < items.length - 1) {
                                items[currentIdx + 1].focus();
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const items = Array.from(document.querySelectorAll('[data-lote-prod-item="true"]')) as HTMLElement[];
                              const currentIdx = items.indexOf(e.currentTarget);
                              if (currentIdx > 0) {
                                items[currentIdx - 1].focus();
                              } else {
                                document.getElementById('input-buscar-producto-lote')?.focus();
                              }
                            } else if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedProduct(p);
                              setShowDropdown(false);
                              setSearchQuery('');
                              setTimeout(() => document.getElementById('input-cantidad-lote')?.focus(), 50);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowDropdown(false);
                              document.getElementById('input-buscar-producto-lote')?.focus();
                            }
                          }}
                          className="flex flex-col p-3 bg-white hover:bg-[#1E293B] hover:text-white focus:!bg-[#1E293B] focus:!text-white border-b border-[#E2E8F0] cursor-pointer group outline-none transition-colors"
                        >
                          <span className="text-[9px] font-bold text-[#64748B] group-hover:text-emerald-400 group-focus:!text-emerald-400">{p.code} | {p.category}</span>
                          <span className="text-xs font-black text-[#1E293B] group-hover:text-white group-focus:!text-white uppercase">{p.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] font-bold text-[#64748B] uppercase">No se encontraron productos</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CANTIDAD Y COSTO TOTAL */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-[#E2E8F0] pt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex justify-between">
                <span>2. Cantidad *</span>
                <span className="text-[var(--color-success)]">{selectedProduct ? `(${selectedProduct.unit})` : ''}</span>
              </label>
              <div className="flex border-2 border-[#E2E8F0] bg-[var(--color-surface)] focus-within:border-[var(--color-success)] transition-colors">
                <input 
                  id="input-cantidad-lote"
                  type="number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="lote_cantidad_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const next = document.getElementById('input-costo-total-lote') as HTMLInputElement | null;
                      next?.focus();
                      next?.select();
                    }
                  }}
                  disabled={!selectedProduct}
                  className="w-full p-3 text-sm font-black text-[var(--color-ink)] outline-none disabled:bg-[#F1F5F9] disabled:cursor-not-allowed text-right focus:ring-2 focus:ring-[var(--color-success)]"
                />
                <div className="bg-[#F8FAFC] px-4 border-l-2 border-[#E2E8F0] flex items-center justify-center text-[10px] font-black text-[#64748B] w-16 shrink-0">
                  {selectedProduct ? selectedProduct.unit : '---'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
                3. Costo Compra (Total)
              </label>
              <div className="flex border-2 border-[#E2E8F0] bg-[var(--color-surface)] focus-within:border-[var(--color-success)] transition-colors">
                <div className="bg-[#F8FAFC] px-4 border-r-2 border-[#E2E8F0] flex items-center justify-center text-[10px] font-black text-[#64748B] shrink-0">
                  S/
                </div>
                <input 
                  id="input-costo-total-lote"
                  type="number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="lote_costo_total_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={costoTotal}
                  onChange={(e) => setCostoTotal(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const next = document.getElementById('input-proveedor-lote') as HTMLInputElement | null;
                      next?.focus();
                      next?.select();
                    }
                  }}
                  disabled={!selectedProduct}
                  className="w-full p-3 text-sm font-black text-[var(--color-ink)] outline-none disabled:bg-[#F1F5F9] disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--color-success)]"
                />
              </div>
            </div>
          </div>

          {/* 3. FÓRMULA MATEMÁTICA: COSTO UNITARIO AUTOMÁTICO */}
          <div className="bg-[var(--color-ink)] p-4 flex items-center justify-between shadow-inner">
            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Calculator size={14} className="text-[var(--color-success)]" /> Costo Unitario Automático
            </span>
            <span className="text-xl font-black text-[var(--color-success)]">
              S/ {costoUnitario}
            </span>
          </div>

          {/* 4. PROVEEDOR Y DOCUMENTO (ambos opcionales) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-[#E2E8F0] pt-6">

            <div ref={provContainerRef} className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Truck size={14} /> 4. Proveedor (Opcional)
              </label>
              <div className="relative">
                <input
                  id="input-proveedor-lote"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="BUSCAR PROVEEDOR..."
                  value={proveedor}
                  onChange={(e) => {
                    setProveedor(e.target.value.toUpperCase());
                    setProveedorId(null); // lo escrito ya no es el proveedor elegido
                    setShowProviderDropdown(true);
                  }}
                  onFocus={() => {
                    if (proveedoresActivos.length > 0) {
                      setShowProviderDropdown(true);
                    }
                  }}
                  onBlur={(e) => {
                    if (!provContainerRef.current?.contains(e.relatedTarget as Node)) {
                      setShowProviderDropdown(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showProviderDropdown && proveedor.trim() && filteredProveedores.length > 0) {
                        elegirProveedor(filteredProveedores[0]);
                        return;
                      }
                      setShowProviderDropdown(false);
                      const next = document.getElementById('input-sustento-lote') as HTMLInputElement | null;
                      next?.focus();
                      next?.select();
                    }
                  }}
                  disabled={!selectedProduct}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                />

                {/* BUSCADOR DESPLEGABLE DE PROVEEDORES (SOLO SI HAY COINCIDENCIAS) */}
                {showProviderDropdown && selectedProduct && filteredProveedores.length > 0 && (
                  <div className="absolute top-full mt-1.5 left-0 right-0 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-44 overflow-y-auto custom-scrollbar">
                    <div className="p-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[9px] font-black text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                      <span>Proveedores registrados</span>
                      <span className="text-[8px] font-bold text-[#94A3B8]">{filteredProveedores.length} opción(es)</span>
                    </div>
                    {filteredProveedores.map(prov => (
                      <div
                        key={prov.id}
                        data-lote-prov-item="true"
                        role="option"
                        tabIndex={0}
                        onClick={() => elegirProveedor(prov)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const items = Array.from(document.querySelectorAll('[data-lote-prov-item="true"]')) as HTMLElement[];
                            const currentIdx = items.indexOf(e.currentTarget);
                            if (currentIdx !== -1 && currentIdx < items.length - 1) {
                              items[currentIdx + 1].focus();
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const items = Array.from(document.querySelectorAll('[data-lote-prov-item="true"]')) as HTMLElement[];
                            const currentIdx = items.indexOf(e.currentTarget);
                            if (currentIdx > 0) {
                              items[currentIdx - 1].focus();
                            } else {
                              document.getElementById('input-proveedor-lote')?.focus();
                            }
                          } else if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            elegirProveedor(prov);
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            setShowProviderDropdown(false);
                            document.getElementById('input-proveedor-lote')?.focus();
                          }
                        }}
                        className="p-3 bg-white hover:bg-[#1E293B] hover:text-white focus:!bg-[#1E293B] focus:!text-white border-b border-[#E2E8F0] cursor-pointer outline-none group transition-colors"
                      >
                        <span className="text-xs font-black text-[#1E293B] group-hover:text-white group-focus:!text-white uppercase">{prov.razon_social}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> 5. Documento (Factura / Guía) (Opcional)
              </label>
              <input
                id="input-sustento-lote"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="EJ: F001-123"
                value={sustento}
                onChange={(e) => setSustento(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-vencimiento-lote')?.focus();
                  }
                }}
                disabled={!selectedProduct}
                className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> 6. Fecha Vencimiento (Opcional)
              </label>
              <input
                id="input-vencimiento-lote"
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    try {
                      (e.currentTarget as HTMLInputElement).showPicker();
                    } catch {}
                  }
                }}
                disabled={!selectedProduct}
                className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors disabled:bg-[#F1F5F9] cursor-pointer"
              />
            </div>

          </div>

        </div>

        {/* PIE DE PÁGINA (BOTONES) */}
        <div className="p-6 bg-[var(--color-surface)] border-t-2 border-[#E2E8F0] flex justify-end gap-3 shrink-0">
          <button 
            id="btn-cancelar-lote"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                document.getElementById('btn-guardar-lote')?.focus();
              }
            }}
            className="px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] font-black text-[10px] uppercase tracking-widest hover:bg-[#F8FAFC] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[#F8FAFC] focus:text-[var(--color-ink)] transition-all cursor-pointer rounded-none"
          >
            Cancelar
          </button>
          <button 
            id="btn-guardar-lote"
            onClick={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('btn-cancelar-lote')?.focus();
              }
            }}
            disabled={!selectedProduct || !cantidad || Number(cantidad) <= 0 || isSubmitting}
            className="bg-[var(--color-success)] text-[var(--color-ink)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-success)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isSubmitting ? 'PROCESANDO...' : initialLote ? 'Guardar Cambios' : 'Guardar Lote'}
          </button>
        </div>

      </div>
    </div>
  );
};