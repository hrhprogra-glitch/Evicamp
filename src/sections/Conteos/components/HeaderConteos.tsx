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

      <div className="flex flex-col md:flex-row items-end md:items-center gap-3 sm:gap-4 max-w-full justify-end">
        {children}
        <button
          id="btn-nuevo-ajuste"
          style={{ '--icono': 'var(--color-warning)' } as React.CSSProperties}
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
          className="boton-cabecera px-4 sm:px-6 py-3 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none w-full md:w-auto whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo ajuste
        </button>
      </div>
    </div>
  );
};
