// src/sections/Inventario/components/ModalProducto.tsx
import React from 'react';
import { X, Save, Box } from 'lucide-react';

interface ModalProductoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalProducto: React.FC<ModalProductoProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-mono">
      {/* Fondo oscuro desenfocado */}
      <div 
        className="absolute inset-0 bg-[#1E293B]/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Contenedor del Formulario (Panel Técnico) */}
      <div className="relative w-full max-w-3xl bg-white border-2 border-[#1E293B] shadow-[8px_8px_0_0_#10B981] flex flex-col max-h-[90vh]">
        
        {/* CABECERA */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1E293B] text-[#10B981]">
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1E293B] uppercase tracking-tighter">
                Registrar Nuevo SKU
              </h2>
              <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mt-1">
                Ficha Técnica de Mercancía
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Bloque 1: Identidad */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
              Descripción del Producto <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="EJ: POLLO X KILO, VINO TABERNERO..."
              className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none text-[#1E293B] placeholder:text-[#CBD5E1]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloque 2: Clasificación */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Categoría Familia
              </label>
              <select className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#1E293B] cursor-pointer appearance-none">
                <option value="GENERAL">GENERAL</option>
                <option value="ABARROTES">ABARROTES</option>
                <option value="BEBIDAS">BEBIDAS</option>
                <option value="CARNE">CARNE</option>
                <option value="LACTEOS">LACTEOS</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Tipo de Control (Venta)
              </label>
              <select className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#1E293B] cursor-pointer appearance-none">
                <option value="UND">POR UNIDAD (UND)</option>
                <option value="WEIGHT">POR PESO (KG / GR)</option>
              </select>
            </div>

            {/* Bloque 3: Códigos */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Código Interno (SKU)
              </label>
              <input 
                type="text" 
                placeholder="EJ: COD-001"
                className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#1E293B]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Código de Barras (Escaner)
              </label>
              <input 
                type="text" 
                placeholder="ESCANEAR O ESCRIBIR..."
                className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#10B981] tracking-widest"
              />
            </div>

            {/* Bloque 4: Finanzas */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Costo Base (S/)
              </label>
              <input 
                type="number" step="0.01"
                placeholder="0.00"
                className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#1E293B]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Precio de Venta (S/)
              </label>
              <input 
                type="number" step="0.01"
                placeholder="0.00"
                className="w-full p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-black uppercase focus:border-[#10B981] outline-none text-[#059669]"
              />
            </div>

            {/* Bloque 5: Inventario Crítico */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Stock Inicial
              </label>
              <input 
                type="number" step="0.01"
                placeholder="0"
                className="w-full p-3 bg-white border border-[#E2E8F0] text-xs font-bold uppercase focus:border-[#10B981] outline-none text-[#1E293B]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest">
                Alerta de Stock Mínimo
              </label>
              <input 
                type="number" step="0.01"
                placeholder="5"
                className="w-full p-3 bg-red-50 border border-red-200 text-xs font-bold uppercase focus:border-red-500 outline-none text-red-600"
              />
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL (BOTONES) */}
        <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 border border-[#E2E8F0] bg-white text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:text-[#1E293B] hover:border-[#1E293B] transition-colors"
          >
            Cancelar
          </button>
          
          <button 
            className="px-6 py-3 border-2 border-[#1E293B] bg-[#10B981] text-[10px] font-black uppercase tracking-widest text-[#1E293B] hover:bg-[#1E293B] hover:text-[#10B981] transition-colors flex items-center gap-2 shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            <Save size={16} /> Guardar Registro
          </button>
        </div>

      </div>
    </div>
  );
};