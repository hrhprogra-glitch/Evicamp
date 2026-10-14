// src/sections/Finanzas/components/ModalNuevoMovimiento.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRightLeft, CheckCircle2, Building2, Wallet, ChevronLeft, ChevronDown } from 'lucide-react';
import { supabase } from '../../../db/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string;
}

const METODOS = [
  { value: 'EFECTIVO', label: 'EFECTIVO' },
  { value: 'YAPE', label: 'YAPE / PLIN' },
  { value: 'TARJETA', label: 'TARJETA' },
];

export const ModalNuevoMovimiento: React.FC<Props> = ({ isOpen, onClose, onSuccess, sessionId }) => {
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [flujo, setFlujo] = useState<'INTERNO' | 'EXTERNO' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados y Refs para desplegable accesible de Método
  const [openMetodoDropdown, setOpenMetodoDropdown] = useState(false);
  const [highlightedMetodoIdx, setHighlightedMetodoIdx] = useState(0);
  const metodoDropdownRef = useRef<HTMLDivElement>(null);
  const btnMetodoRef = useRef<HTMLButtonElement>(null);

  const btnInternoRef = useRef<HTMLButtonElement>(null);
  const btnExternoRef = useRef<HTMLButtonElement>(null);
  const btnCloseRef = useRef<HTMLButtonElement>(null);
  const btnVolverRef = useRef<HTMLButtonElement>(null);

  const inputMontoRef = useRef<HTMLInputElement>(null);
  const inputDescRef = useRef<HTMLInputElement>(null);
  const btnSubmitRef = useRef<HTMLButtonElement>(null);

  const cerrarYReiniciar = () => { 
    setFlujo(null); 
    setMonto('');
    setDescripcion('');
    setTipo('EGRESO');
    setMetodoPago('EFECTIVO');
    setOpenMetodoDropdown(false);
    onClose(); 
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (metodoDropdownRef.current && !metodoDropdownRef.current.contains(e.target as Node)) {
        setOpenMetodoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-Focus inicial al abrir el modal (Paso 1: Caja Interna / Paso 2: Monto)
  useEffect(() => {
    if (!isOpen) return;

    if (flujo === null) {
      const enfocarPaso1 = () => {
        const btn = btnInternoRef.current || (document.getElementById('btn-flujo-interno') as HTMLButtonElement | null);
        btn?.focus();
      };
      enfocarPaso1();
      const t1 = setTimeout(enfocarPaso1, 30);
      const t2 = setTimeout(enfocarPaso1, 100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      const enfocarPaso2 = () => {
        const input = inputMontoRef.current || (document.getElementById('input-movimiento-monto') as HTMLInputElement | null);
        if (input) {
          input.focus();
          input.select();
        }
      };
      enfocarPaso2();
      const t1 = setTimeout(enfocarPaso2, 30);
      const t2 = setTimeout(enfocarPaso2, 100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, flujo]);

  // Focus trap y control de teclado (Escape, Tab) en fase de captura
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // 1. ESCAPE:
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (openMetodoDropdown) {
          setOpenMetodoDropdown(false);
          btnMetodoRef.current?.focus();
          return;
        }
        if (flujo !== null) {
          setFlujo(null); // Si está en el formulario, volver a elegir caja
        } else {
          cerrarYReiniciar(); // Si está en el paso 1, cerrar modal
        }
        return;
      }

      // 2. TAB: Focus Trap estricto dentro del modal
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const modalEl = document.getElementById('modal-nuevo-movimiento');
        if (!modalEl) return;

        const focusables = Array.from(
          modalEl.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')
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
  }, [isOpen, flujo, openMetodoDropdown]);

  if (!isOpen) return null;

  const handleGuardar = async () => {
    if (!monto || !descripcion) return;
    setIsSubmitting(true);

    const movId = Date.now().toString();

    const { error } = await supabase.from('cash_movements').insert([{
      id: movId,
      session_id: sessionId,
      type: tipo,
      amount: Number(monto),
      description: descripcion.toUpperCase(),
      payment_type: metodoPago,
      flujo: flujo,
      created_at: new Date().toISOString(),
      is_synced: '1'
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Error al guardar movimiento: " + error.message);
    } else {
      setMonto('');
      setDescripcion('');
      onSuccess();
      cerrarYReiniciar();
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-movimiento-title"
      id="modal-nuevo-movimiento"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(var(--alto-pantalla)*0.94)] bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-md flex flex-col rounded-none animate-fade-in overflow-hidden"
      >

        <div className="bg-[var(--color-info)] p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-white gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {flujo !== null && (
              <button
                ref={btnVolverRef}
                id="btn-volver-flujo"
                onClick={() => setFlujo(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    btnCloseRef.current?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('btn-tipo-ingreso')?.focus();
                  }
                }}
                className="flex items-center gap-1 bg-white text-[var(--color-ink)] px-2.5 py-1.5 border-2 border-[var(--color-ink)] font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus:outline-none focus:ring-4 focus:ring-white transition-all cursor-pointer shrink-0 rounded-none"
                title="Cambiar Caja Interna/Externa (Esc)"
              >
                <ChevronLeft size={16} strokeWidth={3} /> Volver
              </button>
            )}
            <h2 id="modal-movimiento-title" className="font-black uppercase tracking-widest flex items-center gap-2 text-sm truncate">
              <ArrowRightLeft size={18} className="shrink-0" /> <span className="truncate">Registrar Movimiento</span>
            </h2>
          </div>
          <button 
            ref={btnCloseRef}
            id="btn-cerrar-modal-movimiento"
            onClick={cerrarYReiniciar} 
            title="Cerrar modal"
            aria-label="Cerrar modal"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' && flujo !== null) {
                e.preventDefault();
                btnVolverRef.current?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (flujo === null) {
                  btnInternoRef.current?.focus();
                } else {
                  document.getElementById('btn-tipo-egreso')?.focus();
                }
              }
            }}
            className="p-1 hover:text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-white focus:bg-[var(--color-ink)] focus:text-white transition-all cursor-pointer shrink-0 rounded-none"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {flujo === null ? (
          /* 🔀 PASO 1 (obligatorio): elegir primero si el movimiento es del negocio o
             personal. Recién con esa elección hecha se ve el resto del formulario. */
          <div className="p-6 flex flex-col gap-3">
            <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest text-center mb-1">
              ¿A qué caja pertenece este movimiento?
            </p>
            <button
              ref={btnInternoRef}
              id="btn-flujo-interno"
              autoFocus
              onClick={() => setFlujo('INTERNO')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  btnExternoRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  btnCloseRef.current?.focus();
                }
              }}
              className="flex items-center gap-3 p-4 border-2 border-[var(--color-ink)] bg-white hover:bg-[var(--color-ink)] hover:text-white focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:ring-offset-2 focus:bg-[var(--color-ink)] focus:text-white shadow-[4px_4px_0_0_var(--color-ink)] transition-all cursor-pointer rounded-none text-left group"
            >
              <Building2 size={28} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-sm">Caja Interna (Negocio)</p>
                <p className="text-[11px] font-bold uppercase text-[var(--color-muted)] group-hover:text-[var(--color-line-light)] group-focus:text-[var(--color-line-light)]">
                  Queda guardado en el historial y afecta el saldo del negocio
                </p>
              </div>
            </button>
            <button
              ref={btnExternoRef}
              id="btn-flujo-externo"
              onClick={() => setFlujo('EXTERNO')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  btnInternoRef.current?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  btnCloseRef.current?.focus();
                }
              }}
              className="flex items-center gap-3 p-4 border-2 border-[var(--color-ink)] bg-white hover:bg-[var(--color-ink)] hover:text-white focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:ring-offset-2 focus:bg-[var(--color-ink)] focus:text-white shadow-[4px_4px_0_0_var(--color-ink)] transition-all cursor-pointer rounded-none text-left group"
            >
              <Wallet size={28} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-sm">Caja Externa (Personal)</p>
                <p className="text-[11px] font-bold uppercase text-[var(--color-muted)] group-hover:text-[var(--color-line-light)] group-focus:text-[var(--color-line-light)]">
                  Dinero personal, no cuenta en las ganancias ni gastos del negocio
                </p>
              </div>
            </button>
          </div>
        ) : (
        <>
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">

          {/* Caja elegida en el paso 1 — se puede cambiar con el botón "Volver" */}
          <div className={`text-center py-2 border-2 font-black text-[12px] uppercase tracking-widest ${flujo === 'INTERNO' ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)]' : 'bg-[var(--color-warning-bg)] border-[var(--color-warning-dark)] text-[var(--color-warning-dark)]'}`}>
            {flujo === 'INTERNO' ? 'Caja Interna (Negocio)' : 'Caja Externa (Personal)'}
          </div>

          <div className="flex gap-2">
            <button 
              id="btn-tipo-ingreso"
              onClick={() => setTipo('INGRESO')} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTipo('INGRESO');
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById('btn-tipo-egreso')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  inputMontoRef.current?.focus();
                  inputMontoRef.current?.select();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  btnVolverRef.current?.focus();
                }
              }}
              className={`flex-1 py-2 text-xs font-black uppercase border-2 transition-all rounded-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-2 ${tipo === 'INGRESO' ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]'}`}
            >
              Ingreso Extra
            </button>
            <button 
              id="btn-tipo-egreso"
              onClick={() => setTipo('EGRESO')} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTipo('EGRESO');
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  document.getElementById('btn-tipo-ingreso')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  inputMontoRef.current?.focus();
                  inputMontoRef.current?.select();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  btnCloseRef.current?.focus();
                }
              }}
              className={`flex-1 py-2 text-xs font-black uppercase border-2 transition-all rounded-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-danger)] focus:ring-offset-2 ${tipo === 'EGRESO' ? 'bg-[var(--color-danger)] border-[var(--color-danger)] text-white' : 'bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)]'}`}
            >
              Gasto / Retiro
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="input-movimiento-monto" className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              Monto (S/)
            </label>
            <input 
              id="input-movimiento-monto"
              ref={inputMontoRef}
              autoComplete="off" 
              type="number" 
              step="any"
              value={monto} 
              onChange={(e) => setMonto(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  inputDescRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (tipo === 'INGRESO') document.getElementById('btn-tipo-ingreso')?.focus();
                  else document.getElementById('btn-tipo-egreso')?.focus();
                }
              }}
              placeholder="0.00" 
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 text-lg font-black outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:border-[var(--color-info)] focus:bg-white transition-all rounded-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="input-movimiento-desc" className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              Motivo / Descripción
            </label>
            <input 
              id="input-movimiento-desc"
              ref={inputDescRef}
              autoComplete="off" 
              type="text" 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  btnMetodoRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  inputMontoRef.current?.focus();
                  inputMontoRef.current?.select();
                }
              }}
              placeholder="Ej. Pago a proveedor, Pasajes..." 
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:border-[var(--color-info)] focus:bg-white transition-all rounded-none"
            />
          </div>

          <div className="space-y-1 relative" ref={metodoDropdownRef}>
            <label htmlFor="select-movimiento-metodo" className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">
              Método
            </label>
            <div className="relative">
              <button
                type="button"
                id="select-movimiento-metodo"
                ref={btnMetodoRef}
                onClick={() => {
                  const currentIdx = METODOS.findIndex(m => m.value === metodoPago);
                  setHighlightedMetodoIdx(currentIdx >= 0 ? currentIdx : 0);
                  setOpenMetodoDropdown(prev => !prev);
                }}
                onKeyDown={(e) => {
                  if (openMetodoDropdown) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedMetodoIdx(prev => Math.min(prev + 1, METODOS.length - 1));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedMetodoIdx(prev => Math.max(prev - 1, 0));
                      return;
                    }
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const selected = METODOS[highlightedMetodoIdx] || METODOS[0];
                      if (selected) {
                        setMetodoPago(selected.value);
                      }
                      setOpenMetodoDropdown(false);
                      btnMetodoRef.current?.focus();
                      return;
                    }
                    if (e.key === 'Tab') {
                      setOpenMetodoDropdown(false);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setOpenMetodoDropdown(false);
                      btnMetodoRef.current?.focus();
                      return;
                    }
                  } else {
                    // Desplegable cerrado
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const currentIdx = METODOS.findIndex(m => m.value === metodoPago);
                      setHighlightedMetodoIdx(currentIdx >= 0 ? currentIdx : 0);
                      setOpenMetodoDropdown(true);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      inputDescRef.current?.focus();
                      return;
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      btnSubmitRef.current?.focus();
                      return;
                    }
                  }
                }}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:border-[var(--color-info)] focus:bg-white transition-all rounded-none cursor-pointer flex items-center justify-between"
              >
                <span>{METODOS.find(m => m.value === metodoPago)?.label || 'EFECTIVO'}</span>
                <ChevronDown size={16} className={`text-[var(--color-ink)] shrink-0 transition-transform duration-150 ${openMetodoDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Opciones desplegables accesibles hacia abajo */}
              {openMetodoDropdown && (
                <div className="mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] overflow-hidden">
                  {METODOS.map((m, idx) => {
                    const isSelected = metodoPago === m.value;
                    const isHighlighted = idx === highlightedMetodoIdx;
                    return (
                      <div
                        key={m.value}
                        data-metodo-idx={idx}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlightedMetodoIdx(idx)}
                        onClick={() => {
                          setMetodoPago(m.value);
                          setOpenMetodoDropdown(false);
                          btnMetodoRef.current?.focus();
                        }}
                        className={`p-2.5 text-xs font-black uppercase transition-colors cursor-pointer border-b border-[var(--color-line-light)] last:border-b-0 flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-[var(--color-info)] text-white'
                            : isSelected
                            ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] font-black'
                            : 'hover:bg-[var(--color-bg)] text-[var(--color-ink)]'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && <span className="text-[10px] font-black uppercase tracking-wider">{isHighlighted ? '✓' : 'ACTUAL'}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] shrink-0">
          <button 
            ref={btnSubmitRef}
            id="btn-guardar-movimiento"
            onClick={handleGuardar} 
            disabled={!monto || !descripcion || isSubmitting} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                btnMetodoRef.current?.focus();
              }
            }}
            className="w-full bg-[var(--color-ink)] text-white p-3 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-info)] focus:outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:ring-offset-2 transition-all disabled:opacity-50 border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none"
          >
            {isSubmitting ? 'Guardando...' : <><CheckCircle2 size={18} /> Confirmar Movimiento</>}
          </button>
        </div>
        </>
        )}

      </div>
    </div>
  );
};