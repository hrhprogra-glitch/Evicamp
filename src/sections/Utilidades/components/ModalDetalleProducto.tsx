import { X, Package, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import type { AnalisisProducto } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  producto: AnalisisProducto;
  onClose: () => void;
}

const formatearFecha = (fecha: string) => {
  if (!fecha) return 'SIN FECHA';
  const d = new Date(fecha);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima'
  });
};

export const ModalDetalleProducto: React.FC<Props> = ({ producto, onClose }) => {
  useCerrarConEscape(true, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const ventas = producto.ventasDetalle || [];

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-3xl max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.85)] flex flex-col rounded-none">

        {/* CABECERA */}
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent-shadow)] flex items-center justify-center border border-[var(--color-ink)]">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-ink)]">{producto.nombre}</h3>
              <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{producto.categoria}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-white hover:bg-red-600 transition-colors border border-[var(--color-border)] p-1.5 rounded-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* RESUMEN RÁPIDO */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[var(--color-border)] border-b-2 border-[var(--color-ink)] shrink-0">
          <div className="bg-white p-3 text-center">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Vendido</p>
            <p className="text-sm font-black text-[var(--color-ink)] font-mono">
              {Number(producto.unidadesVendidas).toFixed(2)} <span className="text-[12px] text-[var(--color-muted)]">{producto.unidadMedida}</span>
            </p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Cobrado</p>
            <p className="text-sm font-black text-[var(--color-ink)] font-mono">S/ {producto.ingresosTotales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Costo</p>
            <p className="text-sm font-black text-[var(--color-ink)] font-mono">S/ {producto.costoTotalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Utilidad</p>
            <p className={`text-sm font-black font-mono ${producto.utilidadReal >= 0 ? 'text-[var(--color-accent-shadow)]' : 'text-[var(--color-danger)]'}`}>
              S/ {producto.utilidadReal.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Margen</p>
            <p className={`text-sm font-black font-mono flex items-center justify-center gap-1 ${producto.margen >= 0 ? 'text-[var(--color-accent-shadow)]' : 'text-[var(--color-danger)]'}`}>
              {producto.margen >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
              {producto.margen.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* LISTA DE VENTAS */}
        <div className="flex items-center gap-2 px-4 pt-3 shrink-0">
          <Receipt size={14} className="text-[var(--color-accent-shadow)]" />
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--color-ink)]">
            Ventas del período ({ventas.length})
          </h4>
        </div>

        <div className="overflow-y-auto p-4 pt-2 flex-1">
          {ventas.length === 0 ? (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-6 text-center">
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">Sin ventas en este período</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ventas.map((v, idx) => (
                <div key={`${v.saleId}-${idx}`} className="border border-[var(--color-border)] p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-[var(--color-bg)] transition-colors">
                  <div>
                    <p className="text-[12px] font-bold text-[var(--color-ink)] font-mono">{formatearFecha(v.fecha)}</p>
                    <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                      {Number(v.cantidad).toFixed(2)} {producto.unidadMedida} · Ticket #{v.saleId.slice(-6)}
                      {v.clienteNombre ? ` · ${v.clienteNombre}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--color-ink)] font-mono">S/ {v.monto.toFixed(2)}</span>

                    {!v.esFiado ? (
                      <span className="text-[12px] font-black px-2 py-1 rounded-none border border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)] uppercase tracking-widest">
                        Pagado
                      </span>
                    ) : v.fiadoCompleto ? (
                      <span className="text-[12px] font-black px-2 py-1 rounded-none border border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)] uppercase tracking-widest">
                        Abono completo S/ {Number(v.montoAbonado || 0).toFixed(2)}
                      </span>
                    ) : (
                      <div className="flex gap-1.5">
                        <span className="text-[12px] font-black px-2 py-1 rounded-none border border-[var(--color-warning)] text-[var(--color-warning)] bg-[var(--color-warning-bg)] uppercase tracking-widest">
                          Abonó S/ {Number(v.montoAbonado || 0).toFixed(2)}
                        </span>
                        <span className="text-[12px] font-black px-2 py-1 rounded-none border border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)] uppercase tracking-widest">
                          Resta S/ {Number(v.montoRestante || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
