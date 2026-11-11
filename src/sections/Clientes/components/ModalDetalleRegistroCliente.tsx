// src/sections/Clientes/components/ModalDetalleRegistroCliente.tsx
// VENTANA FLOTANTE PARA VER DETALLE COMPLETO DE UN PENDIENTE, PAGADO O COMPRA
// Muestra todos los productos, cantidades, precios, abonos y totales con máxima claridad.
import React, { useEffect, useRef } from 'react';
import { X, ReceiptText, Calendar, DollarSign, UserCheck, ShieldCheck, Clock } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { formatearCantidadDetalle, formatearMonto } from '../../../utils/formato';

export interface RegistroDetalleCliente {
  tipo: 'PENDIENTE' | 'PAGADO' | 'COMPRA';
  id: string;
  clienteNombre: string;
  fecha: string;
  total: number;
  // Campos de crédito (Pendiente / Pagado)
  montoOriginal?: number;
  montoPagado?: number;
  saldoPendiente?: number;
  fechaEmision?: string;
  fechaUltimoPago?: string;
  pagos?: Array<{
    id: string;
    fecha: string;
    monto: number;
    metodo: string;
    nota?: string;
  }>;
  // Campos de compra al contado
  metodoPago?: string;
  vendedor?: string;
  // Productos incluidos
  detalles: Array<{
    name: string;
    qty: number | string;
    price?: number;
    subtotal?: number | string;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registro: RegistroDetalleCliente | null;
}

const toNum = (v?: number | string): number => {
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? 0 : parsed;
  }
  return v || 0;
};

