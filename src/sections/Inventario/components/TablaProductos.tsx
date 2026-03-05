import React from 'react';
import { Database, ArrowUpDown, Search, Edit, Trash2 } from 'lucide-react';
import { EtiquetaStock } from './EtiquetaStock';
import type { Product } from '../types';

interface Props {
  loading: boolean;
  productos: Product[];
}

export const TablaProductos: React.FC<Props> = ({ loading, productos }) => {
  return (
    <div className="border border-[#E2E8F0] flex-1 flex flex-col bg-white relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Database size={24} className="text-[#10B981] animate-bounce" />
            <span className="text-[10px] font-black text-[#1E293B] uppercase tracking-[0.2em]">Sincronizando con DB...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 bg-[#1E293B] text-white p-4 text-[9px] font-black uppercase tracking-[0.2em] shrink-0">
        <div className="col-span-2">Código / SKU</div>
        <div className="col-span-4">Descripción del Item</div>
        <div className="col-span-2 text-right">Precio Venta</div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <ArrowUpDown size={10}/> Stock Actual
        </div>
        <div className="col-span-2 text-center">Acciones</div>
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {!loading && productos.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest flex flex-col items-center justify-center h-full gap-2">
            <Search size={32} className="text-[#E2E8F0] mb-2" />
            No se registran productos con esos parámetros.
          </div>
        ) : (
          productos.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-center p-4 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors group">
              <div className="col-span-2 flex flex-col gap-1 items-start">
                <span className="bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0] text-[9px] font-bold text-[#64748B] rounded-none">
                  {item.code}
                </span>
              </div>
              <div className="col-span-4 pr-4">
                <p className="font-black text-xs uppercase text-[#1E293B] truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-black text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 tracking-wider border border-[#A7F3D0]">
                    {item.category}
                  </span>
                  <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Costo: S/ {item.cost.toFixed(2)}</p>
                </div>
              </div>
              <div className="col-span-2 font-bold text-sm text-[#1E293B] text-right">
                S/ {item.price.toFixed(2)}
              </div>
              <div className="col-span-2 text-center">
                <EtiquetaStock qty={item.quantity} minStock={item.minStock} unit={item.unit} />
              </div>
              <div className="col-span-2 text-center flex items-center justify-center gap-3">
                <button className="text-[#64748B] hover:text-[#10B981] transition-colors cursor-pointer" title="Editar">
                  <Edit size={16} />
                </button>
                <button className="text-[#64748B] hover:text-red-500 transition-colors cursor-pointer" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};