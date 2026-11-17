// src/sections/Taller/components/TablaTaller.tsx
// Lista de órdenes de trabajo en el taller con navegación por teclado.
// Estilo SiuMax Sobrio: mismo marco, cabecera y tamaño de fila que Inventario > Productos.

import React from 'react';
import { Wrench, Phone, Calendar, Eye } from 'lucide-react';
import { PaginacionSobrio } from '../../../components/PaginacionSobrio';
import type { TallerOrden, EstadoOrdenTaller } from '../types';

interface Props {
  ordenes: TallerOrden[];
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  onSeleccionarOrden: (orden: TallerOrden) => void;
}

const colorEstado = (estado: EstadoOrdenTaller) => {
  switch (estado) {
    case 'RECIBIDO': return 'bg-blue-100 text-blue-900 border-blue-900';
    case 'DIAGNOSTICO': return 'bg-purple-100 text-purple-900 border-purple-900';
    case 'PRESUPUESTADO': return 'bg-amber-100 text-amber-900 border-amber-900';
    case 'EN_PROCESO': return 'bg-yellow-100 text-yellow-900 border-yellow-900';
    case 'LISTO': return 'bg-emerald-100 text-emerald-900 border-emerald-900';
    case 'ENTREGADO': return 'bg-slate-200 text-slate-800 border-slate-800';
    case 'CANCELADO': return 'bg-red-100 text-red-900 border-red-900';
    default: return 'bg-gray-100 text-gray-800 border-gray-800';
  }
};

const labelEstado = (estado: EstadoOrdenTaller) => {
  switch (estado) {
    case 'RECIBIDO': return 'Recibido';
    case 'DIAGNOSTICO': return 'En Diagnóstico';
    case 'PRESUPUESTADO': return 'Presupuestado';
    case 'EN_PROCESO': return 'En Reparación';
    case 'LISTO': return 'Listo / Retirar';
    case 'ENTREGADO': return 'Entregado';
    case 'CANCELADO': return 'Cancelado';
    default: return estado;
  }
};

export const TablaTaller: React.FC<Props> = ({ ordenes, pagina, totalPaginas, onCambiarPagina, onSeleccionarOrden }) => {
  const alTeclearFila = (e: React.KeyboardEvent, idx: number, o: TallerOrden) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSeleccionarOrden(o);
    } else if (e.key === 'ArrowDown' && idx === ordenes.length - 1) {
      e.preventDefault();
      document.getElementById('btn-pag-bottom-taller-ant')?.focus();
    } else if (e.key === 'ArrowUp' && idx === 0) {
      e.preventDefault();
      document.getElementById('btn-pag-taller-sig')?.focus();
    }
  };

  return (
    <div className="tabla-marco flex flex-col">
      <PaginacionSobrio
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="taller"
        posicion="top"
        selectorFilas="#tabla-ordenes-taller [data-row='true']"
        idBuscador="buscador-taller"
      />

      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[980px]" id="tabla-ordenes-taller">
          {ordenes.length === 0 ? (
            <div className="vacio-sobrio">
              <Wrench size={32} />
              No hay órdenes de reparación registradas con esos parámetros.
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="tabla-cabecera sticky top-0 z-10">
                <tr>
                  <th className="p-4">Código / Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Equipo & Falla</th>
                  <th className="p-4">Técnico</th>
                  <th className="p-4 text-right">Total / Saldo</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {ordenes.map((o, idx) => {
                  const fechaStr = new Date(o.fecha_ingreso).toLocaleDateString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  });
                  const tieneSaldo = Number(o.saldo) > 0;

                  return (
                    <tr
                      key={o.id}
                      id={`fila-orden-${o.id}`}
                      data-row="true"
                      data-nav={`${idx + 1},0`}
                      tabIndex={0}
                      onClick={() => onSeleccionarOrden(o)}
                      onKeyDown={(e) => alTeclearFila(e, idx, o)}
                      className="tabla-fila h-[79px] cursor-pointer transition-colors"
                    >
                      {/* Código y Fecha */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-black text-[var(--color-ink)] text-xs flex items-center gap-1">
                          {o.codigo}
                          {o.prioridad === 'URGENTE' && (
                            <span className="px-1 py-0.2 bg-red-600 text-white text-[9px] font-black uppercase">Urgente</span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {fechaStr}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="p-4">
                        <div className="font-black text-[var(--color-ink)] uppercase">{o.customer?.name || 'Cliente sin nombre'}</div>
                        {o.customer?.telefono && (
                          <div className="text-[10px] font-bold text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                            <Phone size={11} /> {o.customer.telefono}
                          </div>
                        )}
                      </td>

                      {/* Equipo y Falla */}
                      <td className="p-4 max-w-xs">
                        <div className="font-black text-[var(--color-ink)] truncate uppercase">
                          {o.tipo_equipo} {o.marca ? `· ${o.marca}` : ''} {o.modelo || ''}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-muted)] truncate mt-0.5">Falla: {o.falla_reportada}</div>
                      </td>

                      {/* Técnico */}
                      <td className="p-4 whitespace-nowrap">
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
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="font-black text-[var(--color-ink)] text-xs">S/ {Number(o.total || 0).toFixed(2)}</div>
                        <div className={`text-[10px] font-black mt-0.5 ${tieneSaldo ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                          {tieneSaldo ? `Saldo: S/ ${Number(o.saldo).toFixed(2)}` : 'PAGADO'}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase tracking-wider ${colorEstado(o.estado)}`}>
                          {labelEstado(o.estado)}
                        </span>
                      </td>

                      {/* Botón Ver */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          aria-label={`Ver orden ${o.codigo}`}
                          className="p-1 bg-white border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer rounded-none"
                          onClick={(e) => { e.stopPropagation(); onSeleccionarOrden(o); }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <PaginacionSobrio
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="taller"
        posicion="bottom"
        selectorFilas="#tabla-ordenes-taller [data-row='true']"
        idBuscador="buscador-taller"
      />
    </div>
  );
};
