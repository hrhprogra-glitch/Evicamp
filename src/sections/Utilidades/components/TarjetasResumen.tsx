// src/sections/Utilidades/components/TarjetasResumen.tsx
import React from 'react';
import { DollarSign, ArrowDownToLine, ArrowUpFromLine, Activity, Wallet, Filter } from 'lucide-react';
import { formatearMonto } from '../../../utils/formato';

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
    <div className="flex flex-col gap-3 font-mono">
      {filtrado && (
        <div className="flex items-center gap-2 text-[12px] font-black text-[var(--color-accent-shadow)] uppercase tracking-widest">
          <Filter size={12} strokeWidth={3} />
          Mostrando totales solo de los productos filtrados en la tabla
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Ingreso Total Bruto (Green) */}
        <div className="tarjeta-sobria bg-[var(--color-surface)] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-10 h-10 bg-[var(--color-accent-bg)] border border-[var(--color-accent)] flex items-center justify-center text-[var(--color-accent)] rounded-none shrink-0">
            <ArrowUpFromLine size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-wider truncate">Ingreso Total Bruto</p>
            <p className="text-lg xl:text-2xl font-black whitespace-nowrap text-[var(--color-accent)]">S/ {formatearMonto(ingresos)}</p>
          </div>
        </div>

        {/* 2. Inversión (Costo) */}
        <div className="tarjeta-sobria bg-[var(--color-surface)] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-10 h-10 bg-[var(--color-bg-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)] rounded-none shrink-0">
            <ArrowDownToLine size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest truncate">Inversión (Costo)</p>
            <p className="text-lg xl:text-2xl font-black whitespace-nowrap text-[var(--color-ink)]">S/ {formatearMonto(costos)}</p>
          </div>
        </div>

        {/* 3. Pérdida Mermas (Danger/Red) */}
        <div className="tarjeta-sobria bg-[var(--color-surface)] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-10 h-10 bg-[var(--color-danger-bg)] border border-[var(--color-danger)] flex items-center justify-center text-[var(--color-danger)] rounded-none shrink-0">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-danger)] uppercase tracking-widest truncate">Pérdida Mermas</p>
            <p className="text-lg xl:text-2xl font-black whitespace-nowrap text-[var(--color-danger)]">S/ {formatearMonto(mermas)}</p>
          </div>
        </div>

        {/* 4. Gastos Operativos (Orange) */}
        <div className="tarjeta-sobria bg-[var(--color-surface)] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none">
          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 border border-orange-500 flex items-center justify-center text-orange-500 rounded-none shrink-0">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-orange-500 uppercase tracking-widest truncate">Gastos Operativos</p>
            <p className="text-lg xl:text-2xl font-black whitespace-nowrap text-orange-500">S/ {formatearMonto(gastosOperativos)}</p>
          </div>
        </div>

        {/* 5. Utilidad Neta (Green shadow) */}
        <div className="tarjeta-sobria bg-[var(--color-surface)] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none col-span-2 lg:col-span-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[var(--color-accent-bg)] border border-[var(--color-accent-shadow)] flex items-center justify-center text-[var(--color-accent-shadow)] rounded-none shrink-0">
            <DollarSign size={24} strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-accent-shadow)] uppercase tracking-widest truncate">Utilidad Neta</p>
            <p className="text-xl xl:text-3xl font-black text-[var(--color-accent-shadow)] whitespace-nowrap">S/ {formatearMonto(utilidad)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
