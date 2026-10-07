import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Edit, Banknote, ShoppingCart, CheckCircle } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { ClienteFiadoAgrupado } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteFiadoAgrupado | null;
  onRefetch: () => void;
}

export const ModalEstadoCuenta: React.FC<Props> = ({ isOpen, onClose, cliente, onRefetch }) => {
  useCerrarConEscape(isOpen, onClose);
  const [tab, setTab] = useState<'DEUDAS' | 'PAGOS'>('DEUDAS');

  if (!isOpen || !cliente) return null;

  return createPortal(
    <div className="fixed inset-0 bg-[var(--color-ink)]/90 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 animate-fade-in font-mono">
      <div className="bg-white border-4 border-[var(--color-ink)] shadow-[16px_16px_0_0_var(--color-ink)] w-full max-w-6xl h-[90vh] flex flex-col rounded-none relative">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black uppercase tracking-widest text-xl sm:text-3xl">ESTADO DE CUENTA</h2>
            <p className="text-[var(--color-accent)] font-bold tracking-widest uppercase mt-1">CLIENTE: {cliente.clienteNombre}</p>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer bg-white/10 p-2">
            <X size={32} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-[var(--color-bg)]">
          {/* LADO IZQUIERDO: DETALLE DE DEUDAS */}
          <div className="flex-1 flex flex-col border-r-4 border-[var(--color-ink)] overflow-hidden">
            <div className="p-4 border-b-4 border-[var(--color-ink)] bg-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg tracking-widest uppercase flex items-center gap-2">
                <ShoppingCart size={24} className="text-[var(--color-accent)]" /> 
                Historial de Consumos
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              {cliente.fiados.map((fiado) => (
                <div key={fiado.id} className="bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start border-b-2 border-dashed border-[var(--color-line-light)] pb-2 mb-2">
                    <div className="flex flex-col">
                      <span className="font-black text-lg text-[var(--color-ink)]">S/ {fiado.saldoPendiente.toFixed(2)}</span>
                      <span className="text-xs font-bold text-[var(--color-muted)] flex items-center gap-1">
                        <Calendar size={12} /> {new Date(fiado.fechaEmision).toLocaleString('es-PE')}
                        <button className="ml-2 bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)] hover:bg-[var(--color-accent)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
                          <Edit size={10} /> EDITAR FECHA
                        </button>
                      </span>
                    </div>
                    {fiado.saldoPendiente === 0 ? (
                      <span className="bg-[var(--color-success)] text-white text-[10px] font-black uppercase px-2 py-1 flex items-center gap-1"><CheckCircle size={12}/> PAGADO</span>
                    ) : (
                      <span className="bg-[var(--color-danger)] text-white text-[10px] font-black uppercase px-2 py-1">PENDIENTE</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {fiado.detalles.map((det, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold text-[var(--color-subtle)]">
                        <span>{det.qty} x {det.name}</span>
                        <span>S/ {Number(det.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LADO DERECHO: REGISTRO DE ABONO Y TOTALES */}
          <div className="w-full lg:w-[450px] flex flex-col shrink-0 overflow-y-auto custom-scrollbar bg-white">
            <div className="p-6 bg-[var(--color-ink)] text-white border-b-4 border-[var(--color-ink)]">
              <p className="text-[var(--color-subtle)] font-black uppercase text-xs mb-2">Deuda Total Pendiente</p>
              <h1 className="text-6xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>
            </div>
            
            <div className="p-6 flex flex-col gap-6 flex-1">
              <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] p-4 flex flex-col gap-2">
                 <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
                   <Banknote size={18} className="text-[var(--color-success)]" /> Registrar Abono
                 </h3>
                 <p className="text-xs font-bold text-[var(--color-muted)]">
                   Esta sección se implementará a continuación para permitir pagos parciales o totales.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
