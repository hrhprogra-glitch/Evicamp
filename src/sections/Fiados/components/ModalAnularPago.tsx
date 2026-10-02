import React from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import type { Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { usePermiso } from '../../../utils/permisos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fiado: Fiado | null;
  onAnularPago: (pagoId: string, monto: number) => void;
}

export const ModalAnularPago: React.FC<Props> = ({ isOpen, onClose, fiado, onAnularPago }) => {
  // Anular pagos requiere el permiso de cobrar deudas (el historial se puede ver igual)
  const puedeCobrar = usePermiso('caja_cobrar_deudas');
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  if (!isOpen || !fiado) return null;

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.8)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <RotateCcw className="text-[var(--color-warning)]" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              Historial de Pagos
            </h2>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer"><X size={20} /></button>
        </div>

        {/* BODY */}
        <div className="p-6 flex flex-col gap-4 overflow-hidden flex-1">
          <div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4 text-center">
            <p className="text-xs font-black text-[var(--color-muted)] uppercase">Cliente</p>
            <p className="text-lg font-black text-[var(--color-ink)] uppercase leading-tight">{fiado.clienteNombre}</p>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {!fiado.pagos || fiado.pagos.length === 0 ? (
              <p className="text-center text-[var(--color-subtle)] font-bold text-xs py-4 uppercase">No hay pagos registrados.</p>
            ) : (
              fiado.pagos.map(pago => (
                <div key={pago.id} className="flex justify-between items-center border-2 border-[var(--color-border)] p-3 hover:border-[var(--color-danger)] transition-colors bg-[var(--color-bg)] group">
                  <div className="flex-1">
                    <p className="text-xs font-black text-[var(--color-ink)] uppercase">Abono {pago.metodo}</p>
                    <p className="text-[12px] font-bold text-[var(--color-muted)]">{new Date(pago.fecha).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[var(--color-accent)]">S/ {pago.monto.toFixed(2)}</span>
                    {puedeCobrar && (
                    <button 
                      onClick={() => onAnularPago(pago.id, pago.monto)} 
                      className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] group-hover:border-[var(--color-danger)] group-hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                      title="Eliminar este pago"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};