// src/sections/Clientes/components/ModalDetalleCliente.tsx
// DETALLE DEL CLIENTE (fase 4.1b): Enter en un cliente de la pestaña Clientes (o "Ver historial" del estado de cuenta).
// Muestra sus datos, un resumen (deuda, créditos, total fiado, último crédito, cada cuánto viene), lo que más lleva y
// su HISTORIAL de créditos, igual que el de la ventana vieja del directorio: pestañas Pendientes | Pagados, buscador de
// producto o monto, filtro por fecha, y Enter en un crédito despliega los productos que sacó y sus abonos.
// Botones: Editar, Estado de cuenta y Unir con otro cliente (para los repetidos). Las compras al contado se agregarán
// cuando la Caja guarde el cliente (fase 4.2).
// Teclado: fila 1 = botones, fila 2 = pestañas + buscador + fecha (← → dentro de cada fila, ↑ ↓ entre filas y créditos;
// la pestaña cambia con Enter; Enter en la fecha abre el calendario); Esc cierra.
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit, UserCircle, X, ReceiptText, FilterX, Search, MapPin, Users, UserMinus } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ventanaSuperior } from '../../../utils/ventanas';
import { CuerpoVentana, BarraFiltros, TextoBarra, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, claseBotonBarra, claseCampoBarra } from '../../../components/ListaVentana';

interface Props {
  cliente: Cliente | null;          // null = cerrada
  fiados: Fiado[];
  onClose: () => void;
  onEditar: (c: Cliente) => void;
  onEstadoCuenta: (c: Cliente) => void;
  // Grupo de clientes (familia o empresa)
  grupo?: GrupoClientes | null;
  miembrosGrupo?: number;
  deudaGrupo?: number;
  onGrupo: (c: Cliente) => void;          // sin grupo: elegir uno; con grupo: ver el grupo
  onSacarDeGrupo: (c: Cliente) => void;
}

