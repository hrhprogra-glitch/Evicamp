import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';

interface Props {
  onNuevaMerma: () => void;
  children?: React.ReactNode;
}

export const HeaderMermas: React.FC<Props> = ({ onNuevaMerma, children }) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 lg:p-4 bg-white border-b-2 border-[var(--color-ink)] shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-danger)] rounded-none">
          <AlertTriangle size={24} className="text-[var(--color-danger)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest">
            Control de Pérdidas
          </h1>
          <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-[0.2em] mt-1">
            Registro de pérdidas, vencimientos y uso interno
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end md:items-center gap-3 sm:gap-4 w-full xl:w-auto justify-end">
        {children}
        <button 
          id="btn-registrar-merma"
          onClick={onNuevaMerma}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              e.stopPropagation();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const searchInput = document.getElementById("buscador-global-mermas") as HTMLInputElement | null;
              if (searchInput) {
                searchInput.focus();
                searchInput.select();
              }
            }
          }}
          className="bg-[var(--color-danger)] text-white px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-danger)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-full md:w-auto justify-center"
        >
          <Plus size={16} /> Registrar Merma
        </button>
      </div>
    </div>
  );
};