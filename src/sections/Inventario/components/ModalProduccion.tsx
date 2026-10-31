import React, { useState, useEffect, useMemo } from 'react';
import { X, ChefHat, CheckCircle2, AlertTriangle, ArrowRight, Loader2, PackagePlus } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productos: Product[];
  productoInicial?: Product | null;
}

export const ModalProduccion: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  productos,
  productoInicial
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [recetasInsumos, setRecetasInsumos] = useState<any[]>([]);
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [cantidadProducir, setCantidadProducir] = useState<string>('1');
  const [costoAdicional, setCostoAdicional] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar solo productos con Receta/Elaborados
  const productosReceta = useMemo(() => {
    return productos.filter(p => p.tipoCompuesto === 'RECETA');
  }, [productos]);

  const selectedProduct = useMemo(() => {
    return productos.find(p => String(p.id) === String(selectedProductId)) || null;
  }, [productos, selectedProductId]);

  // Cargar producto inicial o el primero disponible
  useEffect(() => {
    if (isOpen) {
      if (productoInicial && productoInicial.tipoCompuesto === 'RECETA') {
        setSelectedProductId(String(productoInicial.id));
        setCostoAdicional(String(productoInicial.costoAdicionalProduccion || 0));
      } else if (productosReceta.length > 0) {
        setSelectedProductId(String(productosReceta[0].id));
        setCostoAdicional(String(productosReceta[0].costoAdicionalProduccion || 0));
      } else {
        setSelectedProductId('');
        setCostoAdicional('0');
      }
      setCantidadProducir('1');
    }
  }, [isOpen, productoInicial, productosReceta]);

  // Cargar insumos y receta cuando cambia el producto seleccionado
  useEffect(() => {
    const fetchReceta = async () => {
      if (!selectedProductId) {
        setRecetasInsumos([]);
        return;
      }
      setLoadingReceta(true);
      try {
        const { data, error } = await supabase
          .from('product_recipes')
          .select('*')
          .eq('parent_product_id', selectedProductId);

        if (error) throw error;

        if (data) {
          const vinculados = data.map((r: any) => {
            const comp = productos.find(p => String(p.id) === String(r.component_product_id));
            return {
              ...r,
              component_name: comp?.name || 'Insumo #' + r.component_product_id,
              component_unit: comp?.unit || 'UND',
              component_stock: Number(comp?.quantity || 0),
              component_cost: Number(comp?.cost || comp?.price || 0)
            };
          });
          setRecetasInsumos(vinculados);
        }
      } catch (err) {
        console.error('Error cargando receta:', err);
      } finally {
        setLoadingReceta(false);
      }
    };

    if (isOpen && selectedProductId) {
      fetchReceta();
    }
  }, [isOpen, selectedProductId, productos]);

  // Calcular máximo producibles según stock actual de insumos
  const maximoPosible = useMemo(() => {
    if (!recetasInsumos.length) return 0;
    const capacidades = recetasInsumos.map(item => {
      const stock = Number(item.component_stock) || 0;
      const factor = Number(item.quantity) || 1;
      if (factor <= 0) return 0;
      return Math.floor(stock / factor);
    });
    return Math.max(0, Math.min(...capacidades));
  }, [recetasInsumos]);

  // Cálculo de costo estimado resultante
  const calculoCosto = useMemo(() => {
    const cant = Number(cantidadProducir) || 0;
    if (cant <= 0) return { totalInsumos: 0, costoUnitario: 0, totalGeneral: 0 };

    const totalInsumos = recetasInsumos.reduce((acc, item) => {
      const cantTotalInsumo = cant * Number(item.quantity || 1);
      return acc + (cantTotalInsumo * Number(item.component_cost || 0));
    }, 0);

    const extra = Number(costoAdicional) || 0;
    const totalGeneral = totalInsumos + extra;
    const costoUnitario = cant > 0 ? (totalGeneral / cant) : 0;

    return { totalInsumos, costoUnitario, totalGeneral };
  }, [recetasInsumos, cantidadProducir, costoAdicional]);

  // Validación de insumos para la cantidad ingresada
  const insumosInsuficientes = useMemo(() => {
    const cant = Number(cantidadProducir) || 0;
    if (cant <= 0) return [];
    return recetasInsumos.filter(item => {
      const requerido = cant * Number(item.quantity || 1);
      return Number(item.component_stock || 0) < requerido;
    });
  }, [recetasInsumos, cantidadProducir]);

  const handleConfirmar = async () => {
    const cant = Number(cantidadProducir);
    if (!selectedProduct) {
      await avisar('Por favor selecciona un producto a producir.');
      return;
    }
    if (isNaN(cant) || cant <= 0) {
      await avisar('Ingresa una cantidad válida mayor a 0 para producir.');
      document.getElementById('input-cantidad-produccion')?.focus();
      return;
    }
    if (!recetasInsumos.length) {
      await avisar('Este producto no tiene insumos configurados en su receta.');
      return;
    }
    if (insumosInsuficientes.length > 0) {
      const nombres = insumosInsuficientes.map(i => `${i.component_name} (Requiere: ${cant * i.quantity} ${i.component_unit}, Hay: ${i.component_stock})`).join('\n');
      await avisar(`Stock insuficiente de insumos para producir ${cant} unidades:\n\n${nombres}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('fn_producir_receta', {
        p_product_id: Number(selectedProduct.id),
        p_cantidad: cant,
        p_costo_adicional: Number(costoAdicional) || 0,
        p_usuario: 'Administrador'
      });

      if (error) throw error;

      await avisar(`¡PRODUCCIÓN EXITOSA! 🎉\n\nProducto: ${selectedProduct.name}\nCantidad fabricada: ${cant} ${selectedProduct.unit}\nLote generado: ${data?.batch_code || 'PROD'}\nCosto unitario calculado: S/ ${Number(data?.cost_unit || calculoCosto.costoUnitario).toFixed(2)}`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al producir:', err);
      await avisar(`Error en la orden de producción:\n${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        id="modal-produccion-receta"
        className="bg-white dark:bg-slate-900 border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-none overflow-hidden"
      >
        {/* CABECERA */}
        <div className="p-4 bg-emerald-600 text-white flex justify-between items-center border-b-2 border-[var(--color-ink)]">
          <div className="flex items-center gap-2">
            <ChefHat size={22} className="text-white" />
            <div>
              <h3 className="font-black text-sm tracking-wider uppercase">
                Orden de Producción / Fabricación
              </h3>
              <p className="text-[10px] text-emerald-100">
                Transforma insumos en productos terminados con cálculo de costo real y kardex
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {productosReceta.length === 0 ? (
            <div className="p-6 text-center space-y-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
              <AlertTriangle size={36} className="mx-auto text-amber-600" />
              <h4 className="text-sm font-black text-[var(--color-ink)] uppercase">
                No hay productos configurados con Receta
              </h4>
              <p className="text-xs text-[#64748B]">
                Para fabricar un producto, primero edítalo o créalo en el inventario y marca la opción <strong>"Elaborado / Receta"</strong> con sus respectivos insumos.
              </p>
            </div>
          ) : (
            <>
              {/* SELECCIÓN DE PRODUCTO A FABRICAR */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)] tracking-wider">
                  Producto a Fabricar / Elaborar
                </label>
                <select
                  id="select-producto-produccion"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = productos.find(p => String(p.id) === e.target.value);
                    if (prod) setCostoAdicional(String(prod.costoAdicionalProduccion || 0));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-cantidad-produccion')?.focus();
                    }
                  }}
                  className="w-full p-2.5 text-xs font-black uppercase border-2 border-[#CBD5E1] bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
                >
                  {productosReceta.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock Actual: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* CAPACIDAD DE PRODUCCIÓN Y CANTIDAD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)] tracking-wider">
                    Cantidad a Fabricar
                  </label>
                  <input
                    id="input-cantidad-produccion"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadProducir}
                    onChange={(e) => setCantidadProducir(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-costo-adicional-produccion')?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('select-producto-produccion')?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('input-costo-adicional-produccion')?.focus();
                      }
                    }}
                    className={`w-full p-2.5 text-xs font-black text-right border-2 bg-white dark:bg-slate-800 outline-none ${
                      insumosInsuficientes.length > 0 ? 'border-red-500 text-red-600' : 'border-[#CBD5E1] focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-black uppercase text-[#64748B] tracking-wider" title="Mano de obra, gas, empaque o costo indirecto">
                    Costo Adicional Lote (S/)
                  </label>
                  <input
                    id="input-costo-adicional-produccion"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costoAdicional}
                    onChange={(e) => setCostoAdicional(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('btn-confirmar-produccion')?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-cantidad-produccion')?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('btn-confirmar-produccion')?.focus();
                      }
                    }}
                    className="w-full p-2.5 text-xs font-black text-right border-2 border-[#CBD5E1] bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="p-2.5 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-[#64748B] uppercase">Máximo con insumos actuales</span>
                  <span className={`text-base font-black ${maximoPosible > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                    {maximoPosible} {selectedProduct?.unit || 'UND'}
                  </span>
                </div>
              </div>

              {/* LISTA DE INSUMOS REQUERIDOS */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-[var(--color-ink)] tracking-wider">
                  Insumos Requeridos vs. Existencias:
                </span>

                {loadingReceta ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Cargando receta...
                  </div>
                ) : recetasInsumos.length === 0 ? (
                  <p className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 font-bold">
                    ⚠️ Este producto no tiene insumos asignados en su receta. Edita el producto en Inventario para agregarle insumos.
                  </p>
                ) : (
                  <div className="border-2 border-[#CBD5E1] dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-12 gap-1 bg-slate-200 dark:bg-slate-800 p-2 text-[9px] font-black uppercase text-[#64748B]">
                      <span className="col-span-5">Insumo</span>
                      <span className="col-span-2 text-right">Por Unidad</span>
                      <span className="col-span-2 text-right">Requerido</span>
                      <span className="col-span-3 text-right">Disponible</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                      {recetasInsumos.map((item, idx) => {
                        const cantReq = (Number(cantidadProducir) || 0) * Number(item.quantity || 1);
                        const disponible = Number(item.component_stock || 0);
                        const alcanza = disponible >= cantReq;

                        return (
                          <div key={idx} className={`grid grid-cols-12 gap-1 p-2 text-xs items-center ${alcanza ? 'hover:bg-slate-50' : 'bg-red-50 dark:bg-red-950/30'}`}>
                            <span className="col-span-5 font-bold text-[var(--color-ink)] uppercase truncate">
                              {item.component_name}
                            </span>
                            <span className="col-span-2 text-right text-slate-600 font-mono text-[11px]">
                              {item.quantity} {item.component_unit}
                            </span>
                            <span className={`col-span-2 text-right font-black font-mono text-[11px] ${alcanza ? 'text-slate-800 dark:text-slate-200' : 'text-red-600 font-black'}`}>
                              {cantReq} {item.component_unit}
                            </span>
                            <span className={`col-span-3 text-right font-black font-mono text-[11px] ${alcanza ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 font-black'}`}>
                              {disponible} {item.component_unit} {!alcanza && '⚠️'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RESUMEN ECONÓMICO Y LOTE RESULTANTE */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-200 uppercase">
                    Costo unitario calculado:
                  </span>
                  <div className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    S/ {calculoCosto.costoUnitario.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-emerald-700">x {selectedProduct?.unit || 'UND'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-200 uppercase">
                    Inversión total del lote:
                  </span>
                  <div className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                    S/ {calculoCosto.totalGeneral.toFixed(2)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* PIE Y BOTONES */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t-2 border-[var(--color-ink)] flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancelar (Esc)
          </button>

          {productosReceta.length > 0 && (
            <button
              id="btn-confirmar-produccion"
              type="button"
              onClick={handleConfirmar}
              disabled={isSubmitting || insumosInsuficientes.length > 0 || !recetasInsumos.length}
              className="px-6 py-2.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0_0_var(--color-ink)] cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
              <span>{isSubmitting ? 'Procesando...' : 'Confirmar Producción'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
