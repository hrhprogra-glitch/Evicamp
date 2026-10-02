// src/sections/Finanzas/components/ModalDetalleCaja.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Receipt, Download, FileText, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useReactToPrint } from 'react-to-print';
// html2canvas-pro (no el html2canvas normal): Tailwind v4 usa colores oklch() en su CSS, y la
// librería original no sabe interpretarlos (falla al generar la imagen). Este fork sí los soporta.
import html2canvas from 'html2canvas-pro';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caja: any;
}

export const ModalDetalleCaja: React.FC<Props> = ({ isOpen, onClose, caja }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana

  const [tickets, setTickets] = useState<any[]>([]);
  // 🧾 Movimientos manuales de Caja Interna (Ingreso Extra / Gasto-Retiro, registrados desde
  // "Nuevo Movimiento"). Antes el reporte solo mostraba las ventas y estos quedaban afuera.
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 🪟 Dos vistas: "DETALLE" (clara y completa, se ve primero al hacer clic) y "TICKET"
  // (formato angosto 80mm, vista previa antes de imprimir o descargar). Antes solo existía
  // la vista de ticket, forzando a leer todo apretado en un formato pensado para imprimir.
  const [vista, setVista] = useState<'DETALLE' | 'TICKET'>('DETALLE');
  const [descargando, setDescargando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Resumen_Caja_${caja?.id}`,
  });

  const handleDescargar = async () => {
    if (!printRef.current) return;
    setDescargando(true);
    try {
      const canvas = await html2canvas(printRef.current, { backgroundColor: 'var(--color-surface)', scale: 2 });
      const link = document.createElement('a');
      link.download = `Ticket_Caja_${caja.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('No se pudo descargar el ticket.');
    } finally {
      setDescargando(false);
    }
  };

  useEffect(() => {
    if (isOpen && caja) {
      setVista('DETALLE'); // siempre arranca en la vista clara, no en el ticket
      cargarResumenTicket();
    }
  }, [isOpen, caja]);

  const cargarResumenTicket = async () => {
    setLoading(true);

    // Buscamos ventas en el rango de la caja
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', caja.opened_at)
      .lte('created_at', caja.closed_at || new Date().toISOString());
    setTickets(sales || []);

    // Movimientos manuales de Caja Interna de ESTA sesión (Ingreso Extra / Gasto-Retiro).
    // Los de Caja Externa (personal) no entran: no son plata del negocio, no van en su reporte.
    // Los abonos de fiados (INGRESO_FIADO) tampoco: ya se cuentan en "Final" vía closing_balance.
    const { data: movs } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', String(caja.id))
      .eq('flujo', 'INTERNO')
      .order('created_at');
    setMovimientos(movs || []);

    setLoading(false);
  };

  if (!isOpen || !caja) return null;

  const ventasValidas = tickets.filter(t => t.sunat_status !== 'ANULADO');
  const totalMovimientos = movimientos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/90 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-2xl h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.9)] flex flex-col">

        <div className="bg-[var(--color-info)] p-4 border-b-2 border-[var(--color-ink)] flex justify-between items-center text-white gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {vista === 'TICKET' && (
              <button
                onClick={() => setVista('DETALLE')}
                className="flex items-center gap-1 bg-white text-[var(--color-ink)] px-2.5 py-1.5 border-2 border-[var(--color-ink)] font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shrink-0 rounded-none"
                title="Volver al detalle"
              >
                <ChevronLeft size={16} strokeWidth={3} /> Volver
              </button>
            )}
            <h2 className="font-black uppercase tracking-widest flex items-center gap-2 text-base sm:text-lg truncate">
              <Receipt size={22} className="shrink-0" /> <span className="truncate">{vista === 'DETALLE' ? 'Detalle de Caja' : 'Ticket'} #{caja.id}</span>
            </h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform cursor-pointer shrink-0">
            <X size={26} strokeWidth={3} />
          </button>
        </div>

        {loading ? (
          <p className="text-center font-black animate-pulse p-8">GENERANDO REPORTE...</p>
        ) : vista === 'DETALLE' ? (
          <>
            {/* VISTA CLARA: todo lo que hubo, sin el formato angosto de ticket */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-4">

              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Apertura</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{new Date(caja.opened_at).toLocaleString('es-PE')}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Cierre</p>
                  <p className="text-base font-black text-[var(--color-ink)]">{caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE') : '---'}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Fondo Inicial</p>
                  <p className="text-base font-black text-[var(--color-ink)]">S/ {Number(caja.opening_balance).toFixed(2)}</p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-3">
                  <p className="text-xs font-black text-[var(--color-muted)] uppercase">Saldo Final Contado</p>
                  <p className="text-base font-black text-[var(--color-ink)]">S/ {Number(caja.closing_balance).toFixed(2)}</p>
                </div>
              </div>

              {caja.justification && (
                <div className="border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-3">
                  <p className="text-xs font-black text-[var(--color-warning-dark)] uppercase mb-1">Justificación de la diferencia</p>
                  <p className="text-sm font-bold text-[var(--color-ink)]">{caja.justification}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 border-b-2 border-[var(--color-ink)] pb-1">
                  Ventas ({ventasValidas.length})
                </h3>
                {ventasValidas.length === 0 ? (
                  <p className="text-sm font-bold text-[var(--color-muted)] uppercase">No hubo ventas en esta caja.</p>
                ) : (
                  <div className="border-2 border-[var(--color-border)]">
                    {ventasValidas.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm">
                        <span className="font-bold text-[var(--color-muted)]">{new Date(t.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-black uppercase text-[var(--color-ink)]">{t.payment_type}</span>
                        <span className="font-black text-[var(--color-accent)]">S/ {Number(t.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 border-b-2 border-[var(--color-ink)] pb-1">
                  Movimientos de Caja Interna ({movimientos.length})
                </h3>
                {movimientos.length === 0 ? (
                  <p className="text-sm font-bold text-[var(--color-muted)] uppercase">No hubo ingresos/gastos manuales en esta caja.</p>
                ) : (
                  <>
                    <div className="border-2 border-[var(--color-border)]">
                      {movimientos.map(m => (
                        <div key={m.id} className="flex justify-between items-center gap-2 p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm">
                          <span className="font-bold text-[var(--color-muted)] shrink-0">{new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-black uppercase text-[var(--color-ink)] flex-1">{m.description}</span>
                          <span className={`font-black shrink-0 ${m.type === 'INGRESO' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                            {m.type === 'INGRESO' ? '+' : '-'} S/ {Number(m.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between p-2.5 bg-[var(--color-bg)] border-2 border-t-0 border-[var(--color-border)] text-sm font-black uppercase">
                      <span>Total Movimientos</span>
                      <span className={totalMovimientos >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}>S/ {totalMovimientos.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

            </div>

            <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)]">
              <button
                onClick={() => setVista('TICKET')}
                className="w-full bg-[var(--color-ink)] text-white p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-info)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 cursor-pointer"
              >
                <FileText size={20} /> Ver Ticket para Imprimir / Descargar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* VISTA TICKET: formato angosto 80mm, vista previa antes de imprimir o descargar */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[var(--color-bg-2)]">
              <div ref={printRef} className="bg-white p-4 text-[var(--color-ink)] w-[80mm] mx-auto border border-dashed border-gray-300 shadow-md print:border-0 print:p-0 print:shadow-none">
                <div className="text-center border-b-2 border-black pb-2 mb-4">
                  <h3 className="font-black text-lg uppercase">Resumen de Caja</h3>
                  <p className="text-[12px] font-bold">ID: {caja.id}</p>
                  <p className="text-[12px]">Desde: {new Date(caja.opened_at).toLocaleString()}</p>
                  <p className="text-[12px]">Hasta: {caja.closed_at ? new Date(caja.closed_at).toLocaleString() : '---'}</p>
                </div>

                <table className="w-full text-[12px] mb-4">
                  <thead>
                    <tr className="border-b border-black text-left">
                      <th>HORA</th>
                      <th>MET.</th>
                      <th className="text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasValidas.map(t => (
                      <tr key={t.id}>
                        <td className="py-1">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="uppercase">{t.payment_type}</td>
                        <td className="text-right">S/ {Number(t.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {movimientos.length > 0 && (
                  <table className="w-full text-[12px] mb-4">
                    <thead>
                      <tr className="border-b border-black text-left">
                        <th colSpan={2}>MOVIMIENTOS DE CAJA</th>
                        <th className="text-right">MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map(m => (
                        <tr key={m.id}>
                          <td className="py-1" colSpan={2}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {m.description}
                          </td>
                          <td className={`text-right ${m.type === 'INGRESO' ? 'text-green-700' : 'text-red-700'}`}>
                            {m.type === 'INGRESO' ? '+' : '-'} S/ {Number(m.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="border-t-2 border-black pt-2 space-y-1 font-black text-xs uppercase">
                  <div className="flex justify-between"><span>Base:</span><span>S/ {Number(caja.opening_balance).toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Efectivo:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_cash || 0), 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-blue-600"><span>Yape:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_yape || 0), 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-purple-600"><span>Tarjeta:</span><span>S/ {ventasValidas.reduce((a, b) => a + Number(b.amount_card || 0), 0).toFixed(2)}</span></div>
                  {movimientos.length > 0 && (
                    <div className="flex justify-between text-[var(--color-ink)]">
                      <span>Movimientos (Ingresos - Gastos):</span>
                      <span>S/ {totalMovimientos.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-1 text-lg">
                    <span>Final:</span>
                    <span>S/ {Number(caja.closing_balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] flex gap-2">
              <button
                onClick={handleDescargar}
                disabled={descargando}
                className="flex-1 bg-white text-[var(--color-ink)] p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-border)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 disabled:opacity-50 cursor-pointer"
              >
                <Download size={20} /> {descargando ? 'Descargando...' : 'Descargar'}
              </button>
              <button
                onClick={() => handlePrint()}
                className="flex-1 bg-[var(--color-ink)] text-white p-4 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--color-accent)] transition-colors border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-1 cursor-pointer"
              >
                <Printer size={20} /> Imprimir
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
