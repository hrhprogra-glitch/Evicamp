// src/sections/Punto-de-venta/components/ModalNombreEspera.tsx
import React, { useEffect, useState } from 'react';
import { Pause, X, Check } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  defaultNombre: string;
  total: number;
  itemsCount: number;
  onConfirm: (nombre: string) => void;
  onClose: () => void;
}

export const ModalNombreEspera: React.FC<Props> = ({
  isOpen,
  defaultNombre,
  total,
  itemsCount,
  onConfirm,
  onClose
}) => {
  const [nombre, setNombre] = useState(defaultNombre);

  useCerrarConEscape(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setNombre(defaultNombre);
    const t = setTimeout(() => {
      const input = document.getElementById('input-nombre-espera') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 40);
    return () => clearTimeout(t);
  }, [isOpen, defaultNombre]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.stopPropagation();
        const focusables = Array.from(
          document.querySelectorAll('#modal-nombre-espera input, #modal-nombre-espera button')
        ) as HTMLElement[];
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalNombre = nombre.trim() || defaultNombre || 'Ticket';
    onConfirm(finalNombre);
  };

  return (
    <div
      id="modal-nombre-espera"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-mono"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pausar ticket en espera"
        className="w-full max-w-md bg-[var(--color-surface,#fff)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col overflow-hidden"
      >
        {/* Cabecera */}
        <div className="bg-[var(--color-ink)] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Pause size={18} className="text-[var(--color-warning)]" />
            <h2 className="text-sm font-black uppercase tracking-wider">Pausar Ticket en Espera</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-[var(--color-danger)] text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-[var(--color-bg)] px-4 py-2.5 border-b-2 border-[var(--color-border)] flex items-center justify-between text-xs font-black uppercase text-[var(--color-ink)]">
          <span>{itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}</span>
          <span className="text-[var(--color-accent)] font-black text-sm">S/ {total.toFixed(2)}</span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="input-nombre-espera" className="text-xs font-black uppercase text-[var(--color-ink)]">
              Nombre o Nota para identificar el Ticket:
            </label>
            <input
              id="input-nombre-espera"
              type="text"
              autoComplete="off"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Don Mario, Mesa 3, Delivery Juan..."
              className="w-full bg-white border-2 border-[var(--color-border)] px-3 py-2.5 text-sm font-black uppercase outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]"
            />
            <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
              Enter guarda en espera · Esc cancela
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[var(--color-border)] text-[var(--color-ink)] text-xs font-black uppercase hover:border-[var(--color-ink)] transition-colors cursor-pointer"
            >
              Cancelar (Esc)
            </button>
            <button
              id="btn-confirmar-espera"
              type="submit"
              className="px-5 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-warning)] text-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer"
            >
              <Check size={14} /> Guardar (Enter)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
