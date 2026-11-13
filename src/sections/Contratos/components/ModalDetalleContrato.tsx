import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Repeat, User, MapPin, Plus, CheckCircle, Clock, AlertTriangle, Edit3, Pause, Play, FlaskConical } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import type { Contrato, VisitaContrato, CobroContrato } from '../types';
import { ModalRegistrarConsumo } from './ModalRegistrarConsumo';
import { ModalRegistrarPago } from './ModalRegistrarPago';

interface ModalDetalleContratoProps {
  contrato: Contrato;
  onClose: (actualizado?: boolean) => void;
  onEditar: (contrato: Contrato) => void;
}

export const ModalDetalleContrato: React.FC<ModalDetalleContratoProps> = ({
  contrato,
  onClose,
  onEditar,
}) => {
  useCerrarConEscape(true, () => onClose());

  const [pestaña, setPestaña] = useState<'visitas' | 'cobros'>('visitas');
  const [visitas, setVisitas] = useState<VisitaContrato[]>([]);
  const [cobros, setCobros] = useState<CobroContrato[]>([]);
  const [cargando, setCargando] = useState(true);

  const [visitaParaConsumo, setVisitaParaConsumo] = useState<VisitaContrato | null>(null);
  const [cobroParaPago, setCobroParaPago] = useState<CobroContrato | null>(null);

  useEffect(() => {
    cargarDetalles();
  }, [contrato.id]);

  const cargarDetalles = async () => {
    setCargando(true);
    try {
      const [resVis, resCob] = await Promise.all([
        supabase
          .from('contrato_visitas')
          .select('*, tecnico:trabajadores(id, nombre), consumos:contrato_consumos(*)')
          .eq('contrato_id', contrato.id)
          .order('fecha_programada', { ascending: false }),
        supabase
          .from('contrato_cobros')
          .select('*')
          .eq('contrato_id', contrato.id)
          .order('fecha_vencimiento', { ascending: false }),
      ]);

      if (resVis.data) setVisitas(resVis.data);
      if (resCob.data) setCobros(resCob.data);
    } catch (err) {
      console.error('Error cargando detalles del contrato:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleGenerarVisitas = async () => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // 1-12

    const si = await confirmar(`¿Deseas generar automáticamente las visitas para el mes ${mes}/${anio}? Se sincronizarán con la Agenda.`);
    if (!si) return;

    try {
      const { data, error } = await supabase.rpc('fn_generar_visitas_contrato', {
        p_contrato_id: contrato.id,
        p_anio: anio,
        p_mes: mes,
      });

      if (error) throw error;
      avisar(`Se crearon ${data?.visitas_creadas || 0} visitas para este mes en el Contrato y en la Agenda.`);
      cargarDetalles();
    } catch (err: any) {
      console.error('Error generando visitas:', err);
      avisar('Error al generar visitas: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleEmitirPeriodo = async () => {
    const ahora = new Date();
    const mesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodoNombre = `${mesNombres[ahora.getMonth()]} ${ahora.getFullYear()}`;

    // Validar si ya existe este período
    const existe = cobros.some((c) => c.periodo.toLowerCase() === periodoNombre.toLowerCase());
    if (existe) {
      const reemitir = await confirmar(`Ya existe un cobro para el período "${periodoNombre}". ¿Deseas emitir otro adicional?`);
      if (!reemitir) return;
    }

    const fechaEmision = ahora.toISOString().slice(0, 10);
    const diaC = Math.max(1, Math.min(28, contrato.dia_cobro || 1));
    const fechaVenc = new Date(ahora.getFullYear(), ahora.getMonth(), diaC).toISOString().slice(0, 10);

    try {
      const { error } = await supabase.from('contrato_cobros').insert([
        {
          contrato_id: contrato.id,
          customer_id: contrato.customer_id,
          periodo: periodoNombre,
          monto: contrato.precio_periodo,
          moneda: contrato.moneda,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVenc,
          estado: 'PENDIENTE',
          monto_pagado: 0,
        },
      ]);

      if (error) throw error;
      avisar(`Período "${periodoNombre}" emitido correctamente.`);
      cargarDetalles();
    } catch (err: any) {
      console.error('Error emitiendo período:', err);
      avisar('Error al emitir período: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleCambiarEstadoVisita = async (visitaId: number, nuevoEstado: string) => {
    try {
      const updates: any = { estado: nuevoEstado, updated_at: new Date().toISOString() };
      if (nuevoEstado === 'REALIZADO') {
        updates.fecha_ejecutada = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from('contrato_visitas').update(updates).eq('id', visitaId);
      if (error) throw error;
      avisar(`Visita marcada como ${nuevoEstado}.`);
      cargarDetalles();
    } catch (err: any) {
      console.error('Error actualizando visita:', err);
      avisar('Error: ' + err.message);
    }
  };

  const handleToggleEstadoContrato = async () => {
    const nuevo = contrato.estado === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    const si = await confirmar(`¿Cambiar estado del contrato a "${nuevo}"?`);
    if (!si) return;

    try {
      const { error } = await supabase.from('contratos').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', contrato.id);
      if (error) throw error;
      avisar(`Contrato ahora está ${nuevo}.`);
      onClose(true);
    } catch (err: any) {
      console.error('Error actualizando contrato:', err);
      avisar('Error: ' + err.message);
    }
  };

  const totalFacturado = cobros.reduce((acc, c) => acc + Number(c.monto || 0), 0);
  const totalPagado = cobros.reduce((acc, c) => acc + Number(c.monto_pagado || 0), 0);
  const deudaTotal = Math.max(0, totalFacturado - totalPagado);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-detalle-contrato"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-4xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <span className="font-mono text-xs font-black">{contrato.codigo.replace('CTR-', '')}</span>
            </div>
            <div>
              <h2 id="modal-titulo-detalle-contrato" className="ventana-cabecera__titulo truncate max-w-md">
                {contrato.codigo} · {contrato.titulo}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Cliente: {contrato.customer?.name || 'Cliente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-editar-contrato-modal"
              onClick={() => onEditar(contrato)}
              className="px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border border-[var(--color-border)] text-[var(--color-ink)] bg-[var(--color-surface)] hover:border-[var(--color-ink)] flex items-center gap-1.5 transition-colors rounded-none"
            >
              <Edit3 size={14} />
              <span>Editar</span>
            </button>

            <button
              id="btn-cerrar-detalle-contrato"
              onClick={() => onClose()}
              className="ventana-cerrar"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Resumen Ficha Superior */}
        <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs shrink-0">
          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Cliente</span>
            <span className="font-bold text-[var(--color-ink)] block truncate">{contrato.customer?.name || 'Cliente'}</span>
            {contrato.bien && (
              <span className="text-[var(--color-muted)] block text-[11px] truncate">
                {contrato.bien.nombre} ({contrato.bien.tipo})
              </span>
            )}
          </div>

          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Frecuencia / Cobro</span>
            <span className="font-bold text-[var(--color-ink)] block">
              {contrato.frecuencia} · Día {contrato.dia_cobro}
            </span>
            <span className="text-sm font-black text-[var(--color-ink)]">
              S/ {Number(contrato.precio_periodo).toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Técnico Principal</span>
            <span className="font-bold text-[var(--color-ink)] block truncate">
              {contrato.tecnico?.nombre || 'Sin asignar'}
            </span>
            <span className="text-[var(--color-muted)] block text-[11px]">
              Desde {contrato.fecha_inicio} {contrato.fecha_fin ? `hasta ${contrato.fecha_fin}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Estado & Deuda</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`px-2 py-0.5 font-bold uppercase text-[10px] ${
                  contrato.estado === 'ACTIVO'
                    ? 'bg-green-100 text-green-900 border border-green-400'
                    : 'bg-yellow-100 text-yellow-900 border border-yellow-400'
                }`}
              >
                {contrato.estado}
              </span>
              <span className={`font-black text-xs ${deudaTotal > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {deudaTotal > 0 ? `Debe S/ ${deudaTotal.toFixed(2)}` : 'Al día'}
              </span>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación Interna */}
        <div className="flex items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
          <div className="flex gap-2">
            <button
              id="tab-modal-visitas"
              onClick={() => setPestaña('visitas')}
              className={`h-10 px-4 font-mono text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                pestaña === 'visitas'
                  ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Calendar size={14} />
              <span>Visitas ({visitas.length})</span>
            </button>

            <button
              id="tab-modal-cobros"
              onClick={() => setPestaña('cobros')}
              className={`h-10 px-4 font-mono text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                pestaña === 'cobros'
                  ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <DollarSign size={14} />
              <span>Cobros y Períodos ({cobros.length})</span>
            </button>
          </div>

          <div className="py-2">
            {pestaña === 'visitas' ? (
              <button
                id="btn-generar-visitas-mes"
                onClick={handleGenerarVisitas}
                className="h-8 px-3 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Generar Visitas de este Mes</span>
              </button>
            ) : (
              <button
                id="btn-emitir-periodo"
                onClick={handleEmitirPeriodo}
                className="h-8 px-3 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Emitir Período de Cobro</span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido de la pestaña */}
        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="p-8 text-center font-mono text-xs text-[var(--color-muted)]">Cargando información...</div>
          ) : pestaña === 'visitas' ? (
            /* LISTA DE VISITAS */
            visitas.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] font-mono">
                <Calendar size={32} className="mx-auto mb-2 text-[var(--color-muted)]" />
                <p className="text-sm font-bold text-[var(--color-ink)] uppercase">No hay visitas programadas aún</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Usa el botón "Generar Visitas de este Mes" para crearlas automáticamente según la frecuencia ({contrato.frecuencia}).
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {visitas.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-ink)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--color-ink)]">{v.fecha_programada}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                            v.estado === 'REALIZADO'
                              ? 'bg-green-100 text-green-900 border-green-400'
                              : v.estado === 'CANCELADO'
                              ? 'bg-red-100 text-red-900 border-red-400'
                              : 'bg-yellow-100 text-yellow-900 border-yellow-400'
                          }`}
                        >
                          {v.estado}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        <span>Técnico: </span>
                        <span className="text-[var(--color-ink)] font-bold">{v.tecnico?.nombre || 'Sin asignar'}</span>
                        {v.fecha_ejecutada && (
                          <span className="ml-2 text-green-700 font-bold">· Ejecutada el {v.fecha_ejecutada}</span>
                        )}
                      </div>

                      {/* Consumos registrados */}
                      {v.consumos && v.consumos.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex flex-wrap gap-2 text-[11px]">
                          <span className="text-[var(--color-muted)] font-bold">Insumos usados:</span>
                          {v.consumos.map((c) => (
                            <span key={c.id} className="px-2 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] font-bold">
                              {c.descripcion} ({c.cantidad} {c.unidad})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones de la Visita */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`btn-consumo-visita-${v.id}`}
                        onClick={() => setVisitaParaConsumo(v)}
                        className="h-8 px-2.5 border border-[var(--color-border)] hover:border-[var(--color-ink)] font-mono text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5 transition-colors"
                      >
                        <FlaskConical size={13} />
                        <span>Insumos</span>
                      </button>

                      {v.estado === 'PENDIENTE' && (
                        <button
                          id={`btn-realizar-visita-${v.id}`}
                          onClick={() => handleCambiarEstadoVisita(v.id, 'REALIZADO')}
                          className="h-8 px-2.5 bg-green-700 text-white hover:bg-green-800 font-mono text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle size={13} />
                          <span>Marcar Lista</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* LISTA DE COBROS */
            cobros.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] font-mono">
                <DollarSign size={32} className="mx-auto mb-2 text-[var(--color-muted)]" />
                <p className="text-sm font-bold text-[var(--color-ink)] uppercase">No hay períodos de cobro emitidos</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Usa el botón "Emitir Período de Cobro" para generar la cuota correspondiente a este mes.
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {cobros.map((c) => {
                  const saldo = Math.max(0, c.monto - (c.monto_pagado || 0));
                  return (
                    <div
                      key={c.id}
                      className="p-3 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-ink)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--color-ink)]">{c.periodo}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                              c.estado === 'PAGADO'
                                ? 'bg-green-100 text-green-900 border-green-400'
                                : c.estado === 'PARCIAL'
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-400'
                                : 'bg-red-100 text-red-900 border-red-400'
                            }`}
                          >
                            {c.estado}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--color-muted)]">
                          <span>Monto: </span>
                          <span className="font-bold text-[var(--color-ink)]">S/ {Number(c.monto).toFixed(2)}</span>
                          <span className="mx-2">·</span>
                          <span>Pagado: </span>
                          <span className="font-bold text-green-700">S/ {Number(c.monto_pagado || 0).toFixed(2)}</span>
                          {saldo > 0 && (
                            <>
                              <span className="mx-2">·</span>
                              <span className="text-red-700 font-bold">Resta: S/ {saldo.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                        {c.fecha_pago && (
                          <div className="text-[11px] text-[var(--color-muted)]">
                            Pagado el {c.fecha_pago} {c.metodo_pago ? `vía ${c.metodo_pago}` : ''} {c.referencia_pago ? `(Ref: ${c.referencia_pago})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {c.estado !== 'PAGADO' && (
                          <button
                            id={`btn-pagar-cobro-${c.id}`}
                            onClick={() => setCobroParaPago(c)}
                            className="h-8 px-3 bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                          >
                            <DollarSign size={14} />
                            <span>Registrar Cobro</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Pie */}
        <div className="h-12 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleToggleEstadoContrato}
            className="h-8 px-3 font-mono text-xs font-bold border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] flex items-center gap-1.5 transition-colors"
          >
            {contrato.estado === 'ACTIVO' ? <Pause size={13} /> : <Play size={13} />}
            <span>{contrato.estado === 'ACTIVO' ? 'Pausar Contrato' : 'Reactivar Contrato'}</span>
          </button>

          <button
            type="button"
            onClick={() => onClose()}
            className="h-8 px-4 font-mono text-xs font-bold uppercase tracking-wider bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Sub-modales */}
      {visitaParaConsumo && (
        <ModalRegistrarConsumo
          visita={visitaParaConsumo}
          onClose={(g) => {
            setVisitaParaConsumo(null);
            if (g) cargarDetalles();
          }}
        />
      )}

      {cobroParaPago && (
        <ModalRegistrarPago
          cobro={cobroParaPago}
          onClose={(g) => {
            setCobroParaPago(null);
            if (g) cargarDetalles();
          }}
        />
      )}
    </div>
  );
};
