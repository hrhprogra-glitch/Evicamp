import React, { useEffect, useState } from 'react';
import { Truck, X, Printer, RotateCcw, Plus, CheckCircle, AlertTriangle, MapPin, User, Calendar } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { VistaPreviaSalida } from './VistaPreviaSalida';
import { useEmpresaComprobante } from '../empresa';
import { ModalDevolucion } from './ModalDevolucion';
import type { Salida } from '../types';

interface ModalDetalleSalidaProps {
  salida: Salida;
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  onContinuar: (salida: Salida) => void;
}

export const ModalDetalleSalida: React.FC<ModalDetalleSalidaProps> = ({
  salida,
  isOpen,
  onClose,
  onReload,
  onContinuar,
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // 204 (dueño 23/11/2026): el empleado responsable también se puede cambiar después de guardar.
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [empleadoValor, setEmpleadoValor] = useState(salida.usuario || '');
  const [guardandoEmpleado, setGuardandoEmpleado] = useState(false);
  const empleadoNombre = empleados.find((e) => String(e.id) === String(empleadoValor))?.nombre
    || empleadoValor || '';

  useEffect(() => {
    setEmpleadoValor(salida.usuario || '');
  }, [salida.id, salida.usuario]);

  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    supabase
      .from('empleados_publico')
      .select('id, nombre, email, rol, estado')
      .eq('estado', 'ACTIVO')
      .order('nombre')
      .then(({ data }: { data: any[] | null }) => {
        if (!vivo || !data) return;
        setEmpleados(data);
        const coincide = data.find(
          (e) => String(e.nombre || '').trim().toLowerCase() === String(salida.usuario || '').trim().toLowerCase()
        );
        if (coincide) setEmpleadoValor(String(coincide.id));
      });
    return () => { vivo = false; };
  }, [isOpen, salida.id, salida.usuario]);

  const guardarEmpleado = async (valor: string) => {
    const nombre = empleados.find((e) => String(e.id) === String(valor))?.nombre || valor;
    if (!nombre.trim()) {
      avisar('Elige un empleado');
      return;
    }
    setGuardandoEmpleado(true);
    try {
      const { error } = await supabase
        .from('salidas')
        .update({ usuario: nombre })
        .eq('id', salida.id);
      if (error) throw error;
      await onReload();
    } catch (err: any) {
      console.error('Error al cambiar empleado:', err);
      avisar(err.message || 'No se pudo cambiar el empleado');
      setEmpleadoValor(salida.usuario || '');
    } finally {
      setGuardandoEmpleado(false);
      setTimeout(() => document.getElementById('select-empleado-detalle-salida')?.focus(), 60);
    }
  };

  // 194: el botón de imprimir abre la misma vista previa de las salidas nuevas (ticket, hoja, PDF y WhatsApp).
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const empresa = useEmpresaComprobante();

  if (!isOpen) return null;

  const handleCambiarEstado = async (nuevoEstado: 'FINALIZADO' | 'EN_PROCESO' | 'CANCELADO') => {
    let pregunta = `¿Deseas marcar la salida ${salida.codigo} como ${nuevoEstado}?`;
    if (nuevoEstado === 'CANCELADO') {
      pregunta = `¿Estás seguro de cancelar la salida ${salida.codigo}? Todo el material no devuelto volverá automáticamente al almacén.`;
    }
    const seguro = await confirmar(pregunta);
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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
        <div
          id="modal-detalle-salida-container"
          className="ventana-sobria bg-[var(--color-surface)] w-full max-w-3xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
        >
          {/* Cabecera SiuMax Sobrio */}
          <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ventana-cabecera__icono">
                <Truck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="ventana-cabecera__titulo">
                    Detalle de Salida {salida.codigo}
                  </h2>
                  {getEstadoBadge(salida.estado)}
                </div>
                <p className="ventana-cabecera__subtitulo">
                  Control de materiales entregados y devoluciones
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
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4">
            {/* Info Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border-2 border-[var(--color-border)] bg-[var(--color-bg)]">
              <div>
                <p className="text-[10px] text-[var(--color-muted)] font-black uppercase">Cliente y Trabajo</p>
                <p className="text-sm font-black uppercase text-[var(--color-ink)] mt-0.5">
                  {salida.customer?.name || 'Cliente no registrado'}
                </p>
                {(salida.customer?.dni || salida.customer?.ruc) && (
                  <p className="text-[11px] text-[var(--color-muted)]">Doc: {salida.customer.dni || salida.customer.ruc}</p>
                )}
                {salida.bien && (
                  <p className="text-[11px] font-bold text-[var(--color-accent-dark)] mt-1">
                    Atención a: {salida.bien.nombre} ({salida.bien.tipo})
                  </p>
                )}
                {salida.direccion && (
                  <p className="text-[11px] flex items-center gap-1 mt-1 text-[var(--color-muted)]">
                    <MapPin size={12} /> {salida.direccion}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-[var(--color-muted)] font-black uppercase">Detalles Operativos</p>
                <p className="text-[11px] mt-0.5">
                  <span className="font-black">Tipo:</span> <span className="font-bold uppercase">{salida.tipo}</span>
                </p>
                <p className="text-[11px] mt-0.5">
                  <span className="font-black">Fecha:</span> {salida.fecha}
                </p>
                {/* 204 (dueño 23/11/2026): cambiar al empleado responsable después de guardar */}
                <div className="mt-2">
                  <label htmlFor="select-empleado-detalle-salida" className="block font-black uppercase text-[var(--color-ink)] mb-1">
                    Empleado responsable *
                  </label>
                  <select
                    id="select-empleado-detalle-salida"
                    value={empleadoValor}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmpleadoValor(v);
                      void guardarEmpleado(v);
                    }}
                    disabled={guardandoEmpleado}
                    className="w-full p-2 min-h-[44px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none disabled:opacity-50"
                  >
                    {!empleadoValor && <option value="">-- ELIGE AL EMPLEADO --</option>}
                    {empleadoValor && !empleados.some((e) => String(e.id) === String(empleadoValor)) && (
                      <option value={empleadoValor}>{empleadoValor} (anterior)</option>
                    )}
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}{e.email ? ` (${e.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--color-muted)] mt-1">
                    Cambia el responsable y se guarda al instante. Sale en el comprobante.
                  </p>
                </div>
                {salida.salida_raiz_codigo && (
                  <p className="text-[11px] mt-0.5 text-blue-700 font-bold">
                    Continuación de: {salida.salida_raiz_codigo}
                  </p>
                )}
                {salida.observaciones && (
                  <p className="text-[11px] italic mt-1 text-[var(--color-muted)]">
                    Nota: {salida.observaciones}
                  </p>
                )}
              </div>
            </div>

            {/* Personal Asignado */}
            <div>
              <p className="font-black uppercase text-[var(--color-ink)] mb-1">
                Personal Técnico Responsable:
              </p>
              <div className="flex flex-wrap gap-2">
                {salida.trabajadores && salida.trabajadores.length > 0 ? (
                  salida.trabajadores.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] font-bold uppercase text-[10px] flex items-center gap-1"
                    >
                      <User size={12} className="text-[var(--color-accent-dark)]" />
                      {t.trabajador?.nombre || 'Técnico'} {t.rol ? `(${t.rol})` : ''}
                    </span>
                  ))
                ) : (
                  <span className="text-[var(--color-muted)] italic">Sin personal registrado</span>
                )}
              </div>
            </div>

            {/* Materiales y Repuestos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="font-black uppercase text-[var(--color-ink)]">
                  Materiales y Repuestos Utilizados:
                </p>
                {salida.estado !== 'CANCELADO' && (
                  <button
                    id="btn-devolver-material"
                    type="button"
                    onClick={() => setModalDevolucionOpen(true)}
                    className="px-3 py-1 bg-[var(--color-surface)] border border-[var(--color-ink)] text-[var(--color-ink)] font-black uppercase text-[10px] flex items-center gap-1 hover:bg-[var(--color-ink)] hover:text-white cursor-pointer"
                  >
                    <RotateCcw size={12} /> Registrar Devolución
                  </button>
                )}
              </div>

              <div className="border-2 border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--color-ink)] text-white font-black uppercase">
                    <tr>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 w-16 text-center">Unidad</th>
                      <th className="p-2 w-20 text-right">Salida</th>
                      <th className="p-2 w-20 text-right">Devuelto</th>
                      <th className="p-2 w-20 text-right">Consumo Neto</th>
                      <th className="p-2 w-24 text-right">Costo Unit.</th>
                      <th className="p-2 w-24 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {salida.items && salida.items.length > 0 ? (
                      salida.items.map((it, idx) => {
                        const neto = it.cantidad - it.cantidad_devuelta;
                        const subtotal = neto * it.costo_unitario;
                        return (
                          <tr key={idx} className="hover:bg-black/5">
                            <td className="p-2 font-bold uppercase">
                              {it.descripcion}
                              {it.es_externo && (
                                <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 border border-amber-300">
                                  EXTERNO
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center">{it.unidad}</td>
                            <td className="p-2 text-right font-bold">{it.cantidad}</td>
                            <td className="p-2 text-right font-bold text-amber-700">
                              {it.cantidad_devuelta > 0 ? it.cantidad_devuelta : '-'}
                            </td>
                            <td className="p-2 text-right font-black text-emerald-800">{neto}</td>
                            <td className="p-2 text-right">S/ {it.costo_unitario.toFixed(2)}</td>
                            <td className="p-2 text-right font-black">S/ {subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-[var(--color-muted)]">
                          No hay items registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-wrap justify-between items-center gap-2 shrink-0">
            <div className="flex gap-2">
              <button
                id="btn-imprimir-salida"
                type="button"
                onClick={() => setVistaPreviaOpen(true)}
                className="px-4 py-2 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] font-black uppercase text-xs flex items-center gap-1.5 hover:bg-[var(--color-ink)] hover:text-white cursor-pointer"
              >
                <Printer size={16} /> Imprimir / Enviar vale
              </button>

              {salida.estado !== 'CANCELADO' && (
                <button
                  id="btn-continuar-salida"
                  type="button"
                  onClick={() => {
                    onClose();
                    onContinuar(salida);
                  }}
                  className="px-4 py-2 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] font-black uppercase text-xs flex items-center gap-1.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  <Plus size={16} /> Continuar Salida
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {salida.estado === 'EN_PROCESO' && (
                <button
                  id="btn-finalizar-salida"
                  type="button"
                  disabled={procesando}
                  onClick={() => handleCambiarEstado('FINALIZADO')}
                  className="px-4 py-2 bg-emerald-700 text-white font-black uppercase text-xs flex items-center gap-1.5 hover:bg-emerald-800 cursor-pointer"
                >
                  <CheckCircle size={16} /> Finalizar Salida
                </button>
              )}

              {salida.estado === 'FINALIZADO' && (
                <button
                  id="btn-reactivar-salida"
                  type="button"
                  disabled={procesando}
                  onClick={() => handleCambiarEstado('EN_PROCESO')}
                  className="px-4 py-2 bg-amber-600 text-white font-black uppercase text-xs flex items-center gap-1.5 hover:bg-amber-700 cursor-pointer"
                >
                  <RotateCcw size={16} /> Reactivar
                </button>
              )}

              {salida.estado !== 'CANCELADO' && (
                <button
                  id="btn-cancelar-salida"
                  type="button"
                  disabled={procesando}
                  onClick={() => handleCambiarEstado('CANCELADO')}
                  className="px-3 py-2 border border-rose-600 text-rose-700 font-black uppercase text-xs hover:bg-rose-50 cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-[var(--color-border)] font-black uppercase text-xs hover:bg-black/5 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa del comprobante (hoja, ticket, PDF y WhatsApp) */}
      {vistaPreviaOpen && (
        <VistaPreviaSalida salida={{ ...salida, usuario: empleadoNombre }} empresa={empresa} onCerrar={() => setVistaPreviaOpen(false)} />
      )}

      {/* Modal Devolución */}
      {modalDevolucionOpen && (
        <ModalDevolucion
          salida={salida}
          isOpen={modalDevolucionOpen}
          onClose={() => setModalDevolucionOpen(false)}
          onSuccess={onReload}
        />
      )}
    </>
  );
};
