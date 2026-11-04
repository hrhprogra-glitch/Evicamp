import React from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';

interface Props {
  onNuevoAjuste: () => void; // salió del stock o conté lo que hay (components/ModalAjuste.tsx)
  children?: React.ReactNode;
}

export const HeaderConteos: React.FC<Props> = ({ onNuevoAjuste, children }) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] shrink-0">
      <div className="flex items-center gap-3" title="Lo que salió del stock, lo que falta y lo que sobra">
        <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
          <ClipboardCheck size={20} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
          Conteos
        </h1>
      </div>

      <div className="flex flex-col md:flex-row items-end md:items-center gap-3 sm:gap-4 w-full xl:w-auto justify-end">
        {children}
        <button
          id="btn-nuevo-ajuste"
          style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
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
          className="boton-cabecera bg-[var(--color-warning)] text-[#030712] px-6 py-3 border-2 border-[var(--color-warning)] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-warning)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-warning)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-full md:w-auto justify-center whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo ajuste
        </button>
      </div>
    </div>
  );
};
