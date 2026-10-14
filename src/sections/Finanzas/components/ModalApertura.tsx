// src/sections/Finanzas/components/ModalApertura.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalApertura: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [monto, setMonto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnCloseRef = useRef<HTMLButtonElement>(null);
  const btnSubmitRef = useRef<HTMLButtonElement>(null);

  // Auto-Focus en el input de monto al abrir
  useEffect(() => {
    if (!isOpen) return;

    const enfocar = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    enfocar();
    const t1 = setTimeout(enfocar, 30);
    const t2 = setTimeout(enfocar, 100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen]);

  // Focus trap y navegación por teclado en captura
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const modalEl = document.getElementById('modal-apertura-caja');
        if (!modalEl) return;

        const focusables = Array.from(
          modalEl.querySelectorAll('input:not([disabled]), button:not([disabled])')
        ) as HTMLElement[];

        if (focusables.length === 0) return;

        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIndex = 0;

        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
        }

        const nextEl = focusables[nextIndex];
        if (nextEl) {
          nextEl.focus();
          if (nextEl instanceof HTMLInputElement) nextEl.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDownCapture, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApertura = async () => {
    if (!monto || Number(monto) < 0) return;
    setIsSubmitting(true);

    const sessionId = Date.now().toString();

    const { error } = await supabase.from('cash_sessions').insert([{
      id: sessionId,
      opening_balance: Number(monto),
      status: 'OPEN',
      opened_at: new Date().toISOString(),
      is_synced: '1'
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Error al aperturar caja: " + error.message);
    } else {
      setMonto('');
      onSuccess();
      onClose();
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-apertura-title"
      id="modal-apertura-caja"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(var(--alto-pantalla)*0.94)] overflow-y-auto bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-sm flex flex-col rounded-none animate-fade-in"
      >
        
        <div className="bg-[var(--color-accent)] p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-[var(--color-ink)]">
          <h2 id="modal-apertura-title" className="font-black uppercase tracking-widest flex items-center gap-2 text-sm">
            <Wallet size={18} /> Aperturar Caja
          </h2>
          <button 
            ref={btnCloseRef}
            onClick={onClose} 
            title="Cerrar (Esc)"
            aria-label="Cerrar modal"
            className="p-1 hover:text-white focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white transition-all cursor-pointer rounded-none"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest text-center">
            Ingresa el dinero físico (sencillo) con el que inicia la caja hoy.
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="input-monto-apertura" className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              Monto Inicial (S/)
            </label>
            <input 
              id="input-monto-apertura"
              ref={inputRef}
              autoComplete="off" 
              type="number" 
              step="any"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  btnSubmitRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  btnCloseRef.current?.focus();
                }
              }}
              placeholder="Ej. 100.00"
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-3 text-2xl font-black text-center outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:ring-offset-2 focus:border-[var(--color-accent)] focus:bg-white transition-all rounded-none"
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)]">
          <button 
            ref={btnSubmitRef}
            id="btn-confirmar-apertura"
            onClick={handleApertura}
            disabled={!monto || isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
              }
            }}
            className="w-full bg-[var(--color-ink)] text-white p-3 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-2 transition-all disabled:opacity-50 border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
          >
            {isSubmitting ? 'Abriendo...' : <><CheckCircle2 size={18} /> Confirmar Apertura</>}
          </button>
        </div>

      </div>
    </div>
  );
};