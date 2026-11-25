import React, { useEffect, useRef, useState } from 'react';
import { Truck, X, Printer, RotateCcw, CheckCircle, AlertTriangle, MapPin, User, Calendar, Trash2, Plus, Search } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';
import { VistaPreviaSalida } from './VistaPreviaSalida';
import { ModalDevolucionesSalida } from './ModalDevolucionesSalida';
import { UnidadMaterial } from './UnidadMaterial';
import { useEmpresaComprobante } from '../empresa';
import type { Salida, SalidaItem } from '../types';

interface ModalDetalleSalidaProps {
  salida: Salida;
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  onContinuar: (salida: Salida) => void;
}

type MaterialVista = Pick<
  SalidaItem,
  'id' | 'descripcion' | 'unidad' | 'cantidad' | 'cantidad_devuelta' | 'costo_unitario' | 'es_externo' | 'product_id'
>;

const texto = (v: any) => (v === null || v === undefined ? '' : String(v));
const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * 228 (dueño 24/11/2026): el detalle es SOLO DE LECTURA.
 * Para cambiar datos o materiales se usa «Continuar salida», que abre Nueva salida con
 * los materiales copiados en la tabla editable. Aquí solo se mira, se imprime, se devuelve,
 * se finaliza/reactiva, se elimina o se continúa.
 */
