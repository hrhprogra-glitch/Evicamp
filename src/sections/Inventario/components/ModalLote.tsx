import React, { useState, useEffect } from 'react';
import { X, Save, Database, Search, Calculator, FileText, Check, Calendar, Loader2 } from 'lucide-react';
import type { Product } from '../types';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Product[];
  initialProduct?: Product | null;
  initialLote?: any | null; // <-- NUEVO: EL LOTE A EDITAR
  onLoteSaved?: (lote: any) => void;
}

export const ModalLote: React.FC<Props> = ({ isOpen, onClose, productos, initialProduct, initialLote, onLoteSaved }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false); // <-- NUEVO ESTADO
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cantidad, setCantidad] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [sustento, setSustento] = useState('');
  // Distingue "el cajero escribió texto libre" de "eligió un proveedor real del desplegable":
  // solo en el segundo caso guardamos `supplier` (antes nunca se guardaba, así que la
  // etiqueta azul "PROV:" de TablaLotes nunca aparecía en lotes nuevos).
  const [proveedorConfirmado, setProveedorConfirmado] = useState(false);
  const [omitirSustento, setOmitirSustento] = useState(false);
  const [expiration, setExpiration] = useState('');

  // Limpiar memoria o Cargar Lote si es modo edición
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setShowDropdown(false);

      if (initialLote) {
        // === MODO EDICIÓN ===
        const prod = productos.find(p => p.id === initialLote.product_id) || null;
        setSelectedProduct(prod);
        // El campo "Cantidad" es la cantidad COMPRADA (initial_quantity): con ella se calcula el costo unitario.
        // El stock actual (quantity) NO se reemplaza: al guardar solo se le suma/resta la diferencia.
        setCantidad(initialLote.initial_quantity?.toString() || '');

        // Costo total: usamos el guardado; si no existe, lo reconstruimos (costo_unitario * cantidad_inicial)
        const cTotalGuardado = Number(initialLote.cost_total);
        const cTotal = cTotalGuardado > 0
          ? cTotalGuardado
          : Number(initialLote.cost_unit) * Number(initialLote.initial_quantity);
        setCostoTotal(cTotal ? String(Math.round(cTotal * 100) / 100) : '');
        
        if (initialLote.document_ref === 'OMITIDO / SIN SUSTENTO') {
          setOmitirSustento(true);
          setSustento('');
        } else {
          setOmitirSustento(false);
          setSustento(initialLote.document_ref || '');
        }
        setExpiration(initialLote.expiration_date || '');

      } else {
        // === MODO CREACIÓN ===
        setSelectedProduct(initialProduct || null);
        setCantidad('');
        setCostoTotal('');
        setSustento('');
        setOmitirSustento(false);
        setExpiration('');
      }
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

  if (!isOpen) return null;

  // Motor de filtrado ultra-rápido (EXCLUYE LOS PRODUCTOS DE CONSUMO INTERNO)
  const filteredProducts = productos.filter(p => {
    if (p.unit === 'CONSUMO') return false; // <-- BLOQUEO ESTRICTO: NO MOSTRAR CONSUMO AQUÍ
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q);
  });

  // 📡 SOPORTE DE ESCÁNER: el lector escribe el código y envía "Enter" automáticamente.
  // Si hay una coincidencia, la seleccionamos al instante sin necesidad de hacer click.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      e.preventDefault();
      setSelectedProduct(filteredProducts[0]);
      setShowDropdown(false);
      setSearchQuery('');
    }
  };

  // FÓRMULA MATEMÁTICA AUTOMÁTICA (Costo Unitario)
  // Se guarda con 6 decimales (ej. 10.00 / 3 = 3.333333) para no perder costo; solo se redondea al mostrar.
  const costoUnitarioRaw = (Number(costoTotal) > 0 && Number(cantidad) > 0)
    ? Math.round((Number(costoTotal) / Number(cantidad)) * 1e6) / 1e6
    : 0;
  const costoUnitario = costoUnitarioRaw.toFixed(2); // solo para mostrar

  // En edición: stock que quedará en el lote tras cambiar la cantidad comprada
  const stockActualLote = initialLote ? Number(initialLote.quantity || 0) : 0;
  const stockResultanteLote = initialLote
    ? stockActualLote + ((Number(cantidad) || 0) - Number(initialLote.initial_quantity || 0))
    : 0;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const documento = omitirSustento ? 'OMITIDO / SIN SUSTENTO' : (sustento || 'SIN SUSTENTO');

    try {
      if (initialLote) {
        // === MODO EDICIÓN EVICAMP ===
        const cantidadNueva = Number(cantidad) || 0; // nueva cantidad comprada (initial_quantity)
        // Releer el lote justo antes de guardar: el stock pudo cambiar (ventas/mermas) desde que se abrió la lista
        const { data: loteFresco, error: freshError } = await supabase
          .from('batches')
          .select('quantity, initial_quantity')
          .eq('id', initialLote.id)
          .single();
        if (freshError) throw freshError;
        if (!loteFresco) throw new Error('No se encontró el lote para actualizarlo.');

        // stock actual (fresco) + diferencia de la cantidad comprada (no se reinicia)
        const nuevaActual = Number(loteFresco.quantity || 0)
          + (cantidadNueva - Number(loteFresco.initial_quantity || 0));

        if (nuevaActual < 0) {
          alert('Error: La nueva cantidad es menor a lo que ya se vendió/mermó de este lote.');
          setIsSubmitting(false);
          return;
        }

        // 1. Guardar los campos secundarios (vencimiento, sustento tributario)
        const { error: metaError } = await supabase
          .from('batches')
          .update({
            initial_quantity: cantidadNueva,
            expiration_date: expiration || null,
            cost_total: Number(costoTotal) || 0,
            document_ref: documento,
            is_active: 1
          })
          .eq('id', initialLote.id);

        if (metaError) throw metaError;

        // 🛡️ 2. RPC BLINDADO: El VPS hace toda la matemática, actualiza cantidad y stock en 0.001ms
        const { error: rpcError } = await supabase.rpc('fn_edit_batch', {
          p_batch_id: String(initialLote.id),
          p_new_qty: nuevaActual,
          p_new_cost: costoUnitarioRaw,
          p_user_name: 'Admin'
        });

        if (rpcError) throw rpcError;

        if (onLoteSaved && selectedProduct) {
          onLoteSaved({ 
            ...initialLote, 
            quantity: nuevaActual,
            initial_quantity: cantidadNueva,
            expiration_date: expiration,
            cost_unit: costoUnitarioRaw,
            cost_total: Number(costoTotal),
            document_ref: documento 
          });
        }
        alert(`LOTE ACTUALIZADO Y STOCK GLOBAL SINCRONIZADO.\nProducto: ${selectedProduct?.name}`);

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
            cost_unit: costoUnitarioRaw,
            document_ref: documento,
            supplier: proveedorConfirmado ? sustento : null,
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
            notes: 'Doc: ' + documento,
            user: 'Sistema',
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
        alert(`LOTE REGISTRADO CORRECTAMENTE.\nCantidad sumada al stock global: ${cantidad}`);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.75)] sm:mt-10">
        
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-[var(--color-accent)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">Ingresar Lote de Stock</h2>
              <p className="text-[12px] font-bold opacity-80 uppercase tracking-widest">Añadir existencias al inventario</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[var(--color-bg)] flex-1 space-y-6">
          
          {/* 1. BUSCADOR DE PRODUCTO DESPLEGABLE */}
          <div className="space-y-2 relative">
            <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
              <Search size={14} className="text-[var(--color-accent)]"/> 1. Buscar Producto *
            </label>
            
            {selectedProduct ? (
              <div className="flex items-center justify-between border-2 border-[var(--color-accent)] bg-[var(--color-accent-bg)] p-3 rounded-none">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-[var(--color-accent)] uppercase tracking-wider">Producto Seleccionado:</span>
                  <span className="text-xs font-black text-[var(--color-ink)] uppercase mt-1">{selectedProduct.code} - {selectedProduct.name}</span>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="text-[var(--color-danger)] hover:bg-[#FECACA] p-2 transition-colors cursor-pointer border-2 border-transparent hover:border-[var(--color-danger)]"
                  title="Cambiar Producto"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="ESCANEA O ESCRIBE CÓDIGO / NOMBRE DEL PRODUCTO..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-accent)] transition-colors"
                />
                {showDropdown && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <div 
                          key={p.id} 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedProduct(p);
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className="flex flex-col p-3 hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] cursor-pointer group"
                        >
                          <span className="text-[12px] font-bold text-[var(--color-muted)] group-hover:text-[var(--color-accent)]">{p.code} | {p.category}</span>
                          <span className="text-xs font-black text-[var(--color-ink)] uppercase">{p.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[12px] font-bold text-[var(--color-muted)] uppercase">No se encontraron productos</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CANTIDAD Y COSTO TOTAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-[var(--color-border)] pt-6">
            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest flex justify-between">
                <span>{initialLote ? '2. Cantidad comprada *' : '2. Cantidad *'}</span>
                <span className="text-[var(--color-accent)]">{selectedProduct ? `(${selectedProduct.unit})` : ''}</span>
              </label>
              <div className="flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-accent)] transition-colors">
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full p-3 text-sm font-black text-[var(--color-ink)] outline-none disabled:bg-[var(--color-bg-2)] disabled:cursor-not-allowed text-right"
                />
                <div className="bg-[var(--color-bg)] px-4 border-l-2 border-[var(--color-border)] flex items-center justify-center text-[12px] font-black text-[var(--color-muted)] w-16 shrink-0">
                  {selectedProduct ? selectedProduct.unit : '---'}
                </div>
              </div>
              {initialLote && (
                <p className={`text-[12px] font-bold uppercase tracking-wider ${stockResultanteLote < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
                  Stock actual del lote: {stockActualLote} → quedará: {Math.round(stockResultanteLote * 1000) / 1000}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">
                3. Costo Compra (Total)
              </label>
              <div className="flex border-2 border-[var(--color-border)] bg-white focus-within:border-[var(--color-accent)] transition-colors">
                <div className="bg-[var(--color-bg)] px-4 border-r-2 border-[var(--color-border)] flex items-center justify-center text-[12px] font-black text-[var(--color-muted)] shrink-0">
                  S/
                </div>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={costoTotal}
                  onChange={(e) => setCostoTotal(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full p-3 text-sm font-black text-[var(--color-ink)] outline-none disabled:bg-[var(--color-bg-2)] disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 3. FÓRMULA MATEMÁTICA: COSTO UNITARIO AUTOMÁTICO */}
          <div className="bg-[var(--color-ink)] p-4 flex items-center justify-between shadow-inner">
            <span className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Calculator size={14} className="text-[var(--color-accent)]" /> Costo Unitario Automático
            </span>
            <span className="text-xl font-black text-[var(--color-accent)]">
              S/ {costoUnitario}
            </span>
          </div>

          {/* 4. SUSTENTO TRIBUTARIO Y VENCIMIENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-[var(--color-border)] pt-6">
            
            <div className="space-y-3">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> 4. Sustento (Doc. Proveedor)
              </label>
              <div className="flex flex-col gap-3 relative">
                <input 
                  type="text"
                  placeholder={omitirSustento ? "OMITIDO / SIN SUSTENTO..." : "BUSCAR PROVEEDOR O DOC..."}
                  value={omitirSustento ? '' : sustento}
                  onChange={(e) => {
                    setSustento(e.target.value.toUpperCase());
                    setProveedorConfirmado(false);
                    setShowProviderDropdown(true);
                  }}
                  onFocus={() => setShowProviderDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}
                  disabled={omitirSustento || !selectedProduct}
                  className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-accent)] transition-colors disabled:bg-[var(--color-bg-2)] disabled:text-[var(--color-subtle)]"
                />

                {/* BUSCADOR DESPLEGABLE DE PROVEEDORES */}
                {showProviderDropdown && !omitirSustento && selectedProduct && (
                  <div className="absolute top-[48px] left-0 right-0 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-40 overflow-y-auto custom-scrollbar">
                    {proveedoresActivos.filter(p => p.razon_social.includes(sustento)).length > 0 ? (
                      proveedoresActivos.filter(p => p.razon_social.includes(sustento)).map(prov => (
                        <div 
                          key={prov.id}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Evita que el onBlur cierre la ventana antes del click
                            setSustento(prov.razon_social);
                            setProveedorConfirmado(true);
                            setShowProviderDropdown(false);
                          }}
                          className="p-3 hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] cursor-pointer"
                        >
                          <span className="text-xs font-black text-[var(--color-ink)] uppercase">{prov.razon_social}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-[12px] font-bold text-[var(--color-muted)] uppercase text-center bg-[var(--color-bg)]">
                        ESCRIBE LIBREMENTE SI NO ESTÁ EN LA LISTA
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer w-max group">
                  <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${omitirSustento ? 'bg-[var(--color-danger)] border-[var(--color-danger)]' : 'border-[var(--color-subtle)] bg-white group-hover:border-[var(--color-danger)]'}`}>
                    {omitirSustento && <Check size={12} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={omitirSustento} 
                    onChange={() => setOmitirSustento(!omitirSustento)} 
                    disabled={!selectedProduct} 
                  />
                  <span className="text-[12px] font-bold text-[var(--color-muted)] uppercase select-none group-hover:text-[var(--color-danger)]">
                    Ingresar sin sustento tributario
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Fecha Vencimiento (Opcional)
              </label>
              <input 
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                disabled={!selectedProduct}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-accent)] transition-colors disabled:bg-[var(--color-bg-2)]"
              />
            </div>

          </div>

        </div>

        {/* PIE DE PÁGINA (BOTONES) */}
        <div className="p-6 bg-white border-t-2 border-[var(--color-border)] flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-muted)] font-black text-[12px] uppercase tracking-widest hover:bg-[var(--color-bg)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all cursor-pointer rounded-none"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedProduct || !cantidad || Number(cantidad) <= 0 || isSubmitting}
            className="bg-[var(--color-accent)] text-[var(--color-ink)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isSubmitting ? 'PROCESANDO...' : 'Guardar Lote'}
          </button>
        </div>

      </div>
    </div>
  );
};