import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertTriangle, Database, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../../db/supabase.ts';
import { formatearCantidad } from '../../../utils/formato';
import { esDecimal, nombreUnidad } from '../../../utils/unidades';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Product[];
  onProductSaved?: (product: any, loteId?: string, nuevaCantLote?: number) => void;
  initialData?: any;
}

export const ModalMerma: React.FC<Props> = ({ isOpen, onClose, productos, onProductSaved, initialData }) => {
  // Búsqueda de Producto
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0);

  // Estados de Desplegables Personalizados (Evitan bloqueos de Enter/Select nativos)
  const [openLoteDropdown, setOpenLoteDropdown] = useState(false);
  const [highlightedLoteIdx, setHighlightedLoteIdx] = useState(0);
  const loteDropdownRef = useRef<HTMLDivElement>(null);

  const [openMotivoDropdown, setOpenMotivoDropdown] = useState(false);
  const [highlightedMotivoIdx, setHighlightedMotivoIdx] = useState(0);
  const motivoDropdownRef = useRef<HTMLDivElement>(null);

  const MOTIVOS = [
    { value: 'DAÑADO', label: 'PRODUCTO DAÑADO' },
    { value: 'VENCIDO', label: 'FECHA VENCIDA' },
    { value: 'ROBO', label: 'PÉRDIDA / ROBO' },
    { value: 'USO INTERNO', label: 'USO INTERNO' },
    { value: 'OTRO', label: 'OTRO' },
  ];

  // Cerrar desplegables al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (loteDropdownRef.current && !loteDropdownRef.current.contains(e.target as Node)) {
        setOpenLoteDropdown(false);
      }
      if (motivoDropdownRef.current && !motivoDropdownRef.current.contains(e.target as Node)) {
        setOpenMotivoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll automático para item resaltado de lotes
  useEffect(() => {
    if (openLoteDropdown) {
      const el = document.querySelector(`[data-lote-idx="${highlightedLoteIdx}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedLoteIdx, openLoteDropdown]);

  // Scroll automático para item resaltado de motivos
  useEffect(() => {
    if (openMotivoDropdown) {
      const el = document.querySelector(`[data-motivo-idx="${highlightedMotivoIdx}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedMotivoIdx, openMotivoDropdown]);
  

  // Selección de Lote
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Formulario
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('DAÑADO');
  const [detalle, setDetalle] = useState('');

  // 🚨 Variable de control PARCHADA: Garantiza que reconozca la edición aunque Supabase no devuelva un ID
  const isEdit = !!initialData && Object.keys(initialData).length > 0;

  useEffect(() => {
    setSelectedDropdownIndex(0);
  }, [searchQuery]);

  // 1. Cargar Lotes cuando se selecciona un producto
  useEffect(() => {
    if (selectedProduct) {
      const fetchLotes = async () => {
        setLoadingLotes(true);
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .eq('product_id', selectedProduct.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error("Error cargando lotes para merma:", error.message);
          setLotes([]);
          setLoadingLotes(false); // antes se quedaba "cargando" para siempre y no dejaba elegir
          setTimeout(() => {
            const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
            (cant || document.getElementById('btn-cambiar-producto-merma'))?.focus();
          }, 50);
          return;
        }

        // Filtro estándar de lotes con stock
        let lotesDisponibles = (data || []).filter(lote => Number(lote.quantity) > 0);

        // 🚨 PARCHE DE RECUPERACIÓN (EDICIÓN): Si el lote de la merma llegó a 0 stock, 
        // lo forzamos a aparecer en la lista para que el sistema no pierda la referencia visual.
        if (initialData?.batch_id) {
          const loteOriginal = data?.find(l => String(l.id) === String(initialData.batch_id));
          if (loteOriginal && !lotesDisponibles.some(l => String(l.id) === String(loteOriginal.id))) {
            lotesDisponibles.push(loteOriginal);
          }
        }

        setLotes(lotesDisponibles);

        // 🚨 PARCHE DE AUTO-SELECCIÓN: Asignar el lote proveniente de la base de datos
        if (initialData?.batch_id) {
          const loteGuardado = lotesDisponibles.find(l => String(l.id) === String(initialData.batch_id));
          setSelectedLote(loteGuardado || null);
        } else {
          // Si solo hay un lote con stock, seleccionarlo automáticamente
          if (lotesDisponibles.length === 1) {
            setSelectedLote(lotesDisponibles[0]);
          } else {
            setSelectedLote(null);
          }
        }

        setLoadingLotes(false);

        // 🛡️ ENFOQUE INTELIGENTE TRAS CARGAR LOTES:
        setTimeout(() => {
          if (!isEdit && lotesDisponibles.length > 0) {
            const loteSelect = document.getElementById('merma-select-lote') as HTMLElement | null;
            if (loteSelect && !loteSelect.hasAttribute('disabled')) {
              loteSelect.focus();
              return;
            }
          }
          const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
          cant?.focus();
          cant?.select();
        }, 50);
      };
      fetchLotes();
    } else {
      setLotes([]);
      setSelectedLote(null);
    }
  }, [selectedProduct, initialData]); // 🚨 Crucial: Escuchar los cambios de initialData

  // 2. Limpieza de memoria e Inyección de datos
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // MODO EDICIÓN
        setSearchQuery(initialData.product_name || '');
        
        // Corrección: Mostrar Soles si fue consumo, o Cantidad si fue físico
        const esConsumoInicial = initialData.reason === 'USO INTERNO' || Number(initialData.quantity) === 0;
        setCantidad(esConsumoInicial ? initialData.total_loss.toString() : Math.abs(initialData.quantity).toString());
        
        setMotivo(initialData.reason || 'DAÑADO');
        setDetalle(initialData.notes || '');
        const p = productos.find(prod => prod.id === initialData.product_id);
        if (p) setSelectedProduct(p);
      } else {
        // MODO NUEVO
        setSearchQuery('');
        setSelectedProduct(null);
        setCantidad('');
        setMotivo('DAÑADO');
        setDetalle('');
      }
    }
  }, [isOpen, initialData, productos]);

  // --- MOTOR DE VALIDACIÓN Y CÁLCULO DE DIFERENCIAL (REACTIVO) ---
  const inputNumVal = Number(cantidad) || 0;
  const esConsumoActivo = selectedProduct?.unit?.toUpperCase().includes('CONS') || 
                          selectedProduct?.category?.toUpperCase().includes('CONS') || 
                          motivo === 'USO INTERNO';
  const costoUnitLote = Number(selectedLote?.cost_unit) || 0;
  
  let cantNumCalculada = 0;
  if (esConsumoActivo) {
    // 🚨 ARQUITECTURA FINANCIERA: Si es consumo, no se descuenta stock físico, solo es gasto.
    cantNumCalculada = 0; 
  } else {
    cantNumCalculada = inputNumVal; // Mantiene Kilos o Unidades para mermas reales
  }

  // 🚨 LÓGICA DE EDICIÓN: Cuánto sacamos ANTES vs Cuánto sacamos AHORA
  const oldCantNum = isEdit ? Math.abs(Number(initialData.quantity)) : 0;
  const diffCant = cantNumCalculada - oldCantNum; // Diferencia real a afectar al inventario

  // Bandera de seguridad adaptada a la diferencia: Solo avisa si el "extra" que sacamos excede el lote
  const excedeStockLote = (selectedLote && !esConsumoActivo && diffCant > 0) ? diffCant > selectedLote.quantity : false;
  // ----------------------------------------------

  useCerrarConEscape(isOpen, onClose);

  // ================= NAVEGACIÓN Y FOCUS TRAP EN MODAL MERMA =================
  useEffect(() => {
    if (!isOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      // 🛡️ RESCATE SI EL FOCO ESTÁ FUERA DEL MODAL O PERDIDO
      const isInsideModal = active && active.closest('.fixed.inset-0.z-50');
      if (!isInsideModal) {
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          const target = isEdit
            ? (document.getElementById('merma-input-cantidad') as HTMLInputElement | null)
            : (document.getElementById('merma-input-search') as HTMLInputElement | null) ||
              (document.getElementById('merma-input-cantidad') as HTMLInputElement | null);
          if (target) {
            target.focus();
            target.select?.();
          }
          return;
        }
      }

      if (e.key === 'Tab') {
        e.stopPropagation();

        const allFocusables = Array.from(
          document.querySelectorAll('input:not([type="file"]), select:not([disabled]), textarea, button:not([disabled]), [role="option"]')
        ) as HTMLElement[];

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
            if (modalFocusables[prevIndex] instanceof HTMLInputElement) {
              (modalFocusables[prevIndex] as HTMLInputElement).select?.();
            }
          } else {
            const nextIndex = currentIndex === -1 || currentIndex >= modalFocusables.length - 1 ? 0 : currentIndex + 1;
            modalFocusables[nextIndex]?.focus();
            if (modalFocusables[nextIndex] instanceof HTMLInputElement) {
              (modalFocusables[nextIndex] as HTMLInputElement).select?.();
            }
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen, isEdit]);


  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (isEdit) {
          const cantInput = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
          if (cantInput) {
            cantInput.focus();
            cantInput.select();
          }
        } else {
          const searchInput = document.getElementById('merma-input-search') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
          }
        }
      }, 100);
    }
  }, [isOpen, isEdit]);


  if (!isOpen) return null;

  // Filtro inteligente
  const filteredProducts = productos.filter(p => {
    return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
  });

  const handleSeleccionarProducto = (prod: Product) => {
    setSelectedProduct(prod);
    setShowDropdown(false);
    setSearchQuery('');
    setSelectedDropdownIndex(0);
    setTimeout(() => {
      // El selector de lote está bloqueado mientras cargan los lotes: entonces el foco queda en
      // "Cambiar producto" y al terminar de cargar pasa solo al lote (ver "ENFOQUE INTELIGENTE")
      const lote = document.getElementById('merma-select-lote') as HTMLButtonElement | null;
      const next = (lote && !lote.disabled ? lote : null)
        || document.getElementById('btn-cambiar-producto-merma') || document.getElementById('merma-input-cantidad');
      if (next) {
        next.focus();
        (next as HTMLInputElement).select?.();
      }
    }, 60);
  };

  // 📡 SOPORTE DE ESCÁNER Y TECLADO: el lector escribe el código y envía "Enter" automáticamente.
  // Con flechas arriba y abajo se navega por las sugerencias y con Enter se selecciona.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length > 0) {
        e.preventDefault();
        const prod = (selectedDropdownIndex >= 0 && selectedDropdownIndex < filteredProducts.length)
          ? filteredProducts[selectedDropdownIndex]
          : filteredProducts[0];
        handleSeleccionarProducto(prod);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown) {
        if (searchQuery) {
          setShowDropdown(true);
          setSelectedDropdownIndex(0);
        }
        return;
      }
      if (filteredProducts.length > 0) {
        setSelectedDropdownIndex(prev => {
          const nextIdx = Math.min(prev + 1, filteredProducts.length - 1);
          setTimeout(() => {
            const itemEl = document.querySelector(`[data-merma-dropdown-idx="${nextIdx}"]`) as HTMLElement | null;
            itemEl?.scrollIntoView({ block: 'nearest' });
          }, 10);
          return nextIdx;
        });
      }
      // 🛡️ Si NO hay producto seleccionado, no permite saltar a los campos de abajo
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showDropdown && filteredProducts.length > 0 && selectedDropdownIndex > 0) {
        setSelectedDropdownIndex(prev => {
          const prevIdx = prev - 1;
          setTimeout(() => {
            const itemEl = document.querySelector(`[data-merma-dropdown-idx="${prevIdx}"]`) as HTMLElement | null;
            itemEl?.scrollIntoView({ block: 'nearest' });
          }, 10);
          return prevIdx;
        });
        return;
      }
      document.getElementById('btn-cerrar-modal-merma')?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  // 3. Lógica de Guardado (INSERT vs UPDATE)
  const handleSave = async () => {
    if (isSubmitting || excedeStockLote) return;
    setIsSubmitting(true);
    
    // 🚨 EXCEPCIÓN: Si es consumo, NO exigimos que haya un lote seleccionado
    if (!selectedProduct || (!selectedLote && !esConsumoActivo) || !cantidad) {
      setIsSubmitting(false);
      return;
    }
    
    if (inputNumVal <= 0) {
      alert('⚠️ ERROR: El valor debe ser mayor a 0.');
      setIsSubmitting(false);
      return;
    }

    if (excedeStockLote) {
      alert(`⚠️ ERROR TÉCNICO: Estás intentando sacar ${diffCant.toFixed(3)} adicionales, pero el lote solo tiene ${selectedLote.quantity}.`);
      setIsSubmitting(false);
      return;
    }

    // Heredamos los cálculos reactivos
    const cantNum = cantNumCalculada;
    const costUnit = costoUnitLote;
    let totalLoss = esConsumoActivo ? inputNumVal : (costUnit * cantNum);

    try {
      // 1. Detectamos de forma segura si es consumo/uso interno
      const esConsumo = selectedProduct?.unit?.toUpperCase().includes('CONS') || 
                        selectedProduct?.category?.toUpperCase().includes('CONS') || 
                        motivo === 'USO INTERNO';

      // A. ACTUALIZAR o REGISTRAR en Waste (Merma / Gasto)
      if (isEdit) {
        // 🚨 PROTECCIÓN QUIRÚRGICA: Buscar el registro EXACTO a actualizar sin alterar otras mermas del lote
        let updateQuery = supabase.from('waste').update({
          quantity: esConsumo ? 0 : -cantNum,
          total_loss: totalLoss,
          reason: motivo,
          notes: detalle
        });

        if (initialData.id) {
          updateQuery = updateQuery.eq('id', initialData.id);
        } else {
          // NUNCA USAMOS SOLO BATCH_ID. Cruzamos producto, lote y fecha de milisegundo exacto.
          updateQuery = updateQuery.eq('product_id', initialData.product_id);
          if (initialData.batch_id) updateQuery = updateQuery.eq('batch_id', initialData.batch_id);
          
          // 🛡️ PARCHE APLICADO: Si no hay fecha, bloqueamos la fuga usando el dinero como filtro exacto
          if (initialData.raw_date) {
            updateQuery = updateQuery.eq('created_at', initialData.raw_date);
          } else {
            updateQuery = updateQuery.eq('total_loss', initialData.total_loss);
          }
        }
        
        const { error: wasteError } = await updateQuery;
        if (wasteError) throw wasteError;

      } else {
        const { error: wasteError } = await supabase.from('waste').insert([{
          batch_id: selectedLote?.id || null, // 🚨 Permite null si es consumo
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: esConsumo ? 0 : -cantNum, // 0 unidades si es consumo
          cost_unit: costUnit,
          total_loss: totalLoss, 
          reason: motivo,
          notes: detalle,
          user: 'Sistema',
          previous_quantity: selectedProduct.quantity,
          new_quantity: selectedProduct.quantity - (esConsumo ? 0 : cantNum),
          is_synced: '1'
        }]);
        
        if (wasteError) throw wasteError;
      }

      // B. SOLO ACTUALIZAR STOCK FÍSICO SI NO ES CONSUMO Y SI HUBO DIFERENCIA
      if (!esConsumo && diffCant !== 0) {
        const { error: batchUpdateError } = await supabase
          .from('batches')
          .update({ quantity: selectedLote.quantity - diffCant })
          .eq('id', selectedLote.id);
        if (batchUpdateError) throw batchUpdateError;

        const { error: productUpdateError } = await supabase
          .from('products')
          .update({ quantity: selectedProduct.quantity - diffCant })
          .eq('id', selectedProduct.id);
        if (productUpdateError) throw productUpdateError;

        const tipoOperacion = diffCant > 0 ? 'MERMA' : 'ENTRADA';
        const razonOperacion = diffCant > 0 ? (isEdit ? 'Ampliación Merma' : motivo) : 'Reducción Merma';

        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            batch_id: selectedLote.id,
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            change_amount: -diffCant, // Negativo si sacamos más, Positivo si devolvemos
            previous_quantity: selectedLote.quantity,
            new_quantity: selectedLote.quantity - diffCant,
            operation_type: tipoOperacion,
            reason: razonOperacion,
            notes: isEdit ? `Corrección de merma [Ref: ${initialData.id || initialData.batch_id || 'Virtual'}]` : detalle || 'Merma manual',
            user: 'Sistema',
            is_synced: 0
          }]);
        if (movementError) throw movementError;
      }

      // Alerta adaptada
      if (esConsumo) {
        alert(`✅ GASTO ${isEdit ? 'ACTUALIZADO' : 'REGISTRADO'}\n\nSe ha registrado un gasto interno de S/ ${totalLoss.toFixed(2)} sin afectar el stock físico.`);
      } else {
        alert(`✅ MERMA ${isEdit ? 'ACTUALIZADA' : 'EXITOSA'}\n\nTotal reportado: ${cantNum.toFixed(3)} unidades (S/ ${totalLoss.toFixed(2)}) de ${selectedProduct.name}.`);
      }
      
      // [ SALIDA ]: Notificamos el cambio al Inventario General y al Control de Lotes
      if (onProductSaved && selectedProduct && selectedLote && diffCant !== 0) {
        const cantFinalLote = selectedLote.quantity - diffCant;
        onProductSaved(
          { ...selectedProduct, quantity: selectedProduct.quantity - diffCant },
          selectedLote.id,
          cantFinalLote
        );
      }

      onClose();
    } catch (error) {
      console.error("Error al guardar transacción:", error);
      alert("❌ Ocurrió un error de conexión al registrar la operación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-[var(--color-surface)] w-full max-w-lg border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] relative flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))]">
        
        {/* HEADER */}
        <div className={`${isEdit ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'} text-white px-6 py-4 flex items-center justify-between border-b-2 border-[var(--color-ink)] shrink-0`}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-white" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">{isEdit ? 'Editar Registro' : 'Registrar Merma'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{isEdit ? 'Corrección de cantidad o motivo' : 'Salida por daño o pérdida'}</p>
            </div>
          </div>
          <button 
            type="button"
            id="btn-cerrar-modal-merma"
            onClick={onClose} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                // 1. Si NO hay producto seleccionado, el destino directo es el buscador
                if (!selectedProduct) {
                  const search = document.getElementById('merma-input-search');
                  if (search && !search.hasAttribute('disabled')) {
                    search.focus();
                    return;
                  }
                }

                // 2. Si hay botón de cambiar producto habilitado (modo nuevo)
                const btnCambiar = document.getElementById('btn-cambiar-producto-merma');
                if (btnCambiar && !btnCambiar.hasAttribute('disabled')) {
                  btnCambiar.focus();
                  return;
                }

                // 3. Selector de lote (si existe y NO está deshabilitado)
                const loteSelect = document.getElementById('merma-select-lote');
                if (loteSelect && !loteSelect.hasAttribute('disabled') && !esConsumoActivo) {
                  loteSelect.focus();
                  return;
                }

                // 4. Primer campo editable (modo edición o consumo): cantidad
                const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
                if (cant && !cant.hasAttribute('disabled')) {
                  cant.focus();
                  cant.select?.();
                  return;
                }

                // 5. Selector de motivo
                const motivoSelect = document.getElementById('merma-select-motivo');
                if (motivoSelect && !motivoSelect.hasAttribute('disabled')) {
                  motivoSelect.focus();
                  return;
                }
              }
            }}
            className={`hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:bg-white ${isEdit ? 'focus:text-[var(--color-warning)] hover:text-[var(--color-warning)]' : 'focus:text-[var(--color-danger)] hover:text-[var(--color-danger)]'} p-1.5 transition-all border-2 border-transparent hover:border-white focus:border-white cursor-pointer rounded-none text-white`}
            title="Cerrar modal (Esc o Enter)"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL MODAL (Scrolleable si es muy largo) */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          
          {/* 1. BUSCADOR DE PRODUCTO DESPLEGABLE */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              { (selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO') 
              ? 'PRECIO / COSTO RETIRADO (S/)' 
              : (esDecimal(selectedProduct) ? `CANTIDAD PERDIDA (${nombreUnidad(selectedProduct, true).toUpperCase()})` : 'CANTIDAD PERDIDA (UNIDADES)') }
            </label>
            
            {selectedProduct ? (
              <div className={`flex items-center justify-between border-2 border-[var(--color-ink)] ${isEdit ? 'bg-[#F8FAFC]' : 'bg-[#FEF2F2]'} p-3 rounded-none`}>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isEdit ? 'text-[var(--color-ink)]' : 'text-[var(--color-danger)]'}`}>Producto Seleccionado:</span>
                  <span className="text-xs font-black text-[var(--color-ink)] uppercase mt-1">{selectedProduct.code} - {selectedProduct.name}</span>
                </div>
                {/* 🚨 Evitamos que el usuario cambie el producto en modo edición para no cruzar inventarios */}
                {!isEdit && (
                  <button 
                    type="button"
                    id="btn-cambiar-producto-merma"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedLote(null);
                      setTimeout(() => document.getElementById('merma-input-search')?.focus(), 50);
                    }} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'x' || e.key === 'Delete' || e.key === 'Backspace') {
                        e.preventDefault();
                        setSelectedProduct(null);
                        setSelectedLote(null);
                        setTimeout(() => document.getElementById('merma-input-search')?.focus(), 50);
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = (!esConsumoActivo && lotes.length > 0)
                          ? document.getElementById('merma-select-lote')
                          : document.getElementById('merma-input-cantidad');
                        (next as HTMLElement)?.focus();
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('btn-cerrar-modal-merma')?.focus();
                        return;
                      }
                    }}
                    className="text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:bg-[var(--color-danger)] focus:text-white p-2 transition-colors cursor-pointer border-2 border-transparent hover:border-[var(--color-ink)]"
                    title="Quitar producto (Enter o X)"
                    aria-label="Quitar producto"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  id="merma-input-search"
                  name="merma_search_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-danger)] transition-colors"
                  placeholder="Escanea o escribe nombre / código del producto..."
                />
                {showDropdown && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, idx) => (
                        <div 
                          key={p.id} 
                          data-merma-product-item="true"
                          data-merma-dropdown-idx={idx}
                          role="option"
                          aria-selected={idx === selectedDropdownIndex}
                          tabIndex={0}
                          onMouseEnter={() => setSelectedDropdownIndex(idx)}
                          onClick={() => handleSeleccionarProducto(p)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSeleccionarProducto(p);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSeleccionarProducto(p);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const nextIdx = Math.min(idx + 1, filteredProducts.length - 1);
                              setSelectedDropdownIndex(nextIdx);
                              const nextEl = document.querySelector(`[data-merma-dropdown-idx="${nextIdx}"]`) as HTMLElement | null;
                              nextEl?.focus();
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              if (idx > 0) {
                                const prevIdx = idx - 1;
                                setSelectedDropdownIndex(prevIdx);
                                const prevEl = document.querySelector(`[data-merma-dropdown-idx="${prevIdx}"]`) as HTMLElement | null;
                                prevEl?.focus();
                              } else {
                                document.getElementById('merma-input-search')?.focus();
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowDropdown(false);
                              document.getElementById('merma-input-search')?.focus();
                            }
                          }}
                          className={`flex flex-col p-3 border-b border-[#E2E8F0] cursor-pointer group transition-colors ${
                            idx === selectedDropdownIndex 
                              ? 'bg-amber-100 ring-2 ring-inset ring-[var(--color-ink)]' 
                              : 'hover:bg-[#F8FAFC]'
                          } focus:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)]`}
                        >
                          <span className="text-[9px] font-bold text-[#64748B] group-hover:text-[var(--color-danger)]">{p.code} | Stock: {formatearCantidad(p.quantity, p.unit)}</span>
                          <span className="text-xs font-black text-[var(--color-ink)] uppercase">{p.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] font-bold text-[#64748B] uppercase">No encontrado</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. SELECTOR DE LOTE ACCESIBLE Y DESPLEGABLE */}
          {selectedProduct && !esConsumoActivo && (
            <div className="space-y-2 border-l-4 border-[var(--color-ink)] pl-3 py-1 relative" ref={loteDropdownRef}>
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Database size={14} className="text-[var(--color-ink)]" /> 2. Seleccionar Lote Afectado *
              </label>

              {/* Botón Principal del Selector de Lote */}
              <div className="relative">
                <button
                  type="button"
                  id="merma-select-lote"
                  disabled={loadingLotes || lotes.length === 0 || isEdit}
                  onClick={() => {
                    if (loadingLotes || lotes.length === 0 || isEdit) return;
                    setOpenMotivoDropdown(false);
                    const currentIdx = lotes.findIndex(l => String(l.id) === String(selectedLote?.id));
                    setHighlightedLoteIdx(currentIdx >= 0 ? currentIdx : 0);
                    setOpenLoteDropdown(prev => !prev);
                  }}
                  onKeyDown={(e) => {
                    if (isEdit || lotes.length === 0) return;

                    if (openLoteDropdown) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedLoteIdx(prev => Math.min(prev + 1, lotes.length - 1));
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedLoteIdx(prev => Math.max(prev - 1, 0));
                        return;
                      }
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const loteToSelect = lotes[highlightedLoteIdx] || lotes[0];
                        if (loteToSelect) {
                          setSelectedLote(loteToSelect);
                        }
                        setOpenLoteDropdown(false);
                        setTimeout(() => {
                          document.getElementById('merma-select-lote')?.focus();
                        }, 50);
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setOpenLoteDropdown(false);
                        return;
                      }
                    } else {
                      // Desplegable CERRADO
                      if (e.key.toLowerCase() === 'x') {
                        e.preventDefault();
                        setSelectedProduct(null);
                        setSelectedLote(null);
                        setTimeout(() => document.getElementById('merma-input-search')?.focus(), 50);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenMotivoDropdown(false);
                        const currentIdx = lotes.findIndex(l => String(l.id) === String(selectedLote?.id));
                        setHighlightedLoteIdx(currentIdx >= 0 ? currentIdx : 0);
                        setOpenLoteDropdown(true);
                        return;
                      }
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
                        cant?.focus();
                        cant?.select();
                        return;
                      }
                      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = document.getElementById('btn-cambiar-producto-merma') || document.getElementById('btn-cerrar-modal-merma');
                        prev?.focus();
                        return;
                      }
                    }
                  }}
                  className={`w-full flex items-center justify-between ${isEdit ? 'bg-[#F1F5F9] cursor-not-allowed' : lotes.length === 0 ? 'bg-[#F8FAFC] opacity-60 cursor-not-allowed' : 'bg-[#F8FAFC] cursor-pointer hover:border-[var(--color-ink)]'} border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] transition-all`}
                >
                  <span className="truncate pr-2 text-left">
                    {loadingLotes
                      ? 'CARGANDO LOTES DISPONIBLES...'
                      : lotes.length === 0
                      ? 'SIN LOTES CON STOCK'
                      : selectedLote
                      ? `F. INGRESO: ${new Date(selectedLote.created_at).toLocaleDateString()} | STOCK: ${formatearCantidad(selectedLote.quantity, selectedProduct?.unit)} | COSTO: S/${Number(selectedLote.cost_unit || 0).toFixed(2)}`
                      : '-- SELECCIONAR LOTE DISPONIBLE --'}
                  </span>
                  <ChevronDown size={16} className={`text-[var(--color-ink)] shrink-0 transition-transform duration-150 ${openLoteDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Menú de opciones desplegables de Lotes */}
                {openLoteDropdown && lotes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[6px_6px_0_0_var(--color-ink)] z-50 max-h-56 overflow-y-auto custom-scrollbar">
                    {lotes.map((l, idx) => {
                      const isSelected = selectedLote && String(selectedLote.id) === String(l.id);
                      const isHighlighted = idx === highlightedLoteIdx;
                      return (
                        <div
                          key={l.id}
                          data-lote-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setHighlightedLoteIdx(idx)}
                          onClick={() => {
                            setSelectedLote(l);
                            setOpenLoteDropdown(false);
                            setTimeout(() => {
                              document.getElementById('merma-select-lote')?.focus();
                            }, 50);
                          }}
                          className={`p-3 text-xs font-bold uppercase transition-colors cursor-pointer border-b border-[#E2E8F0] last:border-b-0 flex items-center justify-between gap-2 ${
                            isHighlighted
                              ? 'bg-[var(--color-warning)] text-[var(--color-ink)] font-black'
                              : isSelected
                              ? 'bg-[#FEF2F2] text-[var(--color-danger)] font-black'
                              : 'hover:bg-[#F8FAFC] text-[var(--color-ink)]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <span>F. INGRESO: {new Date(l.created_at).toLocaleDateString()}</span>
                            <span className="text-[10px] opacity-80">STOCK: {formatearCantidad(l.quantity, selectedProduct?.unit)}</span>
                          </div>
                          <span className="text-[11px] font-black shrink-0">COSTO: S/{Number(l.cost_unit || 0).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
                {(selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO') 
                ? 'Costo Total (S/)' 
                : (esDecimal(selectedProduct) ? `Cantidad (${nombreUnidad(selectedProduct, true)})` : 'Cantidad (Unidades)')}
              </label>
              <input
                type="number"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                id="merma-input-cantidad"
                name="merma_cantidad_no_history"
                data-lpignore="true"
                data-form-type="other"
                value={cantidad}
                disabled={!selectedProduct}
                tabIndex={!selectedProduct ? -1 : 0}
                step={esDecimal(selectedProduct) ? "0.001" : "1"}
                onChange={(e) => {
                  if (!selectedProduct) return;
                  const val = e.target.value;
                  const isUnidad = !esDecimal(selectedProduct);
                  if (isUnidad && !esConsumoActivo) {
                    setCantidad(val.replace(/[.,]/g, ''));
                  } else {
                    setCantidad(val);
                  }
                }}
                onFocus={(e) => e.currentTarget.select()}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) => {
                  if (!selectedProduct) return;
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('merma-select-motivo')?.focus();
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('merma-input-detalle')?.focus();
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const loteSelect = document.getElementById('merma-select-lote') as HTMLElement | null;
                    if (loteSelect && !loteSelect.hasAttribute('disabled') && selectedProduct && !esConsumoActivo) {
                      loteSelect.focus();
                      return;
                    }
                    const prev = document.getElementById('btn-cambiar-producto-merma') || 
                                 document.getElementById('merma-input-search') || 
                                 document.getElementById('btn-cerrar-modal-merma');
                    prev?.focus();
                    return;
                  }
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const loteSelect = document.getElementById('merma-select-lote') as HTMLElement | null;
                    if (loteSelect && !loteSelect.hasAttribute('disabled') && selectedProduct && !esConsumoActivo) {
                      loteSelect.focus();
                      return;
                    }
                    const prev = document.getElementById('btn-cambiar-producto-merma') || 
                                 document.getElementById('merma-input-search');
                    prev?.focus();
                    return;
                  }
                }}
                className={`w-full ${!selectedProduct ? 'bg-[#F1F5F9] cursor-not-allowed opacity-60' : 'bg-[#F8FAFC]'} border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] transition-colors`}
                placeholder={!selectedProduct ? 'Selecciona un producto...' : '0.00'}
              />
            </div>
            
            <div className="space-y-2 relative" ref={motivoDropdownRef}>
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
                Motivo
              </label>

              {/* Botón Principal del Selector de Motivo */}
              <div className="relative">
                <button
                  type="button"
                  id="merma-select-motivo"
                  disabled={!selectedProduct}
                  tabIndex={!selectedProduct ? -1 : 0}
                  onClick={() => {
                    if (!selectedProduct) return;
                    setOpenLoteDropdown(false);
                    const currentIdx = MOTIVOS.findIndex(m => m.value === motivo);
                    setHighlightedMotivoIdx(currentIdx >= 0 ? currentIdx : 0);
                    setOpenMotivoDropdown(prev => !prev);
                  }}
                  onKeyDown={(e) => {
                    if (!selectedProduct) return;
                    if (openMotivoDropdown) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedMotivoIdx(prev => Math.min(prev + 1, MOTIVOS.length - 1));
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedMotivoIdx(prev => Math.max(prev - 1, 0));
                        return;
                      }
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const motivoToSelect = MOTIVOS[highlightedMotivoIdx] || MOTIVOS[0];
                        if (motivoToSelect) {
                          setMotivo(motivoToSelect.value);
                        }
                        setOpenMotivoDropdown(false);
                        setTimeout(() => {
                          document.getElementById('merma-select-motivo')?.focus();
                        }, 50);
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setOpenMotivoDropdown(false);
                        return;
                      }
                    } else {
                      // Desplegable CERRADO
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenLoteDropdown(false);
                        const currentIdx = MOTIVOS.findIndex(m => m.value === motivo);
                        setHighlightedMotivoIdx(currentIdx >= 0 ? currentIdx : 0);
                        setOpenMotivoDropdown(true);
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('merma-input-detalle')?.focus();
                        return;
                      }
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
                        cant?.focus();
                        cant?.select();
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const loteSelect = document.getElementById('merma-select-lote') as HTMLElement | null;
                        if (loteSelect && !loteSelect.hasAttribute('disabled') && selectedProduct && !esConsumoActivo) {
                          loteSelect.focus();
                          return;
                        }
                        const target = document.getElementById('btn-cambiar-producto-merma') || document.getElementById('merma-input-search') || document.getElementById('btn-cerrar-modal-merma');
                        target?.focus();
                        return;
                      }
                    }
                  }}
                  className={`w-full flex items-center justify-between ${!selectedProduct ? 'bg-[#F1F5F9] cursor-not-allowed opacity-60' : 'bg-[#F8FAFC] cursor-pointer hover:border-[var(--color-ink)]'} border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] transition-all`}
                >
                  <span className="truncate pr-2 text-left">
                    {!selectedProduct ? '---' : MOTIVOS.find(m => m.value === motivo)?.label || 'PRODUCTO DAÑADO'}
                  </span>
                  <ChevronDown size={16} className={`text-[var(--color-ink)] shrink-0 transition-transform duration-150 ${openMotivoDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Menú de opciones desplegables de Motivo */}
                {openMotivoDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[6px_6px_0_0_var(--color-ink)] z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {MOTIVOS.map((m, idx) => {
                      const isSelected = motivo === m.value;
                      const isHighlighted = idx === highlightedMotivoIdx;
                      return (
                        <div
                          key={m.value}
                          data-motivo-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setHighlightedMotivoIdx(idx)}
                          onClick={() => {
                            setMotivo(m.value);
                            setOpenMotivoDropdown(false);
                            setTimeout(() => {
                              document.getElementById('merma-select-motivo')?.focus();
                            }, 50);
                          }}
                          className={`p-3 text-xs font-bold uppercase transition-colors cursor-pointer border-b border-[#E2E8F0] last:border-b-0 flex items-center justify-between ${
                            isHighlighted
                              ? 'bg-[var(--color-warning)] text-[var(--color-ink)] font-black'
                              : isSelected
                              ? 'bg-[#FEF2F2] text-[var(--color-danger)] font-black'
                              : 'hover:bg-[#F8FAFC] text-[var(--color-ink)]'
                          }`}
                        >
                          <span>{m.label}</span>
                          {isSelected && <span className="text-[9px] text-[var(--color-danger)] font-bold">ACTUAL</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              Detalle / Observación
            </label>
            <textarea 
              id="merma-input-detalle"
              rows={3}
              placeholder={!selectedProduct ? 'Selecciona un producto primero...' : "Ej: Se cayó el frasco al momento de acomodar la estantería..."}
              value={detalle}
              disabled={!selectedProduct}
              tabIndex={!selectedProduct ? -1 : 0}
              onChange={(e) => {
                if (!selectedProduct) return;
                setDetalle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (!selectedProduct) return;
                if (e.key === 'ArrowUp') {
                  const target = e.currentTarget;
                  if (target.selectionStart === 0) {
                    e.preventDefault();
                    const cant = document.getElementById('merma-input-cantidad') as HTMLInputElement | null;
                    cant?.focus();
                    cant?.select();
                  }
                } else if (e.key === 'ArrowDown') {
                  const target = e.currentTarget;
                  if (target.selectionEnd === target.value.length) {
                    e.preventDefault();
                    const btnSave = document.getElementById('btn-guardar-merma');
                    if (btnSave && !btnSave.hasAttribute('disabled')) {
                      btnSave.focus();
                    } else {
                      document.getElementById('btn-cancelar-merma')?.focus();
                    }
                  }
                }
              }}
              className={`w-full ${!selectedProduct ? 'bg-[#F1F5F9] cursor-not-allowed opacity-60' : 'bg-[#F8FAFC]'} border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] transition-colors resize-none`}
            />
          </div>

        </div>

        {/* FOOTER Y BOTONES */}
        <div className="p-6 bg-[#F8FAFC] border-t-2 border-[#E2E8F0] flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            id="btn-cancelar-merma"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('btn-guardar-merma')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('merma-input-detalle')?.focus();
              }
            }}
            className="px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-surface)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] transition-all rounded-none cursor-pointer"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            id="btn-guardar-merma"
            onClick={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('btn-cancelar-merma')?.focus();
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('merma-input-detalle')?.focus();
                return;
              }
            }}
            disabled={
              !selectedProduct || 
              (!selectedLote && !esConsumoActivo) || 
              !cantidad ||
              parseFloat(cantidad) <= 0 || 
              isSubmitting || 
              excedeStockLote || 
              (!esDecimal(selectedProduct) && !esConsumoActivo && !Number.isInteger(Number(cantidad)))
            }
            className={`px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:ring-offset-2 rounded-none ${excedeStockLote ? 'bg-[#94A3B8] text-white cursor-not-allowed' : 'bg-[var(--color-ink)] text-white hover:bg-[var(--color-danger)] disabled:opacity-50'}`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (excedeStockLote ? <AlertTriangle size={16} /> : <Save size={16} />)}
            <span>
              {isSubmitting ? 'PROCESANDO...' : 
               excedeStockLote ? '⚠️ EXCEDE EL STOCK' : 
               (isEdit ? 'Guardar Cambios' : 'Confirmar Merma')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};