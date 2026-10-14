// src/sections/Finanzas/components/ModalCierre.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Calculator, AlertTriangle, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { CashSession, SuperMetricas } from '../types';

const redondearCentavos = (n: number) => Math.round(n * 100) / 100;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionActiva: CashSession;
  superMetricas: SuperMetricas;
}

interface BloqueArqueoProps {
  id: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  icono: React.ReactNode;
  color: string;
  titulo: string;
  esperado: number;
  valor: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
const BloqueArqueo: React.FC<BloqueArqueoProps> = ({ id, inputRef, icono, color, titulo, esperado, valor, onChange, onKeyDown }) => {
  const numReal = Number(valor) || 0;
  const diferencia = redondearCentavos(numReal - esperado);
  const hayDescuadre = valor !== '' && diferencia !== 0;

  return (
    <div className="border-2 border-[var(--color-border)] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer" style={{ color }}>
          {icono} {titulo}
        </label>
        <span className="text-xs font-bold text-[var(--color-muted)] whitespace-nowrap">Espera: S/ {esperado.toFixed(2)}</span>
      </div>
      <input 
        id={id}
        ref={inputRef}
        autoComplete="off" 
        type="number"
        step="any"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="¿Cuánto hay realmente?"
        className={`w-full p-3 text-xl font-black text-center outline-none transition-all border-2 rounded-none focus:ring-4 focus:ring-[var(--color-ink)] focus:ring-offset-2 ${
          valor === '' ? 'bg-[var(--color-bg)] border-[var(--color-ink)]' :
          diferencia === 0 ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
        }`}
      />
      {hayDescuadre && (
        <p className="text-[12px] font-black uppercase text-[var(--color-warning-dark)] flex items-center gap-1">
          <AlertTriangle size={12} />
          {diferencia > 0 ? `Sobra S/ ${Math.abs(diferencia).toFixed(2)}` : `Falta S/ ${Math.abs(diferencia).toFixed(2)}`}
        </p>
      )}
    </div>
  );
};

export const ModalCierre: React.FC<Props> = ({ isOpen, onClose, onSuccess, sessionActiva, superMetricas }) => {
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoYape, setMontoYape] = useState('');
  const [montoTarjeta, setMontoTarjeta] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const efectivoRef = useRef<HTMLInputElement>(null);
  const yapeRef = useRef<HTMLInputElement>(null);
  const tarjetaRef = useRef<HTMLInputElement>(null);
  const justificacionRef = useRef<HTMLInputElement>(null);
  const btnCerrarRef = useRef<HTMLButtonElement>(null);
  const btnSubmitRef = useRef<HTMLButtonElement>(null);

