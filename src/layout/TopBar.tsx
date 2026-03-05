// src/layout/TopBar.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../db/supabase';
import { LogOut, Activity } from 'lucide-react';

interface TopBarProps {
  toggleSidebar: () => void;
  userEmail: string;
}

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, userEmail }) => {
  // Estado para el reloj en tiempo real
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-PE', { hour12: false })); // Formato 24h técnico
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-4 lg:px-6 shrink-0 font-mono relative z-10">
      
      {/* LÍNEA DE TENSIÓN TÉCNICA SUPERIOR (1px) */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#10B981]"></div>

      {/* =========================================
          LADO IZQUIERDO: Control y Consola
      ========================================= */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2.5 border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] hover:border-[#10B981] hover:text-[#10B981] hover:bg-white transition-all rounded-none cursor-pointer group"
          title="Alternar Menú"
        >
          {/* Icono Menu Técnico con animación al hover */}
          <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        
        {/* Breadcrumb Tipo Terminal (Consola Activa) */}
        <div className="hidden md:flex items-center text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] bg-[#F8FAFC] px-3 py-1 border border-[#E2E8F0]">
          <span className="text-[#10B981] mr-2">root@evicamp:~#</span>
          <span>/</span>
          <span className="mx-2 text-[#1E293B]">SYSTEM_ACTIVE</span>
          {/* Cursor parpadeante de terminal */}
          <span className="w-1.5 h-3 bg-[#10B981] animate-pulse ml-2 inline-block"></span>
        </div>
      </div>

      {/* =========================================
          LADO DERECHO: Telemetría y Acciones
      ========================================= */}
      <div className="flex items-center h-full py-3 gap-2 lg:gap-4">
        
        {/* Telemetría: Estado de Red (Solo visible en pantallas grandes) */}
        <div className="hidden lg:flex items-center border border-[#E2E8F0] px-3 py-1.5 bg-white text-[9px] font-bold uppercase tracking-widest text-[#64748B]">
          <Activity size={12} className="text-[#10B981] mr-2" />
          NET: <span className="text-[#10B981] ml-1">SECURE</span>
        </div>

        {/* Telemetría: Reloj Operativo */}
        <div className="flex items-center border border-[#E2E8F0] px-3 py-1.5 bg-[#F8FAFC] text-[10px] font-black uppercase tracking-widest text-[#1E293B]">
          [ {time} ]
        </div>

        {/* Info de Usuario Segmentada */}
        <div className="flex items-center border border-[#E2E8F0] pl-3 pr-4 py-1.5 bg-white">
          <div className="h-1.5 w-1.5 bg-[#10B981] animate-pulse mr-2"></div>
          <span className="text-[10px] font-black text-[#1E293B] uppercase tracking-[0.1em]">
            ID: <span className="text-[#64748B]">{userEmail.split('@')[0]}</span>
          </span>
        </div>
        
        {/* Botón de Desconexión Riguroso y Peligroso (Rojo Técnico en Hover) */}
        <button 
          onClick={() => supabase.auth.signOut()}
          className="px-4 py-1.5 border border-[#1E293B] bg-[#1E293B] text-[9px] font-black uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-red-600 hover:border-red-600 transition-colors rounded-none cursor-pointer flex items-center gap-2"
          title="Desconectar Terminal"
        >
          <LogOut size={12} />
          <span className="hidden md:inline">SALIDA</span>
        </button>

      </div>
    </header>
  );
};