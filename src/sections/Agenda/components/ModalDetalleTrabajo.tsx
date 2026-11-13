import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  PackageOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { badgeEstado, badgePrioridad } from './TarjetaTrabajo';
import type { Trabajo, EstadoTrabajo } from '../types';

interface ModalDetalleTrabajoProps {
  trabajo: Trabajo | null;
  onClose: () => void;
  onEditar: (t: Trabajo) => void;
  onGenerarSalida: (t: Trabajo) => void;
  onEstadoCambiado: () => void;
  onEliminado: () => void;
}

export const ModalDetalleTrabajo: React.FC<ModalDetalleTrabajoProps> = ({
  trabajo,
  onClose,
  onEditar,
  onGenerarSalida,
  onEstadoCambiado,
  onEliminado,
}) => {
  useCerrarConEscape(!!trabajo, onClose);
  const [actualizando, setActualizando] = useState(false);

  if (!trabajo) return null;

  const est = badgeEstado(trabajo.estado);
  const prioClase = badgePrioridad(trabajo.prioridad);

  const horaTexto = trabajo.hora_inicio
    ? `${trabajo.hora_inicio.slice(0, 5)}${trabajo.hora_fin ? ` - ${trabajo.hora_fin.slice(0, 5)}` : ''}`
    : 'Todo el día';

  const mapsUrl = trabajo.ubicacion
    ? trabajo.ubicacion
    : trabajo.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trabajo.direccion)}`
    : null;

  const handleCambiarEstado = async (nuevoEstado: EstadoTrabajo) => {
    if (trabajo.estado === nuevoEstado) return;
    setActualizando(true);
    try {
      const { error } = await supabase
        .from('agenda_trabajos')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', trabajo.id);

      if (error) throw error;
      onEstadoCambiado();
    } catch (err: any) {
      console.error('Error cambiando estado del trabajo:', err);
      avisar(`Error: ${err.message || 'No se pudo actualizar el estado'}`);
    } finally {
      setActualizando(false);
    }
  };

  const handleEliminar = async () => {
    const si = await confirmar(`¿Estás seguro de eliminar el trabajo "${trabajo.titulo}"?`);
    if (!si) return;

    setActualizando(true);
    try {
      const { error } = await supabase
        .from('agenda_trabajos')
        .delete()
        .eq('id', trabajo.id);

      if (error) throw error;
      onEliminado();
      onClose();
    } catch (err: any) {
      console.error('Error eliminando trabajo:', err);
      avisar(`Error: ${err.message || 'No se pudo eliminar el trabajo'}`);
    } finally {
      setActualizando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm font-mono"
    >
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Detalle del Trabajo #{trabajo.id}
              </h2>
              <p className="ventana-cabecera__subtitulo truncate max-w-xs sm:max-w-md">
                {trabajo.titulo}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-detalle"
            type="button"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Título y Estado */}
          <div className="flex flex-col gap-1.5 pb-2 border-b border-[var(--color-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`px-2 py-0.5 text-xs font-black uppercase border ${est.clase}`}>
                {est.icono}
                {est.texto}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[var(--color-ink)]">
                  {trabajo.fecha} ({horaTexto})
                </span>
                {trabajo.prioridad !== 'NORMAL' && (
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-black ${prioClase}`}>
                    {trabajo.prioridad}
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-base font-black uppercase text-[var(--color-ink)] leading-snug">
              {trabajo.titulo}
            </h1>
          </div>

          {/* Selector Rápido de Estado */}
          <div className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
              Cambiar Estado del Trabajo:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                id="btn-estado-pendiente"
                type="button"
                disabled={actualizando || trabajo.estado === 'PENDIENTE'}
                onClick={() => handleCambiarEstado('PENDIENTE')}
                className={`py-1 px-2 text-xs font-bold uppercase border rounded-none cursor-pointer transition-colors ${
                  trabajo.estado === 'PENDIENTE'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white hover:bg-amber-50 text-[var(--color-ink)] border-[var(--color-border)]'
                }`}
              >
                Pendiente
              </button>
              <button
                id="btn-estado-seguimiento"
                type="button"
                disabled={actualizando || trabajo.estado === 'SEGUIMIENTO'}
                onClick={() => handleCambiarEstado('SEGUIMIENTO')}
                className={`py-1 px-2 text-xs font-bold uppercase border rounded-none cursor-pointer transition-colors ${
                  trabajo.estado === 'SEGUIMIENTO'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white hover:bg-blue-50 text-[var(--color-ink)] border-[var(--color-border)]'
                }`}
              >
                Volver a ir
              </button>
              <button
                id="btn-estado-completado"
                type="button"
                disabled={actualizando || trabajo.estado === 'COMPLETADO'}
                onClick={() => handleCambiarEstado('COMPLETADO')}
                className={`py-1 px-2 text-xs font-bold uppercase border rounded-none cursor-pointer transition-colors ${
                  trabajo.estado === 'COMPLETADO'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white hover:bg-emerald-50 text-[var(--color-ink)] border-[var(--color-border)]'
                }`}
              >
                Completado
              </button>
              <button
                id="btn-estado-cancelado"
                type="button"
                disabled={actualizando || trabajo.estado === 'CANCELADO'}
                onClick={() => handleCambiarEstado('CANCELADO')}
                className={`py-1 px-2 text-xs font-bold uppercase border rounded-none cursor-pointer transition-colors ${
                  trabajo.estado === 'CANCELADO'
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white hover:bg-red-50 text-[var(--color-ink)] border-[var(--color-border)]'
                }`}
              >
                Cancelado
              </button>
            </div>
          </div>

          {/* Ficha Cliente & Bien */}
          {(trabajo.customer || trabajo.bien) && (
            <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                Cliente y Ubicación
              </span>

              {trabajo.customer && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-black text-sm text-[var(--color-ink)]">
                    <User size={15} className="text-[var(--color-accent)] shrink-0" />
                    <span>{trabajo.customer.name}</span>
                  </div>
                  {trabajo.customer.telefono && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${trabajo.customer.telefono}`}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-[var(--color-border)] text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-none"
                      >
                        <Phone size={12} />
                        {trabajo.customer.telefono}
                      </a>
                      <a
                        href={`https://wa.me/51${trabajo.customer.telefono.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-none"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {trabajo.bien && (
                <div className="p-2 bg-amber-50/60 border border-amber-200 text-xs">
                  <span className="font-bold text-[var(--color-accent-dark)] uppercase">
                    Lo que se atiende:
                  </span>{' '}
                  <span className="font-black text-[var(--color-ink)]">
                    {trabajo.bien.tipo} — {trabajo.bien.nombre}
                  </span>
                </div>
              )}

              {/* Dirección y Mapa */}
              {(trabajo.direccion || mapsUrl) && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--color-muted)] truncate">
                    <MapPin size={13} className="shrink-0 text-[var(--color-ink)]" />
                    <span className="truncate">{trabajo.direccion || 'Ubicación registrada'}</span>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-none shrink-0"
                    >
                      <ExternalLink size={12} />
                      Abrir Mapa
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Técnicos Asignados */}
          {trabajo.trabajadores && trabajo.trabajadores.length > 0 && (
            <div className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                Técnicos Asignados ({trabajo.trabajadores.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {trabajo.trabajadores.map((t) => (
                  <span
                    key={t.id || t.trabajador_id}
                    className="px-2 py-0.5 bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase"
                  >
                    {t.trabajador?.nombre || 'Técnico'} {t.trabajador?.cargo ? `(${t.trabajador.cargo})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción / Notas */}
          {trabajo.descripcion && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                Descripción
              </span>
              <p className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                {trabajo.descripcion}
              </p>
            </div>
          )}

          {trabajo.notas && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                Notas Internas
              </span>
              <p className="p-2.5 bg-amber-50/40 border border-amber-200 text-xs text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                {trabajo.notas}
              </p>
            </div>
          )}

          {/* Salida de Materiales vinculada si existe */}
          {trabajo.salida_id && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">
                ✓ Salida de materiales generada (Salida #{trabajo.salida_id})
              </span>
            </div>
          )}
        </div>

        {/* Botones del Pie */}
        <div className="p-3 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              id="btn-eliminar-trabajo"
              type="button"
              disabled={actualizando}
              onClick={handleEliminar}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold uppercase border border-red-300 cursor-pointer rounded-none"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
            <button
              id="btn-editar-trabajo"
              type="button"
              disabled={actualizando}
              onClick={() => {
                onEditar(trabajo);
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-[var(--color-ink)] text-xs font-bold uppercase border border-[var(--color-border)] cursor-pointer rounded-none"
            >
              <Edit2 size={14} />
              Editar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-generar-salida"
              type="button"
              disabled={actualizando}
              onClick={() => {
                onGenerarSalida(trabajo);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-xs font-black uppercase border border-[var(--color-accent-dark)] cursor-pointer rounded-none active:scale-[0.98]"
            >
              <PackageOpen size={15} />
              Generar Salida de Material
            </button>

            <button
              id="btn-cerrar-detalle-pie"
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-[var(--color-border)] bg-white text-xs font-bold uppercase text-[var(--color-ink)] hover:bg-slate-100 cursor-pointer rounded-none"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
