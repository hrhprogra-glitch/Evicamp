import React, { useState } from 'react';
import { X, Save, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import type { CobroContrato } from '../types';

interface ModalRegistrarPagoProps {
  cobro: CobroContrato;
  onClose: (guardado?: boolean) => void;
}

export const ModalRegistrarPago: React.FC<ModalRegistrarPagoProps> = ({ cobro, onClose }) => {
  useCerrarConEscape(true, () => onClose());

  const saldoPendiente = Math.max(0, cobro.monto - (cobro.monto_pagado || 0));
  const [monto, setMonto] = useState<string>(String(saldoPendiente.toFixed(2)));
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Regla 9 SiuMax: Enter es como un clic, el selector se queda en el campo
  // (en una lista o una fecha, Enter la abre)
  const handleEnterKey = (e: React.KeyboardEvent, _nextId?: string) => enterSeQueda(e);

  const handleGuardar = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    const m = parseFloat(monto);
    if (!m || m <= 0) {
      avisar('Ingresa un monto válido mayor a 0.');
      document.getElementById('input-monto-pago')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_registrar_pago_contrato', {
        p_cobro_id: cobro.id,
        p_monto: m,
        p_metodo: metodo,
        p_referencia: referencia.trim() || '',
        p_fecha: fecha,
        p_notas: notas.trim() || ''
      });

      if (error) throw error;

      avisar('Pago registrado con éxito.');
      onClose(true);
    } catch (err: any) {
      console.error('Error registrando pago de contrato:', err);
      avisar('Error registrando pago: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-pago-contrato"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-md flex flex-col max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 id="modal-titulo-pago-contrato" className="ventana-cabecera__titulo">
                Registrar Cobro
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Abono o pago de período de contrato
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-pago"
            onClick={() => onClose()}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info del Cobro */}
        <div className="p-4 space-y-4">
          <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Período:</span>
              <span className="font-bold text-[var(--color-ink)]">{cobro.periodo}</span>
            </div>
            {cobro.contrato && (
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Contrato:</span>
                <span className="font-bold text-[var(--color-ink)]">{cobro.contrato.codigo} - {cobro.contrato.titulo}</span>
              </div>
            )}
            {cobro.customer && (
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Cliente:</span>
                <span className="font-bold text-[var(--color-ink)]">{cobro.customer.name}</span>
              </div>
            )}
            <div className="border-t border-[var(--color-border)] my-1 pt-1 flex justify-between">
              <span className="text-[var(--color-muted)]">Monto total:</span>
              <span className="font-bold text-[var(--color-ink)]">S/ {Number(cobro.monto).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Ya abonado:</span>
              <span className="font-bold text-green-700">S/ {Number(cobro.monto_pagado || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-black text-[var(--color-ink)]">Saldo pendiente:</span>
              <span className="font-black text-[var(--color-ink)]">S/ {saldoPendiente.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
              Monto a Pagar (S/) *
            </label>
            <input
              id="input-monto-pago"
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => handleEnterKey(e, 'select-metodo-pago')}
              className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-base font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Método de Pago *
              </label>
              <select
                id="select-metodo-pago"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-referencia-pago')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="YAPE_PLIN">Yape / Plin</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                N° Operación / Ref.
              </label>
              <input
                id="input-referencia-pago"
                type="text"
                placeholder="Ej: Ope 481920..."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-fecha-pago')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Fecha de Pago *
              </label>
              <input
                id="input-fecha-pago"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-notas-pago')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Observaciones
              </label>
              <input
                id="input-notas-pago"
                type="text"
                placeholder="Ej: Pago adelantado..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="h-14 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
          >
            Cancelar
          </button>

          <button
            id="btn-guardar-pago"
            type="button"
            disabled={guardando}
            onClick={handleGuardar}
            className="h-10 px-6 font-mono text-xs font-black uppercase tracking-widest bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <Save size={15} />
            <span>{guardando ? 'Registrando...' : 'Registrar Pago'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
