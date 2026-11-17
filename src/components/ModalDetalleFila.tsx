import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';

export interface CampoDetalleFila {
  etiqueta: string;
  valor: React.ReactNode;
}

interface ModalDetalleFilaProps {
  titulo: string;
  subtitulo?: string;
  campos: CampoDetalleFila[];
  onClose: () => void;
}

/**
 * Detalle de solo lectura para las tablas que no tenían ventana propia (Utilidades,
 * visitas y cobros de Contratos). Mismo estilo SiuMax Sobrio que Inventario > Productos:
 * sin esquinas redondeadas, cabecera oscura y cierre con Escape o con el botón.
 * La pila de useCerrarConEscape garantiza que Escape cierre primero esa ventana si hay
 * otra abajo (por ejemplo el detalle de un contrato).
 */
export const ModalDetalleFila: React.FC<ModalDetalleFilaProps> = ({
  titulo,
  subtitulo,
  campos,
  onClose,
}) => {
  useCerrarConEscape(true, onClose);

  useEffect(() => {
    const t = setTimeout(() => document.getElementById('btn-cerrar-detalle-fila')?.focus(), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      id="modal-detalle-fila"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none shadow-lg">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-ink)] truncate">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase mt-0.5 truncate">
                {subtitulo}
              </p>
            )}
          </div>
          <button
            id="btn-cerrar-detalle-fila"
            type="button"
            onClick={onClose}
            title="Cerrar (Escape)"
            className="w-8 h-8 shrink-0 flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {campos.map((campo, idx) => (
            <div
              key={`${campo.etiqueta}-${idx}`}
              className="grid grid-cols-1 md:grid-cols-[38%_1fr] gap-1 md:gap-3 p-2.5 border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                {campo.etiqueta}
              </span>
              <span className="text-xs font-bold text-[var(--color-ink)] break-words">
                {campo.valor ?? '—'}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex justify-end shrink-0">
          <button
            id="btn-cerrar-pie-detalle-fila"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
