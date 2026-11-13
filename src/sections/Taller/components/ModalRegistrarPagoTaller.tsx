// src/sections/Taller/components/ModalRegistrarPagoTaller.tsx
// Modal para registrar abonos, adelantos o pago final de una orden de taller

import React, { useState, useRef } from 'react';
import { DollarSign, Check, X, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { TallerOrden } from '../types';

interface Props {
  orden: TallerOrden;
  onCerrar: () => void;
  onPagoRegistrado: () => void;
}

const METODOS = [
  { clave: 'EFECTIVO', label: 'Efectivo' },
  { clave: 'YAPE', label: 'Yape' },
  { clave: 'PLIN', label: 'Plin' },
  { clave: 'TARJETA', label: 'Tarjeta' },
  { clave: 'TRANSFERENCIA', label: 'Transferencia' },
  { clave: 'OTRO', label: 'Otro' },
];

const TIPOS = [
  { clave: 'ABONO', label: 'Abono / Cuota' },
  { clave: 'ADELANTO', label: 'Adelanto' },
  { clave: 'PAGO_FINAL', label: 'Pago Final / Liquidación' },
];

const claseInput =
  'w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] rounded-none';
const claseBoton =
  'px-4 py-2 border-2 border-[var(--color-ink)] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1 cursor-pointer disabled:opacity-50 rounded-none';

export const ModalRegistrarPagoTaller: React.FC<Props> = ({ orden, onCerrar, onPagoRegistrado }) => {
  useCerrarConEscape(true, () => onCerrar());
  const cuerpo = useRef<HTMLDivElement>(null);

  const [monto, setMonto] = useState<string>(orden.saldo > 0 ? String(orden.saldo) : '0');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO'>('EFECTIVO');
  const [tipo, setTipo] = useState<'ADELANTO' | 'PAGO_FINAL' | 'ABONO'>(
    orden.saldo <= (Number(monto) || 0) ? 'PAGO_FINAL' : 'ABONO'
  );
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Regla de SiuMax Nego: Enter nunca pasa al siguiente campo (el selector se queda; se mueve con flechas)
  const handleKeyDown = (e: React.KeyboardEvent) => enterSeQueda(e);

  const guardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      await avisar('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_registrar_pago_taller', {
        p_orden_id: orden.id,
        p_monto: valMonto,
        p_metodo: metodo,
        p_referencia: referencia.trim() || null,
        p_tipo: tipo,
        p_notas: notas.trim() || null,
      });

      if (error) throw error;

      await avisar(`Pago de S/ ${valMonto.toFixed(2)} registrado correctamente.`);
      onPagoRegistrado();
      onCerrar();
    } catch (err: any) {
      console.error('Error al registrar pago de taller:', err);
      await avisar(err?.message || 'Error al guardar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 font-mono">
      <div
        ref={cuerpo}
        onKeyDown={handleKeyDown}
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-md flex flex-col max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Registrar Pago
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Orden {orden.codigo} · Abono a cuenta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen de orden */}
        <div className="bg-amber-50 border-b-2 border-[var(--color-border)] p-3 text-xs flex justify-between items-center">
          <div>
            <div className="font-bold text-[var(--color-ink)]">{orden.tipo_equipo} {orden.marca ? `- ${orden.marca}` : ''}</div>
            <div className="text-[10px] text-[var(--color-muted)]">Cliente: {orden.customer?.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-muted)]">Saldo pendiente:</div>
            <div className="text-sm font-black text-rose-700">S/ {Number(orden.saldo).toFixed(2)}</div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={guardarPago} className="p-4 flex flex-col gap-3 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
              Monto a cobrar (S/) *
            </label>
            <input
              id="pago-taller-monto"
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={claseInput}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                Método de Pago *
              </label>
              <select
                id="pago-taller-metodo"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as any)}
                className={claseInput}
              >
                {METODOS.map((m) => (
                  <option key={m.clave} value={m.clave}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                Tipo de Cobro *
              </label>
              <select
                id="pago-taller-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className={claseInput}
              >
                {TIPOS.map((t) => (
                  <option key={t.clave} value={t.clave}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
              Nº Operación / Referencia (Opcional)
            </label>
            <input
              id="pago-taller-referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Operación 483921 / Yape"
              className={claseInput}
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
              Notas u Observaciones
            </label>
            <textarea
              id="pago-taller-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observación del cobro..."
              className={claseInput}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-[var(--color-border)] mt-2">
            <button
              id="btn-cancelar-pago-taller"
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className={`${claseBoton} bg-white text-[var(--color-ink)] hover:bg-gray-100`}
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-pago-taller"
              type="submit"
              disabled={guardando}
              className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] hover:brightness-105`}
            >
              {guardando ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Check size={14} /> Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
