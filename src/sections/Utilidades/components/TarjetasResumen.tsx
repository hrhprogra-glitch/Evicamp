// src/sections/Utilidades/components/TarjetasResumen.tsx
import React from 'react';
import { DollarSign, ArrowDownToLine, ArrowUpFromLine, Activity, Wallet, Filter } from 'lucide-react';

interface Props {
  ingresos: number;
  costos: number;
  mermas: number;
  gastosOperativos: number;
  utilidad: number;
  filtrado?: boolean;
}

export const TarjetasResumen: React.FC<Props> = ({ ingresos, costos, mermas, gastosOperativos, utilidad, filtrado }) => {
  return (
    <div className="flex flex-col gap-3 font-sans">
      {filtrado && (
        <div className="flex items-center gap-2 text-[12px] font-black text-[var(--color-accent-shadow)] uppercase tracking-widest">
          <Filter size={12} strokeWidth={3} />
          Mostrando totales solo de los productos filtrados en la tabla
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-[var(--color-accent-shadow)] p-3 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center min-w-0 rounded-none shadow-[2px_2px_0px_0px_rgba(6,95,70,0.1)]">
          <div className="w-12 h-12 bg-[var(--color-accent-bg)] border border-[var(--color-accent-dark)] flex items-center justify-center text-[var(--color-accent-dark)] rounded-none shrink-0">
            <ArrowUpFromLine size={24} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-wider">Ingreso Total Bruto</p>
            <p className="text-lg xl:text-2xl font-bold whitespace-nowrap text-[var(--color-ink)] font-mono">S/ {ingresos.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] p-3 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 rounded-none shrink-0">
            <ArrowDownToLine size={24} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Inversión (Costo)</p>
            <p className="text-lg xl:text-2xl font-bold whitespace-nowrap text-[var(--color-ink)] font-mono">S/ {costos.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] p-3 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-12 h-12 bg-red-50 border border-red-100 flex items-center justify-center text-red-500 rounded-none shrink-0">
            <Activity size={24} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Pérdida Mermas</p>
            <p className="text-lg xl:text-2xl font-bold whitespace-nowrap text-[var(--color-ink)] font-mono">S/ {mermas.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] p-3 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-12 h-12 bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 rounded-none shrink-0">
            <Wallet size={24} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Gastos Operativos</p>
            <p className="text-lg xl:text-2xl font-bold whitespace-nowrap text-[var(--color-ink)] font-mono">S/ {gastosOperativos.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-[var(--color-accent-shadow)] border-2 border-[var(--color-accent-shadow)] p-3 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center min-w-0 rounded-none shadow-[4px_4px_0px_0px_rgba(6,95,70,0.2)] text-white col-span-2 lg:col-span-1">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white flex items-center justify-center text-[var(--color-accent-shadow)] rounded-none shrink-0">
            <DollarSign size={28} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-accent-bg)] uppercase tracking-widest">Utilidad Neta</p>
            <p className="text-xl xl:text-3xl font-black text-white font-mono whitespace-nowrap">S/ {utilidad.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};