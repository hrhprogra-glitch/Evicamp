// src/sections/Reportes/index.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, RotateCcw, CalendarDays } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaTickets } from './components/TablaTickets';
import type { TicketVenta } from './types';

export const Reportes: React.FC = () => {
  const [tickets, setTickets] = useState<TicketVenta[]>([]);
  
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState<string>(primerDiaMes);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);

  useEffect(() => {
    const autoLimpiarAntiguos = async () => {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      await supabase
        .from('sales')
        .delete()
        .lt('created_at', fechaLimite.toISOString());
    };
    autoLimpiarAntiguos();
  }, []);

  useEffect(() => {
    const fetchTickets = async () => {
      const fechaFinExpandida = new Date(fechaFin);
      fechaFinExpandida.setDate(fechaFinExpandida.getDate() + 1);
      const finAjustado = fechaFinExpandida.toISOString().split('T')[0];

      // PASO 1: Consulta original segura
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lt('created_at', `${finAjustado}T00:00:00`)
        .order('created_at', { ascending: false });

      if (data) {
        // PASO 2: Buscamos fiados
        const saleIds = data.map(t => t.id).filter(id => id != null);
        const fiadosMap: Record<string, any> = {};

        if (saleIds.length > 0) {
          const { data: fiadosData } = await supabase
            .from('fiados')
            .select('sale_id, customer_name, amount, paid_amount')
            .in('sale_id', saleIds);
            
          if (fiadosData) {
            fiadosData.forEach(f => {
              fiadosMap[f.sale_id] = f;
            });
          }
        }

        const ticketsFormateados: TicketVenta[] = data.map(t => {
          const fiado = t.id ? fiadosMap[String(t.id)] : null;
          const esFiado = !!fiado;
          
          const totalTicket = Number(t.total) || 0;
          
          // CÁLCULO MATEMÁTICO CORREGIDO:
          // Deuda Actual = (Monto del Fiado) - (Lo que ha ido abonando después)
          const deudaActual = esFiado ? (Number(fiado.amount || 0) - Number(fiado.paid_amount || 0)) : 0;
          
          // Pagado = (Total del Ticket) - (La deuda que aún le queda)
          // Esto captura automáticamente el "pago inicial" + "abonos posteriores"
          const montoPagado = esFiado ? (totalTicket - deudaActual) : totalTicket;

          return {
            id: t.id ? String(t.id) : `ERR-${Math.floor(Math.random() * 10000)}`,
            created_at: t.created_at || new Date().toISOString(),
            total: totalTicket,
            metodo_pago: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
            estado: t.status === 'ANULADO' || t.sunat_status === 'ANULADO' ? 'ANULADO' : 'COMPLETADO',
            
            es_fiado: esFiado,
            cliente_nombre: fiado?.customer_name || null,
            monto_pagado: montoPagado,
            monto_deuda: deudaActual
          };
        });
        setTickets(ticketsFormateados);
      }
      if (error) console.error("Error al cargar tickets:", error);
    };

    fetchTickets();
  }, [fechaInicio, fechaFin]);

  const handleAnularTicket = async (id: string) => {
    if (id.startsWith('ERR-')) {
      alert('⚠️ PROTECCIÓN DEL SISTEMA: Registro corrupto.');
      return;
    }

    if (window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock regresará a tu inventario.')) {
      const { error } = await supabase.from('sales').update({ sunat_status: 'ANULADO' }).eq('id', id);
      
      if (error) {
        alert("Error de integridad al anular en BD: " + error.message);
      } else {
        const { data: detalles } = await supabase.from('sale_details').select('product_id, quantity, product_name').eq('sale_id', id);
        if (detalles) {
          for (const item of detalles) {
            const { data: producto } = await supabase.from('products').select('quantity, control_type').eq('id', item.product_id).single();
            if (producto && producto.control_type !== 'CONSUMPTION') {
              const stockDevuelto = Number(producto.quantity) + Number(item.quantity);
              await supabase.from('products').update({ quantity: stockDevuelto }).eq('id', item.product_id);
              await supabase.from('inventory_movements').insert([{
                product_id: item.product_id,
                change_amount: Number(item.quantity),
                operation_type: 'DEVOLUCION',
                reason: `Anulación de Ticket #${id}`,
                user: 'Sistema'
              }]);
            }
          }
        }
        setTickets(tickets.map(t => t.id === id ? { ...t, estado: 'ANULADO' } : t));
        alert("✅ OPERACIÓN CONFIRMADA: Ticket anulado.");
      }
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('🗑️ ¿Estás seguro de ELIMINAR este ticket permanentemente?')) {
      if (id.startsWith('ERR-')) {
        await supabase.from('sales').delete().is('id', null);
        setTickets(tickets.filter(t => t.id !== id));
        return;
      }
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (!error) {
        setTickets(tickets.filter(t => t.id !== id));
      }
    }
  };

  const totalRango = tickets.filter(t => t.estado !== 'ANULADO').reduce((acc, t) => acc + Number(t.total), 0);
  const totalAnulados = tickets.filter(t => t.estado === 'ANULADO').length;

  return (
    <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto font-mono">
      <div className="flex justify-between items-end shrink-0">
        <div className="flex gap-4 w-2/3">
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#F8FAFC] rounded-none border-2 border-[#E2E8F0] flex items-center justify-center">
              <FileText className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Ventas del Rango</p>
              <p className="text-2xl font-black text-[#1E293B]">S/ {totalRango.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#FEF2F2] rounded-none border-2 border-[#EF4444] flex items-center justify-center">
              <RotateCcw className="text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Devoluciones</p>
              <p className="text-2xl font-black text-[#EF4444]">{totalAnulados} tickets</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white border-2 border-[#E2E8F0] p-3 shadow-[4px_4px_0_0_#E2E8F0]">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest mb-1">Desde</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-[#94A3B8]" />
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-xs font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
          <div className="w-[2px] h-8 bg-[#E2E8F0]"></div>
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest mb-1">Hasta</label>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#94A3B8]" />
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-xs font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TablaTickets tickets={tickets} onAnular={handleAnularTicket} onDelete={handleDeleteTicket} />
      </div>
    </div>
  );
};