const soles = (n?: number | string) => `S/ ${formatearMonto(toNum(n))}`;
const fechaHora = (f?: string) => {
  if (!f) return '—';
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ModalDetalleRegistroCliente: React.FC<Props> = ({ isOpen, onClose, registro }) => {
  useCerrarConEscape(isOpen, onClose);
  const btnCerrarRef = useRef<HTMLButtonElement>(null);

  // Auto-foco en el botón cerrar al abrir
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        btnCerrarRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen || !registro) return null;

  const esPendiente = registro.tipo === 'PENDIENTE';
  const esPagado = registro.tipo === 'PAGADO';
  const esCompra = registro.tipo === 'COMPRA';

  const ticketNumero = registro.id.length > 6 ? registro.id.slice(-6) : registro.id;

  const tituloVentana = esPendiente
    ? `Deuda Pendiente · Ticket #${ticketNumero}`
    : esPagado
    ? `Crédito Cancelado · Ticket #${ticketNumero}`
    : `Venta al Contado · Ticket #${ticketNumero}`;

  const estadoBadge = esPendiente ? (
    <span className="border-2 border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] px-2.5 py-1 text-xs font-black uppercase tracking-widest">
      PENDIENTE DE PAGO
    </span>
  ) : esPagado ? (
    <span className="border-2 border-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)] text-[var(--color-accent-shadow)] px-2.5 py-1 text-xs font-black uppercase tracking-widest">
      100% CANCELADO
    </span>
  ) : (
    <span className="border-2 border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)] px-2.5 py-1 text-xs font-black uppercase tracking-widest">
      PAGO AL CONTADO
    </span>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-registro-cliente"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 font-mono"
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          // Navegación fluida entre elementos enfocables
          const focusables = Array.from(
            document.querySelectorAll<HTMLElement>(
              '#modal-registro-cliente button, #modal-registro-cliente [tabindex="0"]'
            )
          ).filter((el) => el.offsetParent !== null);
          const idx = focusables.indexOf(document.activeElement as HTMLElement);
          if (idx >= 0) {
            e.preventDefault();
            const sig = e.key === 'ArrowDown'
              ? focusables[Math.min(idx + 1, focusables.length - 1)]
              : focusables[Math.max(idx - 1, 0)];
            sig?.focus();
          }
        }
      }}
    >
      <div
        id="modal-registro-cliente"
        className="ventana-sobria bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[90vh] shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        {/* CABECERA SOBRIA */}
        <div className="ventana-cabecera bg-[var(--color-ink)] text-white px-4 sm:px-6 py-3.5 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ReceiptText size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2
                id="titulo-modal-registro-cliente"
                className="ventana-cabecera__titulo text-xs sm:text-sm font-black uppercase tracking-widest truncate text-white"
              >
                {tituloVentana}
              </h2>
              <p className="text-[11px] font-bold text-gray-300 truncate">
                Cliente: <span className="text-white font-black">{registro.clienteNombre}</span>
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-registro-cliente"
            ref={btnCerrarRef}
            onClick={onClose}
            title="Cerrar (Escape)"
            className="ventana-cerrar text-white hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-white p-1 cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-[var(--color-bg)]">
          {/* TARJETAS DE CIFRAS CLAVE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            {esPendiente ? (
              <>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Monto Total</p>
                  <p className="text-sm font-black text-[var(--color-ink)]">{soles(registro.montoOriginal || registro.total)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Abonado</p>
                  <p className="text-sm font-black text-[var(--color-accent-shadow)]">{soles(registro.montoPagado || 0)}</p>
                </div>
                <div className="border-2 border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-danger)]">Debe Actualmente</p>
                  <p className="text-base font-black text-[var(--color-danger)]">{soles(registro.saldoPendiente || registro.total)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5 flex items-center justify-center">
                  {estadoBadge}
                </div>
              </>
            ) : esPagado ? (
              <>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Total Pagado</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{soles(registro.montoOriginal || registro.total)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Fecha Emisión</p>
                  <p className="text-xs font-black text-[var(--color-ink)]">{fechaHora(registro.fechaEmision || registro.fecha)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Fecha Cancelado</p>
                  <p className="text-xs font-black text-[var(--color-accent-shadow)]">{fechaHora(registro.fechaUltimoPago || registro.fecha)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5 flex items-center justify-center">
                  {estadoBadge}
                </div>
              </>
            ) : (
              <>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Total Cobrado</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{soles(registro.total)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Método de Pago</p>
                  <p className="text-xs font-black uppercase text-[var(--color-info)]">{registro.metodoPago || 'EFECTIVO'}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Fecha y Hora</p>
                  <p className="text-xs font-black text-[var(--color-ink)]">{fechaHora(registro.fecha)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] bg-white p-2.5 flex items-center justify-center">
                  {estadoBadge}
                </div>
              </>
            )}
          </div>

          {/* LISTA DE PRODUCTOS */}
          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center border-b-2 border-[var(--color-border)] pb-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-[var(--color-ink)]">
                Productos Comprados ({registro.detalles.length})
              </span>
              <span className="text-[11px] font-bold text-[var(--color-muted)]">
                Total ítems: {registro.detalles.reduce((acc, d) => acc + (Number(d.qty) || 1), 0)}
              </span>
            </div>

            {registro.detalles.length === 0 ? (
              <p className="text-xs font-bold text-[var(--color-muted)] py-4 text-center">
                Sin detalle de productos registrado.
              </p>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--color-bg)] text-[var(--color-ink)] border-b-2 border-[var(--color-border)]">
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-center w-16">Cant.</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider">Descripción del Producto</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-right w-24">P. Unit</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registro.detalles.map((d, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-2)] transition-colors"
                      >
                        <td className="py-2.5 px-3 font-black text-center text-[var(--color-ink)] bg-[var(--color-bg-2)]/50">
                          {formatearCantidadDetalle(d.qty)}
                        </td>
                        <td className="py-2.5 px-3 font-black text-[var(--color-ink)] uppercase">
                          {d.name}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-right text-[var(--color-muted)]">
                          {d.price != null && d.price > 0 ? soles(d.price) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-black text-right text-[var(--color-ink)]">
                          {soles(d.subtotal != null ? d.subtotal : (d.price || 0) * toNum(d.qty))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-ink)] bg-[var(--color-surface)]">
                      <td colSpan={3} className="py-2.5 px-3 font-black uppercase text-right tracking-widest text-[var(--color-ink)]">
                        Monto Total:
                      </td>
                      <td className="py-2.5 px-3 font-black text-right text-sm text-[var(--color-ink)]">
                        {soles(registro.montoOriginal || registro.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* HISTORIAL DE ABONOS (si es crédito y tiene abonos) */}
          {registro.pagos && registro.pagos.length > 0 && (
            <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center border-b-2 border-[var(--color-border)] pb-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-[var(--color-accent-shadow)]">
                  Historial de Abonos ({registro.pagos.length})
                </span>
                <span className="text-[11px] font-black text-[var(--color-accent-shadow)]">
                  Total abonado: {soles(registro.pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0))}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {registro.pagos.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex justify-between items-center p-2.5 border-2 border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[var(--color-accent-bg)] border border-[var(--color-accent)] flex items-center justify-center shrink-0">
                        <Clock size={12} className="text-[var(--color-accent-shadow)]" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[var(--color-ink)]">
                          {fechaHora(p.fecha)}
                        </p>
                        <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                          Método: <span className="text-[var(--color-ink)] font-black">{p.metodo || 'EFECTIVO'}</span>
                          {p.nota ? ` · Nota: ${p.nota}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-[var(--color-accent-shadow)]">
                      + {soles(Number(p.monto) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALLES EXTRA (Vendedor / Fechas) */}
          {registro.vendedor && (
            <p className="text-xs font-bold text-[var(--color-muted)]">
              Atendido por:{' '}
              <span className="text-[var(--color-ink)] font-black uppercase">{registro.vendedor}</span>
            </p>
          )}
        </div>

        {/* PIE DE LA VENTANA */}
        <div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-surface)] px-4 sm:px-6 py-3 flex justify-between items-center gap-3 shrink-0">
          <span className="text-[11px] font-black uppercase text-[var(--color-muted)] hidden sm:inline">
            Presiona <kbd className="px-1.5 py-0.5 bg-white border border-[var(--color-border)] text-[var(--color-ink)] font-mono">Escape</kbd> para volver
          </span>
          <button
            id="btn-cerrar-registro-pie"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-[38px] px-6 bg-[var(--color-ink)] text-white font-black text-xs uppercase tracking-widest border-2 border-[var(--color-ink)] hover:bg-[var(--color-accent-shadow)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer transition-colors"
          >
            Cerrar (Escape)
          </button>
        </div>
      </div>
    </div>
  );
};
