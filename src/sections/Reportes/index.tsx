// src/sections/Reportes/index.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, RotateCcw, CalendarDays } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaTickets } from './components/TablaTickets';
import type { TicketVenta } from './types';

export const Reportes: React.FC = () => {
  const [tickets, setTickets] = useState<TicketVenta[]>([]);
  const [totalAbonos, setTotalAbonos] = useState(0);
  
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];

  // INYECCIÓN: Calculamos la fecha local exacta (evita desfasajes por zona horaria UTC)
  const hoyLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  // Seteamos "HOY" como fecha predeterminada al cargar el módulo
  const [fechaInicio, setFechaInicio] = useState<string>(hoyLocal);
  const [fechaFin, setFechaFin] = useState<string>(hoyLocal);

  // --- FUNCIONES DE FILTRADO RÁPIDO ---
  const filtrarHoy = () => {
    setFechaInicio(hoyStr);
    setFechaFin(hoyStr);
  };

  const filtrarSemana = () => {
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(hoy.getDate() - 7);
    setFechaInicio(haceUnaSemana.toISOString().split('T')[0]);
    setFechaFin(hoyStr);
  };

  const filtrarMes = () => {
    setFechaInicio(primerDiaMes);
    setFechaFin(hoyStr);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
  };
  // ------------------------------------

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

  // 🔥 1. SACAMOS LA FUNCIÓN AFUERA PARA QUE EL BOTÓN "ANULAR" PUEDA USARLA
  const fetchTickets = async () => {
    const fechaFinExpandida = new Date(fechaFin);
    fechaFinExpandida.setDate(fechaFinExpandida.getDate() + 1);
    const finAjustado = fechaFinExpandida.toISOString().split('T')[0];

    let query = supabase.from('sales').select('*');
    
    if (fechaInicio && fechaFin) {
      let inicioUTC = new Date(`${fechaInicio}T00:00:00-05:00`).toISOString();
      const finUTC = new Date(`${finAjustado}T00:00:00-05:00`).toISOString();

      if (fechaInicio === hoyStr && fechaFin === hoyStr) {
         const { data: caja } = await supabase.from('cash_sessions').select('opened_at').eq('status', 'OPEN').maybeSingle();
         if (caja && caja.opened_at) inicioUTC = caja.opened_at;
      }
      
      query = query.gte('created_at', inicioUTC).lt('created_at', finUTC);
    } else {
      query = query.limit(100); 
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    let sumaAbonos = 0;
    if (fechaInicio && fechaFin) {
      let inicioUTC_abonos = new Date(`${fechaInicio}T00:00:00-05:00`).toISOString();
      const finUTC_abonos = new Date(`${finAjustado}T00:00:00-05:00`).toISOString();
      
      if (fechaInicio === hoyStr && fechaFin === hoyStr) {
         const { data: caja } = await supabase.from('cash_sessions').select('opened_at').eq('status', 'OPEN').maybeSingle();
         if (caja && caja.opened_at) inicioUTC_abonos = caja.opened_at;
      }
      
      const { data: abonos } = await supabase.from('debt_payments').select('amount').gte('created_at', inicioUTC_abonos).lt('created_at', finUTC_abonos);
      if (abonos) {
        sumaAbonos = abonos.reduce((acc, a) => acc + Number(a.amount || 0), 0);
      }
    }
    setTotalAbonos(sumaAbonos);

    if (data) {
      const fiadosMap: Record<string, any> = {};

      if (data.length > 0) {
        let queryFiados = supabase.from('fiados').select('sale_id, customer_name, amount, paid_amount');
        
        if (fechaInicio && fechaFin) {
          queryFiados = queryFiados.gte('date_given', `${fechaInicio}T00:00:00`)
                                   .lt('date_given', `${finAjustado}T00:00:00`);
        } else {
          queryFiados = queryFiados.limit(1000); 
        }

        const { data: fiadosData } = await queryFiados;
          
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
        
        // 🔥 CRITICO: En el reporte, el "monto pagado" del ticket es lo que entró en caja en ese momento.
        // NO sumamos abonos posteriores aquí para evitar duplicidad con la tarjeta de Abonos.
        const montoPagadoEnVenta = Number(t.amount_cash || 0) + 
                                   Number(t.amount_yape || 0) + 
                                   Number(t.amount_card || 0) + 
                                   Number(t.amount_transfer || 0);

        // La deuda inicial generada por este ticket (si es fiado)
        const deudaGenerada = Number(t.amount_credit || 0);

        return {
          id: t.id ? String(t.id) : `ERR-${Math.floor(Math.random() * 10000)}`,
          created_at: t.created_at || new Date().toISOString(),
          total: totalTicket,
          metodo_pago: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
          estado: t.status === 'ANULADO' || t.sunat_status === 'ANULADO' ? 'ANULADO' : 'COMPLETADO',
          es_fiado: esFiado,
          cliente_nombre: fiado?.customer_name || null,
          monto_pagado: montoPagadoEnVenta,
          monto_deuda: deudaGenerada
        };
      });
      setTickets(ticketsFormateados);
    }
    if (error) console.error("Error al cargar tickets:", error);
  };

  // 🔥 2. AHORA EL USEEFFECT SOLO LLAMA A LA FUNCIÓN QUE ESTÁ AFUERA
  useEffect(() => {
    fetchTickets();
  }, [fechaInicio, fechaFin]);

  const handleAnularTicket = async (id: string) => {
    if (id.startsWith('ERR-')) return alert('⚠️ Registro corrupto.');

    if (window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock regresará a tu inventario y se limpiarán las finanzas.')) {
      const { error } = await supabase.from('sales').update({ sunat_status: 'ANULADO' }).eq('id', id);
      
      if (!error) {
        // 1. Devolver Stock
        const { data: detalles } = await supabase.from('sale_details').select('product_id, quantity').eq('sale_id', id);
        if (detalles) {
          for (const item of detalles) {
            const { data: producto } = await supabase.from('products').select('quantity, control_type').eq('id', item.product_id).maybeSingle();
            if (producto && producto.control_type !== 'CONSUMPTION') {
              const stockDevuelto = Number(producto.quantity) + Number(item.quantity);
              await supabase.from('products').update({ quantity: stockDevuelto }).eq('id', item.product_id);
            }
          }
        }

        // 🔥 2. LIMPIEZA PROFUNDA: Borrar pagos y dinero fantasma de Finanzas y Reportes
        const { data: fiadoVinculado } = await supabase.from('fiados').select('id').eq('sale_id', id).maybeSingle();
        if (fiadoVinculado) {
          const { data: pagos } = await supabase.from('debt_payments').select('id, amount').eq('fiado_id', fiadoVinculado.id);
          if (pagos && pagos.length > 0) {
            const { data: movs } = await supabase.from('cash_movements').select('id, amount').eq('flujo', 'INGRESO_FIADO');
            for (const pago of pagos) {
              const exactMov = movs?.find(m => Math.abs(Number(m.amount) - Number(pago.amount)) < 0.01);
              if (exactMov) await supabase.from('cash_movements').delete().eq('id', exactMov.id);
            }
            await supabase.from('debt_payments').delete().eq('fiado_id', fiadoVinculado.id);
          }
          // REINICIO TOTAL PARA REPORTES (paid_amount a 0)
          await supabase.from('fiados').update({ status: 'ANULADO', paid_amount: 0 }).eq('sale_id', id);
        }

        alert("✅ OPERACIÓN CONFIRMADA: Ticket anulado, deuda cancelada y Finanzas limpiadas.");
        fetchTickets(); 
      }
    }
  };

  const handleDeleteTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);

    if (ticket && ticket.estado !== 'ANULADO' && !id.startsWith('ERR-')) {
      alert('⚠️ OPERACIÓN DENEGADA: Primero debes usar el botón ANULAR para que el stock y la deuda se reviertan.');
      return;
    }

    if (window.confirm('🗑️ ADVERTENCIA FINAL: ¿Seguro de borrar el registro? Esta acción es irreversible.')) {
      if (id.startsWith('ERR-')) {
        await supabase.from('sales').delete().is('id', null);
        setTickets(tickets.filter(t => !t.id.startsWith('ERR-')));
        return;
      }
      
      // 🔥 LIMPIEZA PROFUNDA ANTES DE BORRAR
      const { data: fiadoVinculado } = await supabase.from('fiados').select('id').eq('sale_id', id).maybeSingle();
      if (fiadoVinculado) {
        const { data: pagos } = await supabase.from('debt_payments').select('id, amount').eq('fiado_id', fiadoVinculado.id);
        if (pagos) {
          const { data: movs } = await supabase.from('cash_movements').select('id, amount').eq('flujo', 'INGRESO_FIADO');
          for (const pago of pagos) {
            const exactMov = movs?.find(m => Math.abs(Number(m.amount) - Number(pago.amount)) < 0.01);
            if (exactMov) await supabase.from('cash_movements').delete().eq('id', exactMov.id);
          }
          await supabase.from('debt_payments').delete().eq('fiado_id', fiadoVinculado.id);
        }
      }

      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (!error) {
        await supabase.from('fiados').delete().eq('sale_id', id);
        setTickets(tickets.filter(t => t.id !== id));
      }
    }
  };

  // 🔥 ARQUITECTURA UNIFICADA:
  // 1. Ingresos por ventas = Solo lo cobrado en los tickets (Efectivo/Yape/Tarjeta)
  // 2. Ingresos por abonos = Todo lo cobrado en la tabla debt_payments (Abonos reales)
  // Total = La suma real de dinero físico y digital que entró a caja en este rango.
  const ventasRango = tickets
    .filter(t => t.estado !== 'ANULADO')
    .reduce((acc, t) => acc + Number(t.monto_pagado || 0), 0);
    
  const totalAnulados = tickets.filter(t => t.estado === 'ANULADO').length;
  const granTotalIngresos = ventasRango + totalAbonos;

  return (
    <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto font-mono">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="flex gap-4 shrink-0">
        <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#F8FAFC] rounded-none border-2 border-[#E2E8F0] flex items-center justify-center">
              <FileText className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Ingresos Reales (Tickets + Fiados Cobrados)</p>
              <p className="text-2xl font-black text-[#1E293B]">S/ {granTotalIngresos.toFixed(2)}</p>
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

      {/* BARRA DE CONTROLES TÉCNICOS */}
      <div className="flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 shrink-0">
        
        {/* BOTONES RÁPIDOS */}
        <div className="flex gap-3">
          <button onClick={filtrarHoy} className="bg-white border-2 border-[#1E293B] px-6 py-3 text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            Hoy
          </button>
          <button onClick={filtrarSemana} className="bg-white border-2 border-[#1E293B] px-6 py-3 text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            7 Días
          </button>
          <button onClick={filtrarMes} className="bg-white border-2 border-[#1E293B] px-6 py-3 text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            Mes
          </button>
        </div>

        {/* SELECTOR DE FECHAS PERSONALIZADO */}
        <div className="flex items-center gap-6 bg-white border-2 border-[#E2E8F0] p-4 shadow-[4px_4px_0_0_#E2E8F0] rounded-none">
          <div className="flex flex-col">
            <label className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-1">Desde</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[#94A3B8]" />
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-base font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
          <div className="w-[2px] h-10 bg-[#E2E8F0]"></div>
          <div className="flex flex-col">
            <label className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-1">Hasta</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#94A3B8]" />
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-base font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
          
          {/* BOTÓN LIMPIAR */}
          {(fechaInicio || fechaFin) && (
             <div className="pl-4 ml-2 border-l-2 border-[#E2E8F0]">
               <button onClick={limpiarFiltros} className="text-[#EF4444] hover:bg-[#FEF2F2] p-2 transition-colors cursor-pointer rounded-none" title="Limpiar Filtros">
                 <RotateCcw size={16} />
               </button>
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TablaTickets tickets={tickets} onAnular={handleAnularTicket} onDelete={handleDeleteTicket} />
      </div>
    </div>
  );
};