import React from 'react';
import { Package, Database, Plus } from 'lucide-react';

interface Props {
  onIngresoStock: () => void;
  onNuevoSKU: () => void;
}

export const HeaderInventario: React.FC<Props> = ({ onIngresoStock, onNuevoSKU }) => {
  return (
    <div className="bg-white border-b border-[#E2E8F0] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 rounded-none relative shrink-0">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-[#1E293B] flex items-center gap-3">
          <Package size={24} className="text-[#10B981]"/> Catálogo de Existencias
        </h1>
        <p className="text-[10px] font-bold text-[#64748B] mt-2 tracking-widest uppercase">
          Gestión de Almacén, Precios y Valorización
        </p>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={onIngresoStock}
          className="bg-[#1E293B] text-[#10B981] px-6 py-4 border-2 border-[#1E293B] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white hover:text-[#1E293B] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_#10B981] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <Database size={18} /> Ingresar Stock
        </button>

        <button 
          onClick={onNuevoSKU}
          className="bg-[#10B981] text-[#1E293B] px-6 py-4 border-2 border-[#1E293B] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-[#1E293B] hover:text-[#10B981] hover:border-[#10B981] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <Plus size={18} /> Nuevo SKU
        </button>
      </div>
    </div>
  );
};