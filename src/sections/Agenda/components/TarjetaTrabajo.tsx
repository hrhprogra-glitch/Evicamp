import React from 'react';
import {
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Phone,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import type { Trabajo, EstadoTrabajo, PrioridadTrabajo } from '../types';

interface TarjetaTrabajoProps {
  trabajo: Trabajo;
  onClick: () => void;
  tabIndex?: number;
}

export const badgeEstado = (estado: EstadoTrabajo) => {
  switch (estado) {
    case 'PENDIENTE':
      return {
        texto: 'Pendiente',
        clase: 'bg-amber-100 text-amber-900 border-amber-300',
        icono: <Clock size={12} />,
      };
    case 'SEGUIMIENTO':
      return {
        texto: 'Volver a ir',
        clase: 'bg-blue-100 text-blue-900 border-blue-400 font-black',
        icono: <RotateCcw size={12} />,
      };
    case 'COMPLETADO':
      return {
        texto: 'Completado',
        clase: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        icono: <CheckCircle2 size={12} />,
      };
    case 'CANCELADO':
      return {
        texto: 'Cancelado',
        clase: 'bg-red-100 text-red-800 border-red-300',
        icono: <XCircle size={12} />,
      };
  }
};

export const badgePrioridad = (prioridad: PrioridadTrabajo) => {
  switch (prioridad) {
    case 'URGENTE':
      return 'bg-red-600 text-white font-black';
    case 'ALTA':
      return 'bg-amber-500 text-white font-bold';
    case 'NORMAL':
      return 'bg-slate-200 text-slate-800';
    case 'BAJA':
      return 'bg-slate-100 text-slate-600';
  }
};

export const TarjetaTrabajo: React.FC<TarjetaTrabajoProps> = ({
  trabajo,
  onClick,
  tabIndex = 0,
}) => {
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

  return (
    <div
      id={`tarjeta-trabajo-${trabajo.id}`}
      data-tarjeta-trabajo="true"
      data-trabajo-id={trabajo.id}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-ink)] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer rounded-none transition-all flex flex-col gap-2 font-mono outline-none group"
    >
      {/* Encabezado: Hora, Prioridad y Estado */}
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-[var(--color-ink)]">
          <Clock size={12} className="text-[var(--color-muted)]" />
          <span>{horaTexto}</span>
          {trabajo.prioridad !== 'NORMAL' && (
            <span className={`px-1.5 py-0.2 text-[9px] uppercase tracking-wider ${prioClase}`}>
              {trabajo.prioridad}
            </span>
          )}
        </div>

        <span
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase font-bold border ${est.clase}`}
        >
          {est.icono}
          {est.texto}
        </span>
      </div>

      {/* Título */}
      <h3 className="text-xs font-black uppercase text-[var(--color-ink)] group-hover:text-[var(--color-accent-dark)] line-clamp-2 leading-snug">
        {trabajo.titulo}
      </h3>

      {/* Cliente y Bien */}
      {(trabajo.customer || trabajo.bien) && (
        <div className="text-[11px] text-[var(--color-muted)] flex flex-col gap-1 border-t border-[var(--color-border)] pt-1.5">
          {trabajo.customer && (
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0 font-semibold text-[var(--color-ink)]">
                <User size={11} className="shrink-0 text-[var(--color-muted)]" />
                <span className="truncate">{trabajo.customer.name}</span>
              </div>
              {trabajo.customer.telefono && (
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`tel:${trabajo.customer.telefono}`}
                    title="Llamar al cliente"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 bg-white border border-[var(--color-border)] text-emerald-700 hover:bg-emerald-50 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <Phone size={11} />
                  </a>
                  <a
                    href={`https://wa.me/51${trabajo.customer.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp al cliente"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <MessageCircle size={11} />
                  </a>
                </div>
              )}
            </div>
          )}
          {trabajo.bien && (
            <div className="text-[10px] font-bold text-[var(--color-accent-dark)] truncate">
              ↳ {trabajo.bien.tipo}: {trabajo.bien.nombre}
            </div>
          )}
        </div>
      )}

      {/* Dirección y Mapa */}
      {(trabajo.direccion || mapsUrl) && (
        <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--color-muted)] border-t border-dashed border-[var(--color-border)] pt-1">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin size={10} className="shrink-0 text-[var(--color-ink)]" />
            <span className="truncate">{trabajo.direccion || 'Ubicación registrada'}</span>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Google Maps"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-none shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <ExternalLink size={9} />
              <span>Mapa</span>
            </a>
          )}
        </div>
      )}

      {/* Trabajadores asignados */}
      {trabajo.trabajadores && trabajo.trabajadores.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5 pt-1 border-t border-dashed border-[var(--color-border)]">
          {trabajo.trabajadores.map((t) => (
            <span
              key={t.id || t.trabajador_id}
              className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-[9px] font-bold uppercase truncate max-w-[120px]"
            >
              {t.trabajador?.nombre || 'Técnico'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
