import React, { useState, useEffect } from 'react';
import { X, Coffee, Banknote, ShoppingCart } from 'lucide-react';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  producto: Product | null;
  onClose: () => void;
  onConfirm: (precio: number, cantidad: number) => void;
}

export const ModalPrecioConsumo: React.FC<Props> = ({ isOpen, producto, onClose, onConfirm }) => {
  const [precioAjustado, setPrecioAjustado] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPrecioAjustado('');
    }
  }, [isOpen]);

  if (!isOpen || !producto) return null;

  const handleSubmit = () => {
    const precioFinal = parseFloat(precioAjustado);
    if (!isNaN(precioFinal) && precioFinal >= 0) {
      onConfirm(precioFinal, 1);
      setPrecioAjustado('');
    }
  };

  const handleClose = () => {
    setPrecioAjustado('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="max-h-[calc(var(--alto-pantalla)*0.94)] overflow-y-auto bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col overflow-hidden">
        
        {/* Cabecera Naranja */}
        <div className="bg-[var(--color-warning-dark)] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[var(--color-ink)]">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Coffee size={20} /> Asignar Consumo
          </h2>
          <button 
            id="consumo-btn-close"
            onClick={handleClose} 
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                  document.getElementById('consumo-btn-confirm')?.focus();
                } else {
                  document.getElementById('consumo-input-precio')?.focus();
                }
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('consumo-input-precio')?.focus();
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('consumo-btn-confirm')?.focus();
              }
              if (e.key === 'Delete') {
                e.preventDefault();
                if (precioAjustado === '') handleClose();
                else setPrecioAjustado('');
              }
            }}
            className="hover:text-[var(--color-ink)] focus:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-white transition-all cursor-pointer p-1"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-4">
            <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest mb-1">Registro Operativo</p>
            <h3 className="text-lg font-black text-[var(--color-ink)] uppercase mb-2 leading-tight">{producto.name}</h3>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-muted)] uppercase">Costo Base Ref:</span>
              <span className="text-xl font-black text-[var(--color-warning-dark)]">S/ {producto.cost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
              <Banknote size={16} className="text-[var(--color-warning-dark)]" /> Precio a Cobrar (S/)
            </label>
            <div className="relative">
              <input 
                id="consumo-input-precio"
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={precioAjustado}
                onChange={(e) => setPrecioAjustado(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (parseFloat(precioAjustado) >= 0) handleSubmit();
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      document.getElementById('consumo-btn-close')?.focus();
                    } else {
                      document.getElementById('consumo-btn-confirm')?.focus();
                    }
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('consumo-btn-confirm')?.focus();
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    document.getElementById('consumo-btn-close')?.focus();
                  }
                  if (e.key === 'Delete') {
                    e.preventDefault();
                    if (precioAjustado === '') handleClose();
                    else setPrecioAjustado('');
                  }
                }}
                className="w-full h-14 bg-white border-2 border-[var(--color-ink)] px-4 text-2xl font-black text-[var(--color-ink)] outline-none focus:bg-[var(--color-warning-bg)]"
                placeholder="0.00"
              />
            </div>
          </div>

          <button 
            id="consumo-btn-confirm"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                  document.getElementById('consumo-input-precio')?.focus();
                } else {
                  document.getElementById('consumo-btn-close')?.focus();
                }
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('consumo-btn-close')?.focus();
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('consumo-input-precio')?.focus();
              }
              if (e.key === 'Delete') {
                e.preventDefault();
                if (precioAjustado === '') handleClose();
                else setPrecioAjustado('');
              }
            }}
            disabled={precioAjustado === '' || parseFloat(precioAjustado) < 0}
            className="w-full h-16 bg-[var(--color-ink)] text-white flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_0_var(--color-warning-dark)] focus:ring-4 focus:ring-[var(--color-warning-dark)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
          >
            <ShoppingCart size={24} /> Registrar
          </button>
        </div>
      </div>
    </div>
  );
};