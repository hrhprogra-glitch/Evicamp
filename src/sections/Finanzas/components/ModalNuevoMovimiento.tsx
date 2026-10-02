// src/sections/Finanzas/components/ModalNuevoMovimiento.tsx
import React, { useState } from 'react';
import { X, ArrowRightLeft, CheckCircle2, Building2, Wallet, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string;
}

export const ModalNuevoMovimiento: React.FC<Props> = ({ isOpen, onClose, onSuccess, sessionId }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  // 🔀 ELEGIR primero obliga a decidir Interna/Externa antes de ver el resto del formulario
  // (antes era solo un botón arriba, fácil de pasar por alto sin querer).
  const [flujo, setFlujo] = useState<'INTERNO' | 'EXTERNO' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Al cerrar o terminar de guardar, volvemos siempre al primer paso para la próxima vez.
  const cerrarYReiniciar = () => { setFlujo(null); onClose(); };

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
      flujo: flujo, // <-- Guardamos si es INTERNO o EXTERNO
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
    <div className="fixed inset-0 bg-[#1E293B]/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 font-mono">
      <div className="max-h-[calc(var(--alto-pantalla)*0.94)] overflow-y-auto bg-white border-2 border-[#1E293B] shadow-[8px_8px_0_0_#1E293B] w-full max-w-md flex flex-col rounded-none animate-fade-in">

        <div className="bg-[#3B82F6] p-4 border-b-2 border-[#1E293B] flex justify-between items-center text-white gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {flujo !== null && (
              <button
                onClick={() => setFlujo(null)}
                className="flex items-center gap-1 bg-white text-[#1E293B] px-2.5 py-1.5 border-2 border-[#1E293B] font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0_0_#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer shrink-0 rounded-none"
                title="Cambiar Caja Interna/Externa"
              >
                <ChevronLeft size={16} strokeWidth={3} /> Volver
              </button>
            )}
            <h2 className="font-black uppercase tracking-widest flex items-center gap-2 text-sm truncate">
              <ArrowRightLeft size={18} className="shrink-0" /> <span className="truncate">Registrar Movimiento</span>
            </h2>
          </div>
          <button onClick={cerrarYReiniciar} className="hover:text-[#1E293B] transition-colors cursor-pointer shrink-0">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {flujo === null ? (
          /* 🔀 PASO 1 (obligatorio): elegir primero si el movimiento es del negocio o
             personal. Recién con esa elección hecha se ve el resto del formulario, para
             que no se pueda guardar un movimiento sin decidir a qué caja pertenece. */
          <div className="p-6 flex flex-col gap-3">
            <p className="text-[12px] font-black text-[#64748B] uppercase tracking-widest text-center mb-1">
              ¿A qué caja pertenece este movimiento?
            </p>
            <button
              onClick={() => setFlujo('INTERNO')}
              className="flex items-center gap-3 p-4 border-2 border-[#1E293B] bg-white hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none text-left group"
            >
              <Building2 size={28} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-sm">Caja Interna (Negocio)</p>
                <p className="text-[11px] font-bold uppercase text-[#64748B] group-hover:text-[#CBD5E1]">Queda guardado en el historial y afecta el saldo del negocio</p>
              </div>
            </button>
            <button
              onClick={() => setFlujo('EXTERNO')}
              className="flex items-center gap-3 p-4 border-2 border-[#1E293B] bg-white hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none text-left group"
            >
              <Wallet size={28} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-sm">Caja Externa (Personal)</p>
                <p className="text-[11px] font-bold uppercase text-[#64748B] group-hover:text-[#CBD5E1]">Dinero personal, no cuenta en las ganancias ni gastos del negocio</p>
              </div>
            </button>
          </div>
        ) : (
        <>
        <div className="p-6 flex flex-col gap-4">

          {/* Caja elegida en el paso 1 — se puede cambiar con la flecha de arriba */}
          <div className={`text-center py-2 border-2 font-black text-[12px] uppercase tracking-widest ${flujo === 'INTERNO' ? 'bg-[#ECFDF5] border-[#10B981] text-[#10B981]' : 'bg-[#FFFBEB] border-[#D97706] text-[#D97706]'}`}>
            {flujo === 'INTERNO' ? 'Caja Interna (Negocio)' : 'Caja Externa (Personal)'}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setTipo('INGRESO')} className={`flex-1 py-2 text-xs font-black uppercase border-2 transition-colors rounded-none cursor-pointer ${tipo === 'INGRESO' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#10B981]'}`}>
              Ingreso Extra
            </button>
            <button onClick={() => setTipo('EGRESO')} className={`flex-1 py-2 text-xs font-black uppercase border-2 transition-colors rounded-none cursor-pointer ${tipo === 'EGRESO' ? 'bg-[#EF4444] border-[#EF4444] text-white' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#EF4444]'}`}>
              Gasto / Retiro
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-black text-[#1E293B] uppercase tracking-widest">Monto (S/)</label>
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="w-full bg-[#F8FAFC] border-2 border-[#1E293B] p-2 text-lg font-black outline-none focus:border-[#3B82F6] rounded-none"/>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-black text-[#1E293B] uppercase tracking-widest">Motivo / Descripción</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Pago a proveedor, Pasajes..." className="w-full bg-[#F8FAFC] border-2 border-[#1E293B] p-2 text-xs font-black uppercase outline-none focus:border-[#3B82F6] rounded-none"/>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-black text-[#1E293B] uppercase tracking-widest">Método</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full bg-[#F8FAFC] border-2 border-[#1E293B] p-2 text-xs font-black uppercase outline-none focus:border-[#3B82F6] rounded-none cursor-pointer">
              <option value="EFECTIVO">EFECTIVO</option>
              {/* Plin es billetera como Yape: va a la bolsa Yape/Transferencias (ver bolsaDe en Finanzas) */}
              <option value="YAPE">YAPE / PLIN</option>
              <option value="TARJETA">TARJETA</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-[#F8FAFC] border-t-2 border-[#1E293B]">
          <button onClick={handleGuardar} disabled={!monto || !descripcion || isSubmitting} className="w-full bg-[#1E293B] text-white p-3 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#3B82F6] transition-colors disabled:opacity-50 border-2 border-[#1E293B] shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none">
            {isSubmitting ? 'Guardando...' : <><CheckCircle2 size={18} /> Confirmar Movimiento</>}
          </button>
        </div>
        </>
        )}

      </div>
    </div>
  );
};