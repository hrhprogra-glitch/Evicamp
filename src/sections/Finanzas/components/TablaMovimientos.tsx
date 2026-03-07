// src/sections/Finanzas/components/TablaMovimientos.tsx
import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { CashMovement } from '../types';

interface Props {
  movimientos: CashMovement[];
}

export const TablaMovimientos: React.FC<Props> = ({ movimientos }) => {
  return (
    <div className="w-full bg-white flex flex-col font-mono h-full overflow-hidden">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-[#1E293B] text-white sticky top-0">
            <tr>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Hora</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Tipo</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Descripción</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Método</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B] text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#64748B] font-bold text-xs uppercase">
                  No hay movimientos registrados en esta sesión.
                </td>
              </tr>
            ) : (
              movimientos.map((mov) => (
                <tr key={mov.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="p-4 text-xs font-bold text-[#64748B]">
                    {new Date(mov.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-1 w-max border-2 rounded-none ${
                      mov.type === 'INGRESO' ? 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                    }`}>
                      {mov.type === 'INGRESO' ? <ArrowUpFromLine size={12} /> : <ArrowDownToLine size={12} />}
                      {mov.type}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-black text-[#1E293B] uppercase">{mov.description}</td>
                  <td className="p-4 text-xs font-bold text-[#64748B] uppercase">{mov.payment_type}</td>
                  <td className={`p-4 text-right text-sm font-black ${mov.type === 'INGRESO' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {mov.type === 'INGRESO' ? '+' : '-'} S/ {Number(mov.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};