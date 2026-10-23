import React, { useState, useEffect } from 'react';
import { X, Scale, Banknote, Calculator, ShoppingCart } from 'lucide-react';
import type { Product } from '../../Inventario/types';
import { unidadDe, nombreUnidad } from '../../../utils/unidades';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (weight: number) => void;
}

export const ModalBalanza: React.FC<Props> = ({ isOpen, onClose, product, onConfirm }) => {
  const [montoSoles, setMontoSoles] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMontoSoles('');
      setPesoKg('');
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const precioUnitario = product.price;

  const handleMontoChange = (val: string) => {
    setMontoSoles(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const calcPeso = num / precioUnitario;
      setPesoKg(calcPeso.toFixed(4));
    } else {
      setPesoKg('');
    }
  };

  const handlePesoChange = (val: string) => {
    setPesoKg(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const calcMonto = num * precioUnitario;
      setMontoSoles(calcMonto.toFixed(2));
    } else {
      setMontoSoles('');
    }
  };

  const handleConfirm = () => {
    const peso = parseFloat(pesoKg);
    if (!isNaN(peso) && peso > 0) {
      onConfirm(peso);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="max-h-[calc(var(--alto-pantalla)*0.94)] overflow-y-auto bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="bg-[var(--color-info)] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[var(--color-ink)]">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Scale size={20} /> {unidadDe(product).corto === 'KG' ? 'Balanza Digital' : 'Venta por medida'}
          </h2>
          <button 
            id="balanza-btn-close"
            onClick={onClose} 
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                  document.getElementById('balanza-btn-confirm')?.focus();
                } else {
                  document.getElementById('balanza-input-monto')?.focus();
                }
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('balanza-input-monto')?.focus();
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('balanza-btn-confirm')?.focus();
              }
            }}
            className="hover:text-[var(--color-ink)] focus:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-white transition-all cursor-pointer p-1"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-4">
            <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest mb-1">{unidadDe(product).corto === 'KG' ? 'Cálculo de Peso' : 'Cálculo por medida'}</p>
            <h3 className="text-lg font-black text-[var(--color-ink)] uppercase mb-2 leading-tight">{product.name}</h3>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-muted)] uppercase">Precio x {unidadDe(product).corto}:</span>
              <span className="text-xl font-black text-[var(--color-accent)]">S/ {precioUnitario.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Banknote size={16} className="text-[var(--color-accent)]" /> ¿Cuánto dinero quiere llevar? (S/)
              </label>
              <div className="relative">
                <input autoComplete="off" id="balanza-input-monto"
                  type="number" 
                  autoFocus
                  value={montoSoles}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && parseFloat(pesoKg) > 0) handleConfirm();
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      if (e.shiftKey) {
                        document.getElementById('balanza-btn-close')?.focus();
                      } else {
                        document.getElementById('balanza-input-peso')?.focus();
                      }
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      document.getElementById('balanza-input-peso')?.focus();
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('balanza-btn-close')?.focus();
                    }
                    if (e.key === 'Delete') {
                      e.preventDefault();
                      if (montoSoles === '' && pesoKg === '') {
                        onClose();
                      } else {
                        handleMontoChange('');
                      }
                    }
                  }}
                  className="w-full h-14 bg-white border-2 border-[var(--color-ink)] px-4 text-2xl font-black text-[var(--color-ink)] outline-none focus:bg-[var(--color-accent-bg)]"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-center py-2 relative">
               <div className="h-[2px] w-full bg-[var(--color-border)] absolute top-1/2 -translate-y-1/2"></div>
               <div className="bg-white border-2 border-[var(--color-border)] p-2 relative z-10">
                 <Calculator size={16} className="text-[var(--color-subtle)]" />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
                <Scale size={16} className="text-[var(--color-info)]" /> {unidadDe(product).corto === 'KG' ? '¿Cuántos Kilos va a pesar? (KG)' : `¿Cuántos ${nombreUnidad(product, true)}? (${unidadDe(product).corto})`}
              </label>
              <div className="relative">
                <input autoComplete="off" id="balanza-input-peso"
                  type="number" 
                  value={pesoKg}
                  onChange={(e) => handlePesoChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && parseFloat(pesoKg) > 0) handleConfirm();
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      if (e.shiftKey) {
                        document.getElementById('balanza-input-monto')?.focus();
                      } else {
                        document.getElementById('balanza-btn-confirm')?.focus();
                      }
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      document.getElementById('balanza-btn-confirm')?.focus();
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('balanza-input-monto')?.focus();
                    }
                    if (e.key === 'Delete') {
                      e.preventDefault();
                      if (montoSoles === '' && pesoKg === '') {
                        onClose();
                      } else {
                        handlePesoChange(''); // Se puede usar handleMontoChange también, ambas vacían todo
                      }
                    }
                  }}
                  className="w-full h-14 bg-white border-2 border-[var(--color-ink)] px-4 text-2xl font-black text-[var(--color-info)] outline-none focus:bg-[var(--color-info-bg)]"
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>

          <button 
            id="balanza-btn-confirm"
            onClick={handleConfirm}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                  document.getElementById('balanza-input-peso')?.focus();
                } else {
                  document.getElementById('balanza-btn-close')?.focus();
                }
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('balanza-btn-close')?.focus();
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('balanza-input-peso')?.focus();
              }
              if (e.key === 'Delete') {
                e.preventDefault();
                if (montoSoles === '' && pesoKg === '') {
                  onClose();
                } else {
                  handleMontoChange('');
                }
              }
            }}
            // aria-disabled (no disabled): sin peso no agrega nada, pero el selector puede llegar al botón con Tab y flechas
            aria-disabled={!pesoKg || parseFloat(pesoKg) <= 0}
            className="w-full h-16 bg-[var(--color-ink)] text-white flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_0_var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all aria-disabled:opacity-50 cursor-pointer"
          >
            <ShoppingCart size={24} /> Agregar al Carrito
          </button>
        </div>
      </div>
    </div>
  );
};