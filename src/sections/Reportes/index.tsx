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

  // 2. CARGAR TICKETS POR RANGO DE FECHAS (Protección de Zona Horaria)
  useEffect(() => {
    const fetchTickets = async () => {
      // Inyección: Forzamos la consulta ignorando el desplazamiento horario del navegador
      // Expandimos artificialmente el end en 1 día extra para atrapar registros que entraron como UTC+0 en Supabase
      const fechaFinExpandida = new Date(fechaFin);
      fechaFinExpandida.setDate(fechaFinExpandida.getDate() + 1);
      const finAjustado = fechaFinExpandida.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lt('created_at', `${finAjustado}T00:00:00`) // Usamos estrictamente "menor que el día siguiente"
        .order('created_at', { ascending: false });

      if (data) {
        // Mapeamos los datos reales de la BD al formato que entiende la tabla
        const ticketsFormateados: TicketVenta[] = data.map(t => ({
          // Inyección: Usamos String() que soporta nulos sin crashear la aplicación
          id: t.id ? String(t.id) : `ERR-${Math.floor(Math.random() * 10000)}`,
          created_at: t.created_at || new Date().toISOString(),
          total: Number(t.total) || 0,
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
    // Intercepción de Seguridad
    if (id.startsWith('ERR-')) {
      alert('⚠️ PROTECCIÓN DEL SISTEMA: Este es un registro corrupto (No tiene ID válido en la base de datos). No contiene productos para devolver al inventario. Te recomendamos usar el tacho de basura rojo para eliminarlo y limpiar tu pantalla.');
      return;
    }

    if (window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock de los productos regresará a tu inventario automáticamente.')) {
      // 1. Marcamos la venta como ANULADA (Usamos sunat_status para compatibilidad con tu BD)
      const { error } = await supabase.from('sales').update({ sunat_status: 'ANULADO' }).eq('id', id);
      
      if (error) {
        alert("Error de integridad al anular en BD: " + error.message);
      } else {
        
        // 2. OBTENER DETALLES DE LA VENTA PARA DEVOLVER AL STOCK
        const { data: detalles } = await supabase.from('sale_details').select('product_id, quantity, product_name').eq('sale_id', id);
        
        if (detalles) {
          for (const item of detalles) {
            // Buscamos el stock actual del producto en tiempo real
            const { data: producto } = await supabase.from('products').select('quantity, control_type').eq('id', item.product_id).single();
            
            // Si el producto existe y NO es un "consumo/servicio", procedemos a devolver la física
            if (producto && producto.control_type !== 'CONSUMPTION') {
              // Sumamos la cantidad devuelta al stock
              const stockDevuelto = Number(producto.quantity) + Number(item.quantity);
              await supabase.from('products').update({ quantity: stockDevuelto }).eq('id', item.product_id);
              
              // Registro estricto de auditoría de ingreso (Kardex)
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
        
        // Actualizamos la interfaz gráfica (UI) al instante aplicando el estilo de alto contraste
        setTickets(tickets.map(t => t.id === id ? { ...t, estado: 'ANULADO' } : t));
        alert("✅ OPERACIÓN CONFIRMADA: Ticket anulado y stock reingresado exitosamente a la base de datos.");
      }
    }
  };

  // 4. ELIMINAR TICKET INDIVIDUAL
  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('🗑️ ¿Estás seguro de ELIMINAR este ticket permanentemente?')) {
      
      // Si es un ticket corrupto (sin ID), forzamos su limpieza buscando los nulos en la BD
      if (id.startsWith('ERR-')) {
        await supabase.from('sales').delete().is('id', null);
        setTickets(tickets.filter(t => t.id !== id));
        alert("✅ Registro corrupto eliminado y limpiado de la base de datos.");
        return;
      }

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