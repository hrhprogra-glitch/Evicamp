// src/sections/Taller/components/TablaTaller.tsx
// Lista de órdenes de trabajo en el taller con navegación por teclado

import React from 'react';
import { Wrench, Phone, Calendar, ArrowRight, Eye, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { TallerOrden, EstadoOrdenTaller } from '../types';

interface Props {
  ordenes: TallerOrden[];
  onSeleccionarOrden: (orden: TallerOrden) => void;
}

const colorEstado = (estado: EstadoOrdenTaller) => {
  switch (estado) {
    case 'RECIBIDO':
      return 'bg-blue-100 text-blue-900 border-blue-900';
    case 'DIAGNOSTICO':
      return 'bg-purple-100 text-purple-900 border-purple-900';
    case 'PRESUPUESTADO':
      return 'bg-amber-100 text-amber-900 border-amber-900';
    case 'EN_PROCESO':
      return 'bg-yellow-100 text-yellow-900 border-yellow-900';
    case 'LISTO':
      return 'bg-emerald-100 text-emerald-900 border-emerald-900';
    case 'ENTREGADO':
      return 'bg-slate-200 text-slate-800 border-slate-800';
    case 'CANCELADO':
      return 'bg-red-100 text-red-900 border-red-900';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-800';
  }
};

const labelEstado = (estado: EstadoOrdenTaller) => {
  switch (estado) {
    case 'RECIBIDO':
      return 'Recibido';
    case 'DIAGNOSTICO':
      return 'En Diagnóstico';
    case 'PRESUPUESTADO':
      return 'Presupuestado';
    case 'EN_PROCESO':
      return 'En Reparación';
    case 'LISTO':
      return 'Listo / Retirar';
    case 'ENTREGADO':
      return 'Entregado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return estado;
  }
};

export const TablaTaller: React.FC<Props> = ({ ordenes, onSeleccionarOrden }) => {
  if (ordenes.length === 0) {
    return (
      <div className="vacio-sobrio border-2 border-dashed border-[var(--color-border)] p-12 bg-[var(--color-surface)]">
        <Wrench size={32} />
        <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">
          No hay órdenes de reparación registradas
        </p>
        <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">
          Usa el botón "+ Recibir equipo" para registrar un nuevo ingreso al taller.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-2 border-[var(--color-ink)] bg-[var(--color-surface)] font-mono shadow-[3px_3px_0_0_var(--color-ink)]">
      <table className="w-full text-xs text-left" id="tabla-ordenes-taller">
        <thead className="bg-[var(--color-ink)] text-white text-[10px] font-black uppercase tracking-widest border-b-2 border-[var(--color-ink)]">
          <tr>
            <th className="p-2.5">Código / Fecha</th>
            <th className="p-2.5">Cliente</th>
            <th className="p-2.5">Equipo & Falla</th>
            <th className="p-2.5">Técnico</th>
            <th className="p-2.5 text-right">Total / Saldo</th>
            <th className="p-2.5 text-center">Estado</th>
            <th className="p-2.5 text-center w-16">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {ordenes.map((o, idx) => {
            const fechaStr = new Date(o.fecha_ingreso).toLocaleDateString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const tieneSaldo = Number(o.saldo) > 0;

            return (
              <tr
                key={o.id}
                id={`fila-orden-${o.id}`}
                data-nav={`${idx + 1},0`}
                tabIndex={0}
                onClick={() => onSeleccionarOrden(o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSeleccionarOrden(o);
                  }
                }}
                className="hover:bg-[var(--color-bg)] focus:bg-[var(--color-accent-bg)] focus:outline-none cursor-pointer transition-colors"
              >
                {/* Código y Fecha */}
                <td className="p-2.5 whitespace-nowrap">
                  <div className="font-black text-[var(--color-ink)] text-xs flex items-center gap-1">
                    {o.codigo}
                    {o.prioridad === 'URGENTE' && (
                      <span className="px-1 py-0.2 bg-red-600 text-white text-[9px] font-black uppercase">
                        Urgente
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {fechaStr}
                  </div>
                </td>

                {/* Cliente */}
                <td className="p-2.5">
                  <div className="font-black text-[var(--color-ink)] uppercase">
                    {o.customer?.name || 'Cliente sin nombre'}
                  </div>
                  {o.customer?.telefono && (
                    <div className="text-[10px] font-bold text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {o.customer.telefono}
                    </div>
                  )}
                </td>

                {/* Equipo y Falla */}
                <td className="p-2.5 max-w-xs">
                  <div className="font-black text-[var(--color-ink)] truncate uppercase">
                    {o.tipo_equipo} {o.marca ? `· ${o.marca}` : ''} {o.modelo || ''}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--color-muted)] truncate mt-0.5">
                    Falla: {o.falla_reportada}
                  </div>
                </td>

                {/* Técnico */}
                <td className="p-2.5 whitespace-nowrap">
                  <div className="font-black text-[var(--color-ink)]">
                    {o.tecnico?.nombre || <span className="text-[var(--color-muted)] italic">Sin asignar</span>}
                  </div>
                  {o.fecha_prometida && (
                    <div className="text-[9px] font-bold text-[var(--color-muted)] mt-0.5">
                      Promesa: {new Date(o.fecha_prometida).toLocaleDateString('es-PE')}
                    </div>
                  )}
                </td>

                {/* Total / Saldo */}
                <td className="p-2.5 text-right whitespace-nowrap">
                  <div className="font-black text-[var(--color-ink)] text-xs">
                    S/ {Number(o.total || 0).toFixed(2)}
                  </div>
                  <div
                    className={`text-[10px] font-black mt-0.5 ${
                      tieneSaldo ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                    }`}
                  >
                    {tieneSaldo ? `Saldo: S/ ${Number(o.saldo).toFixed(2)}` : 'PAGADO'}
                  </div>
                </td>

                {/* Estado */}
                <td className="p-2.5 text-center whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase tracking-wider ${colorEstado(
                      o.estado
                    )}`}
                  >
                    {labelEstado(o.estado)}
                  </span>
                </td>

                {/* Botón Ver */}
                <td className="p-2.5 text-center">
                  <button
                    type="button"
                    aria-label={`Ver orden ${o.codigo}`}
                    className="p-1 bg-white border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer rounded-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeleccionarOrden(o);
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
