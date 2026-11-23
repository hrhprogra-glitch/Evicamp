// src/sections/Contratos/components/HeaderContratos.tsx
// Cabecera de Contratos en estilo SiuMax Sobrio (igual que Salidas y Taller, pedido del dueño 11/11/2026):
// cuadros de conteo arriba al lado del título; lo que se ve (Contratos, Visitas, Cobros y períodos) y el estado
// son listas de filtro junto al buscador

import React from 'react';
import { Search, Plus, Repeat, X } from 'lucide-react';

type Vista = 'contratos' | 'visitas' | 'cobros';

interface HeaderContratosProps {
  pestana: Vista;
  onCambiarPestana: (p: Vista) => void;
  busqueda: string;
  onBusquedaChange: (b: string) => void;
  filtroEstado: string;
  onFiltroEstadoChange: (e: string) => void;
  onNuevoContrato: () => void;
  metricas: {
    totalActivos: number;
    deudaTotal: number;
    visitasPendientes: number;
  };
}

// Qué se ve en la tabla (antes eran pestañas)
const VISTAS: { id: Vista; label: string }[] = [
  { id: 'contratos', label: 'Contratos' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'cobros', label: 'Cobros y períodos' },
];

export const HeaderContratos: React.FC<HeaderContratosProps> = ({
  pestana,
  onCambiarPestana,
  busqueda,
  onBusquedaChange,
  filtroEstado,
  onFiltroEstadoChange,
  onNuevoContrato,
  metricas,
}) => {
  const enfocar = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') el.select();
    }
  };

  const focusAbajo = () => {
    const fila = document.querySelector('[data-row="true"], [id^="fila-contrato-"], tbody tr') as HTMLElement | null;
    if (fila) fila.focus();
  };

  // Cuadros de conteo, pequeños y en la cabecera (el nombre largo sale al pasar el mouse)
  const cuadros = [
    { label: 'Activos', valor: String(metricas.totalActivos), color: 'var(--color-ink)', ayuda: 'Contratos activos' },
    { label: 'Por cobrar', valor: 'S/ ' + metricas.deudaTotal.toFixed(2), color: 'var(--color-danger)', ayuda: 'Deuda pendiente de cobro' },
    { label: 'Visitas', valor: String(metricas.visitasPendientes), color: 'var(--color-warning-dark)', ayuda: 'Visitas pendientes' },
  ];

  // Flechas de las listas: ← → entre buscador, vista y estado; ↓ a la tabla; ↑ a "+ Nuevo contrato".
  // (Con la lista cerrada las flechas no cambian la opción y Enter o Espacio la abren: lo hace el teclado general.)
  const teclasFiltro = (izquierda: string, derecha: string | null) => (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar(izquierda); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (derecha) enfocar(derecha); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusAbajo(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('btn-nuevo-contrato'); }
  };

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* CABECERA (como Salidas y Taller): título, cuadros de conteo y botón a la derecha */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 max-w-full flex-wrap">
          {/* Título de la Sección */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[2px_2px_0_0_var(--color-accent)] rounded-none shrink-0">
              <Repeat size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Contratos
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
            id="btn-nuevo-contrato"
            type="button"
            onClick={onNuevoContrato}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                enfocar('buscador-contratos');
              }
            }}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none whitespace-nowrap"
          >
            <Plus size={16} /> Nuevo contrato
          </button>
        </div>
      </div>

      {/* SUB-BARRA: Buscador, lista de vista y lista de estado en una fila limpia */}
      <div className="flex flex-col xl:flex-row gap-2.5 sm:gap-3 items-stretch xl:items-center justify-between shrink-0">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            id="buscador-contratos"
            type="text"
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            placeholder={
              pestana === 'contratos'
                ? 'BUSCAR CONTRATOS, CLIENTES, DIRECCIÓN O PERÍODO...'
                : pestana === 'visitas'
                ? 'BUSCAR VISITAS, CONTRATO, CLIENTE O FECHA...'
                : 'BUSCAR COBROS, PERÍODO, CLIENTE O TÍTULO...'
            }
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' && (e.currentTarget.selectionEnd === busqueda.length || !busqueda)) {
                e.preventDefault();
                enfocar('filtro-vista-contratos');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusAbajo();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                enfocar('btn-nuevo-contrato');
              }
            }}
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <button
                type="button"
                className="buscador-sobrio__borrar"
                onClick={() => {
                  onBusquedaChange('');
                  enfocar('buscador-contratos');
                }}
                title="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
          <select
            id="filtro-vista-contratos"
            value={pestana}
            onChange={(e) => onCambiarPestana(e.target.value as Vista)}
            onKeyDown={teclasFiltro('buscador-contratos', pestana === 'contratos' ? 'filtro-estado-contratos' : null)}
            className="filtro-sobrio w-full sm:w-auto"
          >
            {VISTAS.map((v) => (
              <option key={v.id} value={v.id}>{v.label.toUpperCase()}</option>
            ))}
          </select>

          {/* El estado solo filtra los contratos (las visitas y los cobros no lo usan) */}
          {pestana === 'contratos' && (
            <select
              id="filtro-estado-contratos"
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value)}
              onKeyDown={teclasFiltro('filtro-vista-contratos', null)}
              className="filtro-sobrio w-full sm:w-auto"
            >
              <option value="TODOS">TODOS LOS ESTADOS</option>
              <option value="ACTIVO">ACTIVOS</option>
              <option value="PAUSADO">PAUSADOS</option>
              <option value="FINALIZADO">FINALIZADOS</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
};
