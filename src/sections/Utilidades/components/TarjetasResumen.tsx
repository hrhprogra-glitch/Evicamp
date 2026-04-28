// src/sections/Utilidades/components/TarjetasResumen.tsx
import React from 'react';
import { DollarSign, ArrowDownToLine, ArrowUpFromLine, Activity, Wallet } from 'lucide-react';

interface Props {
  ingresos: number;
  costos: number;
  mermas: number;
  gastosOperativos: number;
  utilidad: number;
}

export const TarjetasResumen: React.FC<Props> = ({ ingresos, costos, mermas, gastosOperativos, utilidad }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 font-sans">
      <div className="bg-white border border-[#065F46] p-4 flex gap-3 items-center rounded-none shadow-[2px_2px_0px_0px_rgba(6,95,70,0.1)]">
        <div className="w-10 h-10 bg-[#ECFDF5] border border-[#059669] flex items-center justify-center text-[#059669] rounded-none">
          <ArrowUpFromLine size={20} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[9px] font-black text-[#64748B] uppercase tracking-tighter">Ingreso Total Bruto</p>
          <p className="text-lg font-bold text-[#1E293B] font-mono">S/ {ingresos.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="bg-white border border-[#E2E8F0] p-4 flex gap-3 items-center rounded-none">
        <div className="w-10 h-10 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 rounded-none">
          <ArrowDownToLine size={20} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">Inversión (Costo)</p>
          <p className="text-lg font-bold text-[#1E293B] font-mono">S/ {costos.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="bg-white border border-[#E2E8F0] p-4 flex gap-3 items-center rounded-none">
        <div className="w-10 h-10 bg-red-50 border border-red-100 flex items-center justify-center text-red-500 rounded-none">
          <Activity size={20} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">Pérdida Mermas</p>
          <p className="text-lg font-bold text-[#1E293B] font-mono">S/ {mermas.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="bg-white border border-[#E2E8F0] p-4 flex gap-3 items-center rounded-none">
        <div className="w-10 h-10 bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 rounded-none">
          <Wallet size={20} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">Gastos Operativos</p>
          <p className="text-lg font-bold text-[#1E293B] font-mono">S/ {gastosOperativos.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-[#065F46] border-2 border-[#065F46] p-4 flex gap-3 items-center rounded-none shadow-[4px_4px_0px_0px_rgba(6,95,70,0.2)] text-white">
        <div className="w-10 h-10 bg-white flex items-center justify-center text-[#065F46] rounded-none">
          <DollarSign size={22} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[9px] font-black text-[#ECFDF5] uppercase tracking-widest">Utilidad Neta</p>
          <p className="text-xl font-black text-white font-mono">S/ {utilidad.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};