  // Auto-Focus inicial: enfocar y seleccionar el primer campo (Efectivo) al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    const enfocarInicio = () => {
      const input = efectivoRef.current || (document.getElementById('input-cierre-efectivo') as HTMLInputElement | null);
      if (input) {
        input.focus();
        input.select();
      }
    };

    enfocarInicio();
    const t1 = setTimeout(enfocarInicio, 30);
    const t2 = setTimeout(enfocarInicio, 100);
    const t3 = setTimeout(enfocarInicio, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  // Focus trap y control de teclado (Escape, Tab) en fase de captura
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // 1. ESCAPE: Cerrar modal
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. TAB: Focus Trap dentro del modal
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const modalEl = document.getElementById('modal-cierre-caja');
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
          if (nextEl instanceof HTMLInputElement) {
            nextEl.select();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDownCapture, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const esperadoEfectivo = superMetricas.efectivoEsperadoCaja;
  const esperadoYape = superMetricas.yapeEsperado;
  const esperadoTarjeta = superMetricas.tarjetaEsperada;

  const diferenciaEfectivo = redondearCentavos((Number(montoEfectivo) || 0) - esperadoEfectivo);
  const diferenciaYape = redondearCentavos((Number(montoYape) || 0) - esperadoYape);
  const diferenciaTarjeta = redondearCentavos((Number(montoTarjeta) || 0) - esperadoTarjeta);

  const hayDescuadre =
    (montoEfectivo !== '' && diferenciaEfectivo !== 0) ||
    (montoYape !== '' && diferenciaYape !== 0) ||
    (montoTarjeta !== '' && diferenciaTarjeta !== 0);

  const faltaCompletar = montoEfectivo === '' || montoYape === '' || montoTarjeta === '';

  const handleCierre = async () => {
    if (faltaCompletar) return;
    if (hayDescuadre && !justificacion) {
      alert('Debes justificar la diferencia de dinero.');
      justificacionRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('cash_sessions').update({
      closing_balance: Number(montoEfectivo) || 0,
      expected_balance: esperadoEfectivo,
      closing_yape: Number(montoYape) || 0,
      expected_yape: esperadoYape,
      closing_card: Number(montoTarjeta) || 0,
      expected_card: esperadoTarjeta,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      justification: justificacion.toUpperCase() || null
    }).eq('id', sessionActiva.id);

    setIsSubmitting(false);

    if (error) {
      alert('Error al cerrar caja: ' + error.message);
    } else {
      const resumen = [
        `Efectivo: ${diferenciaEfectivo === 0 ? 'CUADRADO' : (diferenciaEfectivo > 0 ? `+S/ ${diferenciaEfectivo.toFixed(2)}` : `-S/ ${Math.abs(diferenciaEfectivo).toFixed(2)}`)}`,
        `Yape: ${diferenciaYape === 0 ? 'CUADRADO' : (diferenciaYape > 0 ? `+S/ ${diferenciaYape.toFixed(2)}` : `-S/ ${Math.abs(diferenciaYape).toFixed(2)}`)}`,
        `Tarjeta: ${diferenciaTarjeta === 0 ? 'CUADRADO' : (diferenciaTarjeta > 0 ? `+S/ ${diferenciaTarjeta.toFixed(2)}` : `-S/ ${Math.abs(diferenciaTarjeta).toFixed(2)}`)}`,
      ].join('\n');
      alert(`✅ Caja Cerrada Exitosamente.\n${resumen}`);
      onSuccess();
      onClose();
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cierre-title"
      id="modal-cierre-caja"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-lg flex flex-col rounded-none animate-fade-in max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)]"
      >

        <div className="bg-[var(--color-danger)] p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-white shrink-0">
          <h2 id="modal-cierre-title" className="font-black uppercase tracking-widest flex items-center gap-2 text-sm">
            <Lock size={18} /> Arqueo y Cierre de Caja
          </h2>
          <button 
            ref={btnCerrarRef}
            id="btn-cerrar-modal-cierre"
            onClick={onClose} 
            title="Cerrar (Esc)"
            aria-label="Cerrar modal"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                efectivoRef.current?.focus();
                efectivoRef.current?.select();
              }
            }}
            className="p-1 hover:text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-white focus:bg-[var(--color-ink)] focus:text-white transition-all cursor-pointer rounded-none"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

          <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-3 flex items-center gap-2 text-[var(--color-muted)]">
            <Calculator size={16} className="shrink-0" />
            <span className="text-[12px] font-bold uppercase tracking-widest">
              Cuenta lo que hay físicamente en caja y confirma tu Yape/Tarjeta contra lo que el sistema calculó.
            </span>
          </div>

          <BloqueArqueo
            id="input-cierre-efectivo"
            inputRef={efectivoRef}
            icono={<Banknote size={14} />} 
            color="var(--color-accent)" 
            titulo="Efectivo"
            esperado={esperadoEfectivo} 
            valor={montoEfectivo} 
            onChange={setMontoEfectivo}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                yapeRef.current?.focus();
                yapeRef.current?.select();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                btnCerrarRef.current?.focus();
              }
            }}
          />
          <BloqueArqueo
            id="input-cierre-yape"
            inputRef={yapeRef}
            icono={<Smartphone size={14} />} 
            color="var(--color-info)" 
            titulo="Yape / Transferencias"
            esperado={esperadoYape} 
            valor={montoYape} 
            onChange={setMontoYape}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                tarjetaRef.current?.focus();
                tarjetaRef.current?.select();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                efectivoRef.current?.focus();
                efectivoRef.current?.select();
              }
            }}
          />
          <BloqueArqueo
            id="input-cierre-tarjeta"
            inputRef={tarjetaRef}
            icono={<CreditCard size={14} />} 
            color="var(--color-purple)" 
            titulo="Tarjeta"
            esperado={esperadoTarjeta} 
            valor={montoTarjeta} 
            onChange={setMontoTarjeta}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (hayDescuadre) {
                  justificacionRef.current?.focus();
                  justificacionRef.current?.select();
                } else {
                  btnSubmitRef.current?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                yapeRef.current?.focus();
                yapeRef.current?.select();
              }
            }}
          />

          {hayDescuadre && (
            <div className="bg-[var(--color-warning-bg)] border-2 border-[var(--color-warning)] p-4 animate-fade-in space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-warning-dark)]">
                <AlertTriangle size={16} />
                <span className="text-[12px] font-black uppercase tracking-widest">Hay una diferencia, explica el motivo</span>
              </div>
              <input 
                id="input-cierre-justificacion"
                ref={justificacionRef}
                autoComplete="off" 
                type="text"
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    btnSubmitRef.current?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    tarjetaRef.current?.focus();
                    tarjetaRef.current?.select();
                  }
                }}
                placeholder="Explica el motivo de la diferencia..."
                className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:border-[var(--color-warning)] rounded-none"
              />
            </div>
          )}

        </div>

        <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] shrink-0">
          <button
            ref={btnSubmitRef}
            id="btn-confirmar-cierre"
            onClick={handleCierre}
            disabled={faltaCompletar || isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (hayDescuadre) {
                  justificacionRef.current?.focus();
                  justificacionRef.current?.select();
                } else {
                  tarjetaRef.current?.focus();
                  tarjetaRef.current?.select();
                }
              }
            }}
            className="w-full bg-[var(--color-ink)] text-white p-3 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-danger)] focus:outline-none focus:ring-4 focus:ring-[var(--color-danger)] focus:ring-offset-2 transition-colors disabled:opacity-50 border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none"
          >
            {isSubmitting ? 'Cerrando Bóveda...' : <><Lock size={18} /> Finalizar Día y Cerrar</>}
          </button>
        </div>

      </div>
    </div>
  );
};
