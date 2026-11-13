// Detalle de una cotización (SiuMax Nego, paso 3h). Base: el de SiuMax Servic (líneas por sección, abonos, aprobar,
// rechazar, convertir en trabajo, imprimir) + lo de Comerc (convertir en venta en la Caja, WhatsApp, anular).
// Cada acción sale solo si tiene sentido para su estado y para el tipo de negocio.
import React, { useEffect, useState } from 'react';
import { X, Printer, DollarSign, CheckCircle, XCircle, Edit3, Wrench, ShoppingBag, MessageCircle, Send, Ban, Trash2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { formatearMonto } from '../../../utils/formato';
import type { Cotizacion, CotizacionItem, CotizacionPago } from '../types';
import { CLASE_ESTADO, simbolo, verFecha, hoyCampo } from '../types';

interface Props {
  cotizacion: Cotizacion;
  conComercio: boolean;
  conServicios: boolean;
  onClose: (actualizado?: boolean) => void;
  onEditar: (c: Cotizacion, detalles: CotizacionItem[]) => void;
  onNavigatePOS?: () => void;
}

const claseBoton = 'h-9 px-3 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer rounded-none whitespace-nowrap';
const sobrio = `${claseBoton} bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-ink)]`;
const solido = `${claseBoton} bg-[var(--color-ink)] border-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)]`;
const peligro = `${claseBoton} bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-danger)] hover:border-[var(--color-danger)]`;

export const ModalDetalleCotizacion: React.FC<Props> = ({ cotizacion, conComercio, conServicios, onClose, onEditar, onNavigatePOS }) => {
  const [estado, setEstado] = useState(cotizacion.estado);
  const [adelanto, setAdelanto] = useState(cotizacion.adelanto);
  const [detalles, setDetalles] = useState<CotizacionItem[]>([]);
  const [pagos, setPagos] = useState<CotizacionPago[]>([]);
  const [cambios, setCambios] = useState(false);
  const [abono, setAbono] = useState(false);
  useCerrarConEscape(!abono, () => onClose(cambios));

  const s = simbolo(cotizacion.moneda);
  const saldo = Math.max(0, Number((cotizacion.total - adelanto).toFixed(2)));
  const cerrada = estado === 'CONVERTIDA' || estado === 'ANULADA' || estado === 'RECHAZADA';

  const cargar = async () => {
    const [rd, rp] = await Promise.all([
      supabase.from('cotizacion_detalles').select('*').eq('cotizacion_id', cotizacion.id).order('id'),
      supabase.from('cotizacion_pagos').select('*').eq('cotizacion_id', cotizacion.id).order('fecha', { ascending: false }),
    ]);
    if (rd.data) setDetalles(rd.data.map((d: any) => ({ ...d, quantity: Number(d.quantity), price: Number(d.price), subtotal: Number(d.subtotal), unidad: d.unidad || 'UND' })));
    if (rp.data) setPagos(rp.data as any);
  };
  useEffect(() => {
    cargar().catch((e) => console.error('Detalle de cotización', e));
    setTimeout(() => document.getElementById('btn-cerrar-detalle-coti')?.focus(), 60);
  }, [cotizacion.id]);

  const cambiarEstado = async (nuevo: string, pregunta?: string) => {
    if (pregunta && !(await confirmar(pregunta))) return;
    const { error } = await supabase.from('cotizaciones').update({ estado: nuevo }).eq('id', cotizacion.id);
    if (error) { avisar('No se pudo cambiar el estado: ' + error.message); return; }
    setEstado(nuevo as any);
    setCambios(true);
    await avisar(`Cotización ${cotizacion.numero}: ${nuevo === 'VIGENTE' ? 'enviada (vigente)' : nuevo.toLowerCase()}.`);
    document.getElementById('btn-cerrar-detalle-coti')?.focus();
  };

  const convertirTrabajo = async () => {
    if (!(await confirmar('¿Convertir esta cotización en un trabajo de la Agenda para hoy?'))) return;
    const { data, error } = await supabase.rpc('fn_convertir_cotizacion_a_trabajo', {
      p_cotizacion_id: cotizacion.id, p_fecha: hoyCampo(), p_tecnico_id: null, p_usuario: 'Usuario',
    });
    if (error) { avisar('No se pudo convertir: ' + error.message); return; }
    setEstado('CONVERTIDA');
    setCambios(true);
    await avisar(`Listo: es el trabajo #${(data as any)?.trabajo_id ?? ''} en la Agenda.`);
  };

  // Como en Comerc (PestanaCotizaciones): pasa las líneas a la Caja; al cobrar la venta queda CONVERTIDA
  const convertirVenta = async () => {
    if (cotizacion.moneda !== 'PEN') { avisar('Solo una cotización en soles se puede convertir en venta.'); return; }
    if (adelanto > 0) { avisar('Esta cotización ya tiene abonos: cobra el saldo con "Registrar abono" en vez de llevarla a la Caja.'); return; }
    if (detalles.length === 0) { avisar('La cotización no tiene líneas.'); return; }
    if (detalles.some((d) => !d.product_id)) { avisar('Solo se convierten en venta las líneas que son productos del inventario (las cotizaciones hechas desde la Caja).'); return; }
    const carrito = detalles.map((it) => ({
      id: String(it.product_id), name: it.product_name, price: it.price, cost: 0,
      quantity: 9999, // la Caja lo cambia por el stock real al cargar los productos (desdeCotizacion)
      minStock: 0, code: 'PROD', barcode: '', category: 'GENERAL', unit: 'UND',
      cartQuantity: it.quantity, subtotal: it.subtotal, esMayoristaAplicado: !!it.es_mayorista, desdeCotizacion: true,
    }));
    localStorage.setItem('evicamp_cart', JSON.stringify(carrito));
    if (cotizacion.cliente_nombre) {
      localStorage.setItem('evicamp_cliente_pos', JSON.stringify({
        id: cotizacion.cliente_id || `CLI-${Date.now()}`, nombre: cotizacion.cliente_nombre,
        dni: cotizacion.cliente_documento || '', telefono: cotizacion.cliente_telefono || '',
      }));
    }
    sessionStorage.setItem('evicamp_coti_activa', String(cotizacion.id));
    onClose(false);
    if (onNavigatePOS) onNavigatePOS(); else { window.location.hash = '#pos'; window.location.reload(); }
  };

  const whatsapp = () => {
    const tel = (cotizacion.cliente_telefono || '').replace(/[^0-9]/g, '');
    const destino = tel.length === 9 ? `51${tel}` : tel;
    const lineas = detalles.map((d) => `• ${d.quantity} ${d.unidad || ''} ${d.product_name} - ${s} ${formatearMonto(d.subtotal)}`).join('\n');
    const texto = encodeURIComponent(
      `*COTIZACIÓN ${cotizacion.numero}*\nEstimado(a) ${cotizacion.cliente_nombre}:\n` +
      (cotizacion.observaciones ? `${cotizacion.observaciones}\n` : '') +
      `\n${lineas}\n\n*TOTAL: ${s} ${formatearMonto(cotizacion.total)}*\n` +
      `Validez hasta: ${cotizacion.fecha_vencimiento ? verFecha(cotizacion.fecha_vencimiento) : '—'}\n` +
      (cotizacion.banco_info ? `\nDatos para el pago:\n${cotizacion.banco_info}\n` : '') +
      `\nQuedamos atentos a cualquier consulta.`,
    );
    window.open(destino ? `https://wa.me/${destino}?text=${texto}` : `https://wa.me/?text=${texto}`, '_blank');
  };

  const eliminar = async () => {
    if (!(await confirmar(`¿Eliminar el borrador ${cotizacion.numero}? No se puede deshacer.`))) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', cotizacion.id); // las líneas se borran solas (cascada)
    if (error) { avisar('No se pudo eliminar: ' + error.message); return; }
    await avisar(`Borrador ${cotizacion.numero} eliminado.`);
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-detalle-coti"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-5xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><span className="text-[10px] font-black">{cotizacion.numero.replace('COT-', '')}</span></div>
            <div className="min-w-0">
              <h2 id="modal-titulo-detalle-coti" className="ventana-cabecera__titulo truncate">{cotizacion.numero}{cotizacion.observaciones ? ` · ${cotizacion.observaciones}` : ''}</h2>
              <p className="ventana-cabecera__subtitulo truncate">Cliente: {cotizacion.cliente_nombre || '—'}{cotizacion.vendedor ? ` · Hecha por ${cotizacion.vendedor}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button id="btn-imprimir-coti" type="button" onClick={() => window.print()} className={sobrio}><Printer size={14} /> Imprimir</button>
            {!cerrada && <button id="btn-editar-coti" type="button" onClick={() => onEditar({ ...cotizacion, estado }, detalles)} className={sobrio}><Edit3 size={14} /> Editar</button>}
            <button id="btn-cerrar-detalle-coti" type="button" onClick={() => onClose(cambios)} className="ventana-cerrar" title="Cerrar (Esc)"><X size={18} /></button>
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-black text-[var(--color-muted)] block">Cliente</span>
            <span className="font-bold text-[var(--color-ink)] block truncate">{cotizacion.cliente_nombre || '—'}</span>
            {cotizacion.cliente_documento && <span className="text-[11px] text-[var(--color-muted)] block">Doc: {cotizacion.cliente_documento}</span>}
            {cotizacion.cliente_telefono && <span className="text-[11px] text-[var(--color-muted)] block">Tel: {cotizacion.cliente_telefono}</span>}
            {cotizacion.bien && <span className="text-[11px] text-[var(--color-muted)] block truncate">Atiende: {cotizacion.bien.nombre}</span>}
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-[var(--color-muted)] block">Fechas</span>
            <span className="font-bold text-[var(--color-ink)] block">Emisión: {verFecha(cotizacion.fecha_emision)}</span>
            <span className="text-[11px] text-[var(--color-muted)] block">Vence: {cotizacion.fecha_vencimiento ? verFecha(cotizacion.fecha_vencimiento) : 'sin fecha'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-[var(--color-muted)] block">Total y saldo</span>
            <span id="detalle-coti-total" className="font-black text-sm text-[var(--color-ink)] block">Total: {s} {formatearMonto(cotizacion.total)}</span>
            <span className="text-[11px] font-bold text-[var(--color-success)] block">Pagado: {s} {formatearMonto(adelanto)}</span>
            <span id="detalle-coti-saldo" className={`text-[11px] font-bold block ${saldo > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>Saldo: {s} {formatearMonto(saldo)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-[var(--color-muted)] block">Estado</span>
            <span id="detalle-coti-estado" className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase border ${CLASE_ESTADO[estado]}`}>{estado}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div className="border border-[var(--color-border)] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--color-ink)] text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-2">Sección</th>
                  <th className="p-2">Descripción</th>
                  <th className="p-2 text-center w-20">Unidad</th>
                  <th className="p-2 text-right w-24">Cantidad</th>
                  <th className="p-2 text-right w-28">P. unit.</th>
                  <th className="p-2 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {detalles.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-[var(--color-muted)]">Sin líneas</td></tr>
                ) : detalles.map((d, i) => (
                  <tr key={d.id ?? i}>
                    <td className="p-2 text-[var(--color-muted)]">{d.seccion || '—'}</td>
                    <td className="p-2 font-bold text-[var(--color-ink)]">{d.product_name}</td>
                    <td className="p-2 text-center text-[var(--color-muted)]">{d.unidad || 'UND'}</td>
                    <td className="p-2 text-right">{d.quantity}</td>
                    <td className="p-2 text-right font-bold">{s} {formatearMonto(d.price)}</td>
                    <td className="p-2 text-right font-black">{s} {formatearMonto(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagos.length > 0 && (
            <div>
              <span className="font-black uppercase tracking-wider text-[var(--color-ink)] block mb-2">Abonos registrados</span>
              <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {pagos.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between bg-[var(--color-bg)]">
                    <div>
                      <span className="font-bold text-[var(--color-ink)]">{verFecha(`${p.fecha}T12:00:00`)}</span>
                      <span className="text-[var(--color-muted)] ml-2">{p.metodo}</span>
                      {p.referencia && <span className="text-[var(--color-muted)] ml-2">(Ref: {p.referencia})</span>}
                    </div>
                    <span className="font-black text-[var(--color-success)] text-sm">+{s} {formatearMonto(p.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(cotizacion.condiciones || cotizacion.banco_info) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cotizacion.condiciones && (
                <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] mb-1">Condiciones</span>
                  <p className="whitespace-pre-line text-[11px] text-[var(--color-ink)]">{cotizacion.condiciones}</p>
                </div>
              )}
              {cotizacion.banco_info && (
                <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] mb-1">Datos para el pago</span>
                  <p className="whitespace-pre-line text-[11px] text-[var(--color-ink)]">{cotizacion.banco_info}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-3 flex flex-wrap items-center justify-end gap-2 shrink-0">
          {estado === 'BORRADOR' && <button id="btn-eliminar-coti" type="button" onClick={eliminar} className={peligro}><Trash2 size={14} /> Eliminar</button>}
          {!cerrada && estado !== 'APROBADA' && <button id="btn-anular-coti" type="button" onClick={() => cambiarEstado('ANULADA', `¿Anular la cotización ${cotizacion.numero}?`)} className={peligro}><Ban size={14} /> Anular</button>}
          {!cerrada && <button id="btn-rechazar-coti" type="button" onClick={() => cambiarEstado('RECHAZADA', `¿Marcar ${cotizacion.numero} como rechazada por el cliente?`)} className={sobrio}><XCircle size={14} /> Rechazada</button>}
          {(estado === 'BORRADOR' || estado === 'VENCIDA') && <button id="btn-enviada-coti" type="button" onClick={() => cambiarEstado('VIGENTE')} className={sobrio}><Send size={14} /> Marcar enviada</button>}
          {!cerrada && estado !== 'APROBADA' && <button id="btn-aprobar-coti" type="button" onClick={() => cambiarEstado('APROBADA')} className={sobrio}><CheckCircle size={14} /> Aprobada</button>}
          <button id="btn-whatsapp-coti" type="button" onClick={whatsapp} className={sobrio}><MessageCircle size={14} /> WhatsApp</button>
          {/* Abonos: también en una ya convertida en trabajo (se cobra el saldo); no en una vendida en la Caja */}
          {estado !== 'ANULADA' && estado !== 'RECHAZADA' && !cotizacion.sale_id && saldo > 0 && <button id="btn-abono-cotizacion" type="button" onClick={() => setAbono(true)} className={sobrio}><DollarSign size={14} /> Registrar abono</button>}
          {conServicios && !cerrada && <button id="btn-convertir-trabajo" type="button" onClick={convertirTrabajo} className={solido}><Wrench size={14} /> Convertir en trabajo</button>}
          {conComercio && !cerrada && <button id="btn-convertir-venta" type="button" onClick={convertirVenta} className={solido}><ShoppingBag size={14} /> Convertir en venta</button>}
        </div>
      </div>

      {abono && (
        <VentanaAbono
          cotizacion={cotizacion}
          saldo={saldo}
          onClose={async (monto) => {
            setAbono(false);
            if (monto) {
              setAdelanto((a) => a + monto);
              if (saldo - monto <= 0.009 && estado !== 'CONVERTIDA') setEstado('APROBADA'); // pagada completa: el servidor la marca APROBADA
              setCambios(true);
              await cargar();
            }
            setTimeout(() => document.getElementById('btn-cerrar-detalle-coti')?.focus(), 60);
          }}
        />
      )}
    </div>
  );
};

// Ventana para registrar un abono (adelanto o pago). Si hay una caja abierta, entra como ingreso en ella.
const VentanaAbono: React.FC<{ cotizacion: Cotizacion; saldo: number; onClose: (monto?: number) => void }> = ({ cotizacion, saldo, onClose }) => {
  useCerrarConEscape(true, () => onClose());
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const s = simbolo(cotizacion.moneda);
  useEffect(() => { setTimeout(() => { const el = document.getElementById('input-monto-abono-coti') as HTMLInputElement | null; el?.focus(); el?.select(); }, 60); }, []);

  const guardar = async () => {
    if (guardando) return;
    const m = parseFloat(monto);
    if (!m || m <= 0) { avisar('Escribe un monto mayor a 0.'); return; }
    if (m > saldo + 0.009) { avisar(`El abono no puede pasar el saldo (${s} ${formatearMonto(saldo)}).`); return; }
    setGuardando(true);
    const { error } = await supabase.rpc('fn_registrar_pago_cotizacion', {
      p_cotizacion_id: cotizacion.id, p_monto: m, p_metodo: metodo, p_referencia: referencia.trim(), p_fecha: hoyCampo(), p_notas: 'Abono',
    });
    setGuardando(false);
    if (error) { avisar('No se pudo registrar el abono: ' + error.message); return; }
    await avisar(`Abono de ${s} ${formatearMonto(m)} registrado.`);
    onClose(m);
  };
  const campo = 'w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] rounded-none';
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 font-mono">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-abono-coti" className="ventana-sobria w-full max-w-sm bg-[var(--color-surface)] border-2 border-[var(--color-ink)]">
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><DollarSign size={16} /></div>
            <div>
              <h2 id="titulo-abono-coti" className="ventana-cabecera__titulo">Registrar abono</h2>
              <p className="ventana-cabecera__subtitulo">{cotizacion.numero} · saldo {s} {formatearMonto(saldo)}</p>
            </div>
          </div>
          <button id="btn-cerrar-abono-coti" type="button" onClick={() => onClose()} className="ventana-cerrar" title="Cerrar (Esc)"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3 text-xs" onKeyDown={enterSeQueda}>
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--color-ink)] mb-1">Monto ({s})</label>
            <input id="input-monto-abono-coti" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} className={`${campo} font-bold`} />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--color-ink)] mb-1">Cómo pagó</label>
            <select id="select-metodo-abono-coti" value={metodo} onChange={(e) => setMetodo(e.target.value)} className={campo}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="YAPE">Yape / Plin</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--color-ink)] mb-1">N.º de operación (opcional)</label>
            <input id="input-ref-abono-coti" type="text" autoComplete="off" value={referencia} onChange={(e) => setReferencia(e.target.value)} className={campo} />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
          <button id="btn-cancelar-abono-coti" type="button" onClick={() => onClose()} className={sobrio}>Cancelar</button>
          <button id="btn-guardar-abono-coti" type="button" aria-disabled={guardando} onClick={guardar} className={solido}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
};
