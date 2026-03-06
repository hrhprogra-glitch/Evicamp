import React, { useState } from 'react';
import { X, Save, AlertTriangle, Package } from 'lucide-react';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Product[];
}

export const ModalMerma: React.FC<Props> = ({ isOpen, onClose, productos }) => {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('DAÑADO');
  const [detalle, setDetalle] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    // AQUÍ SE CONECTARÁ A SUPABASE EN EL FUTURO
    const dataPreparada = { productoId, cantidad, motivo, detalle };
    console.log("MERMA LISTA PARA REGISTRAR:", dataPreparada);
    alert(`MÓDULO EN PREPARACIÓN.\n\nSimulación de registro:\nProducto ID: ${productoId}\nCantidad: ${cantidad}\nMotivo: ${motivo}\n\nEn la próxima fase esto se guardará en la tabla 'waste'.`);
    
    // Limpiar y cerrar
    setProductoId('');
    setCantidad('');
    setMotivo('DAÑADO');
    setDetalle('');
    onClose();
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
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest flex items-center gap-2">
              <Package size={12} /> Seleccionar Producto
            </label>
            <select 
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] p-3 text-xs font-bold text-[#1E293B] uppercase outline-none focus:border-[#EF4444] transition-colors"
            >
              <option value="">-- BUSCAR / SELECCIONAR PRODUCTO --</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name} (Stock: {p.quantity})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Cantidad Perdida
              </label>
              <input 
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
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
            disabled={!productoId || !cantidad}
            className="bg-[#EF4444] text-white px-6 py-3 border-2 border-[#EF4444] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#1E293B] hover:border-[#1E293B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Preparar Registro
          </button>
        </div>

      </div>
    </div>
  );
};