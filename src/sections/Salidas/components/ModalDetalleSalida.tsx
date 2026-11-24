import React, { useEffect, useRef, useState } from 'react';
import { Truck, X, Printer, RotateCcw, Plus, CheckCircle, AlertTriangle, MapPin, User, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { VistaPreviaSalida } from './VistaPreviaSalida';
import { ModalDevolucionesSalida } from './ModalDevolucionesSalida';
import { useEmpresaComprobante } from '../empresa';
import type { Salida, SalidaItem } from '../types';

interface ModalDetalleSalidaProps {
  salida: Salida;
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  onContinuar: (salida: Salida) => void;
}

type Cabecera = {
  tipo: string;
  customer_id: string;
  bien_id: string;
  direccion: string;
  ubicacion: string;
  fecha: string;
  observaciones: string;
  usuario: string;
};

type TrabajadorEdit = { id?: number; trabajador_id: string; rol: string };
type MaterialEdit = Omit<SalidaItem, 'id'> & { id?: number };

const texto = (v: any) => (v === null || v === undefined ? '' : String(v));

const cabeceraInicial = (s: Salida): Cabecera => ({
  tipo: s.tipo || 'SERVICIO',
  customer_id: texto(s.customer_id),
  bien_id: texto(s.bien_id),
  direccion: texto(s.direccion),
  ubicacion: texto(s.ubicacion),
  fecha: texto(s.fecha).slice(0, 10),
  observaciones: texto(s.observaciones),
  usuario: texto(s.usuario),
});

export const ModalDetalleSalida: React.FC<ModalDetalleSalidaProps> = ({
  salida,
  isOpen,
  onClose,
  onReload,
  onContinuar,
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [cab, setCab] = useState<Cabecera>(() => cabeceraInicial(salida));
  const [trabajadores, setTrabajadores] = useState<TrabajadorEdit[]>([]);
  const [materiales, setMateriales] = useState<MaterialEdit[]>([]);
  const [devolver, setDevolver] = useState<Record<number, string>>({});
  const [motivoDev, setMotivoDev] = useState('Sobrante de trabajo no utilizado');

  const [clientes, setClientes] = useState<any[]>([]);
  const [bienes, setBienes] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [trabajadoresCatalogo, setTrabajadoresCatalogo] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [nuevoMaterial, setNuevoMaterial] = useState({
    product_id: '',
    descripcion: '',
    cantidad: '1',
    costo: '0',
    unidad: 'UNID',
  });

  const [procesando, setProcesando] = useState(false);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [devolucionesOpen, setDevolucionesOpen] = useState(false);
  const empresa = useEmpresaComprobante();

  // Refs para guardar siempre el último valor, aunque llegue una recarga en medio.
  const cabRef = useRef(cab);
  const trabRef = useRef(trabajadores);
  const itemsRef = useRef(materiales);
  cabRef.current = cab;
  trabRef.current = trabajadores;
  itemsRef.current = materiales;

  const sincronizarHijos = async (id: number) => {
    const [tr, it] = await Promise.all([
      supabase.from('salida_trabajadores').select('id, trabajador_id, rol, trabajador:trabajadores(id, nombre)').eq('salida_id', id),
      supabase.from('salida_items').select('*').eq('salida_id', id).order('id'),
    ]);
    if (!tr.error && tr.data) {
      const lista = (tr.data as any[]).map((t) => ({
        id: t.id,
        trabajador_id: texto(t.trabajador_id),
        rol: texto(t.rol),
      }));
      setTrabajadores(lista);
      trabRef.current = lista;
    }
    if (!it.error && it.data) {
      const lista = (it.data as any[]) as MaterialEdit[];
      setMateriales(lista);
      itemsRef.current = lista;
      const cant: Record<number, string> = {};
      lista.forEach((m) => {
        cant[Number(m.id)] = '';
      });
      setDevolver(cant);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const inicial = cabeceraInicial(salida);
    setCab(inicial);
    cabRef.current = inicial;
    const tr = (salida.trabajadores || []).map((t) => ({
      id: t.id,
      trabajador_id: texto(t.trabajador_id),
      rol: texto(t.rol),
    }));
    setTrabajadores(tr);
    trabRef.current = tr;
    const it = (salida.items || []) as MaterialEdit[];
    setMateriales(it);
    itemsRef.current = it;
    const cant: Record<number, string> = {};
    it.forEach((m) => {
      cant[Number(m.id)] = '';
    });
    setDevolver(cant);

    let vivo = true;
    (async () => {
      const [resCli, resEmpleados, resTrab, resProd] = await Promise.all([
        supabase.from('customers').select('id, name, dni, ruc, direccion').order('name'),
        supabase.from('empleados_publico').select('id, nombre, email, rol, estado').eq('estado', 'ACTIVO').order('nombre'),
        supabase.from('trabajadores').select('id, nombre, cargo').order('nombre'),
        traerTodo(() => supabase.from('products').select('id, name, code, unit, cost_price').eq('is_active', 1).order('name')),
      ]);
      if (!vivo) return;
      setClientes((resCli.data as any[]) || []);
      setEmpleados((resEmpleados.data as any[]) || []);
      setTrabajadoresCatalogo((resTrab.data as any[]) || []);
      setProductos((resProd.data as any[]) || []);
    })();
    return () => { vivo = false; };
  }, [isOpen, salida.id]);

  useEffect(() => {
    if (!isOpen || !cab.customer_id) return;
    let vivo = true;
    supabase
      .from('bienes_cliente')
      .select('id, nombre, tipo, direccion, ubicacion')
      .eq('customer_id', Number(cab.customer_id))
      .order('nombre')
      .then(({ data }: { data: any[] | null }) => {
        if (vivo) setBienes(data || []);
      });
    return () => { vivo = false; };
  }, [isOpen, cab.customer_id]);

  const empleadoNombre = empleados.find((e) =>
    String(e.nombre || '').trim().toLowerCase() === cab.usuario.trim().toLowerCase()
  )?.nombre || cab.usuario || '';
  const empleadoValor = empleados.find((e) =>
    String(e.nombre || '').trim().toLowerCase() === cab.usuario.trim().toLowerCase()
  )?.id || cab.usuario;

  const armarDatos = (c: Cabecera, t: TrabajadorEdit[], i: MaterialEdit[]) => ({
    tipo: c.tipo,
    customer_id: c.customer_id,
    bien_id: c.bien_id,
    direccion: c.direccion,
    ubicacion: c.ubicacion,
    fecha: c.fecha,
    observaciones: c.observaciones,
    usuario: c.usuario,
    trabajadores: t.map((x) => ({ trabajador_id: x.trabajador_id, rol: x.rol })),
    items: i.map((x) => ({
      id: x.id ? String(x.id) : undefined,
      product_id: x.product_id ? String(x.product_id) : undefined,
      batch_id: x.batch_id ? String(x.batch_id) : undefined,
      descripcion: x.descripcion,
      unidad: x.unidad,
      cantidad: String(x.cantidad),
      costo_unitario: String(x.costo_unitario),
      es_externo: !!x.es_externo,
    })),
  });

  const guardar = async (c: Cabecera = cabRef.current, t: TrabajadorEdit[] = trabRef.current, i: MaterialEdit[] = itemsRef.current) => {
    setProcesando(true);
    try {
      const { error } = await supabase.rpc('fn_editar_salida', {
        p_salida_id: salida.id,
        p_datos: armarDatos(c, t, i),
        p_usuario: c.usuario || 'Sistema',
      });
      if (error) throw error;
      await sincronizarHijos(salida.id);
      await onReload();
    } catch (err: any) {
      console.error('Error al guardar el detalle:', err);
      avisar(err.message || 'No se pudo guardar el cambio');
    } finally {
      setProcesando(false);
    }
  };

  const cambiarCabecera = (campo: keyof Cabecera, valor: string, guardarAhora = true) => {
    const next = { ...cabRef.current, [campo]: valor };
    cabRef.current = next;
    setCab(next);
    if (guardarAhora) void guardar(next);
  };

  const cambiarTrabajador = (idx: number, campo: keyof TrabajadorEdit, valor: string, guardarAhora = true) => {
    const next = trabRef.current.map((t, i) => (i === idx ? { ...t, [campo]: valor } : t));
    trabRef.current = next;
    setTrabajadores(next);
    if (guardarAhora) void guardar();
  };

  const cambiarMaterial = (idx: number, campo: keyof MaterialEdit, valor: any, guardarAhora = true) => {
    const next = itemsRef.current.map((m, i) => (i === idx ? { ...m, [campo]: valor } : m));
    itemsRef.current = next;
    setMateriales(next);
    if (guardarAhora) void guardar(undefined, undefined, next);
  };

  const agregarTrabajador = () => {
    const libre = trabajadoresCatalogo.find((t) =>
      !trabRef.current.some((x) => String(x.trabajador_id) === String(t.id))
    );
    const next = [
      ...trabRef.current,
      { trabajador_id: texto(libre?.id), rol: 'RESPONSABLE' },
    ];
    trabRef.current = next;
    setTrabajadores(next);
    void guardar(undefined, next);
  };

  const agregarMaterial = async () => {
    const prod = productos.find((p) => String(p.id) === nuevoMaterial.product_id);
    const externo = nuevoMaterial.product_id === 'OTRO';
    const desc = externo ? nuevoMaterial.descripcion.trim() : (prod?.name || 'Material');
    const cant = Number(nuevoMaterial.cantidad);
    if (!desc || !Number.isFinite(cant) || cant <= 0) {
      avisar('Escribe el material y una cantidad válida');
      return;
    }
    const nuevo: MaterialEdit = {
      id: undefined,
      salida_id: salida.id,
      product_id: externo ? null : (prod?.id || null),
      batch_id: null,
      descripcion: desc,
      unidad: externo ? nuevoMaterial.unidad : (prod?.unit || 'UNID'),
      cantidad: cant,
      cantidad_devuelta: 0,
      costo_unitario: externo ? Number(nuevoMaterial.costo || 0) : Number(prod?.cost_price || 0),
      es_externo: externo,
    };
    const next = [...itemsRef.current, nuevo];
    itemsRef.current = next;
    setMateriales(next);
    setNuevoMaterial({ product_id: '', descripcion: '', cantidad: '1', costo: '0', unidad: 'UNID' });
    await guardar(undefined, undefined, next);
  };

  const quitarMaterial = async (idx: number) => {
    const m = itemsRef.current[idx];
    if (!m) return;
    if (!m.id) {
      const next = itemsRef.current.filter((_, i) => i !== idx);
      itemsRef.current = next;
      setMateriales(next);
      return;
    }
    const pendiente = Math.max(0, Number(m.cantidad || 0) - Number(m.cantidad_devuelta || 0));
    const seguro = await confirmar(
      `¿Quitar "${m.descripcion}" del detalle? ${
        pendiente > 0
          ? `Se devolverán ${pendiente} ${m.unidad} al almacén.`
          : 'No hay stock pendiente por devolver.'
      }`
    );
    if (!seguro) return;
    setProcesando(true);
    try {
      const { error } = await supabase.rpc('fn_quitar_material_salida', {
        p_salida_id: salida.id,
        p_item_id: Number(m.id),
        p_usuario: cabRef.current.usuario || 'Sistema',
      });
      if (error) throw error;
      avisar(
        pendiente > 0
          ? `Material quitado y ${pendiente} ${m.unidad} devueltos al almacén.`
          : 'Material quitado del detalle.'
      );
      await sincronizarHijos(salida.id);
      await onReload();
    } catch (err: any) {
      console.error('Error quitando el material:', err);
      avisar(err.message || 'No se pudo quitar el material');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarDevoluciones = async () => {
    if (procesando) return;
    const pendientes = itemsRef.current
      .filter((m) => Number(devolver[Number(m.id)] || 0) > 0)
      .map((m) => ({ item_id: Number(m.id), cantidad: Number(devolver[Number(m.id)]) }));
    if (pendientes.length === 0) {
      avisar('Escribe la cantidad que quieres devolver');
      return;
    }
    const total = pendientes.reduce((sum, d) => {
      const it = itemsRef.current.find((m) => Number(m.id) === d.item_id);
      return sum + d.cantidad * Number(it?.costo_unitario || 0);
    }, 0);
    const seguro = await confirmar(
      `Devolver ${pendientes.length} material(es) por S/ ${total.toFixed(2)}. El stock volverá al almacén. ¿Continuar?`
    );
    if (!seguro) return;
    setProcesando(true);
    try {
      const { error } = await supabase.rpc('fn_registrar_devoluciones_lote', {
        p_salida_id: salida.id,
        p_devoluciones: pendientes,
        p_motivo: motivoDev.trim() || 'Sobrante no utilizado',
        p_usuario: cabRef.current.usuario || 'Sistema',
      });
      if (error) throw error;
      avisar('Devolución registrada. El stock volvió al almacén.');
      setDevolucionesOpen(false);
      await sincronizarHijos(salida.id);
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
        p_usuario: cabRef.current.usuario || 'Sistema',
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
        p_usuario: empleadoNombre,
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

  const inputCls = 'w-full p-2 min-h-[40px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none disabled:opacity-50';
  const labelCls = 'block font-black uppercase text-[var(--color-ink)] mb-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
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
                  Todo se guarda solo · Materiales, personal y devoluciones en una sola ventana
                </p>
              </div>
            </div>
            <button
              id="btn-cerrar-detalle-salida"
              onClick={onClose}
              className="ventana-cerrar"
              title="Cerrar (Escape)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenido con Scroll */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs space-y-4">
            {/* Datos principales: una o dos filas, todo editable */}
            <div className="border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3">
              <p className="font-black uppercase text-[var(--color-ink)] mb-2 flex items-center gap-2">
                <User size={14} /> Cliente, trabajo y responsable
                {procesando && <span className="text-[10px] text-[var(--color-muted)] normal-case">Guardando…</span>}
              </p>
              {salida.salida_raiz_codigo && (
                <p className="text-[11px] mb-2 text-blue-700 font-bold">Continuación de: {salida.salida_raiz_codigo}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className={labelCls} htmlFor="select-cliente-detalle-salida">Cliente</label>
                  <select
                    id="select-cliente-detalle-salida"
                    value={cab.customer_id}
                    onChange={(e) => cambiarCabecera('customer_id', e.target.value)}
                    className={inputCls}
                  >
                    {!cab.customer_id && <option value="">-- ELIGE AL CLIENTE --</option>}
                    {cab.customer_id && !clientes.some((c) => String(c.id) === cab.customer_id) && (
                      <option value={cab.customer_id}>{salida.customer?.name || 'Cliente actual'}</option>
                    )}
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.dni || c.ruc ? ` (${c.dni || c.ruc})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="select-bien-detalle-salida">Lo que se atiende</label>
                  <select
                    id="select-bien-detalle-salida"
                    value={cab.bien_id}
                    onChange={(e) => cambiarCabecera('bien_id', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- NINGUNO --</option>
                    {cab.bien_id && !bienes.some((b) => String(b.id) === cab.bien_id) && (
                      <option value={cab.bien_id}>{salida.bien?.nombre || 'Trabajo actual'}</option>
                    )}
                    {bienes.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="input-direccion-detalle-salida">Dirección</label>
                  <input
                    id="input-direccion-detalle-salida"
                    type="text"
                    value={cab.direccion}
                    placeholder={salida.customer?.direccion || salida.bien?.direccion || ''}
                    onChange={(e) => cambiarCabecera('direccion', e.target.value, false)}
                    onBlur={() => { if (cabRef.current.direccion !== texto(salida.direccion)) void guardar(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="input-ubicacion-detalle-salida">Ubicación</label>
                  <input
                    id="input-ubicacion-detalle-salida"
                    type="text"
                    value={cab.ubicacion}
                    onChange={(e) => cambiarCabecera('ubicacion', e.target.value, false)}
                    onBlur={() => void guardar()}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="select-tipo-detalle-salida">Tipo de salida</label>
                  <select
                    id="select-tipo-detalle-salida"
                    value={cab.tipo}
                    onChange={(e) => cambiarCabecera('tipo', e.target.value)}
                    className={inputCls}
                  >
                    <option value="SERVICIO">SERVICIO</option>
                    <option value="OBRA">OBRA</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="input-fecha-detalle-salida">Fecha</label>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-[var(--color-accent-dark)]" />
                    <input
                      id="input-fecha-detalle-salida"
                      type="date"
                      value={cab.fecha}
                      onChange={(e) => cambiarCabecera('fecha', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="select-empleado-detalle-salida">Empleado responsable (quién atendió)</label>
                  <select
                    id="select-empleado-detalle-salida"
                    value={empleadoValor}
                    onChange={(e) => {
                      const nombre = empleados.find((x) => String(x.id) === e.target.value)?.nombre || e.target.value;
                      cambiarCabecera('usuario', String(nombre));
                    }}
                    className={inputCls}
                  >
                    {!empleadoValor && <option value="">-- ELIGE AL EMPLEADO --</option>}
                    {empleadoValor && !empleados.some((e) => String(e.id) === String(empleadoValor)) && (
                      <option value={empleadoValor}>{empleadoValor} (anterior)</option>
                    )}
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}{e.email ? ` (${e.email})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className={labelCls} htmlFor="input-nota-detalle-salida">Nota</label>
                  <input
                    id="input-nota-detalle-salida"
                    type="text"
                    value={cab.observaciones}
                    placeholder="Nota de la salida"
                    onChange={(e) => cambiarCabecera('observaciones', e.target.value, false)}
                    onBlur={() => void guardar()}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Personal técnico, se puede cambiar y agregar aquí */}
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <p className="font-black uppercase text-[var(--color-ink)] flex items-center gap-2">
                  <User size={14} /> Personal técnico responsable
                </p>
                <button
                  id="btn-agregar-trabajador-detalle"
                  type="button"
                  onClick={agregarTrabajador}
                  className="px-3 py-1 border-2 border-[var(--color-ink)] font-black uppercase text-[10px] flex items-center gap-1 hover:bg-[var(--color-ink)] hover:text-white cursor-pointer"
                >
                  <Plus size={12} /> Agregar trabajador
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {trabajadores.length === 0 && (
                  <p className="text-[var(--color-muted)] italic">Sin personal registrado</p>
                )}
                {trabajadores.map((t, idx) => (
                  <div key={t.id || `nuevo-${idx}`} className="flex gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                    <select
                      id={`select-trabajador-detalle-${idx}`}
                      value={t.trabajador_id}
                      onChange={(e) => cambiarTrabajador(idx, 'trabajador_id', e.target.value)}
                      className={inputCls}
                    >
                      {!t.trabajador_id && <option value="">-- ELIGE AL TÉCNICO --</option>}
                      {t.trabajador_id && !trabajadoresCatalogo.some((x) => String(x.id) === t.trabajador_id) && (
                        <option value={t.trabajador_id}>{salida.trabajadores?.[idx]?.trabajador?.nombre || 'Técnico actual'}</option>
                      )}
                      {trabajadoresCatalogo.map((x) => (
                        <option key={x.id} value={x.id}>{x.nombre}{x.cargo ? ` (${x.cargo})` : ''}</option>
                      ))}
                    </select>
                    <input
                      id={`input-rol-trabajador-detalle-${idx}`}
                      type="text"
                      value={t.rol}
                      onChange={(e) => cambiarTrabajador(idx, 'rol', e.target.value, false)}
                      onBlur={() => void guardar()}
                      className={`${inputCls} w-28`}
                      placeholder="ROL"
                    />
                    <button
                      type="button"
                      title="Quitar trabajador"
                      onClick={() => {
                        const next = trabRef.current.filter((_, i) => i !== idx);
                        trabRef.current = next;
                        setTrabajadores(next);
                        void guardar(undefined, next);
                      }}
                      className="px-2 border border-rose-600 text-rose-700 font-black cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Materiales, editables con ajuste de stock */}
            <div>
              <p className="font-black uppercase text-[var(--color-ink)] mb-1">
                Materiales y repuestos · cantidad y costo editables
              </p>
              <div className="border-2 border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--color-ink)] text-white font-black uppercase">
                    <tr>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 w-20 text-center">Unidad</th>
                      <th className="p-2 w-24 text-right">Cantidad</th>
                      <th className="p-2 w-20 text-right">Devuelto</th>
                      <th className="p-2 w-24 text-right">Costo unit.</th>
                      <th className="p-2 w-24 text-right">Subtotal</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {materiales.length === 0 && (
                      <tr><td colSpan={7} className="p-4 text-center text-[var(--color-muted)]">No hay materiales registrados</td></tr>
                    )}
                    {materiales.map((m, idx) => (
                      <tr key={m.id || `nuevo-${idx}`} className="hover:bg-black/5">
                        <td className="p-1">
                          <input
                            id={`input-desc-material-detalle-${idx}`}
                            type="text"
                            value={m.descripcion}
                            onChange={(e) => cambiarMaterial(idx, 'descripcion', e.target.value, false)}
                            onBlur={() => void guardar()}
                            className={`${inputCls} normal-case`}
                          />
                          {m.es_externo && <span className="text-[9px] text-amber-700 font-black">EXTERNO</span>}
                        </td>
                        <td className="p-1">
                          <input
                            id={`input-unidad-material-detalle-${idx}`}
                            type="text"
                            value={m.unidad}
                            onChange={(e) => cambiarMaterial(idx, 'unidad', e.target.value, false)}
                            onBlur={() => void guardar()}
                            className={`${inputCls} text-center`}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            id={`input-cantidad-material-detalle-${idx}`}
                            type="number"
                            step="any"
                            min={Number(m.cantidad_devuelta || 0)}
                            value={m.cantidad}
                            onChange={(e) => cambiarMaterial(idx, 'cantidad', Number(e.target.value), false)}
                            onBlur={() => void guardar(undefined, undefined, itemsRef.current)}
                            className={`${inputCls} text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-amber-700">{Number(m.cantidad_devuelta || 0) || '-'}</td>
                        <td className="p-1">
                          <input
                            id={`input-costo-material-detalle-${idx}`}
                            type="number"
                            step="any"
                            min="0"
                            value={m.costo_unitario}
                            onChange={(e) => cambiarMaterial(idx, 'costo_unitario', Number(e.target.value), false)}
                            onBlur={() => void guardar()}
                            className={`${inputCls} text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-black">
                          S/ {(Math.max(0, Number(m.cantidad || 0) - Number(m.cantidad_devuelta || 0)) * Number(m.costo_unitario || 0)).toFixed(2)}
                        </td>
                        <td className="p-1 text-center">
                          <button
                            id={`btn-quitar-material-detalle-${idx}`}
                            type="button"
                            title={m.id ? 'Quitar material y devolver el stock pendiente' : 'Quitar material nuevo'}
                            onClick={() => void quitarMaterial(idx)}
                            className="px-1 text-rose-700 font-black cursor-pointer"
                          ><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--color-bg)]">
                      <td className="p-1" colSpan={2}>
                        <select
                          id="select-material-nuevo-detalle"
                          value={nuevoMaterial.product_id}
                          onChange={(e) => {
                            const p = productos.find((x) => String(x.id) === e.target.value);
                            setNuevoMaterial((n) => ({ ...n, product_id: e.target.value, costo: String(p?.cost_price || 0) }));
                          }}
                          className={inputCls}
                        >
                          <option value="">+ Agregar material al inventario</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
                          ))}
                          <option value="OTRO">+ Otro material (fuera de inventario)</option>
                        </select>
                        {nuevoMaterial.product_id === 'OTRO' && (
                          <input
                            id="input-desc-material-externo-detalle"
                            type="text"
                            value={nuevoMaterial.descripcion}
                            placeholder="Nombre del material"
                            onChange={(e) => setNuevoMaterial((n) => ({ ...n, descripcion: e.target.value }))}
                            className={`${inputCls} mt-1 normal-case`}
                          />
                        )}
                      </td>
                      <td className="p-1">
                        <input
                          id="input-cantidad-material-nuevo-detalle"
                          type="number"
                          step="any"
                          min="0.001"
                          value={nuevoMaterial.cantidad}
                          onChange={(e) => setNuevoMaterial((n) => ({ ...n, cantidad: e.target.value }))}
                          className={`${inputCls} text-right`}
                        />
                      </td>
                      <td></td>
                      <td className="p-1">
                        <input
                          id="input-costo-material-nuevo-detalle"
                          type="number"
                          step="any"
                          min="0"
                          value={nuevoMaterial.costo}
                          onChange={(e) => setNuevoMaterial((n) => ({ ...n, costo: e.target.value }))}
                          className={`${inputCls} text-right`}
                        />
                      </td>
                      <td></td>
                      <td className="p-1 text-center">
                        <button
                          id="btn-agregar-material-detalle"
                          type="button"
                          onClick={() => void agregarMaterial()}
                          className="px-2 py-2 border-2 border-[var(--color-ink)] font-black cursor-pointer hover:bg-[var(--color-ink)] hover:text-white"
                          title="Agregar material"
                        ><Plus size={14} /></button>
                      </td>
                    </tr>
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
                          <th className="p-1">Motivo</th>
                          <th className="p-1">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {[...salida.devoluciones]
                          .sort((a, b) => new Date(b.fecha || b.created_at || 0).getTime() - new Date(a.fecha || a.created_at || 0).getTime())
                          .map((d, idx) => {
                            const item = (salida.items || []).find((it) => it.id === d.salida_item_id);
                            return (
                              <tr key={d.id || idx}>
                                <td className="p-1">{d.fecha ? new Date(d.fecha).toLocaleString('es-PE') : '-'}</td>
                                <td className="p-1 font-bold uppercase">{item?.descripcion || `Item #${d.salida_item_id}`}</td>
                                <td className="p-1 text-right font-black text-amber-700">{d.cantidad} {item?.unidad || ''}</td>
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

          {/* Footer: TODOS los botones en UNA sola fila, también en 390 px. No hay botón Cerrar (está la X).
              Misma altura en todos para que nunca se vean "en dos filas" por diferencia de 2 px. */}
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
                  title="Continuar salida"
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

      {/* Devoluciones: ventana flotante sobre el detalle */}
      {devolucionesOpen && (
        <ModalDevolucionesSalida
          isOpen={devolucionesOpen}
          codigo={salida.codigo}
          materiales={materiales}
          devolver={devolver}
          setDevolver={setDevolver}
          motivoDev={motivoDev}
          setMotivoDev={setMotivoDev}
          procesando={procesando}
          onConfirmar={() => void confirmarDevoluciones()}
          onClose={() => setDevolucionesOpen(false)}
        />
      )}

      {/* Vista previa del comprobante (hoja, ticket, PDF y WhatsApp) */}
      {vistaPreviaOpen && (
        <VistaPreviaSalida
          salida={{ ...salida, usuario: empleadoNombre }}
          empresa={empresa}
          onCerrar={() => setVistaPreviaOpen(false)}
        />
      )}
    </>
  );
};
