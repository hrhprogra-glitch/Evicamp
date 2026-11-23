// src/sections/Taller/components/HeaderTaller.tsx
// Cabecera del módulo Taller: cuadros de conteo arriba, buscador y filtro de estado en estilo SiuMax Sobrio

import React from 'react';
import { Wrench, Plus, Search, X } from 'lucide-react';
import type { TallerOrden } from '../types';

interface Props {
  ordenes: TallerOrden[];
  filtroEstado: string;
  onCambiarFiltroEstado: (estado: string) => void;
  busqueda: string;
  onCambiarBusqueda: (busqueda: string) => void;
  onNuevaOrden: () => void;
}

const ESTADOS_FILTRO: { clave: string; label: string }[] = [
  { clave: 'TODOS', label: 'Todos los estados' },
  { clave: 'RECIBIDO', label: 'Recibidos' },
  { clave: 'DIAGNOSTICO', label: 'Diagnóstico' },
  { clave: 'EN_PROCESO', label: 'En proceso' },
  { clave: 'LISTO', label: 'Listos' },
  { clave: 'ENTREGADO', label: 'Entregados' },
];

export const HeaderTaller: React.FC<Props> = ({
  ordenes,
  filtroEstado,
  onCambiarFiltroEstado,
  busqueda,
  onCambiarBusqueda,
  onNuevaOrden,
}) => {
  // KPIs
  const enTaller = ordenes.filter((o) => ['RECIBIDO', 'DIAGNOSTICO', 'PRESUPUESTADO', 'EN_PROCESO'].includes(o.estado)).length;
  const listos = ordenes.filter((o) => o.estado === 'LISTO').length;
  const entregados = ordenes.filter((o) => o.estado === 'ENTREGADO').length;
  const saldoPorCobrar = ordenes
    .filter((o) => o.estado !== 'CANCELADO')
    .reduce((acc, o) => acc + (Number(o.saldo) || 0), 0);

  // Cuadros de conteo, pequeños y en la cabecera (como en Salidas; pedido del dueño 11/11/2026)
  const cuadros = [
    { label: 'En taller', valor: String(enTaller), color: 'var(--color-warning-dark)', ayuda: 'Equipos en proceso' },
    { label: 'Listos', valor: String(listos), color: 'var(--color-success)', ayuda: 'Pendientes de retiro' },
    { label: 'Entregados', valor: String(entregados), color: 'var(--color-info)', ayuda: 'Con garantía activa' },
    { label: 'Por cobrar', valor: `S/ ${saldoPorCobrar.toFixed(2)}`, color: 'var(--color-danger)', ayuda: 'Saldo pendiente en taller' },
  ];

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* CABECERA (como Inventario y Clientes): título, cuadros de conteo y botón a la derecha */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 max-w-full flex-wrap">
          {/* Título de la Sección */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[2px_2px_0_0_var(--color-accent)] rounded-none shrink-0">
              <Wrench size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Taller
            </h1>
          </div>

          {/* Cuadros de conteo al lado del título */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {cuadros.map((q) => (
              <div key={q.label} title={q.ayuda} className="tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 text-center min-w-[75px] sm:min-w-[90px]">
                <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: q.color }}>{q.label}</p>
                <p className="text-base sm:text-lg font-black leading-tight whitespace-nowrap" style={{ color: q.color }}>{q.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Acción a la Derecha */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-nueva-orden-taller"
            type="button"
            onClick={onNuevaOrden}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none whitespace-nowrap"
          >
            <Plus size={16} /> Recibir equipo
          </button>
        </div>
      </div>

      {/* SUB-BARRA: Buscador y filtro de estado en una fila limpia */}
      <div className="flex flex-col xl:flex-row gap-2.5 sm:gap-3 items-stretch xl:items-center justify-between shrink-0">
        {/* Buscador Sobrio */}
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            id="buscador-taller"
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            placeholder="BUSCAR ORDEN (ORD-...), CLIENTE, EQUIPO, MARCA, SERIE O FALLA..."
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <button
                type="button"
                className="buscador-sobrio__borrar"
                onClick={() => onCambiarBusqueda('')}
                title="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Filtro de estado */}
        <div className="w-full xl:w-auto shrink-0">
          <select
            id="filtro-estado-taller"
            value={filtroEstado}
            onChange={(e) => onCambiarFiltroEstado(e.target.value)}
            className="filtro-sobrio w-full sm:w-auto"
          >
            {ESTADOS_FILTRO.map((item) => (
              <option key={item.clave} value={item.clave}>{item.label.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
