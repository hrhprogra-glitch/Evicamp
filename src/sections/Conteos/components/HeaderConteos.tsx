import React from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';

interface Props {
  onNuevoAjuste: () => void; // salió del stock o conté lo que hay (components/ModalAjuste.tsx)
  children?: React.ReactNode;
}

export const HeaderConteos: React.FC<Props> = ({ onNuevoAjuste, children }) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 lg:p-4 bg-white border-b-2 border-[var(--color-ink)] shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--color-warning)] border-2 border-[var(--color-ink)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-ink)] rounded-none">
          <ClipboardCheck size={24} className="text-[var(--color-ink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest">
            Conteos
          </h1>
          <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-[0.2em] mt-1">
            Lo que salió del stock, lo que falta y lo que sobra
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end md:items-center gap-3 sm:gap-4 w-full xl:w-auto justify-end">
        {children}
        <button
          id="btn-nuevo-ajuste"
          onClick={onNuevoAjuste}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
              e.preventDefault();
              e.stopPropagation();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const searchInput = document.getElementById("buscador-global-conteos") as HTMLInputElement | null;
              if (searchInput) {
                searchInput.focus();
                searchInput.select();
              }
            }
          }}
          className="bg-[var(--color-warning)] text-[var(--color-ink)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-warning)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-full md:w-auto justify-center whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo ajuste
        </button>
      </div>
    </div>
  );
};
