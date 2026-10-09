import React from 'react';
import { Package, Database, Plus, AlertTriangle } from 'lucide-react';

interface Props {
  onIngresoStock: () => void;
  onNuevoSKU: () => void;
  onRegistrarMerma: () => void; // <-- AGREGA ESTA LÍNEA
}

export const HeaderInventario: React.FC<Props> = ({ onIngresoStock, onNuevoSKU, onRegistrarMerma }) => {
  return (
    <div className="bg-[var(--color-surface)] border-b border-[#E2E8F0] p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 rounded-none relative shrink-0">
      <div>
        <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tighter text-[var(--color-ink)] flex items-center gap-3">
          <Package size={22} className="text-[var(--color-success)]"/> Catálogo de Existencias
        </h1>
        <p className="text-[10px] font-bold text-[#64748B] mt-2 tracking-widest uppercase">
          Gestión de Almacén, Precios y Valorización
        </p>
      </div>

      {/* PANEL DE ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap gap-2 sm:gap-3 lg:gap-4 w-full md:w-auto">

        {/* 1. NUEVO PRODUCTO */}
        <button
          onClick={onNuevoSKU}
          className="bg-[var(--color-success)] text-[var(--color-ink)] px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 lg:gap-3 hover:bg-[var(--color-ink)] hover:text-[var(--color-success)] hover:border-[var(--color-success)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <Plus size={18} /> <span className="whitespace-nowrap">Nuevo Producto</span>
        </button>

        {/* 2. INGRESAR LOTE */}
        <button
          onClick={onIngresoStock}
          className="bg-[var(--color-ink)] text-[var(--color-success)] px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 lg:gap-3 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-success)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <Database size={18} /> <span className="whitespace-nowrap">Ingresar Lote</span>
        </button>

        {/* 3. REGISTRAR MERMA */}
        <button
          onClick={onRegistrarMerma}
          className="bg-[var(--color-surface)] text-[var(--color-danger)] px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 border-2 border-[var(--color-danger)] font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 lg:gap-3 hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-danger)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <AlertTriangle size={18} /> <span className="whitespace-nowrap">Registrar Merma</span>
        </button>
      </div>
    </div>
  );
};