export const ModalDetalleSalida: React.FC<ModalDetalleSalidaProps> = ({
  salida,
  isOpen,
  onClose,
  onReload,
  onContinuar,
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [materiales, setMateriales] = useState<MaterialVista[]>([]);
  // Buscador del detalle: filtra SOLO los materiales que ya tiene esta salida (dueño 24/11/2026).
  const [buscarMaterial, setBuscarMaterial] = useState('');
  const [devolver, setDevolver] = useState<Record<number, string>>({});
  const [motivoDev, setMotivoDev] = useState('Sobrante de trabajo no utilizado');
  // 228: fecha y trabajador que devolvió, elegibles en la ventana flotante.
  const [fechaDev, setFechaDev] = useState(hoy);
  const [trabajadorDev, setTrabajadorDev] = useState('');
  const [trabajadoresCatalogo, setTrabajadoresCatalogo] = useState<any[]>([]);

  const [procesando, setProcesando] = useState(false);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [devolucionesOpen, setDevolucionesOpen] = useState(false);
  const empresa = useEmpresaComprobante();

  const materialesRef = useRef(materiales);
  materialesRef.current = materiales;

  const sincronizarMateriales = async (id: number) => {
    const { data, error } = await supabase
      .from('salida_items')
      .select('*')
      .eq('salida_id', id)
      .order('id');
    if (error || !data) return;
    const lista = data as MaterialVista[];
    setMateriales(lista);
    materialesRef.current = lista;
    const cant: Record<number, string> = {};
    lista.forEach((m) => { cant[Number(m.id)] = ''; });
    setDevolver(cant);
  };

  useEffect(() => {
    if (!isOpen) return;
    const it = (salida.items || []) as MaterialVista[];
    setMateriales(it);
    materialesRef.current = it;
    const cant: Record<number, string> = {};
    it.forEach((m) => { cant[Number(m.id)] = ''; });
    setDevolver(cant);
    setFechaDev(hoy());
    setTrabajadorDev('');
    setBuscarMaterial('');

    // Dueño 24/11/2026: al abrir, la vista queda arriba; el imán de ventanas recuerda este panel
    // y vuelve a él si un clic en el fondo intenta llevar el selector abajo.
    const enfocarArriba = window.setTimeout(
      () => document.getElementById('inicio-detalle-salida')?.focus({ preventScroll: true }),
      0
    );

    let vivo = true;
    supabase
      .from('trabajadores')
      .select('id, nombre, cargo')
      .order('nombre')
      .then(({ data }: { data: any[] | null }) => {
        if (vivo) setTrabajadoresCatalogo(data || []);
      });
    return () => { vivo = false; window.clearTimeout(enfocarArriba); };
  }, [isOpen, salida.id]);

  const confirmarDevoluciones = async () => {
    if (procesando) return;
    const pendientes = materialesRef.current
      .filter((m) => m.id != null && Number(devolver[Number(m.id)] || 0) > 0)
      .map((m) => ({ item_id: Number(m.id), cantidad: Number(devolver[Number(m.id)]) }));
    if (pendientes.length === 0) {
      avisar('Escribe la cantidad que quieres devolver');
      return;
    }
    const total = pendientes.reduce((sum, d) => {
      const it = materialesRef.current.find((m) => Number(m.id) === d.item_id);
      return sum + d.cantidad * Number(it?.costo_unitario || 0);
    }, 0);
    const seguro = await confirmar(
      `Devolver ${pendientes.length} material(es) por S/ ${total.toFixed(2)}. El stock volverá al almacén. ¿Continuar?`
    );
    if (!seguro) return;
    setProcesando(true);
    try {
      const fecha = fechaDev.trim()
        ? new Date(`${fechaDev}T12:00:00`).toISOString()
        : null;
      const { error } = await supabase.rpc('fn_registrar_devoluciones_lote', {
        p_salida_id: salida.id,
        p_devoluciones: pendientes,
        p_motivo: motivoDev.trim() || 'Sobrante no utilizado',
        p_usuario: salida.usuario || 'Sistema',
        p_fecha: fecha,
        p_trabajador_id: trabajadorDev ? Number(trabajadorDev) : null,
      });
      if (error) throw error;
      avisar('Devolución registrada. El stock volvió al almacén.');
      setDevolucionesOpen(false);
      await sincronizarMateriales(salida.id);
      await onReload();
    } catch (err: any) {
      console.error('Error registrando devoluciones:', err);
      avisar(err.message || 'No se pudo registrar la devolución');
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async () => {
    const seguro = await confirmar(
      `¿Eliminar la salida ${salida.codigo}? Se borrará el registro y TODO el material pendiente volverá al almacén.`
    );
    if (!seguro) return;
    setProcesando(true);
    try {
      const { error } = await supabase.rpc('fn_eliminar_salida', {
        p_salida_id: salida.id,
        p_usuario: salida.usuario || 'Sistema',
      });
      if (error) throw error;
      avisar(`Salida ${salida.codigo} eliminada y stock devuelto.`);
      onClose();
      onReload();
    } catch (err: any) {
      console.error('Error eliminando la salida:', err);
      avisar(err.message || 'No se pudo eliminar la salida');
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: 'FINALIZADO' | 'EN_PROCESO') => {
    const seguro = await confirmar(`¿Deseas marcar la salida ${salida.codigo} como ${nuevoEstado}?`);
    if (!seguro) return;
    setProcesando(true);
    try {
      const { error } = await supabase.rpc('fn_cambiar_estado_salida', {
        p_salida_id: salida.id,
        p_nuevo_estado: nuevoEstado,
        p_usuario: salida.usuario || 'Sistema',
      });
      if (error) throw error;
      avisar(`Salida marcada como ${nuevoEstado}`);
      onReload();
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      avisar(err.message || 'Error al actualizar estado');
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  const materialesFiltrados = materiales.filter((m) => coincideBusqueda([m.descripcion, m.unidad], buscarMaterial));

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'FINALIZADO':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase">Finalizado</span>;
      case 'CANCELADO':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 text-[10px] font-black uppercase">Cancelado</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">En Proceso</span>;
    }
  };

  const datoCls = 'w-full min-h-[40px] px-2 py-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] font-bold uppercase break-words flex items-center';
  const labelCls = 'block font-black uppercase text-[var(--color-ink)] mb-1';
  const clienteNombre = salida.customer?.name || (salida.observaciones?.match(/CLIENTE:\s*([^|]+)/)?.[1] || '').trim() || texto(salida.customer_id);
  const bienNombre = salida.bien?.nombre || (salida.observaciones?.match(/ATIENDE:\s*([^|]+)/)?.[1] || '').trim() || '—';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono"
        onMouseDown={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
      >
        <div
          id="modal-detalle-salida-container"
          className="ventana-sobria bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
        >
          {/* Cabecera SiuMax Sobrio */}
          <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ventana-cabecera__icono"><Truck size={20} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="ventana-cabecera__titulo">Detalle de Salida {salida.codigo}</h2>
                  {getEstadoBadge(salida.estado)}
                </div>
                <p className="ventana-cabecera__subtitulo">
                  Solo lectura · Para cambiar datos o materiales usa «Continuar salida»
                </p>
              </div>
            </div>
            <button
              id="btn-cerrar-detalle-salida"
              type="button"
              onClick={onClose}
              className="ventana-cerrar"
              title="Cerrar (Escape)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenido con Scroll */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs space-y-4">
            {/* Datos principales: solo se muestran, no se editan. Este panel es el ancla del foco:
                el imán de ventanas recuerda dónde estaba el selector y vuelve aquí tras un clic afuera. */}
            <div id="inicio-detalle-salida" tabIndex={-1} className="border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 outline-none">
              <p className="font-black uppercase text-[var(--color-ink)] mb-2 flex items-center gap-2">
                <User size={14} /> Cliente, trabajo y responsable
              </p>
              {salida.salida_raiz_codigo && (
                <p className="text-[11px] mb-2 text-blue-700 font-bold">Continuación de: {salida.salida_raiz_codigo}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <span className={labelCls}>Cliente</span>
                  <div id="dato-cliente-detalle-salida" className={datoCls}>{clienteNombre}</div>
                </div>
                <div>
                  <span className={labelCls}>Lo que se atiende</span>
                  <div id="dato-bien-detalle-salida" className={datoCls}>{bienNombre}</div>
                </div>
                <div>
                  <span className={labelCls}>Dirección</span>
                  <div className={datoCls}>{texto(salida.direccion) || texto(salida.customer?.direccion) || texto(salida.bien?.direccion) || '—'}</div>
                </div>
                <div>
                  <span className={labelCls}>Ubicación</span>
                  <div className={datoCls}>{texto(salida.ubicacion) || texto(salida.bien?.ubicacion) || '—'}</div>
                </div>
                <div>
                  <span className={labelCls}>Tipo de salida</span>
                  <div className={datoCls}>{texto(salida.tipo)}</div>
                </div>
                <div>
                  <span className={labelCls}>Fecha</span>
                  <div className={`${datoCls} gap-1`}><Calendar size={14} className="text-[var(--color-accent-dark)] shrink-0" />{texto(salida.fecha).slice(0, 10)}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className={labelCls}>Empleado responsable (quién atendió)</span>
                  <div className={datoCls}>{texto(salida.usuario) || '—'}</div>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className={labelCls}>Nota</span>
                  <div className={datoCls}>{texto(salida.observaciones) || '—'}</div>
                </div>
              </div>
            </div>

            {/* Personal técnico: solo se muestra */}
            <div>
              <p className="font-black uppercase text-[var(--color-ink)] mb-1 flex items-center gap-2">
                <User size={14} /> Personal técnico responsable
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {(salida.trabajadores || []).length === 0 && (
                  <p className="text-[var(--color-muted)] italic">Sin personal registrado</p>
                )}
                {(salida.trabajadores || []).map((t, idx) => (
                  <div key={t.id || `trab-${idx}`} className="flex gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                    <span className="font-black uppercase">{t.trabajador?.nombre || texto(t.trabajador_id)}</span>
                    <span className="text-[var(--color-muted)]">· {texto(t.rol) || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Materiales: tabla de solo lectura (la tabla editable quedó en «Continuar salida») */}
            <div>
              <p className="font-black uppercase text-[var(--color-ink)] mb-1 flex items-center gap-2">
                <MapPin size={14} /> Materiales y repuestos
                <span className="text-[10px] font-bold text-[var(--color-muted)] normal-case">Para quitar o cambiar uno, usa «Continuar salida»</span>
              </p>
              <div className="buscador-sobrio mb-2">
                <div className="buscador-sobrio__icono"><Search size={16} /></div>
                <input
                  id="buscador-materiales-detalle"
                  type="search"
                  value={buscarMaterial}
                  onChange={(e) => setBuscarMaterial(e.target.value)}
                  placeholder="Buscar material de esta salida"
                  aria-label="Buscar material de esta salida"
                />
                {buscarMaterial && (
                  <div className="buscador-sobrio__match">
                    <button
                      id="btn-limpiar-buscador-materiales-detalle"
                      type="button"
                      title="Limpiar búsqueda"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setBuscarMaterial('')}
                      className="buscador-sobrio__borrar"
                    ><X size={14} /></button>
                  </div>
                )}
              </div>
              <div className="border-2 border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--color-ink)] text-white font-black uppercase">
                    <tr>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 w-20 text-center">Unidad</th>
                      <th className="p-2 w-24 text-right">Cantidad</th>
                      <th className="p-2 w-20 text-right">Devuelto</th>
                      <th className="p-2 w-24 text-right">Pendiente</th>
                      <th className="p-2 w-24 text-right">Costo unit.</th>
                      <th className="p-2 w-28 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {materialesFiltrados.length === 0 && (
                      <tr><td colSpan={7} className="p-4 text-center text-[var(--color-muted)]">
                        {buscarMaterial ? 'No hay materiales que coincidan con la búsqueda' : 'No hay materiales registrados'}
                      </td></tr>
                    )}
                    {materialesFiltrados.map((m, idx) => {
                      const pendiente = Math.max(0, Number(m.cantidad || 0) - Number(m.cantidad_devuelta || 0));
                      return (
                        <tr key={m.id || `mat-${idx}`} className="hover:bg-black/5">
                          <td className="p-2 font-bold uppercase">
                            {m.descripcion}
                            {m.es_externo && <span className="ml-2 text-[9px] text-amber-700 font-black">EXTERNO</span>}
                          </td>
                          <td className="p-2 text-center"><UnidadMaterial unidad={m.unidad} /></td>
                          <td className="p-2 text-right font-bold">{Number(m.cantidad || 0)}</td>
                          <td className="p-2 text-right font-bold text-amber-700">{Number(m.cantidad_devuelta || 0) || '-'}</td>
                          <td className="p-2 text-right font-bold">{pendiente}</td>
                          <td className="p-2 text-right">S/ {Number(m.costo_unitario || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-black">S/ {(pendiente * Number(m.costo_unitario || 0)).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Devoluciones: se abren en una ventana flotante */}
            <div>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <p className="font-black uppercase text-[var(--color-ink)] flex items-center gap-2">
                  <RotateCcw size={14} /> Devoluciones
                </p>
                <button
                  id="btn-abrir-devoluciones"
                  type="button"
                  onClick={() => setDevolucionesOpen(true)}
                  className="px-3 py-1 border-2 border-[var(--color-ink)] font-black uppercase text-xs cursor-pointer hover:bg-[var(--color-ink)] hover:text-white"
                >
                  Devolver materiales
                </button>
              </div>

              {/* Historial de devoluciones ya registradas */}
              {salida.devoluciones && salida.devoluciones.length > 0 && (
                <div className="mt-3">
                  <p className="font-black uppercase text-[var(--color-ink)] mb-1">Devoluciones registradas</p>
                  <div className="border border-[var(--color-border)] overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[var(--color-bg)] text-[var(--color-ink)] font-black uppercase">
                        <tr>
                          <th className="p-1">Fecha</th>
                          <th className="p-1">Material</th>
                          <th className="p-1 text-right">Cantidad</th>
                          <th className="p-1">Trabajador</th>
                          <th className="p-1">Motivo</th>
                          <th className="p-1">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {[...salida.devoluciones]
                          .sort((a, b) => new Date(b.fecha || b.created_at || 0).getTime() - new Date(a.fecha || a.created_at || 0).getTime())
                          .map((d, idx) => {
                            const item = (salida.items || []).find((it) => it.id === d.salida_item_id);
                            const nomTrab = d.trabajador?.nombre
                              || trabajadoresCatalogo.find((x) => String(x.id) === String(d.trabajador_id))?.nombre
                              || '';
                            return (
                              <tr key={d.id || idx}>
                                <td className="p-1">{d.fecha ? new Date(d.fecha).toLocaleString('es-PE') : '-'}</td>
                                <td className="p-1 font-bold uppercase">{item?.descripcion || `Item #${d.salida_item_id}`}</td>
                                <td className="p-1 text-right font-black text-amber-700">{d.cantidad} <UnidadMaterial unidad={item?.unidad} /></td>
                                <td className="p-1 uppercase">{nomTrab || '—'}</td>
                                <td className="p-1 uppercase">{d.motivo || '-'}</td>
                                <td className="p-1 uppercase">{d.usuario || '-'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer: TODOS los botones en UNA sola fila, también en 390 px. No hay botón Cerrar (está la X). */}
          <div className="bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-nowrap items-center overflow-x-auto custom-scrollbar shrink-0">
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
              <button
                id="btn-imprimir-salida"
                type="button"
                onClick={() => setVistaPreviaOpen(true)}
                title="Imprimir / Enviar vale"
                className="h-10 shrink-0 px-2 sm:px-3 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-[var(--color-ink)] hover:text-white cursor-pointer"
              >
                <Printer size={16} className="hidden sm:block" />
                <span className="sm:hidden">Imprimir</span>
                <span className="hidden sm:inline">Imprimir / Enviar vale</span>
              </button>
              {salida.estado !== 'CANCELADO' && (
                <button
                  id="btn-continuar-salida"
                  type="button"
                  onClick={() => { onClose(); onContinuar(salida); }}
                  title="Continuar salida (abre Nueva salida con los materiales)"
                  className="h-10 shrink-0 px-2 sm:px-3 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  <Plus size={16} className="hidden sm:block" />
                  <span className="sm:hidden">Continuar</span>
                  <span className="hidden sm:inline">Continuar salida</span>
                </button>
              )}
              {salida.estado === 'EN_PROCESO' && (
                <button
                  id="btn-finalizar-salida"
                  type="button"
                  disabled={procesando}
                  onClick={() => void handleCambiarEstado('FINALIZADO')}
                  title="Finalizar salida"
                  className="h-10 shrink-0 px-2 sm:px-3 bg-emerald-700 text-white font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle size={16} className="hidden sm:block" />
                  <span className="sm:hidden">Finalizar</span>
                  <span className="hidden sm:inline">Finalizar salida</span>
                </button>
              )}
              {salida.estado === 'FINALIZADO' && (
                <button
                  id="btn-reactivar-salida"
                  type="button"
                  disabled={procesando}
                  onClick={() => void handleCambiarEstado('EN_PROCESO')}
                  title="Reactivar salida"
                  className="h-10 shrink-0 px-2 sm:px-3 bg-amber-600 text-white font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={16} className="hidden sm:block" />
                  Reactivar
                </button>
              )}
              <button
                id="btn-eliminar-salida"
                type="button"
                disabled={procesando}
                onClick={() => void eliminar()}
                className="h-10 shrink-0 px-2 sm:px-3 bg-rose-700 text-white font-black uppercase text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-rose-800 cursor-pointer disabled:opacity-50"
                title="Borrar la salida y devolver todo el stock"
              >
                <Trash2 size={16} className="hidden sm:block" />
                Eliminar
              </button>
              {salida.estado === 'CANCELADO' && (
                <span className="shrink-0 text-[10px] text-[var(--color-muted)] flex items-center gap-1">
                  <AlertTriangle size={12} /> Salida cancelada
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Devoluciones: ventana flotante sobre el detalle, con fecha y trabajador elegibles */}
      {devolucionesOpen && (
        <ModalDevolucionesSalida
          isOpen={devolucionesOpen}
          codigo={salida.codigo}
          materiales={materiales}
          devolver={devolver}
          setDevolver={setDevolver}
          motivoDev={motivoDev}
          setMotivoDev={setMotivoDev}
          fechaDev={fechaDev}
          setFechaDev={setFechaDev}
          trabajadorDev={trabajadorDev}
          setTrabajadorDev={setTrabajadorDev}
          trabajadoresCatalogo={trabajadoresCatalogo}
          procesando={procesando}
          onConfirmar={() => void confirmarDevoluciones()}
          onClose={() => setDevolucionesOpen(false)}
        />
      )}

      {/* Vista previa del comprobante (hoja, ticket, PDF y WhatsApp) */}
      {vistaPreviaOpen && (
        <VistaPreviaSalida
          salida={{ ...salida, usuario: salida.usuario || '' }}
          empresa={empresa}
          onCerrar={() => setVistaPreviaOpen(false)}
        />
      )}
    </>
  );
};