type PestanaHistorial = 'PENDIENTES' | 'PAGADOS';
const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const estaPagado = (f: Fiado) => f.estado === 'PAGADO' || (Number(f.saldoPendiente) || 0) <= 0.05;
// Fecha del crédito como AAAA-MM-DD en hora local (para el filtro de fecha)
const diaLocal = (f: string) => { const d = new Date(f); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA'); };

export const ModalDetalleCliente: React.FC<Props> = ({ cliente, fiados, onClose, onEditar, onEstadoCuenta, grupo, miembrosGrupo = 0, deudaGrupo = 0, onGrupo, onSacarDeGrupo }) => {
  // Botones de arriba (← →): con grupo aparece también "Sacar del grupo"
  const BOTONES = ['btn-detalle-cliente-editar', 'btn-detalle-cliente-cuenta', 'btn-detalle-cliente-grupo', ...(grupo ? ['btn-detalle-cliente-sacar'] : [])];
  useCerrarConEscape(!!cliente, onClose);
  const [pestana, setPestana] = useState<PestanaHistorial>('PENDIENTES');
  const [busqueda, setBusqueda] = useState('');
  const [dia, setDia] = useState('');
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  // Sus créditos: por id o, los antiguos sin id, por nombre (del más nuevo al más antiguo)
  const creditos = useMemo(() => (cliente
    ? fiados.filter((f) => (f.clienteId ? f.clienteId === cliente.id : f.clienteNombre === cliente.nombre))
      .sort((a, b) => String(b.fechaEmision).localeCompare(String(a.fechaEmision)))
    : []), [cliente, fiados]);

  const resumen = useMemo(() => {
    const deuda = creditos.reduce((t, f) => t + (Number(f.saldoPendiente) || 0), 0);
    const total = creditos.reduce((t, f) => t + (Number(f.montoOriginal) || 0), 0);
    // Cada cuánto viene: días promedio entre los DÍAS distintos en que sacó crédito (dos el mismo día = una visita)
    const dias = [...new Set(creditos.map((f) => new Date(f.fechaEmision).toDateString()).filter((d) => d !== 'Invalid Date'))]
      .map((d) => Date.parse(d)).sort((a, b) => a - b);
    const cada = dias.length >= 2 ? Math.max(1, Math.round((dias[dias.length - 1] - dias[0]) / (dias.length - 1) / 86400000)) : null;
    // Lo que más lleva (por cantidad, en sus créditos)
    const porProducto = new Map<string, number>();
    creditos.forEach((f) => (f.detalles || []).forEach((d) => porProducto.set(d.name, (porProducto.get(d.name) || 0) + (Number(d.qty) || 0))));
    const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { deuda, total, cada, top };
  }, [creditos]);

  const pendientes = creditos.filter((f) => !estaPagado(f));
  const pagados = creditos.filter(estaPagado);
  // Historial: la pestaña elegida + buscador (producto, monto o estado) + fecha
  const historial = useMemo(() => {
    let lista = pestana === 'PENDIENTES' ? pendientes : pagados;
    if (dia) lista = lista.filter((f) => diaLocal(f.fechaEmision) === dia);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((f) => String(f.montoOriginal).includes(q) || String(f.saldoPendiente).includes(q)
        || (f.detalles || []).some((d) => String(d.name).toLowerCase().includes(q) || String(d.subtotal).includes(q)));
    }
    return lista;
  }, [pestana, pendientes, pagados, dia, busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir: pestaña Pendientes si debe algo (si no, Pagados), sin filtros, y el selector en "Editar"
  useEffect(() => {
    if (!cliente) return;
    setPestana(creditos.some((f) => !estaPagado(f)) ? 'PENDIENTES' : 'PAGADOS');
    setBusqueda(''); setDia(''); setAbiertos(new Set());
    const t = setTimeout(() => document.getElementById(BOTONES[0])?.focus(), 50);
    return () => clearTimeout(t);
  }, [cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cliente) return null;

  const hayFiltros = !!busqueda || !!dia;
  const barra = ['tab-historial-cliente-pendientes', 'tab-historial-cliente-pagados', 'buscar-historial-cliente', 'fecha-historial-cliente', ...(hayFiltros ? ['btn-limpiar-historial-cliente'] : [])];
  const idPestana = pestana === 'PENDIENTES' ? barra[0] : barra[1];
  const filas = () => Array.from(document.querySelectorAll('[data-credito-cliente="true"]')) as HTMLElement[];
  const alternar = (id: string) => setAbiertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Teclado de toda la ventana (solo si es la de arriba: la ficha, unir o un aviso pueden estar encima)
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arriba = ventanaSuperior();
    if (arriba && !arriba.contains(document.getElementById('btn-cerrar-detalle-cliente'))) return;
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const enBoton = BOTONES.includes(a.id);
    const enBarra = barra.includes(a.id);
    const lista = filas();
    const i = lista.indexOf(a);
    const esTexto = a instanceof HTMLInputElement && a.type === 'text';
    if ((enBoton || enBarra) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      if (esTexto && (e.key === 'ArrowRight' ? a.selectionEnd !== a.value.length : a.selectionStart !== 0)) return; // mueve el cursor del texto
      e.preventDefault();
      const fila = enBoton ? BOTONES : barra;
      const k = fila.indexOf(a.id);
      document.getElementById(fila[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), fila.length - 1)])?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a.id === 'btn-cerrar-detalle-cliente') document.getElementById(BOTONES[0])?.focus();
      else if (enBoton) document.getElementById(idPestana)?.focus();
      else if (enBarra) lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBoton) document.getElementById('btn-cerrar-detalle-cliente')?.focus();
      else if (enBarra) document.getElementById(BOTONES[0])?.focus();
      else if (i > 0) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else if (i === 0) document.getElementById(idPestana)?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && (a.id === barra[0] || a.id === barra[1])) {
      e.preventDefault();
      setPestana(a.id === barra[0] ? 'PENDIENTES' : 'PAGADOS');
    } else if ((e.key === 'Enter' || e.key === ' ') && a.id === 'fecha-historial-cliente') {
      e.preventDefault();
      try { (a as HTMLInputElement).showPicker(); } catch { /* sin calendario: se escribe */ }
    } else if (e.key === 'Enter' && a.id === 'buscar-historial-cliente') {
      e.preventDefault(); lista[0]?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault();
      alternar(historial[i].id);
    }
  };

  const datos = [
    cliente.dni ? `DNI: ${cliente.dni}` : null,
    cliente.ruc ? `RUC: ${cliente.ruc}` : null,
    !cliente.dni && !cliente.ruc ? 'Sin DNI ni RUC' : null,
    cliente.telefono ? `Tel.: ${cliente.telefono}` : null,
    cliente.direccion ? `Dirección: ${cliente.direccion}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={teclas}>
      <div role="dialog" aria-label={`Cliente ${cliente.nombre}`}
        className="bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.88)]">
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserCircle size={22} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-detalle-cliente" className="text-sm font-black uppercase tracking-widest truncate">{cliente.nombre}</h2>
              {cliente.referencia && <p className="text-[11px] font-bold opacity-80 truncate">{cliente.referencia}</p>}
            </div>
          </div>
          <button id="btn-cerrar-detalle-cliente" onClick={onClose} title="Cerrar (Escape)"
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* DATOS Y BOTONES */}
          <BarraFiltros>
            <div className="flex flex-wrap gap-2">
              <button id={BOTONES[0]} type="button" onClick={() => onEditar(cliente)} className={claseBotonBarra(false)}><Edit size={14} /> Editar</button>
              <button id={BOTONES[1]} type="button" onClick={() => onEstadoCuenta(cliente)} className={claseBotonBarra(false)}><BookOpen size={14} /> Estado de cuenta</button>
              <button id="btn-detalle-cliente-grupo" type="button" onClick={() => onGrupo(cliente)} className={claseBotonBarra(false)}>
                <Users size={14} /> {grupo ? `Grupo: ${grupo.nombre}` : 'Agregar a un grupo'}
              </button>
              {grupo && <button id="btn-detalle-cliente-sacar" type="button" onClick={() => onSacarDeGrupo(cliente)} className={claseBotonBarra(false)}><UserMinus size={14} /> Sacar del grupo</button>}
            </div>
            <TextoBarra><span id="datos-detalle-cliente" className="text-[var(--color-ink)] normal-case">{datos}</span></TextoBarra>
            {cliente.ubicacion && (
              <a id="btn-detalle-cliente-ubicacion" href={cliente.ubicacion} target="_blank" rel="noopener noreferrer"
                className={`${claseBotonBarra(false)} no-underline`}><MapPin size={14} /> Ver ubicación</a>
            )}
          </BarraFiltros>

          {grupo && (
            <p id="info-grupo-cliente" className="text-[12px] font-bold text-[var(--color-muted)] shrink-0">
              <span className="font-black uppercase tracking-widest text-[var(--color-ink)]">Grupo: </span>
              {grupo.nombre} ({grupo.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'} · {miembrosGrupo} persona{miembrosGrupo === 1 ? '' : 's'}) · Deuda del grupo:{' '}
              <span className={deudaGrupo > 0.05 ? 'text-[var(--color-danger)] font-black' : 'text-[var(--color-ink)] font-black'}>{soles(deudaGrupo)}</span>
            </p>
          )}

          {/* RESUMEN */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0" id="resumen-detalle-cliente">
            {[
              ['Deuda actual', soles(resumen.deuda), resumen.deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'],
              ['Créditos', String(creditos.length), 'text-[var(--color-ink)]'],
              ['Total fiado', soles(resumen.total), 'text-[var(--color-ink)]'],
              ['Último crédito', fecha(creditos[0]?.fechaEmision), 'text-[var(--color-ink)]'],
              ['Viene cada', resumen.cada === null ? '—' : `${resumen.cada} día${resumen.cada === 1 ? '' : 's'}`, 'text-[var(--color-ink)]'],
            ].map(([t, v, c]) => (
              <div key={t} className="border-2 border-[var(--color-border)] bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">{t}</p>
                <p className={`font-black ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          {resumen.top.length > 0 && (
            <p id="top-detalle-cliente" className="text-[12px] font-bold text-[var(--color-muted)] shrink-0">
              <span className="font-black uppercase tracking-widest text-[var(--color-ink)]">Lo que más lleva: </span>
              {resumen.top.map(([n, q]) => `${n} (${q % 1 ? q.toFixed(2) : q})`).join(' · ')}
            </p>
          )}

          {/* HISTORIAL: PENDIENTES | PAGADOS + BUSCADOR + FECHA */}
          <BarraFiltros>
            <div className="flex gap-2" role="tablist" aria-label="Historial de créditos">
              <button id={barra[0]} type="button" role="tab" aria-selected={pestana === 'PENDIENTES'} onClick={() => setPestana('PENDIENTES')} className={claseBotonBarra(pestana === 'PENDIENTES')}>
                Pendientes ({pendientes.length})
              </button>
              <button id={barra[1]} type="button" role="tab" aria-selected={pestana === 'PAGADOS'} onClick={() => setPestana('PAGADOS')} className={claseBotonBarra(pestana === 'PAGADOS')}>
                Pagados ({pagados.length})
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              <div className="relative flex-1 min-w-[260px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                <input id="buscar-historial-cliente" type="text" autoComplete="off" spellCheck={false} data-lpignore="true" value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)} placeholder="PRODUCTO O MONTO..."
                  className={`${claseCampoBarra} w-full pl-8 uppercase`} />
              </div>
              <input id="fecha-historial-cliente" type="date" value={dia} onChange={(e) => setDia(e.target.value)} title="Filtrar por fecha (Enter abre el calendario)" className={claseCampoBarra} />
              {hayFiltros && (
                <button id="btn-limpiar-historial-cliente" type="button" title="Limpiar filtros"
                  onClick={() => { setBusqueda(''); setDia(''); setTimeout(() => document.getElementById('buscar-historial-cliente')?.focus(), 30); }}
                  className="p-2.5 border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer">
                  <FilterX size={16} />
                </button>
              )}
            </div>
          </BarraFiltros>

          {/* CRÉDITOS DE LA PESTAÑA (Enter despliega productos y abonos) */}
          <CajaLista vacia={!historial.length}
            mensaje={hayFiltros ? 'No hay créditos con esos filtros.' : pestana === 'PENDIENTES' ? 'No debe nada: no tiene créditos pendientes.' : 'Todavía no tiene créditos pagados.'}>
            {historial.map((f) => {
              const pagado = estaPagado(f);
              const abierto = abiertos.has(f.id);
              const productos = (f.detalles || []).map((d) => d.name).slice(0, 3).join(', ') + ((f.detalles || []).length > 3 ? '…' : '');
              return (
                <div key={f.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                  <FilaLista tabIndex={0} data-credito-cliente="true" data-row="true" aria-expanded={abierto}
                    onClick={() => alternar(f.id)}
                    icono={<ReceiptText size={28} />}
                    titulo={`Crédito del ${fecha(f.fechaEmision)}`}
                    subtitulo={<><LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato><LineaDato>Monto {soles(Number(f.montoOriginal) || 0)} · abonado {soles(Number(f.montoPagado) || 0)} · {abierto ? 'Enter: ocultar' : 'Enter: ver productos y abonos'}</LineaDato></>}
                    centro={<Etiqueta tono={pagado ? 'verde' : 'rojo'}>{pagado ? 'Pagado' : 'Debe'}</Etiqueta>}
                    derecha={<DatoFila etiqueta="Debe" valor={soles(Number(f.saldoPendiente) || 0)} tono={pagado ? 'normal' : 'rojo'} />}
                  />
                  {abierto && (
                    <div data-credito-abierto="true" className="px-4 sm:px-16 pb-4 pt-1 flex flex-col gap-3 bg-[var(--color-bg)] text-sm">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1">Productos sacados</p>
                        {(f.detalles || []).length ? (f.detalles || []).map((d, k) => (
                          <div key={k} className="flex justify-between font-bold text-[var(--color-ink)]">
                            <span>{d.qty} x {d.name}</span><span>{soles(Number(d.subtotal) || 0)}</span>
                          </div>
                        )) : <p className="text-[var(--color-muted)] font-bold">Sin detalle de productos.</p>}
                      </div>
                      <div className="border-t border-[var(--color-border)] pt-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-success)] mb-1">Abonos a esta deuda</p>
                        {(f.pagos || []).length ? (f.pagos || []).map((p, k) => (
                          <div key={k} className="flex justify-between items-center font-bold text-[var(--color-muted)]">
                            <span>{new Date(p.fecha).toLocaleString('es-PE')} · <span className="uppercase">{p.metodo}</span></span>
                            <span className="text-[var(--color-success)] font-black">+ {soles(Number(p.monto) || 0)}</span>
                          </div>
                        )) : <p className="text-[var(--color-muted)] font-bold">No se registraron abonos para esta deuda.</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
