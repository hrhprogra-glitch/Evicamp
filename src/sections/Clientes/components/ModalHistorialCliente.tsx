// src/sections/Clientes/components/ModalHistorialCliente.tsx
// VENTANA DEL HISTORIAL DE UN CLIENTE (12/11/2026, pedido del dueño): antes Pendientes, Pagados y Compras eran pestañas
// con la lista abajo, dentro del detalle del cliente. Ahora cada una es un botón que abre esta ventana, con la lista en
// grande, su buscador (producto o monto) y su fecha. Enter o clic en una fila abre el detalle completo
// (ModalDetalleRegistroCliente).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ReceiptText, FilterX, Search, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';
import type { Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { CuerpoVentana, BarraFiltros, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila } from '../../../components/ListaVentana';
import { formatearMonto } from '../../../utils/formato';
import { ModalDetalleRegistroCliente, type RegistroDetalleCliente } from './ModalDetalleRegistroCliente';
import type { CompraCliente } from './ModalDetalleCliente';

export type TipoHistorial = 'PENDIENTES' | 'PAGADOS' | 'COMPRAS';

interface Props {
  tipo: TipoHistorial | null;       // null = cerrada
  clienteNombre: string;
  pendientes: Fiado[];
  pagados: Fiado[];
  compras: CompraCliente[];
  onClose: () => void;
}

const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const soles = (n: number) => `S/ ${formatearMonto(n)}`;
const estaPagado = (f: Fiado) => f.estado === 'PAGADO' || (Number(f.saldoPendiente) || 0) <= 0.05;
// Fecha como AAAA-MM-DD en hora local (para el filtro de fecha)
const diaLocal = (f: string) => { const d = new Date(f); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA'); };
export const fechaUltimoPago = (f: Fiado) => {
  if (f.pagos && f.pagos.length > 0) {
    const fechas = f.pagos.map((p) => String(p.fecha)).filter(Boolean).sort();
    if (fechas.length > 0) return fechas[fechas.length - 1];
  }
  return f.fechaEmision;
};

const TITULOS: Record<TipoHistorial, { titulo: string; Icono: typeof Clock; vacio: string }> = {
  PENDIENTES: { titulo: 'Pendientes', Icono: Clock, vacio: 'No debe nada: no tiene créditos pendientes.' },
  PAGADOS: { titulo: 'Pagados', Icono: CheckCircle2, vacio: 'Todavía no tiene créditos pagados.' },
  COMPRAS: { titulo: 'Compras', Icono: ShoppingBag, vacio: 'Todavía no tiene compras registradas en caja.' },
};

export const ModalHistorialCliente: React.FC<Props> = ({ tipo, clienteNombre, pendientes, pagados, compras, onClose }) => {
  const [busqueda, setBusqueda] = useState('');
  const [dia, setDia] = useState('');
  const [registro, setRegistro] = useState<RegistroDetalleCliente | null>(null);
  const ultimaFila = useRef(0);
  useCerrarConEscape(!!tipo, onClose);

  // Al abrir: filtros limpios y el selector en el buscador
  useEffect(() => {
    if (!tipo) return;
    setBusqueda(''); setDia(''); setRegistro(null);
    const t = setTimeout(() => document.getElementById('buscar-historial-cliente')?.focus(), 50);
    return () => clearTimeout(t);
  }, [tipo]);

  const creditos = useMemo(() => {
    let lista = tipo === 'PAGADOS' ? pagados : pendientes;
    if (dia) {
      lista = tipo === 'PAGADOS'
        ? lista.filter((f) => diaLocal(fechaUltimoPago(f)) === dia || (f.pagos || []).some((p) => diaLocal(p.fecha) === dia))
        : lista.filter((f) => diaLocal(f.fechaEmision) === dia);
    }
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((f) => String(f.montoOriginal).includes(q) || String(f.saldoPendiente).includes(q)
        || (f.detalles || []).some((d) => String(d.name).toLowerCase().includes(q) || String(d.subtotal).includes(q)));
    }
    return lista;
  }, [tipo, pendientes, pagados, dia, busqueda]);

  const comprasFiltradas = useMemo(() => {
    let lista = compras;
    if (dia) lista = lista.filter((c) => diaLocal(c.fecha) === dia);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((c) => c.id.includes(q) || String(c.total).includes(q) || c.metodoPago.toLowerCase().includes(q)
        || c.detalles.some((d) => d.name.toLowerCase().includes(q)));
    }
    return lista;
  }, [compras, dia, busqueda]);

  if (!tipo) return null;
  const { titulo, Icono, vacio } = TITULOS[tipo];
  const esCompras = tipo === 'COMPRAS';
  const total = esCompras ? compras.length : tipo === 'PAGADOS' ? pagados.length : pendientes.length;
  const vistos = esCompras ? comprasFiltradas.length : creditos.length;
  const hayFiltros = !!busqueda || !!dia;
  const barra = ['buscar-historial-cliente', 'fecha-historial-cliente', ...(hayFiltros ? ['btn-limpiar-historial-cliente'] : [])];
  const filas = () => Array.from(document.querySelectorAll('[data-fila-historial-cliente="true"]')) as HTMLElement[];

  const abrirCompra = (c: CompraCliente, i: number) => {
    ultimaFila.current = i;
    setRegistro({ tipo: 'COMPRA', id: c.id, clienteNombre, fecha: c.fecha, total: c.total, metodoPago: c.metodoPago, vendedor: c.vendedor, detalles: c.detalles });
  };
  const abrirCredito = (f: Fiado, i: number) => {
    ultimaFila.current = i;
    setRegistro({
      tipo: estaPagado(f) ? 'PAGADO' : 'PENDIENTE',
      id: String(f.id),
      clienteNombre,
      fecha: f.fechaEmision,
      total: Number(f.montoOriginal) || 0,
      montoOriginal: Number(f.montoOriginal) || 0,
      montoPagado: Number(f.montoPagado) || 0,
      saldoPendiente: Number(f.saldoPendiente) || 0,
      fechaEmision: f.fechaEmision,
      fechaUltimoPago: fechaUltimoPago(f),
      pagos: f.pagos,
      detalles: (f.detalles || []).map((d) => ({ name: d.name, qty: d.qty, price: d.price, subtotal: d.subtotal })),
    });
  };
  const cerrarRegistro = () => {
    setRegistro(null);
    setTimeout(() => filas()[ultimaFila.current]?.focus(), 60);
  };

  // Teclado: X ↓ buscador; ← → en la barra; ↓ baja a la lista; ↑ desde la primera fila vuelve al buscador
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const lista = filas();
    const i = lista.indexOf(a);
    const enBarra = barra.includes(a.id);
    const esTexto = a instanceof HTMLInputElement && a.type === 'text';
    if (enBarra && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      if (esTexto && (e.key === 'ArrowRight' ? a.selectionEnd !== a.value.length : a.selectionStart !== 0)) return;
      e.preventDefault();
      const k = barra.indexOf(a.id);
      document.getElementById(barra[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), barra.length - 1)])?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a.id === 'btn-cerrar-historial-cliente') document.getElementById(barra[0])?.focus();
      else if (enBarra) lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBarra) document.getElementById('btn-cerrar-historial-cliente')?.focus();
      else if (i > 0) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else if (i === 0) document.getElementById(barra[0])?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && a.id === 'fecha-historial-cliente') {
      e.preventDefault();
      try { (a as HTMLInputElement).showPicker(); } catch { /* sin calendario */ }
    } else if (e.key === 'Enter' && a.id === 'buscar-historial-cliente') {
      e.preventDefault(); lista[0]?.focus(); // como antes en el detalle del cliente: Enter baja a la primera fila
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault();
      if (esCompras) { const c = comprasFiltradas[i]; if (c) abrirCompra(c, i); }
      else { const f = creditos[i]; if (f) abrirCredito(f, i); }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={registro ? undefined : teclas}>
        <div role="dialog" aria-label={`${titulo} de ${clienteNombre}`}
          className="ventana-sobria bg-[var(--color-surface)] w-full max-w-6xl border-2 border-[var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.96)] max-h-[96vh]">
          <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Icono size={22} className="text-[var(--color-info)] shrink-0" />
              <div className="min-w-0">
                <h2 id="titulo-historial-cliente" className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest truncate">{titulo} · {clienteNombre}</h2>
                <p className="text-[11px] font-bold opacity-80 truncate">
                  {hayFiltros ? `${vistos} de ${total}` : `${total}`} registro{total === 1 ? '' : 's'} · Enter o clic en uno: ver su detalle
                </p>
              </div>
            </div>
            <button id="btn-cerrar-historial-cliente" onClick={onClose} title="Cerrar (Escape)"
              className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <CuerpoVentana>
            {/* BUSCADOR + FECHA */}
            <BarraFiltros>
              <div className="flex items-center gap-2 flex-1 flex-nowrap min-w-0">
                <div className="relative flex-1 min-w-[150px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                  <input id="buscar-historial-cliente" type="text" autoComplete="off" spellCheck={false} data-lpignore="true" value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)} placeholder={esCompras ? 'PRODUCTO, MONTO O PAGO...' : 'PRODUCTO O MONTO...'}
                    className="w-full h-[40px] border-2 border-[var(--color-border)] pl-8 pr-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none bg-white rounded-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]" />
                </div>
                <input id="fecha-historial-cliente" type="date" value={dia} onChange={(e) => setDia(e.target.value)} title="Filtrar por fecha (Enter abre el calendario)"
                  className="h-[40px] w-[145px] sm:w-[155px] border-2 border-[var(--color-border)] px-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none bg-white rounded-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] shrink-0 cursor-pointer" />
                {hayFiltros && (
                  <button id="btn-limpiar-historial-cliente" type="button" title="Limpiar filtros"
                    onClick={() => { setBusqueda(''); setDia(''); setTimeout(() => document.getElementById('buscar-historial-cliente')?.focus(), 30); }}
                    className="h-[40px] w-[40px] flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer shrink-0">
                    <FilterX size={16} />
                  </button>
                )}
              </div>
            </BarraFiltros>

            {/* LISTA (Enter o clic abre el detalle completo) */}
            <CajaLista className="flex-1" vacia={!vistos} mensaje={hayFiltros ? 'No hay registros con esos filtros.' : vacio}>
              {esCompras
                ? comprasFiltradas.map((c, idx) => {
                  const productos = c.detalles.map((d) => d.name).slice(0, 3).join(', ') + (c.detalles.length > 3 ? '…' : '');
                  return (
                    <div key={c.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                      <FilaLista tabIndex={0} data-fila-historial-cliente="true" data-row="true" onClick={() => abrirCompra(c, idx)}
                        icono={<ReceiptText size={28} />}
                        titulo={`Ticket #${c.id.slice(-6)} · ${fecha(c.fecha)} ${new Date(c.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        subtitulo={<>
                          <LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato>
                          <LineaDato>Total {soles(c.total)} · Pago: {c.metodoPago}</LineaDato>
                        </>}
                        centro={<Etiqueta tono="azul">{c.metodoPago}</Etiqueta>}
                        derecha={<DatoFila etiqueta="Total" valor={soles(c.total)} tono="normal" />}
                      />
                    </div>
                  );
                })
                : creditos.map((f, idx) => {
                  const pagado = estaPagado(f);
                  const productos = (f.detalles || []).map((d) => d.name).slice(0, 3).join(', ') + ((f.detalles || []).length > 3 ? '…' : '');
                  return (
                    <div key={f.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                      <FilaLista tabIndex={0} data-fila-historial-cliente="true" data-row="true" onClick={() => abrirCredito(f, idx)}
                        icono={<ReceiptText size={28} />}
                        titulo={pagado ? `Pagado el ${fecha(fechaUltimoPago(f))} · Crédito del ${fecha(f.fechaEmision)}` : `Crédito del ${fecha(f.fechaEmision)}`}
                        subtitulo={<>
                          <LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato>
                          <LineaDato>
                            {pagado
                              ? `Cancelado el ${fecha(fechaUltimoPago(f))} · Total ${soles(Number(f.montoOriginal) || 0)}`
                              : `Monto ${soles(Number(f.montoOriginal) || 0)} · abonado ${soles(Number(f.montoPagado) || 0)}`}
                          </LineaDato>
                        </>}
                        centro={<Etiqueta tono={pagado ? 'verde' : 'rojo'}>{pagado ? 'Pagado' : 'Debe'}</Etiqueta>}
                        derecha={<DatoFila etiqueta={pagado ? 'Total' : 'Debe'} valor={soles(Number(pagado ? f.montoOriginal : f.saldoPendiente) || 0)} tono={pagado ? 'normal' : 'rojo'} />}
                      />
                    </div>
                  );
                })}
            </CajaLista>
          </CuerpoVentana>
        </div>
      </div>

      {registro && <ModalDetalleRegistroCliente isOpen={!!registro} onClose={cerrarRegistro} registro={registro} />}
    </>
  );
};
