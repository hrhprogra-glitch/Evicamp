// src/sections/Reportes/index.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, RotateCcw, CalendarDays } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaTickets } from './components/TablaTickets';
import type { TicketVenta } from './types';

export const Reportes: React.FC = () => {
  const [tickets, setTickets] = useState<TicketVenta[]>([]);
  
  // Por defecto: Desde el día 1 del mes actual, Hasta HOY
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState<string>(primerDiaMes);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);

  // 1. LIMPIEZA AUTOMÁTICA EN SEGUNDO PLANO (Al abrir el módulo)
  useEffect(() => {
    const autoLimpiarAntiguos = async () => {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30); // Retrocede 30 días
      
      // Borra silenciosamente de Supabase todo lo más viejo que 30 días
      await supabase
        .from('sales')
        .delete()
        .lt('created_at', fechaLimite.toISOString());
    };
    
    autoLimpiarAntiguos();
  }, []); // El array vacío asegura que solo se ejecute 1 vez al entrar a la ventana

  // 2. CARGAR TICKETS POR RANGO DE FECHAS
  useEffect(() => {
    const fetchTickets = async () => {
      // Ajustamos las horas para abarcar todo el día (00:00:00 a 23:59:59)
      const start = `${fechaInicio}T00:00:00.000Z`;
      const end = `${fechaFin}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (data) {
        // Mapeamos los datos reales de la BD al formato que entiende la tabla
        const ticketsFormateados: TicketVenta[] = data.map(t => ({
          id: t.id.toString(),
          created_at: t.created_at,
          total: Number(t.total),
          metodo_pago: t.payment_type || 'MIXTO',
          estado: t.status === 'ANULADO' || t.sunat_status === 'ANULADO' ? 'ANULADO' : 'COMPLETADO'
        }));
        setTickets(ticketsFormateados);
      }
      if (error) console.error("Error al cargar tickets:", error);
    };

    fetchTickets();
  }, [fechaInicio, fechaFin]);

  // 3. ANULAR TICKET (Devolución)
  const handleAnularTicket = async (id: string) => {
    if (window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? Esta acción marca el ticket como devuelto.')) {
      // Usamos el campo status en Supabase (asegúrate de que exista en tu tabla sales)
      const { error } = await supabase.from('sales').update({ status: 'ANULADO' }).eq('id', id);
      
      if (error) {
        alert("Error al anular en BD: " + error.message);
      } else {
        setTickets(tickets.map(t => t.id === id ? { ...t, estado: 'ANULADO' } : t));
      }
    }
  };

  // 4. ELIMINAR TICKET INDIVIDUAL
  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('🗑️ ¿Estás seguro de ELIMINAR este ticket permanentemente?')) {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      
      if (!error) {
        setTickets(tickets.filter(t => t.id !== id));
      }
    }
  };

  // Cálculos rápidos para las tarjetas
  const totalRango = tickets.filter(t => t.estado !== 'ANULADO').reduce((acc, t) => acc + Number(t.total), 0);
  const totalAnulados = tickets.filter(t => t.estado === 'ANULADO').length;

  return (
    <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto font-mono">
      
      {/* CABECERA Y FILTROS */}
      <div className="flex justify-between items-end shrink-0">
        
        {/* Tarjetas Informativas */}
        <div className="flex gap-4 w-2/3">
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#F8FAFC] rounded-full border-2 border-[#E2E8F0] flex items-center justify-center">
              <FileText className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Ventas del Rango</p>
              <p className="text-2xl font-black text-[#1E293B]">S/ {totalRango.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#FEF2F2] rounded-full border-2 border-[#EF4444] flex items-center justify-center">
              <RotateCcw className="text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Devoluciones</p>
              <p className="text-2xl font-black text-[#EF4444]">{totalAnulados} tickets</p>
            </div>
          </div>
        </div>

        {/* Filtros Desde - Hasta */}
        <div className="flex items-center gap-4 bg-white border-2 border-[#E2E8F0] p-3 shadow-[4px_4px_0_0_#E2E8F0]">
          
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest mb-1">Desde</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[#94A3B8]" />
              <input 
                type="date" 
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="text-xs font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer"
              />
            </div>
          </div>

          <div className="w-[2px] h-8 bg-[#E2E8F0]"></div> {/* Separador Visual */}

          <div className="flex flex-col">
            <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest mb-1">Hasta</label>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#94A3B8]" />
              <input 
                type="date" 
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="text-xs font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer"
              />
            </div>
          </div>

        </div>

      </div>

      {/* ÁREA DE TABLA */}
      <div className="flex-1 min-h-0">
        <TablaTickets 
          tickets={tickets} 
          onAnular={handleAnularTicket} 
          onDelete={handleDeleteTicket} 
        />
      </div>

    </div>
  );
};