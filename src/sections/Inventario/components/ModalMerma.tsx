import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle,  Database } from 'lucide-react';
import { supabase } from '../../../db/supabase.ts';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Product[];
  onProductSaved?: (product: any, loteId?: string, nuevaCantLote?: number) => void;
}

export const ModalMerma: React.FC<Props> = ({ isOpen, onClose, productos, onProductSaved }) => {
  // Búsqueda de Producto
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Selección de Lote
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<any | null>(null);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Formulario
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('DAÑADO');
  const [detalle, setDetalle] = useState('');

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
        
        // MANEJO DE ERROR: Leemos la variable para que TypeScript no reclame
        if (error) {
          console.error("Error cargando lotes para merma:", error.message);
          return;
        }

        // RETORNO TÉCNICO: Filtrado numérico estricto
        const lotesConStock = (data || []).filter(lote => Number(lote.quantity) > 0);
        setLotes(lotesConStock);
        setSelectedLote(null);
        setLoadingLotes(false);
      };
      fetchLotes();
    } else {
      setLotes([]);
      setSelectedLote(null);
    }
  }, [selectedProduct]);

  // 2. Limpieza de memoria
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setCantidad('');
      setMotivo('DAÑADO');
      setDetalle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtro inteligente
  const filteredProducts = productos.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. Lógica de Guardado Real
  const handleSave = async () => {
    if (!selectedProduct || !selectedLote || !cantidad) return;
    
    const inputNum = Number(cantidad);
    if (inputNum <= 0) {
      alert('⚠️ ERROR: El valor debe ser mayor a 0.');
      return;
    }

    const costUnit = Number(selectedLote.cost_unit) || 0;
    let cantNum = 0;
    let totalLoss = 0;

    // Detectamos si es consumo de forma más flexible (incluyendo el Ajo)
    const esConsumo = selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO';

    if (esConsumo) {
      if (costUnit <= 0) {
        alert('⚠️ ERROR: El lote no tiene un costo válido para calcular la fracción.');
        return;
      }
      totalLoss = inputNum; // Lo que ingresaste son Soles
      cantNum = totalLoss / costUnit; // Calculamos cuántas unidades equivale
    } else {
      cantNum = inputNum; // Lo que ingresaste son Unidades
      totalLoss = costUnit * cantNum; // Calculamos cuántos soles equivale
    }

    if (cantNum > selectedLote.quantity) {
      alert(`⚠️ ERROR DE STOCK: El descuento equivale a ${cantNum.toFixed(3)} unidades, pero el lote solo tiene ${selectedLote.quantity} disponibles.`);
      return;
    }

    try {
      // A. Registrar en Waste (Merma)
      const { error: wasteError } = await supabase.from('waste').insert([{
        batch_id: selectedLote.id,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: -cantNum, // Negativo para mantener el estándar DB
        cost_unit: costUnit,
        total_loss: totalLoss,
        reason: motivo,
        notes: detalle,
        user: 'Sistema',
        previous_quantity: selectedProduct.quantity,
        new_quantity: selectedProduct.quantity - cantNum,
        is_synced: '1'
      }]);
      if (wasteError) throw wasteError;

      // B. Descontar del Lote (Con control de error)
      const { error: batchUpdateError } = await supabase
        .from('batches')
        .update({ quantity: selectedLote.quantity - cantNum })
        .eq('id', selectedLote.id);
      
      if (batchUpdateError) throw batchUpdateError;

      // C. Descontar del Producto General (Con control de error)
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ quantity: selectedProduct.quantity - cantNum })
        .eq('id', selectedProduct.id);
      
      if (productUpdateError) throw productUpdateError;

      // D. Registrar Movimiento en el Kardex (Con control de error)
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          batch_id: selectedLote.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          change_amount: -cantNum,
          previous_quantity: selectedLote.quantity,
          new_quantity: selectedLote.quantity - cantNum,
          operation_type: 'MERMA',
          reason: motivo,
          notes: detalle || 'Merma manual',
          user: 'Sistema',
          is_synced: 0
        }]);

      if (movementError) throw movementError;

      alert(`✅ REGISTRO EXITOSO\n\nSe han descontado ${cantNum.toFixed(3)} unidades (S/ ${totalLoss.toFixed(2)}) de ${selectedProduct.name}.`);
      
      // [ SALIDA ]: Notificamos el cambio al Inventario General y al Control de Lotes
      if (onProductSaved && selectedProduct && selectedLote) {
        const nuevaCantLote = selectedLote.quantity - cantNum;
        onProductSaved(
          { ...selectedProduct, quantity: selectedProduct.quantity - cantNum },
          selectedLote.id,
          nuevaCantLote
        );
      }

      onClose();
    } catch (e: any) {
      alert('Error al registrar merma: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1E293B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
      <div className="bg-white w-full max-w-lg border-2 border-[#1E293B] shadow-[8px_8px_0_0_#1E293B] relative flex flex-col max-h-[90vh]">
        
        {/* HEADER ROJO PARA INDICAR PELIGRO/PÉRDIDA */}
        <div className="bg-[#EF4444] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#1E293B] shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-white" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">Registrar Merma</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Salida por daño o pérdida</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white hover:text-[#EF4444] p-1 transition-colors border-2 border-transparent hover:border-[#1E293B]">
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL MODAL (Scrolleable si es muy largo) */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* 1. BUSCADOR DE PRODUCTO DESPLEGABLE */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
              { (selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO') 
              ? 'PRECIO / COSTO RETIRADO (S/)' 
              : (selectedProduct?.unit?.toUpperCase() === 'KG' ? 'CANTIDAD PERDIDA (KILOGRAMOS / GRAMOS)' : 'CANTIDAD PERDIDA (UNIDADES)') }
            </label>
            
            {selectedProduct ? (
              <div className="flex items-center justify-between border-2 border-[#EF4444] bg-[#FEF2F2] p-3 rounded-none">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[#EF4444] uppercase tracking-wider">Producto Seleccionado:</span>
                  <span className="text-xs font-black text-[#1E293B] uppercase mt-1">{selectedProduct.code} - {selectedProduct.name}</span>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="text-[#EF4444] hover:bg-white p-2 transition-colors cursor-pointer border-2 border-transparent hover:border-[#EF4444]"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="ESCRIBE CÓDIGO O NOMBRE..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-white border-2 border-[#E2E8F0] p-3 text-xs font-black text-[#1E293B] uppercase outline-none focus:border-[#EF4444] transition-colors"
                />
                {showDropdown && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[#1E293B] shadow-[4px_4px_0_0_#1E293B] z-50 max-h-48 overflow-y-auto custom-scrollbar">
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
                          className="flex flex-col p-3 hover:bg-[#F8FAFC] border-b border-[#E2E8F0] cursor-pointer group"
                        >
                          <span className="text-[9px] font-bold text-[#64748B] group-hover:text-[#EF4444]">{p.code} | Stock: {p.quantity}</span>
                          <span className="text-xs font-black text-[#1E293B] uppercase">{p.name}</span>
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

          {/* 2. SELECTOR DE LOTE */}
          {selectedProduct && (
            <div className="space-y-2 border-l-4 border-[#EF4444] pl-3 py-1">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest flex items-center gap-2">
                <Database size={14} className="text-[#EF4444]" /> 2. Seleccionar Lote Afectado *
              </label>
              <select 
                value={selectedLote?.id || ''}
                onChange={(e) => {
                  // Convertimos ambos a String para evitar bloqueos de tipo Número vs Texto
                  const loteEncontrado = lotes.find(l => String(l.id) === String(e.target.value));
                  setSelectedLote(loteEncontrado || null);
                }}
                disabled={loadingLotes || lotes.length === 0}
                className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[#1E293B] uppercase outline-none focus:border-[#EF4444] transition-colors cursor-pointer"
              >
                <option value="">{loadingLotes ? 'CARGANDO LOTES...' : lotes.length === 0 ? 'SIN LOTES CON STOCK' : '-- SELECCIONAR LOTE --'}</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>
                    F. Ingreso: {new Date(l.created_at).toLocaleDateString()} | Stock Restante: {l.quantity} | Costo: S/{Number(l.cost_unit).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                {(selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO') 
                ? 'Costo a descontar (S/)' 
                : (selectedProduct?.unit?.toUpperCase() === 'KG' ? 'Cantidad Perdida (Kilos / Gramos)' : 'Cantidad Perdida (Unidades)')}
              </label>
              <input 
                type="number"
                min="0"
                step="0.01"
                placeholder={(selectedProduct?.unit?.toUpperCase().includes('CONS') || selectedProduct?.category?.toUpperCase().includes('CONS') || motivo === 'USO INTERNO') 
                ? 'Ej: 15.00 (S/)' 
                : (selectedProduct?.unit?.toUpperCase() === 'KG' ? 'Ej: 1.500 (1 Kilo y medio)' : 'Ej: 2')}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[#1E293B] outline-none focus:border-[#EF4444] transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Motivo
              </label>
              <select 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[#1E293B] uppercase outline-none focus:border-[#EF4444] transition-colors"
              >
                <option value="DAÑADO">Producto Dañado</option>
                <option value="VENCIDO">Fecha Vencida</option>
                <option value="ROBO">Pérdida / Robo</option>
                <option value="USO INTERNO">Uso Interno</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
              Detalle / Observación
            </label>
            <textarea 
              rows={3}
              placeholder="Ej: Se cayó el frasco al momento de acomodar la estantería..."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[#1E293B] outline-none focus:border-[#EF4444] transition-colors resize-none"
            />
          </div>

        </div>

        {/* FOOTER Y BOTONES */}
        <div className="p-6 bg-[#F8FAFC] border-t-2 border-[#E2E8F0] flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-[#1E293B] hover:text-[#1E293B] transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedProduct || !selectedLote || !cantidad || parseFloat(cantidad) <= 0}
            className="bg-[#EF4444] text-white px-6 py-3 border-2 border-[#1E293B] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#1E293B] hover:text-[#EF4444] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none"
          >
            <Save size={16} /> Confirmar Merma
          </button>
        </div>

      </div>
    </div>
  );
};