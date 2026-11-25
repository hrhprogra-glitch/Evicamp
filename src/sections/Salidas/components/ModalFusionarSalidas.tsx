// 230 (25/11/2026): «Fusionar salidas» desde Nueva salida.
// El GENERAL es SOLO UNA VISTA: agrupa las salidas elegidas en memoria, sin crear salida nueva
// ni descontar stock dos veces. Desde ahí se ve todo, se devuelve lo pendiente y se imprime.
// Teclado: las flechas solo mueven el selector; Enter activa el botón y el selector se queda.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Layers, Printer, RotateCcw, Search, X } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { avisar, confirmar } from '../../../utils/dialogos';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { conNombreClienteNota, nombreClienteSalida } from '../clienteNota';
import { useEmpresaComprobante } from '../empresa';
import type { Salida, SalidaItem } from '../types';
import type { EmpresaComprobante } from '../empresa';
import { VistaPreviaSalida } from './VistaPreviaSalida';

interface Props {
  isOpen: boolean;
  salidas: Salida[];
  onClose: () => void;
  onReload: () => void;
}

type FilaGeneral = SalidaItem & { salida: Salida; pendiente: number };

const numero = (v: unknown) => Number(v || 0);
const money = (v: unknown) => numero(v).toFixed(2);
const hoy = () => new Date().toISOString().slice(0, 10);

/** Flechas = mover el selector entre [data-nav-fusion]; nunca cambian el valor de un input. */
const moverSelector = (e: React.KeyboardEvent<HTMLDivElement>) => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const actual = (e.target as HTMLElement).dataset?.navFusion;
  if (!actual) return;
  const [fila, col] = actual.split(',').map(Number);
  const todos = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-nav-fusion]'))
    .filter((el) => el.offsetParent !== null && !(el as HTMLButtonElement).disabled)
    .map((el) => {
      const [f, c] = (el.dataset.navFusion || '0,0').split(',').map(Number);
      return { el, f, c };
    });
  if (!todos.length) return;
  let destino: { el: HTMLElement } | undefined;
  if (e.key === 'ArrowRight') destino = todos.filter((x) => x.f === fila && x.c > col).sort((a, b) => a.c - b.c)[0];
  if (e.key === 'ArrowLeft') destino = todos.filter((x) => x.f === fila && x.c < col).sort((a, b) => b.c - a.c)[0];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const otras = todos.filter((x) => (e.key === 'ArrowDown' ? x.f > fila : x.f < fila));
    if (otras.length) {
      const filaDestino = e.key === 'ArrowDown' ? Math.min(...otras.map((x) => x.f)) : Math.max(...otras.map((x) => x.f));
      const enFila = otras.filter((x) => x.f === filaDestino);
      destino = filaDestino === 1000
        ? enFila.sort((a, b) => b.c - a.c)[0]
        : enFila.sort((a, b) => Math.abs(a.c - col) - Math.abs(b.c - a.c) || a.c - b.c)[0];
    }
  }
  if (destino) {
    e.preventDefault();
    e.stopPropagation();
    destino.el.focus();
  }
};

const botonCls = 'h-10 px-3 border-2 border-[var(--color-ink)] font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)]';
const campoCls = 'w-full min-h-[40px] p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none';

