import React from 'react';
import { X, ShoppingCart } from 'lucide-react';
import type { Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fiado: Fiado | null;
}

export const ModalDetalleFiado: React.FC<Props> = ({ isOpen, onClose, fiado }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  
  // 🔥 FOCUS TRAP PARA MODAL DETALLE FIADO
  React.useEffect(() => {
    if (!isOpen) return;

    // 🔥 AUTO-FOCUS MAGNÉTICO AL HACER CLIC EN EL FONDO
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
      setTimeout(() => {
        document.getElementById('btn-cerrar-detalle-fiado')?.focus();
      }, 50);
    };
    document.addEventListener('click', handleGlobalClick);

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      // ================= FOCUS TRAP PARA TAB =================
      if (e.key === 'Tab') {
        e.stopPropagation(); 
        
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled])')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el => 
          el.closest('div[role="dialog"]') && 
          el.tabIndex !== -1 && 
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        if (modalFocusables.length > 0) {
          const first = modalFocusables[0];
          const last = modalFocusables[modalFocusables.length - 1];
          
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      // =======================================================
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isOpen]);

  // 🔥 AUTO-FOCUS AL ABRIR
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        document.getElementById('btn-cerrar-detalle-fiado')?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !fiado) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.8)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-[var(--color-info)]" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              Detalle de Productos
            </h2>
          </div>
          <button id="btn-cerrar-detalle-fiado" onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"><X size={20} /></button>
        </div>

        {/* BODY */}
        <div className="p-6 flex flex-col gap-4 overflow-hidden flex-1">
          <div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4">
            <p className="text-xs font-black text-[var(--color-muted)] uppercase">Cliente</p>
            <p className="text-lg font-black text-[var(--color-ink)] uppercase leading-tight">{fiado.clienteNombre}</p>
            <p className="text-[12px] font-bold text-[var(--color-muted)] mt-1">
              Fecha Emisión: {new Date(fiado.fechaEmision).toLocaleDateString()}
            </p>
          </div>

          {/* LISTA DE PRODUCTOS (Sin barra de scroll visible) */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {!fiado.detalles || fiado.detalles.length === 0 ? (
              <p className="text-center text-[var(--color-subtle)] font-bold text-xs py-4 uppercase">No hay detalles registrados.</p>
            ) : (
              fiado.detalles.map(d => (
                <div key={d.productoId} className="flex justify-between items-center border-2 border-[var(--color-border)] p-3 hover:border-[var(--color-info)] transition-colors bg-[var(--color-bg)]">
                  <div className="flex-1">
                    <p className="text-xs font-black text-[var(--color-ink)] uppercase">{d.name}</p>
                    <p className="text-[12px] font-bold text-[var(--color-muted)]">{d.qty} unid. x S/ {d.price.toFixed(2)}</p>
                  </div>
                  <span className="text-sm font-black text-[var(--color-ink)]">S/ {Number(d.subtotal || 0).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {/* FOOTER - TOTAL */}
          <div className="shrink-0 border-t-2 border-[var(--color-border)] pt-4 mt-2 flex justify-between items-center">
            <span className="text-sm font-black uppercase text-[var(--color-muted)]">Monto Total:</span>
            <span className="text-xl font-black text-[var(--color-ink)]">S/ {fiado.montoOriginal.toFixed(2)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
