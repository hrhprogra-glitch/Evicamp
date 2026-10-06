import React from 'react';
import { Package, Plus } from 'lucide-react';
import { usePermiso } from '../../../utils/permisos';

interface Props {
  onNuevoSKU: () => void;
  children?: React.ReactNode;
}

export const HeaderInventario: React.FC<Props> = ({ onNuevoSKU, children }) => {
  // Cada acción aparece solo si el empleado tiene el permiso correspondiente
  const puedeCrearProductos = usePermiso('almacen_crear_editar_productos');
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 lg:p-4 bg-white border-b-2 border-[var(--color-ink)] shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none">
          <Package size={24} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest">
            Control de Stock
          </h1>
          <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-[0.2em] mt-1">
            Gestión de Almacén, Precios y Valorización
          </p>
        </div>
      </div>
      
      {/* PANEL DE ACCIONES RÁPIDAS */}
      <div className="flex flex-col md:flex-row items-end md:items-center gap-3 sm:gap-4 w-full xl:w-auto justify-end">
        
        {/* METRICS (CHILDREN) */}
        {children}
        
        {/* 1. NUEVO PRODUCTO */}
        {puedeCrearProductos && (
        <button 
          id="btn-nuevo-producto"
          onClick={onNuevoSKU}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault(); e.stopPropagation();
              const btnLimpiar = document.getElementById("btn-limpiar-filtros-inventario");
              if (btnLimpiar) btnLimpiar.focus(); else document.getElementById("filtro-orden-inventario")?.focus();
            }
            if (e.key === "ArrowDown") {
              e.preventDefault(); e.stopPropagation();
              (document.querySelector('div[role="button"]') as HTMLElement)?.focus();
            }
          }}
          className="bg-[var(--color-accent)] text-[var(--color-ink)] px-6 py-4 short:py-2.5 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
        )}
      </div>
    </div>
  );
};

