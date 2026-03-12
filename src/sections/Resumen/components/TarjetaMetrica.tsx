// src/sections/Resumen/components/TarjetaMetrica.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react'; // <--- Se agrega la palabra 'type'

interface Props {
  titulo: string;
  valor: string | number;
  icono: LucideIcon;
  colorIcono: string;
  bgIcono: string;
  tendencia?: string;
  esPositivo?: boolean;
}

export const TarjetaMetrica: React.FC<Props> = ({ 
  titulo, 
  valor, 
  icono: Icon, 
  colorIcono, 
  bgIcono, 
  tendencia, 
  esPositivo 
}) => {
  return (
    <div className="bg-white border border-[#E2E8F0] p-5 shadow-sm flex flex-col relative overflow-hidden group hover:border-[#10B981] transition-colors">
      {/* Efecto visual de fondo al pasar el mouse */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${bgIcono} rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700 ease-out`}></div>
      
      <div className="flex justify-between items-start mb-3 relative z-10">
        <h3 className="text-[10px] font-black text-[#64748B] uppercase tracking-widest leading-tight w-2/3">
          {titulo}
        </h3>
        <div className={`p-2 ${bgIcono} ${colorIcono} rounded-none border border-transparent group-hover:border-current transition-colors`}>
          <Icon size={18} />
        </div>
      </div>
      
      <div className="relative z-10">
        <span className="text-2xl font-black text-[#1E293B] tracking-tight">{valor}</span>
      </div>
      
      {tendencia && (
        <div className="mt-3 text-[10px] font-bold font-mono relative z-10 flex items-center gap-1">
          <span className={esPositivo ? 'text-[#10B981]' : 'text-red-500'}>
            {tendencia}
          </span>
          <span className="text-[#94A3B8]">vs mes anterior</span>
        </div>
      )}
    </div>
  );
};