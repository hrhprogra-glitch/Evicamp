import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../db/supabase';
import { X, Calendar, Edit, Banknote, ShoppingCart, CheckCircle, Calculator, CheckSquare, Square } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { ClienteFiadoAgrupado } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteFiadoAgrupado | null;
  onRefetch: () => void;
  onVerHistorial?: (nombre: string) => void;
}

export const ModalEstadoCuenta: React.FC<Props> = ({ isOpen, onClose, cliente, onRefetch, onVerHistorial }) => {
  useCerrarConEscape(isOpen, onClose);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [efectivo, setEfectivo] = useState<string>('');
  const [yape, setYape] = useState<string>('');
  const [tarjeta, setTarjeta] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Editar Fecha
  const [fechaEditId, setFechaEditId] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string>('');

  useEffect(() => {
    if (isOpen && cliente) {
      setSelectedIds(new Set());
        setEfectivo('');
      setYape('');
      setTarjeta('');
    } else {
      setSelectedIds(new Set());
      setFechaEditId(null);
    }
  }, [isOpen, cliente]);

  // Early return moved below hooks

  const handleToggleSelect = (id: string) => {
    if (!cliente) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    
    // Auto-update efectivo
    const total = cliente.fiados.filter(f => next.has(f.id)).reduce((acc, f) => acc + f.saldoPendiente, 0);
    setEfectivo(total.toFixed(2));
    setYape('');
    setTarjeta('');
  };

  const handleToggleAll = () => {
    if (!cliente) return;
    const pendingIds = cliente.fiados.filter(f => f.estado !== 'PAGADO').map(f => f.id);
    if (selectedIds.size === pendingIds.length) {
      setSelectedIds(new Set());
      setEfectivo('');
      setYape('');
      setTarjeta('');
    } else {
      setSelectedIds(new Set(pendingIds));
      const total = cliente.fiados.filter(f => f.estado !== 'PAGADO').reduce((acc, f) => acc + f.saldoPendiente, 0);
      setEfectivo(total.toFixed(2));
      setYape('');
      setTarjeta('');
    }
  };

  const aCentimos = (v: string) => Math.max(0, Number((Number(v) || 0).toFixed(2)));
  const valEfectivo = aCentimos(efectivo);
  const valYape = aCentimos(yape);
  const valTarjeta = aCentimos(tarjeta);
  const totalAbono = Number((valEfectivo + valYape + valTarjeta).toFixed(2));
  
  const selectedFiados = (cliente?.fiados || []).filter(f => selectedIds.has(f.id)).sort((a,b) => new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime());
  const totalSeleccionado = Number(selectedFiados.reduce((acc, f) => acc + f.saldoPendiente, 0).toFixed(2));

  const handlePagar = async () => {
    if (isSaving) return;
    if (selectedFiados.length === 0) return alert('Selecciona al menos una deuda para pagar.');
    if (totalAbono <= 0) return alert('El monto a abonar debe ser mayor a 0.');
    if (totalAbono > Number((totalSeleccionado + 0.05).toFixed(2))) {
      return alert('El abono supera la deuda seleccionada.');
    }

    setIsSaving(true);
    
    // âœ… ACTUALIZACIÃ“N OPTIMISTA: Cerramos y refrescamos de inmediato
    onRefetch();
    onClose();

    // El proceso fuerte va a background
    (async () => {
      try {
        const { data: session } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').single();
        
        let restanteEf = valEfectivo;
        let restanteYa = valYape;
        let restanteTa = valTarjeta;
        
        const inserciones = [];

        for (const fiado of selectedFiados) {
          if (restanteEf === 0 && restanteYa === 0 && restanteTa === 0) break;

          const porCobrar = fiado.saldoPendiente;
          let pagoEf = Math.min(restanteEf, porCobrar);
          let pagoYa = Math.min(restanteYa, porCobrar - pagoEf);
          let pagoTa = Math.min(restanteTa, porCobrar - pagoEf - pagoYa);
          
          const pagoFiado = Number((pagoEf + pagoYa + pagoTa).toFixed(2));
          if (pagoFiado === 0) continue;

          inserciones.push({
            fiado_id: Number(fiado.id),
            customer_id: fiado.clienteId ? Number(fiado.clienteId) : null,
            amount: pagoFiado,
            amount_cash: pagoEf,
            amount_yape: pagoYa,
            amount_card: pagoTa,
            amount_transfer: 0,
            payment_type: [pagoEf, pagoYa, pagoTa].filter(v => v > 0).length > 1
              ? 'mixto'
              : (pagoEf > 0 ? 'efectivo' : (pagoYa > 0 ? 'yape' : 'tarjeta')),
            session_id: session ? session.id : null,
            created_at: new Date().toISOString(),
            is_synced: 1
          });

          restanteEf = Number((restanteEf - pagoEf).toFixed(2));
          restanteYa = Number((restanteYa - pagoYa).toFixed(2));
          restanteTa = Number((restanteTa - pagoTa).toFixed(2));
        }

        if (inserciones.length > 0) {
          const { error } = await supabase.from('debt_payments').insert(inserciones);
          if (error) console.error('Error al insertar abonos en lote:', error);
        }
      } catch (e: any) {
        console.error('Error al registrar abono en background: ' + e.message);
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleUpdateFecha = async (id: string) => {
    if (!nuevaFecha) return;
    try {
      const { error } = await supabase.from('fiados').update({ date_given: new Date(nuevaFecha).toISOString(), expected_pay_date: new Date(nuevaFecha).toISOString() }).eq('id', id);
      if (error) throw error;
      setFechaEditId(null);
      onRefetch();
    } catch (e: any) {
      alert('Error al actualizar fecha: ' + e.message);
    }
  };

    // ================= FOCUS TRAP Y NAVEGACIÓN TECLADO =================
  useEffect(() => {
    if (!isOpen || !cliente) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      // 1. FOCUS TRAP PARA TAB
      if (e.key === 'Tab') {
        e.stopPropagation();
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled]), [data-fiado-card]')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el =>
          el.closest('.fixed.inset-0') &&
          el.tabIndex !== -1 &&
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

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
        return;
      }

      // 2. NAVEGACIÓN CON FLECHAS
      if (active?.closest('[data-fiado-card]')) {
        const currentCard = active.closest('[data-fiado-card]') as HTMLElement;
        const allCards = Array.from(document.querySelectorAll('[data-fiado-card]')) as HTMLElement[];
        const cardIndex = allCards.indexOf(currentCard);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextCard = allCards[cardIndex + 1];
          if (nextCard) {
            nextCard.focus();
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevCard = allCards[cardIndex - 1];
          if (prevCard) {
            prevCard.focus();
            prevCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            document.getElementById('btn-seleccionar-todas-modal')?.focus();
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('input-abono-efectivo-modal')?.focus();
        } else if (e.key === ' ' || e.key === 'Enter') {
          const fiadoId = currentCard.getAttribute('data-fiado-card');
          if (fiadoId && !active.closest('input')) {
            e.preventDefault();
            handleToggleSelect(fiadoId);
          }
        }
        return;
      }

      if (active?.id === 'btn-seleccionar-todas-modal') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
          if (firstCard) firstCard.focus();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('btn-ver-historial-modal')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-estado')?.focus();
        }
        return;
      }

      if (active?.id === 'btn-ver-historial-modal') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('btn-seleccionar-todas-modal')?.focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-abono-efectivo-modal')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-estado')?.focus();
        }
        return;
      }

      if (active?.id === 'input-abono-efectivo-modal') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-abono-yape-modal')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('btn-ver-historial-modal')?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
          if (firstCard) firstCard.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-confirmar-pago-modal')?.focus();
        }
        return;
      }

      if (active?.id === 'input-abono-yape-modal') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-abono-tarjeta-modal')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-abono-efectivo-modal')?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
          if (firstCard) firstCard.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-confirmar-pago-modal')?.focus();
        }
        return;
      }

      if (active?.id === 'input-abono-tarjeta-modal') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('btn-confirmar-pago-modal')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-abono-yape-modal')?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
          if (firstCard) firstCard.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-confirmar-pago-modal')?.focus();
        }
        return;
      }

      if (active?.id === 'btn-confirmar-pago-modal') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-abono-tarjeta-modal')?.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
          if (firstCard) firstCard.focus();
        }
        return;
      }

      if (active?.id === 'btn-cerrar-modal-estado') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('btn-seleccionar-todas-modal')?.focus();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, cliente, selectedIds, isSaving, totalAbono, totalSeleccionado]);

  useEffect(() => {
    if (isOpen && cliente) {
      setTimeout(() => {
        const firstCard = document.querySelector('[data-fiado-card]') as HTMLElement;
        if (firstCard) {
          firstCard.focus();
        } else {
          document.getElementById('input-abono-efectivo-modal')?.focus();
        }
      }, 100);
    }
  }, [isOpen, cliente]);

  if (!isOpen || !cliente) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 animate-fade-in font-mono">
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-6xl h-[90vh] flex flex-col rounded-none relative">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white p-3 sm:p-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black uppercase tracking-widest text-lg sm:text-2xl">ESTADO DE CUENTA</h2>
            <p className="text-[var(--color-accent)] font-bold tracking-widest uppercase text-sm">CLIENTE: {cliente.clienteNombre}</p>
          </div>
          <button id="btn-cerrar-modal-estado" onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer bg-white/10 p-1.5 focus:outline-none focus:ring-2 focus:ring-white">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-[var(--color-bg)]">
          {/* LADO IZQUIERDO: DETALLE DE DEUDAS */}

          <div className="flex-1 flex flex-col border-r-4 border-[var(--color-ink)] overflow-hidden">
            <div className="p-4 border-b-4 border-[var(--color-ink)] bg-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg tracking-widest uppercase flex items-center gap-2">
                <ShoppingCart size={24} className="text-[var(--color-accent)]" /> 
                Historial de Deudas
              </h3>
              <button id="btn-seleccionar-todas-modal" onClick={handleToggleAll} className="px-4 py-2 bg-[var(--color-ink)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
                Seleccionar Todas
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              {cliente.fiados.filter(f => f.estado !== 'PAGADO').sort((a,b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()).map((fiado) => (
                <div key={fiado.id} 
                  onClick={() => handleToggleSelect(fiado.id)} className={`cursor-pointer bg-white border-2 p-4 flex flex-col gap-2 relative transition-all ${selectedIds.has(fiado.id) ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}
                >
                  <div className="flex justify-between items-start border-b-2 border-dashed border-[var(--color-line-light)] pb-2 mb-2">
                    <div className="flex gap-3 items-center">
                      {fiado.saldoPendiente > 0 && (
                        <button onClick={() => handleToggleSelect(fiado.id)} className="cursor-pointer hover:text-[var(--color-accent)]">
                          {selectedIds.has(fiado.id) ? <CheckSquare size={24} className="text-[var(--color-accent)]" /> : <Square size={24} />}
                        </button>
                      )}
                      <div className="flex flex-col">
                        <span className={`font-black text-lg ${selectedIds.has(fiado.id) ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}>S/ {fiado.saldoPendiente.toFixed(2)}</span>
                        
                        <div className="text-xs font-bold text-[var(--color-muted)] flex flex-wrap items-center gap-2 mt-1">
                          {fechaEditId === fiado.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input type="datetime-local" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} className="border border-[var(--color-ink)] px-1 py-0.5 text-black" />
                              <button onClick={() => handleUpdateFecha(fiado.id)} className="bg-[var(--color-success)] text-white px-2 py-0.5">OK</button>
                              <button onClick={() => setFechaEditId(null)} className="bg-[var(--color-danger)] text-white px-2 py-0.5">X</button>
                            </div>
                          ) : (
                            <>
                              <Calendar size={12} /> {new Date(fiado.fechaEmision).toLocaleString('es-PE')}
                              <button onClick={(e) => { e.stopPropagation(); setFechaEditId(fiado.id); setNuevaFecha(fiado.fechaEmision.slice(0, 16)); }} className="ml-2 bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)] hover:bg-[var(--color-accent)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
                                  <Edit size={10} /> EDITAR
                                </button>
                                {(() => {
                                  const sumaDet = (fiado.detalles || []).reduce((acc, det) => acc + (Number(det.subtotal) || 0), 0);
                                  const abonoInicial = Math.max(0, sumaDet - fiado.montoOriginal);
                                  const abonosPost = fiado.montoPagado || 0;
                                  const totalAbonosHistorico = abonoInicial + abonosPost;
                                  if (totalAbonosHistorico > 0) {
                                    return (
                                      <span style={{ marginLeft: '8px', backgroundColor: '#22c55e', color: 'white', border: '1px solid #16a34a', padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900', fontSize: '11px', borderRadius: '4px' }}>
                                        ABONOS: S/ {totalAbonosHistorico.toFixed(2)}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                    {fiado.estado === 'PAGADO' ? (
                      <span className="bg-[var(--color-success)] text-white text-[10px] font-black uppercase px-2 py-1 flex items-center gap-1"><CheckCircle size={12}/> PAGADO</span>
                    ) : (
                      <span className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)] text-[10px] font-black uppercase px-2 py-1">PENDIENTE</span>
                    )}
                  </div>
                  
                    <div className="flex flex-col gap-1 pl-9">
                      {fiado.detalles.map((det, i) => (
                      <div key={i} className="flex justify-between text-sm font-black text-[var(--color-muted)]">
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
            <div className="p-4 bg-[var(--color-danger-bg)] border-b-4 border-[var(--color-danger)]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[var(--color-danger)] font-black uppercase tracking-widest text-xs">Deuda Total Pendiente</p>
                    <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-danger)] drop-shadow-md leading-none mt-1">S/ {cliente.totalPendiente.toFixed(2)}</h1>
                  </div>
                  <button 
                    onClick={() => {
                      if (onVerHistorial) {
                        onVerHistorial(cliente.clienteNombre);
                      }
                    }}
                    id="btn-ver-historial-modal" className="bg-white border-2 border-[var(--color-ink)] text-[var(--color-ink)] px-3 py-1.5 font-black uppercase tracking-widest text-[10px] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                  >
                    Ver Historial
                  </button>
                </div>
              </div>
            
            <div className="p-4 sm:p-6 flex flex-col gap-6 flex-1 bg-[var(--color-bg)]">
              <div className="bg-white border-2 border-[var(--color-ink)] p-5 shadow-[4px_4px_0_0_var(--color-ink)] flex flex-col gap-4">
                 <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2 border-b-2 border-dashed border-[var(--color-line-light)] pb-3">
                   <Calculator size={24} className="text-[var(--color-accent)]" /> Registrar Abono
                 </h3>
                 
                 <div className="flex justify-between items-center bg-[var(--color-surface)] p-3 border-2 border-[var(--color-ink)]">
                    <span className="font-black text-xs uppercase text-[var(--color-subtle)] tracking-widest">Total Seleccionado</span>
                    <span className="font-black text-xl text-[var(--color-ink)]">S/ {totalSeleccionado.toFixed(2)}</span>
                 </div>

                 <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-[var(--color-muted)] block mb-1">Efectivo</label>
                      <input id="input-abono-efectivo-modal" type="number" min="0" step="0.01" value={efectivo} onChange={(e) => setEfectivo(e.target.value)}
                        className="w-full border-2 border-[var(--color-ink)] px-4 py-3 font-black text-lg focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)] transition-all outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-[var(--color-purple)] block mb-1">Yape / Plin / Transferencia</label>
                      <input id="input-abono-yape-modal" type="number" min="0" step="0.01" value={yape} onChange={(e) => setYape(e.target.value)}
                        className="w-full border-2 border-[var(--color-purple)] px-4 py-3 font-black text-lg focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] transition-all outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-[var(--color-info)] block mb-1">Tarjeta de Crédito / POS</label>
                      <input id="input-abono-tarjeta-modal" type="number" min="0" step="0.01" value={tarjeta} onChange={(e) => setTarjeta(e.target.value)}
                        className="w-full border-2 border-[var(--color-info)] px-4 py-3 font-black text-lg focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] transition-all outline-none" placeholder="0.00" />
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-[var(--color-line-light)]">
                    <span className="font-black text-xs uppercase text-[var(--color-subtle)] tracking-widest">Total a Abonar</span>
                    <span className={`font-black text-2xl ${totalAbono > totalSeleccionado ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>S/ {totalAbono.toFixed(2)}</span>
                 </div>

                 <button 
                  id="btn-confirmar-pago-modal"
                  onClick={handlePagar}
                  disabled={isSaving || totalAbono <= 0 || totalAbono > totalSeleccionado}
                  className="w-full bg-[var(--color-accent)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] py-3 text-lg font-black uppercase tracking-widest hover:bg-[var(--color-success)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                 >
                   {isSaving ? 'Procesando...' : 'CONFIRMAR PAGO'}
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
