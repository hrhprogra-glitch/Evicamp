import React, { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Smartphone, Calculator } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pagos: { efectivo: number; yape: number; tarjeta: number }) => void;
  fiado: Fiado | null;
}

export const ModalAbono: React.FC<Props> = ({ isOpen, onClose, onConfirm, fiado }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [efectivo, setEfectivo] = useState<string>('');
  const [yape, setYape] = useState<string>('');
  const [tarjeta, setTarjeta] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false); 

  useEffect(() => {
    if (isOpen && fiado) {
      setEfectivo(fiado.saldoPendiente.toString());
      setYape('');
      setTarjeta('');
      
      // AUTO-FOCUS Magnético
      setTimeout(() => {
        const input = document.getElementById('input-abono-efectivo') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select(); // Selecciona el texto para que pueda sobreescribirlo rápido
        }
      }, 50);
    }
  }, [isOpen, fiado]);

  // 🔥 FOCUS TRAP PARA MODAL ABONO
  useEffect(() => {
    if (!isOpen) return;

    // 🔥 AUTO-FOCUS MAGNÉTICO AL HACER CLIC EN EL FONDO
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, [role="button"]')) return;

      setTimeout(() => {
        const input = document.getElementById('input-abono-efectivo') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
    };
    document.addEventListener('click', handleGlobalClick);

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled])')) as HTMLElement[];
      const modalFocusables = allFocusables.filter(el => 
        el.closest('div[role="dialog"]') && 
        el.tabIndex !== -1 && 
        !el.classList.contains('hidden') &&
        el.offsetParent !== null
      );

      // ================= FOCUS TRAP PARA TAB =================
      if (e.key === 'Tab') {
        e.stopPropagation(); 
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

      // ================= NAVEGACIÓN CON FLECHAS =================
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.stopPropagation();
        e.preventDefault();

        if (e.key === 'ArrowUp') {
          if (active.id === 'btn-cancelar-abono' || active.id === 'btn-guardar-abono') {
            document.getElementById('input-abono-tarjeta')?.focus();
            return;
          }
          if (active.id === 'input-abono-efectivo') {
            document.getElementById('btn-cerrar-modal-abono')?.focus();
            return;
          }
        }

        if (e.key === 'ArrowDown') {
          if (active.id === 'btn-cerrar-modal-abono') {
            document.getElementById('input-abono-efectivo')?.focus();
            return;
          }
        }

        const currentIndex = modalFocusables.indexOf(active);
        if (currentIndex !== -1) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            if (currentIndex < modalFocusables.length - 1) modalFocusables[currentIndex + 1].focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (currentIndex > 0) modalFocusables[currentIndex - 1].focus();
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

  if (!isOpen || !fiado) return null;

  // Cada porción se redondea a céntimos para que efectivo + yape + tarjeta sume EXACTO el total
  // grabado en debt_payments.amount (la caja registra una fila por cada porción).
  const aCentimos = (v: string) => Math.max(0, Number((Number(v) || 0).toFixed(2)));
  const valEfectivo = aCentimos(efectivo);
  const valYape = aCentimos(yape);
  const valTarjeta = aCentimos(tarjeta);
  
  // Destrucción de la distorsión de coma flotante de JavaScript
  const totalAbono = Number((valEfectivo + valYape + valTarjeta).toFixed(2));
  const saldoPendiente = Number(fiado.saldoPendiente.toFixed(2));
  const nuevoSaldo = Number((saldoPendiente - totalAbono).toFixed(2));

  const handleConfirm = async () => {
    if (isSaving) return; 
    if (totalAbono <= 0) return alert('El monto debe ser mayor a 0.');
    
    // Aplicamos tolerancia de 0.05 del backend
    if (totalAbono > Number((saldoPendiente + 0.05).toFixed(2))) {
        return alert('El abono supera la deuda pendiente.');
    }

    setIsSaving(true); 
    try {
      const { data: session } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').single();

      // 🚨 CORRECCIÓN ARQUITECTÓNICA: 
      // Se eliminó la inyección 'id: Date.now()' para evitar el Error 409 (Conflict).
      // Ahora PostgreSQL generará el ID secuencial automáticamente sin colisiones.
      const { error: pagoError } = await supabase.from('debt_payments').insert([{
        fiado_id: Number(fiado.id),
        customer_id: fiado.clienteId ? Number(fiado.clienteId) : null,
        amount: totalAbono,
        amount_cash: valEfectivo,
        amount_yape: valYape,
        amount_card: valTarjeta,
        amount_transfer: 0,
        // Un solo registro por abono con el desglose por método en amount_cash/yape/card.
        // El trigger fn_register_fiado_payment_in_cash crea un movimiento de caja por cada
        // porción > 0, así que aquí solo se marca el tipo: 'mixto' si hay más de un método.
        payment_type: [valEfectivo, valYape, valTarjeta].filter(v => v > 0).length > 1
          ? 'mixto'
          : (valEfectivo > 0 ? 'efectivo' : (valYape > 0 ? 'yape' : 'tarjeta')),
        session_id: session ? session.id : null,
        created_at: new Date().toISOString(),
        is_synced: 1
      }]);
      
      if (pagoError) throw pagoError;

      alert('✅ Abono registrado en la base de datos y sumado a la caja actual.');
      onConfirm({ efectivo: valEfectivo, yape: valYape, tarjeta: valTarjeta });
      setIsSaving(false);
    } catch (e: any) {
      alert('Error al registrar abono en BD: ' + e.message);
      setIsSaving(false); 
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="max-h-[calc(var(--alto-pantalla)*0.94)] overflow-y-auto bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col rounded-none">
        
        {/* HEADER */}
        <div className="bg-[var(--color-accent)] text-[var(--color-ink)] px-6 py-4 flex justify-between items-center shrink-0 border-b-2 border-[var(--color-ink)]">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Calculator size={20} /> Abono Mixto
          </h2>
          <button id="btn-cerrar-modal-abono" onClick={onClose} className="hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"><X size={20} /></button>
        </div>

        {/* BODY */}
        <div className="p-6 bg-[var(--color-bg)] flex flex-col gap-4">
          <div className="bg-[var(--color-ink)] text-white p-4 text-center border-2 border-[var(--color-ink)] rounded-none">
            <p className="text-[12px] font-bold text-[var(--color-subtle)] uppercase tracking-widest">Saldo Actual de la Deuda</p>
            <p className="text-xl sm:text-3xl font-black text-[var(--color-danger)]">S/ {saldoPendiente.toFixed(2)}</p>
            <p className="text-[12px] font-bold uppercase mt-1">Cliente: {fiado.clienteNombre}</p>
          </div>

          <div className="space-y-3 mt-2">
            <p className="text-[12px] font-black uppercase text-[var(--color-muted)] mb-2">Ingresa los montos por método de pago:</p>
            
            {/* EFECTIVO */}
            <div className="flex items-center gap-3 bg-white p-2 border-2 border-[var(--color-border)] focus-within:border-[var(--color-accent)] transition-colors rounded-none">
              <div className="w-8 h-8 bg-[var(--color-accent-bg)] flex items-center justify-center text-[var(--color-accent)]"><Banknote size={16}/></div>
              <span className="text-xs font-black uppercase flex-1 text-[var(--color-ink)]">Efectivo</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--color-subtle)] font-bold text-xs">S/</span>
                <input autoComplete="off" id="input-abono-efectivo"
                  type="number" 
                  value={efectivo} 
                  onChange={(e) => setEfectivo(e.target.value)}
                  className="w-24 text-right text-sm font-black outline-none text-[var(--color-ink)] rounded-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* YAPE */}
            <div className="flex items-center gap-3 bg-white p-2 border-2 border-[var(--color-border)] focus-within:border-[var(--color-purple)] transition-colors rounded-none">
              <div className="w-8 h-8 bg-[#F5F3FF] flex items-center justify-center text-[var(--color-purple)]"><Smartphone size={16}/></div>
              <span className="text-xs font-black uppercase flex-1 text-[var(--color-ink)]">Yape</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--color-subtle)] font-bold text-xs">S/</span>
                <input autoComplete="off" id="input-abono-yape"
                  type="number" 
                  value={yape} 
                  onChange={(e) => setYape(e.target.value)}
                  className="w-24 text-right text-sm font-black outline-none text-[var(--color-ink)] rounded-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* TARJETA */}
            <div className="flex items-center gap-3 bg-white p-2 border-2 border-[var(--color-border)] focus-within:border-[var(--color-info)] transition-colors rounded-none">
              <div className="w-8 h-8 bg-[var(--color-info-bg)] flex items-center justify-center text-[var(--color-info)]"><CreditCard size={16}/></div>
              <span className="text-xs font-black uppercase flex-1 text-[var(--color-ink)]">Tarjeta</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--color-subtle)] font-bold text-xs">S/</span>
                <input autoComplete="off" id="input-abono-tarjeta"
                  type="number" 
                  value={tarjeta} 
                  onChange={(e) => setTarjeta(e.target.value)}
                  className="w-24 text-right text-sm font-black outline-none text-[var(--color-ink)] rounded-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* RESUMEN DEL ABONO */}
          <div className="mt-2 bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] p-3 flex justify-between items-center rounded-none">
            <div>
              <p className="text-[12px] font-black uppercase text-[var(--color-danger)]">Total a Abonar</p>
              <p className="text-sm font-black text-[var(--color-ink)]">S/ {totalAbono.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-black uppercase text-[var(--color-danger)]">Deuda Restante</p>
              <p className="text-lg font-black text-[var(--color-danger)] leading-none">S/ {Math.max(0, nuevoSaldo).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t-2 border-[var(--color-border)] flex justify-end gap-3 rounded-none">
          <button onClick={onClose} className="px-4 py-2 bg-white border-2 border-[var(--color-border)] text-[var(--color-muted)] text-[12px] font-black uppercase hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors cursor-pointer rounded-none">Cancelar</button>
          <button 
            onClick={handleConfirm} 
            disabled={isSaving}
            className={`px-6 py-2 border-2 border-[var(--color-ink)] text-[12px] font-black uppercase transition-all shadow-[2px_2px_0_0_var(--color-ink)] rounded-none ${
              isSaving 
                ? 'bg-[var(--color-border)] text-[var(--color-subtle)] cursor-not-allowed shadow-none translate-x-[2px] translate-y-[2px]' 
                : 'bg-[var(--color-accent)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] cursor-pointer hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
            }`}
          >
            {isSaving ? 'Procesando...' : 'Confirmar Abono'}
          </button>
        </div>

      </div>
    </div>
  );
};
