// src/sections/Utilidades/components/FiltrosUtilidades.tsx
import React, { useState, useEffect } from 'react';
import { BarChart3, CalendarDays, Search, RotateCcw } from 'lucide-react';

interface Props {
  fechaInicio: string;
  fechaFin: string;
  setFechaInicio: (val: string) => void;
  setFechaFin: (val: string) => void;
  filtrarHoy: () => void;
  filtrarSemana: () => void;
  filtrarMes: () => void;
  limpiarFiltros: () => void;
}

export const FiltrosUtilidades: React.FC<Props> = ({
  fechaInicio, fechaFin, setFechaInicio, setFechaFin,
  filtrarHoy, filtrarSemana, filtrarMes, limpiarFiltros
}) => {
  const [localInicio, setLocalInicio] = useState(fechaInicio);
  const [localFin, setLocalFin] = useState(fechaFin);

  useEffect(() => {
    setLocalInicio(fechaInicio);
    setLocalFin(fechaFin);
  }, [fechaInicio, fechaFin]);

  const handleBuscar = () => {
    setFechaInicio(localInicio);
    setFechaFin(localFin);
  };

  return (
    <div className="flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 shrink-0 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3 uppercase tracking-wider">
          <BarChart3 size={28} className="text-[#1E293B]" strokeWidth={1.5} /> Inteligencia de Negocio
        </h1>
        <p className="text-[#64748B] text-xs font-bold mt-1 uppercase tracking-widest">Análisis de Utilidad y Rendimiento</p>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex gap-2">
          <button onClick={filtrarHoy} className="bg-[#FFFFFF] border border-[#E2E8F0] px-4 py-2 text-[11px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition-colors rounded-none uppercase tracking-widest">Hoy</button>
          <button onClick={filtrarSemana} className="bg-[#FFFFFF] border border-[#E2E8F0] px-4 py-2 text-[11px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition-colors rounded-none uppercase tracking-widest">7 Días</button>
          <button onClick={filtrarMes} className="bg-[#FFFFFF] border border-[#E2E8F0] px-4 py-2 text-[11px] font-bold text-[#1E293B] hover:bg-[#F8FAFC] transition-colors rounded-none uppercase tracking-widest">Mes</button>
        </div>

        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E2E8F0] p-2 rounded-none">
          <div className="flex flex-col px-2">
            <label className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Desde</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[#1E293B]" />
              <input type="date" value={localInicio} onChange={(e) => setLocalInicio(e.target.value)} className="text-xs font-bold text-[#1E293B] outline-none bg-transparent cursor-pointer font-mono" />
            </div>
          </div>
          <div className="w-[1px] h-8 bg-[#E2E8F0]"></div>
          <div className="flex flex-col px-2">
            <label className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Hasta</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[#1E293B]" />
              <input type="date" value={localFin} onChange={(e) => setLocalFin(e.target.value)} className="text-xs font-bold text-[#1E293B] outline-none bg-transparent cursor-pointer font-mono" />
            </div>
          </div>
          
          <div className="w-[1px] h-8 bg-[#E2E8F0] mx-1"></div>
          
          <button onClick={handleBuscar} className="bg-[#1E293B] hover:bg-[#0F172A] text-[#FFFFFF] p-2 rounded-none transition-colors cursor-pointer flex items-center justify-center border border-[#1E293B]" title="Buscar por Fecha">
            <Search size={16} strokeWidth={2} />
          </button>
          
          <button onClick={limpiarFiltros} className="bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#1E293B] p-2 rounded-none transition-colors cursor-pointer flex items-center justify-center border border-[#E2E8F0]" title="Restaurar Fechas">
            <RotateCcw size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};