export const ModalFusionarSalidas: React.FC<Props> = ({ isOpen, salidas, onClose, onReload }) => {
  const [buscar, setBuscar] = useState('');
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [enGeneral, setEnGeneral] = useState(false);
  const [devolver, setDevolver] = useState<Record<number, string>>({});
  const [motivo, setMotivo] = useState('Sobrante de trabajo no utilizado');
  const [fecha, setFecha] = useState(hoy);
  const [trabajador, setTrabajador] = useState('');
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [previaOpen, setPreviaOpen] = useState(false);
  const [general, setGeneral] = useState<Salida | null>(null);
  const empresa: EmpresaComprobante = useEmpresaComprobante();
  const cajaGeneral = useRef<HTMLDivElement>(null);

  useCerrarConEscape(isOpen && !previaOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setBuscar('');
    setElegidas([]);
    setEnGeneral(false);
    setDevolver({});
    setFecha(hoy());
    setTrabajador('');
    let vivo = true;
    supabase.from('trabajadores').select('id, nombre').order('nombre')
      .then(({ data }: { data: any[] | null }) => { if (vivo) setTrabajadores(data || []); });
    const t = window.setTimeout(() => document.getElementById('buscador-fusionar-salidas')?.focus(), 60);
    return () => { vivo = false; window.clearTimeout(t); };
  }, [isOpen]);

  const lista = useMemo(() => (salidas || []).map(conNombreClienteNota), [salidas]);
  const filtradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((s) => [s.codigo, nombreClienteSalida(s, ''), s.bien?.nombre || '']
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [lista, buscar]);

  const seleccionadas = useMemo(
    () => lista.filter((s) => elegidas.includes(Number(s.id))),
    [lista, elegidas]
  );

  const filas = useMemo<FilaGeneral[]>(() => seleccionadas.flatMap((salida) =>
    (salida.items || []).map((it) => ({
      ...it,
      salida,
      pendiente: Math.max(0, numero(it.cantidad) - numero(it.cantidad_devuelta)),
    }))), [seleccionadas]);

  const resumen = useMemo(() => {
    const mapa = new Map<string, { descripcion: string; unidad: string; cantidad: number; pendiente: number; costo: number }>();
    filas.forEach((it) => {
      const clave = `${it.descripcion}|${it.unidad}`;
      const actual = mapa.get(clave) || { descripcion: it.descripcion, unidad: it.unidad, cantidad: 0, pendiente: 0, costo: numero(it.costo_unitario) };
      actual.cantidad += numero(it.cantidad);
      actual.pendiente += it.pendiente;
      mapa.set(clave, actual);
    });
    return Array.from(mapa.values()).sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [filas]);

  const totalPendiente = filas.reduce((s, it) => s + it.pendiente * numero(it.costo_unitario), 0);
  const totalElegido = filas.reduce((s, it) => s + (numero(devolver[Number(it.id)]) || 0) * numero(it.costo_unitario), 0);

  if (!isOpen) return null;

  const alternar = (id: number) => {
    setElegidas((prev) => prev.includes(Number(id)) ? prev.filter((x) => x !== Number(id)) : [...prev, Number(id)]);
  };

  // 230: «desvincular» solo saca la salida del GENERAL en memoria: no borra ni edita la salida real,
  // quita también las cantidades que se hubieran escrito para devolver y recalcula el resumen.
  const desvincular = (id: number) => {
    const salida = lista.find((s) => Number(s.id) === Number(id));
    const ids = new Set((salida?.items || []).map((it) => Number(it.id)));
    setDevolver((prev) => Object.fromEntries(Object.entries(prev).filter(([clave]) => !ids.has(Number(clave)))));
    const restantes = elegidas.filter((x) => x !== Number(id));
    setElegidas(restantes);
    if (!restantes.length) setEnGeneral(false);
  };

  const devolverTodo = async () => {
    if (procesando) return;
    const grupos = new Map<Salida, { item_id: number; cantidad: number }[]>();
    filas.forEach((it) => {
      const cant = Math.min(numero(devolver[Number(it.id)]), it.pendiente);
      if (cant > 0) {
        const listaGrupo = grupos.get(it.salida) || [];
        listaGrupo.push({ item_id: Number(it.id), cantidad: cant });
        grupos.set(it.salida, listaGrupo);
      }
    });
    if (grupos.size === 0) {
      avisar('Escribe la cantidad que quieres devolver');
      return;
    }
    const n = Array.from(grupos.values()).reduce((s, g) => s + g.length, 0);
    const seguro = await confirmar(
      `Devolver ${n} material(es) de ${grupos.size} salida(s) por S/ ${money(totalElegido)}. El stock volverá al almacén. ¿Continuar?`
    );
    if (!seguro) return;
    setProcesando(true);
    try {
      const fechaIso = fecha.trim() ? new Date(`${fecha}T12:00:00`).toISOString() : null;
      for (const [salida, devoluciones] of grupos) {
        const { error } = await supabase.rpc('fn_registrar_devoluciones_lote', {
          p_salida_id: salida.id,
          p_devoluciones: devoluciones,
          p_motivo: motivo.trim() || 'Sobrante no utilizado',
          p_usuario: salida.usuario || 'Sistema',
          p_fecha: fechaIso,
          p_trabajador_id: trabajador ? Number(trabajador) : null,
        });
        if (error) throw error;
      }
      avisar('Devolución registrada. El stock volvió al almacén.');
      onReload();
      onClose();
    } catch (err: any) {
      avisar(err.message || 'No se pudo registrar la devolución');
    } finally {
      setProcesando(false);
    }
  };

  const imprimirGeneral = () => {
    const codigos = seleccionadas.map((s) => s.codigo).join(', ');
    const general: Salida = {
      id: 0,
      codigo: 'GENERAL',
      tipo: 'SERVICIO',
      customer_id: 0,
      customer: null,
      bien_id: null,
      bien: null,
      direccion: '',
      ubicacion: '',
      fecha: new Date().toISOString(),
      estado: 'EN_PROCESO',
      observaciones: `GENERAL de ${seleccionadas.length} salida(s): ${codigos}. Pendiente por devolver: S/ ${money(totalPendiente)}`,
      usuario: '',
      created_at: new Date().toISOString(),
      items: filas.map((it) => ({
        id: Number(it.id), salida_id: Number(it.salida?.id || 0), product_id: it.product_id,
        batch_id: it.batch_id, descripcion: it.descripcion, unidad: it.unidad,
        cantidad: numero(it.cantidad), cantidad_devuelta: numero(it.cantidad_devuelta),
        costo_unitario: numero(it.costo_unitario), es_externo: !!it.es_externo,
      })),
    };
    setGeneral(general);
    setPreviaOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
        <div
          id="modal-fusionar-salidas-container"
          onKeyDown={moverSelector}
          className="ventana-sobria bg-[var(--color-surface)] w-full max-w-6xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
        >
          <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ventana-cabecera__icono"><Layers size={20} /></div>
              <div>
                <h2 className="ventana-cabecera__titulo">{enGeneral ? 'General de salidas' : 'Fusionar salidas'}</h2>
                <p className="ventana-cabecera__subtitulo">
                  {enGeneral
                    ? `${seleccionadas.length} salida(s) · ${filas.length} material(es) · solo vista, sin crear salida`
                    : 'Elige las salidas que quieres ver juntas'}
                </p>
              </div>
            </div>
            <button
              id="btn-cerrar-fusionar-salidas"
              type="button"
              onClick={onClose}
              data-nav-fusion="-1,0"
              className="ventana-cerrar"
              title="Cerrar (Escape)"
            ><X size={18} /></button>
          </div>

          {!enGeneral ? (
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs space-y-3">
              <div className="flex items-center gap-2">
                <Search size={16} />
                <input
                  id="buscador-fusionar-salidas"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar por código, cliente o bien"
                  data-nav-fusion="0,0"
                  className={campoCls}
                />
                <span className="shrink-0 font-black">{elegidas.length} elegida(s)</span>
              </div>
              <div id="lista-fusionar-salidas" className="border-2 border-[var(--color-ink)] overflow-y-auto custom-scrollbar max-h-[46vh]">
                <table className="w-full text-left">
                  <thead className="bg-[var(--color-ink)] text-white font-black uppercase text-[10px] tracking-widest sticky top-0">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2">Salida</th>
                      <th className="p-2">Cliente / nota</th>
                      <th className="p-2">General / bien</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]" data-row="true">
                    {filtradas.map((s, idx) => {
                      const marcada = elegidas.includes(Number(s.id));
                      return (
                        <tr key={s.id} className={marcada ? 'bg-[var(--color-accent)]/20' : ''}>
                          <td className="p-2">
                            <button
                              id={`btn-fusion-elegir-${s.id}`}
                              type="button"
                              onClick={() => alternar(Number(s.id))}
                              aria-pressed={marcada}
                              data-nav-fusion={`${idx + 1},0`}
                              className="w-8 h-8 border-2 border-[var(--color-ink)] flex items-center justify-center cursor-pointer"
                              title={marcada ? 'Quitar salida' : 'Agregar salida'}
                            >{marcada ? <Check size={16} /> : null}</button>
                          </td>
                          <td className="p-2 font-black">{s.codigo}</td>
                          <td className="p-2 uppercase">{nombreClienteSalida(s, 'NO REGISTRADO')}</td>
                          <td className="p-2 uppercase">{s.bien?.nombre || 'General'}</td>
                          <td className="p-2">{s.fecha ? String(s.fecha).slice(0, 10) : '-'}</td>
                          <td className="p-2 font-bold">{s.estado}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtradas.length === 0 && <p className="p-4 text-center text-[var(--color-muted)]">No hay salidas con ese nombre</p>}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs space-y-4">
              <div>
                <p className="font-black uppercase mb-2">Salidas en este general · la X las desvincula (no las borra)</p>
                <div className="flex flex-wrap gap-2">
                  {seleccionadas.map((s, idx) => (
                    <span key={s.id} className="inline-flex items-center gap-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] px-2 py-1 font-black">
                      <span>{s.codigo}</span>
                      <span className="hidden sm:inline uppercase font-bold text-[var(--color-muted)]">{nombreClienteSalida(s, 'NO REGISTRADO')}</span>
                      <button
                        id={`btn-desvincular-salida-${s.id}`}
                        type="button"
                        onClick={() => desvincular(Number(s.id))}
                        title={`Desvincular ${s.codigo} del general`}
                        aria-label={`Desvincular ${s.codigo} del general`}
                        data-nav-fusion={`0,${idx}`}
                        className="w-6 h-6 border-2 border-[var(--color-ink)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-danger)] hover:text-white"
                      ><X size={14} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-black uppercase mb-1" htmlFor="input-fecha-devolucion-fusion">Fecha de la devolución</label>
                  <input id="input-fecha-devolucion-fusion" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} data-nav-fusion="1,0" className={campoCls} />
                </div>
                <div>
                  <label className="block font-black uppercase mb-1" htmlFor="select-trabajador-devolucion-fusion">Trabajador que devolvió</label>
                  <select id="select-trabajador-devolucion-fusion" value={trabajador} onChange={(e) => setTrabajador(e.target.value)} data-nav-fusion="1,1" className={campoCls}>
                    <option value="">-- NO ESPECIFICAR --</option>
                    {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-black uppercase mb-1" htmlFor="input-motivo-devolucion-fusion">Motivo</label>
                  <input id="input-motivo-devolucion-fusion" value={motivo} onChange={(e) => setMotivo(e.target.value)} data-nav-fusion="1,2" className={campoCls} />
                </div>
              </div>

              <div>
                <p className="font-black uppercase mb-1">Resumen de todo lo fusionado</p>
                <div className="border-2 border-[var(--color-ink)] overflow-x-auto custom-scrollbar">
                  <table id="tabla-resumen-fusion" className="w-full text-left" data-fusion-resumen="true">
                    <thead className="bg-[var(--color-ink)] text-white font-black uppercase text-[10px] tracking-widest">
                      <tr><th className="p-2">Material</th><th className="p-2">Unidad</th><th className="p-2 text-right">Cantidad total</th><th className="p-2 text-right">Pendiente</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {resumen.map((r) => (
                        <tr key={`${r.descripcion}|${r.unidad}`}>
                          <td className="p-2 font-bold uppercase">{r.descripcion}</td>
                          <td className="p-2 uppercase">{r.unidad}</td>
                          <td className="p-2 text-right font-black">{r.cantidad}</td>
                          <td className="p-2 text-right font-black text-amber-700">{r.pendiente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <p className="font-black uppercase">Materiales por salida · escribe cuánto devolver</p>
                  <span id="total-fusion" className="font-black" data-total-fusion={money(totalPendiente)}>
                    Pendiente: S/ {money(totalPendiente)} · A devolver: S/ {money(totalElegido)}
                  </span>
                </div>
                <div className="border-2 border-[var(--color-ink)] overflow-x-auto custom-scrollbar max-h-[42vh]">
                  <table className="w-full text-left">
                    <thead className="bg-[var(--color-ink)] text-white font-black uppercase text-[10px] tracking-widest sticky top-0">
                      <tr>
                        <th className="p-2">Salida</th><th className="p-2">Material</th><th className="p-2">Unidad</th>
                        <th className="p-2 text-right">Cant.</th><th className="p-2 text-right">Devuelta</th><th className="p-2 text-right">Pendiente</th>
                        <th className="p-2">A devolver</th><th className="p-2 text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]" data-fusion-filas="true">
                      {filas.map((it, idx) => (
                        <tr key={`${it.salida.id}-${it.id}`}>
                          <td className="p-2 font-bold">{it.salida.codigo}</td>
                          <td className="p-2 uppercase font-bold">{it.descripcion}</td>
                          <td className="p-2 uppercase">{it.unidad}</td>
                          <td className="p-2 text-right">{numero(it.cantidad)}</td>
                          <td className="p-2 text-right">{numero(it.cantidad_devuelta)}</td>
                          <td className="p-2 text-right font-black text-amber-700">{it.pendiente}</td>
                          <td className="p-2">
                            <input
                              id={`input-devolver-fusion-${it.id}`}
                              type="number"
                              min="0"
                              max={it.pendiente}
                              step="0.001"
                              disabled={it.pendiente <= 0}
                              value={devolver[Number(it.id)] || ''}
                              onChange={(e) => setDevolver((prev) => ({ ...prev, [Number(it.id)]: e.target.value }))}
                              data-nav-fusion={`${idx + 2},0`}
                              className={`${campoCls} w-24`}
                            />
                          </td>
                          <td className="p-2 text-right">{money(it.costo_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar shrink-0">
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
              {!enGeneral ? (
                <button
                  id="btn-fusion-ver-general"
                  type="button"
                  disabled={elegidas.length === 0}
                  onClick={() => { setEnGeneral(true); setDevolver({}); }}
                  data-nav-fusion="1000,2"
                  className={botonCls}
                ><Layers size={16} className="hidden sm:block" /> Ver general</button>
              ) : (
                <>
                  <button id="btn-fusion-volver" type="button" onClick={() => setEnGeneral(false)} data-nav-fusion="1000,4" className={botonCls}>
                    <ArrowLeft size={16} className="hidden sm:block" /> Volver
                  </button>
                  <button id="btn-fusion-imprimir-general" type="button" onClick={imprimirGeneral} data-nav-fusion="1000,3" className={botonCls}>
                    <Printer size={16} className="hidden sm:block" /> Imprimir general
                  </button>
                  <button
                    id="btn-fusion-devolver-todo"
                    type="button"
                    disabled={procesando}
                    onClick={() => void devolverTodo()}
                    data-nav-fusion="1000,2"
                    className="h-10 px-3 bg-emerald-700 text-white font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  ><RotateCcw size={16} className="hidden sm:block" /> Devolver todo</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {previaOpen && general && (
        <VistaPreviaSalida
          salida={general}
          empresa={empresa}
          onCerrar={() => setPreviaOpen(false)}
        />
      )}
    </>
  );
};
