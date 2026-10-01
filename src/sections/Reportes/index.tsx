// src/sections/Reportes/index.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, RotateCcw, CalendarDays, Search } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaTickets } from './components/TablaTickets';
import type { TicketVenta } from './types';
// 🎯 MOTOR ÚNICO DE INGRESO TOTAL: misma fórmula y mismas fechas (Perú, UTC-5 fijo) que
// Resumen, Utilidades, Finanzas y Punto de Venta, para que el monto SIEMPRE coincida.
import { calcularIngresoTotal, fechaLocalPeru, primerDiaMesPeru, haceNDiasPeru } from '../../utils/ingresos';
import { traerTodo } from '../../utils/traerTodo';
import { eliminarAbonoYRevertirCaja } from '../../utils/revertirAbono';

export const Reportes: React.FC = () => {
  const [tickets, setTickets] = useState<TicketVenta[]>([]);
  // 💰 Abonos de deudas (fiados) pagados dentro del rango filtrado. Igual que Resumen/Utilidades/
  // Finanzas, estos pagos son ingreso real aunque no correspondan a un ticket de venta nuevo.
  const [totalAbonosRango, setTotalAbonosRango] = useState<number>(0);
  // 🎯 Total del motor único (null mientras carga, o cuando no hay rango de fechas definido).
  const [ingresoCanonico, setIngresoCanonico] = useState<number | null>(null);

  const hoyStr = fechaLocalPeru();
  const primerDiaMes = primerDiaMesPeru();

  // Seteamos "HOY" como fecha predeterminada al cargar el módulo
  const [fechaInicio, setFechaInicio] = useState<string>(hoyStr);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);

  // 🔎 BÚSQUEDA POR CLIENTE O N° DE TICKET: resuelve el caso típico de "no encuentro mi ticket"
  // cuando el dueño no se acuerda de qué día fue la venta. Mientras hay texto, ignora el filtro
  // de fechas y busca en el último año (no solo en el rango visible).
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // 🔎 FILTROS ADICIONALES: estado del ticket y estado de la deuda. Se aplican sobre lo ya
  // cargado (por fecha o por búsqueda), sin disparar una consulta nueva.
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'COMPLETADO' | 'ANULADO'>('TODOS');
  const [filtroDeuda, setFiltroDeuda] = useState<'TODOS' | 'PENDIENTE' | 'PAGADO'>('TODOS');

  // --- FUNCIONES DE FILTRADO RÁPIDO ---
  const filtrarHoy = () => {
    setFechaInicio(hoyStr);
    setFechaFin(hoyStr);
  };

  const filtrarSemana = () => {
    setFechaInicio(haceNDiasPeru(7));
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

  // Nota: antes aquí se borraban en silencio las ventas con más de 30 días cada vez que se
  // abría esta sección, lo que destruía el historial que usan el Panel de Control, Tesorería
  // y Análisis de Rentabilidad. Se quitó: las ventas no se borran automáticamente.

  useEffect(() => {
    const fetchTickets = async () => {
      const buscando = busquedaDebounced !== '';
      let data: any[] | null;
      let error: any;

      if (buscando) {
        // 🔎 MODO BÚSQUEDA: ignora el filtro de fechas por completo. Busca en el último año
        // por nombre de cliente (fiados) o por N° de ticket (id completo o los últimos 6
        // dígitos, que es lo que se ve en pantalla como "#XXXXXX").
        const desdeUTC = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const [{ data: ventasAmplias, error: errVentas }, { data: fiadosPorNombre }] = await Promise.all([
          traerTodo(() => supabase.from('sales').select('*')
            .gte('created_at', desdeUTC)
            .order('created_at', { ascending: false }).order('id')),
          supabase.from('fiados').select('sale_id').ilike('customer_name', `%${busquedaDebounced}%`)
        ]);
        const idsPorNombre = new Set((fiadosPorNombre || []).map((f: any) => String(f.sale_id)));
        // También se busca por MONTO exacto (ej. el dueño se acuerda que fue "42.2" o "42.20",
        // no del nombre del cliente ni del número de ticket). Tolerancia de un centavo por
        // redondeo de punto flotante.
        const terminoNumerico = parseFloat(busquedaDebounced.replace(',', '.'));
        const buscaPorMonto = /^[0-9]+([.,][0-9]{1,2})?$/.test(busquedaDebounced) && !isNaN(terminoNumerico);
        data = (ventasAmplias || []).filter((s: any) =>
          idsPorNombre.has(String(s.id)) ||
          String(s.id).includes(busquedaDebounced) ||
          String(s.id).slice(-6).includes(busquedaDebounced) ||
          (buscaPorMonto && Math.abs(Number(s.total) - terminoNumerico) < 0.01)
        );
        error = errVentas;
        // Los totales de "Ventas del Rango" no tienen sentido mezclados con resultados de
        // búsqueda de cualquier fecha: se dejan en 0 mientras se está buscando.
        setTotalAbonosRango(0);
      } else {
        const fechaFinExpandida = new Date(fechaFin);
        fechaFinExpandida.setDate(fechaFinExpandida.getDate() + 1);
        const finAjustado = fechaFinExpandida.toISOString().split('T')[0];

        // 🛠️ ZONA HORARIA PERÚ (UTC-5): "00:00" de un día en Perú equivale a "05:00" UTC.
        // Sin este ajuste, el rango se corría 5 horas y mezclaba ventas de la noche del día anterior.
        const hayRango = !!(fechaInicio && fechaFin);
        const inicioUTC = `${fechaInicio}T05:00:00.000Z`;
        const finUTC = `${finAjustado}T05:00:00.000Z`;

        // Con rango se traen TODAS las ventas por bloques (Supabase corta en 1000 filas); sin rango, las 100 últimas
        const consultaVentas = () => supabase.from('sales').select('*')
          .gte('created_at', inicioUTC).lt('created_at', finUTC)
          .order('created_at', { ascending: false }).order('id');
        const resultado = hayRango
          ? await traerTodo(consultaVentas)
          : await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
        data = resultado.data;
        error = resultado.error;

        // 💰 ABONOS DE FIADOS EN EL RANGO (igual que Resumen/Utilidades/Finanzas)
        const { data: abonosData } = hayRango
          ? await traerTodo(() => supabase.from('debt_payments').select('amount, fiado_id, created_at')
              .gte('created_at', inicioUTC).lt('created_at', finUTC).order('id'))
          : await supabase.from('debt_payments').select('amount, fiado_id, created_at').limit(1000);

        // 🛡️ Si el ticket de un fiado fue ANULADO después de un abono, ese abono ya se revirtió en
        // caja y no debe seguir sumando ingreso para siempre.
        const fiadoIdsDeAbonos = Array.from(new Set((abonosData || []).map((a: any) => a.fiado_id).filter(Boolean)));
        let fiadoIdsAnulados = new Set<number>();
        if (fiadoIdsDeAbonos.length > 0) {
          const { data: fiadosDeAbonos } = await supabase.from('fiados').select('id, status').in('id', fiadoIdsDeAbonos);
          fiadoIdsAnulados = new Set((fiadosDeAbonos || []).filter((f: any) => f.status === 'ANULADO').map((f: any) => f.id));
        }
        setTotalAbonosRango((abonosData || []).reduce((acc, a: any) => fiadoIdsAnulados.has(a.fiado_id) ? acc : acc + Number(a.amount || 0), 0));
      }

      if (data) {
        const fiadosMap: Record<string, any> = {};

        // 🛡️ Buscamos el fiado por sale_id exacto (no por rango de fecha) para no perder
        // el match si "date_given" quedó unos milisegundos fuera del rango filtrado.
        const idsConCredito = data.filter(t => Number(t.amount_credit || 0) > 0).map(t => t.id);

        if (idsConCredito.length > 0) {
          const { data: fiadosData } = await supabase
            .from('fiados')
            .select('sale_id, customer_name, amount, paid_amount')
            .in('sale_id', idsConCredito);

          if (fiadosData) {
            fiadosData.forEach(f => {
              fiadosMap[f.sale_id] = f;
            });
          }
        }

        const ticketsFormateados: TicketVenta[] = data.map(t => {
          const fiado = t.id ? fiadosMap[String(t.id)] : null;
          const creditoOriginal = Number(t.amount_credit || 0);
          const esFiado = creditoOriginal > 0;
          const totalTicket = Number(t.total) || 0;
          // 💰 INGRESO REAL: igual que Punto de Venta, Finanzas, Resumen y Utilidades — se cuenta
          // solo lo cobrado AL MOMENTO de la venta. No usamos el saldo "en vivo" de fiados aquí
          // porque cambia con el tiempo (a medida que se abona) y descuadraba este total contra
          // las demás secciones, que solo reconocen el abono como ingreso el día que realmente entra.
          const montoPagado = Number(t.amount_cash || 0) + Number(t.amount_yape || 0) + Number(t.amount_card || 0) + Number(t.amount_transfer || 0);
          // Deuda actual (para mostrar "cuánto debe todavía"): usamos el saldo vivo de fiados
          // (baja con los abonos); si el registro no existe por algún fallo, caemos al crédito
          // original de la venta para no mostrar deuda en cero por error.
          const deudaActual = esFiado ? (fiado ? Math.max(0, Number(fiado.amount || 0) - Number(fiado.paid_amount || 0)) : creditoOriginal) : 0;

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

    // 🛡️ EVICAMP: Si la pestaña estuvo inactiva (u otra caja/dispositivo registró ventas),
    // al volver a mirarla se refrescan los totales para no quedar con datos viejos.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchTickets();
    };
    window.addEventListener('focus', fetchTickets);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', fetchTickets);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fechaInicio, fechaFin, busquedaDebounced]);

  // 🎯 MOTOR ÚNICO DE INGRESO TOTAL: mismo cálculo que Resumen, Utilidades, Finanzas y Punto
  // de Venta para este mismo rango, así "Ventas del Rango" SIEMPRE coincide con las demás
  // pantallas (antes esta tarjeta no sumaba los ingresos manuales de caja, por ejemplo).
  useEffect(() => {
    let cancelado = false;
    const cargarIngresoCanonico = async () => {
      if (!fechaInicio || !fechaFin) {
        if (!cancelado) setIngresoCanonico(null);
        return;
      }
      const r = await calcularIngresoTotal(fechaInicio, fechaFin);
      if (!cancelado) setIngresoCanonico(r.ingresoTotal);
    };
    cargarIngresoCanonico();
    return () => { cancelado = true; };
  }, [fechaInicio, fechaFin]);

  const handleAnularTicket = async (id: string) => {
    if (id.startsWith('ERR-')) {
      alert('⚠️ PROTECCIÓN DEL SISTEMA: Registro corrupto.');
      return;
    }

    if (!window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock regresará y el dinero se descontará de la caja actual.')) return;

    // 🔧 fn_annul_sale nunca existió en la BD (ver commits previos): esta operación se hace
    // aquí, en el frontend, con los mismos pasos directos que ya usa el resto del sistema
    // (confirmar venta, registrar abono) desde que se quitaron las funciones RPC rotas.
    try {
      // 1. Releer la venta fresca: evita anular dos veces con un doble clic.
      const { data: venta, error: errVenta } = await supabase.from('sales').select('*').eq('id', id).single();
      if (errVenta || !venta) throw errVenta || new Error('No se encontró la venta.');
      if (venta.sunat_status === 'ANULADO') {
        alert('Este ticket ya estaba anulado.');
        return;
      }

      // 2. DEVOLVER STOCK: reversa exacta de los movimientos que la venta generó (mismos
      // lotes y cantidades que consumió fn_reduce_stock_from_sales al vender).
      const ticketTag = `Ticket #${id}`;
      const { data: movimientos } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('operation_type', 'VENTA')
        .eq('notes', ticketTag);

      for (const mov of movimientos || []) {
        const cantidad = Math.abs(Number(mov.change_amount) || 0);
        if (cantidad <= 0) continue;

        if (mov.batch_id) {
          const { data: lote } = await supabase.from('batches').select('quantity').eq('id', mov.batch_id).single();
          await supabase.from('batches').update({ quantity: Number(lote?.quantity || 0) + cantidad }).eq('id', mov.batch_id);
        }

        const { data: producto } = await supabase.from('products').select('quantity').eq('id', mov.product_id).single();
        const prevProducto = Number(producto?.quantity || 0);
        const nuevoProducto = prevProducto + cantidad;
        await supabase.from('products').update({ quantity: nuevoProducto }).eq('id', mov.product_id);

        await supabase.from('inventory_movements').insert([{
          batch_id: mov.batch_id, product_id: mov.product_id, product_name: mov.product_name,
          change_amount: cantidad, previous_quantity: prevProducto, new_quantity: nuevoProducto,
          operation_type: 'ANULACION', reason: 'Anulación de venta', notes: `Anulación ${ticketTag}`,
          created_at: new Date().toISOString(), user: 'Sistema', is_synced: 1
        }]);
      }

      // 3. MARCAR LA VENTA COMO ANULADA
      const { error: errUpdateVenta } = await supabase.from('sales').update({ sunat_status: 'ANULADO' }).eq('id', id);
      if (errUpdateVenta) throw errUpdateVenta;

      // 4. SI ERA FIADO: anular la deuda y revertir (borrar) los abonos ya pagados, cada uno
      // con su movimiento de caja gemelo, para que no sigan contando como ingreso.
      const { data: fiado } = await supabase.from('fiados').select('*').eq('sale_id', id).maybeSingle();
      let abonosDevueltos = 0;
      if (fiado) {
        const { data: pagos } = await supabase.from('debt_payments').select('id, session_id, amount, created_at').eq('fiado_id', fiado.id);
        for (const pago of pagos || []) {
          abonosDevueltos += Number(pago.amount || 0);
          await eliminarAbonoYRevertirCaja(pago);
        }
        await supabase.from('fiados').update({ status: 'ANULADO' }).eq('id', fiado.id);
      }

      // 5. SI HAY CAJA ABIERTA: sacar de la caja actual el dinero EFECTIVAMENTE cobrado al
      // vender (el crédito/fiado nunca entró como efectivo, así que no se descuenta aquí).
      // Usamos el mismo formato "(Ticket #xxxxxx)" que Finanzas ya sabe reconocer para no
      // restar dos veces si la venta fue de la caja que sigue abierta ahora mismo.
      const { data: sesion } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(1).maybeSingle();
      const cajaAbierta = !!sesion;

      if (cajaAbierta) {
        const ticketCorto = String(id).slice(-6);
        const bolsas = [
          { monto: Number(venta.amount_cash || 0), metodo: 'EFECTIVO' },
          { monto: Number(venta.amount_yape || 0) + Number(venta.amount_transfer || 0), metodo: 'YAPE' },
          { monto: Number(venta.amount_card || 0), metodo: 'TARJETA' },
        ];
        const movimientosCaja = bolsas
          .filter(b => b.monto > 0)
          .map(b => ({
            session_id: String(sesion!.id),
            type: 'EGRESO',
            amount: b.monto,
            description: `DEVOLUCION POR ANULACION (Ticket #${ticketCorto})`,
            payment_type: b.metodo,
            flujo: 'DEVOLUCION',
            created_at: new Date().toISOString(),
            is_synced: 1
          }));
        if (movimientosCaja.length > 0) {
          await supabase.from('cash_movements').insert(movimientosCaja);
        }
      }

      // 6. Reflejar el cambio en pantalla
      setTickets(tickets.map(t => t.id === id ? { ...t, estado: 'ANULADO' } : t));
      const avisoAbonos = abonosDevueltos > 0 ? `\nSe devolvieron S/ ${abonosDevueltos.toFixed(2)} de abonos ya pagados del fiado.` : '';
      alert(cajaAbierta
        ? `✅ OPERACIÓN COMPLETADA: Ticket anulado, stock restaurado y dinero retirado de la caja actual.${avisoAbonos}`
        : `✅ Ticket anulado y stock restaurado.\n⚠️ No hay caja abierta: el dinero NO se descontó de ninguna caja.${abonosDevueltos > 0 ? `\n(Hay S/ ${abonosDevueltos.toFixed(2)} de abonos que devolver al cliente.)` : ''}`);
    } catch (error) {
      console.error('Error al anular ticket:', error);
      const detalle = error instanceof Error ? error.message : (error as any)?.message;
      alert('❌ Error al anular el ticket: ' + (detalle || 'error desconocido'));
    }
  };

  const handleDeleteTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);

    if (ticket && ticket.estado !== 'ANULADO' && !id.startsWith('ERR-')) {
      alert('⚠️ OPERACIÓN DENEGADA: No puedes borrar una venta activa. Primero debes usar el botón ANULAR para que el stock y la deuda se reviertan correctamente.');
      return;
    }

    if (window.confirm('🗑️ ADVERTENCIA FINAL: ¿Seguro de borrar el registro? Esta acción es irreversible.')) {
      if (id.startsWith('ERR-')) {
        await supabase.from('sales').delete().is('id', null);
        setTickets(tickets.filter(t => !t.id.startsWith('ERR-')));
        alert("✨ LIMPIEZA COMPLETADA: Todos los registros corruptos han sido eliminados de la base de datos.");
        return;
      }
      
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (!error) {
        await supabase.from('fiados').delete().eq('sale_id', id);
        setTickets(tickets.filter(t => t.id !== id));
      }
    }
  };

  // 💰 INGRESO REAL: igual que Punto de Venta, Finanzas, Resumen y Utilidades — lo cobrado en
  // cada venta ("monto_pagado") más los abonos de fiados pagados dentro del rango.
  // Mientras el motor único (ingresoCanonico) no esté listo, o cuando no hay rango de fechas
  // definido (vista "sin filtro"), se usa el cálculo local como respaldo.
  const totalRangoLocal = tickets.filter(t => t.estado !== 'ANULADO').reduce((acc, t) => acc + Number(t.monto_pagado), 0) + totalAbonosRango;
  const totalRango = ingresoCanonico !== null ? ingresoCanonico : totalRangoLocal;
  const totalAnulados = tickets.filter(t => t.estado === 'ANULADO').length;

  // Filtros de Estado/Deuda se aplican solo a la TABLA (las tarjetas de arriba siguen
  // mostrando el total real del rango/búsqueda, sin importar qué filas se estén mirando).
  const ticketsFiltrados = tickets.filter(t => {
    if (filtroEstado !== 'TODOS' && t.estado !== filtroEstado) return false;
    if (filtroDeuda === 'PENDIENTE' && !(t.es_fiado && t.monto_deuda > 0)) return false;
    if (filtroDeuda === 'PAGADO' && (t.es_fiado && t.monto_deuda > 0)) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 shrink-0">
        <div className="min-w-0 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-3 sm:p-4 flex gap-3 sm:gap-4 items-center rounded-none">
            <div className="w-12 h-12 bg-[#F8FAFC] rounded-none border-2 border-[#E2E8F0] flex items-center justify-center">
              <FileText className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[#64748B]">Ventas del Rango</p>
              <p className="text-2xl font-black text-[#1E293B]">S/ {totalRango.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="min-w-0 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-3 sm:p-4 flex gap-3 sm:gap-4 items-center rounded-none">
            <div className="w-12 h-12 bg-[#FEF2F2] rounded-none border-2 border-[#EF4444] flex items-center justify-center">
              <RotateCcw className="text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[#64748B]">Devoluciones</p>
              <p className="text-2xl font-black text-[#EF4444]">{totalAnulados} tickets</p>
            </div>
          </div>
      </div>

      {/* 🔎 BÚSQUEDA POR CLIENTE O N° DE TICKET: encuentra un ticket sin importar la fecha,
          para no depender de que el dueño recuerde el día exacto de la venta. */}
      <div className="shrink-0 flex items-center border-2 border-[#1E293B] bg-white shadow-[4px_4px_0_0_#1E293B] rounded-none">
        <div className="w-11 h-11 flex items-center justify-center bg-[#1E293B] text-white shrink-0">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="BUSCAR POR CLIENTE, N° DE TICKET O MONTO (busca en todas las fechas)"
          className="flex-1 min-w-0 h-11 px-3 bg-transparent text-sm font-black text-[#1E293B] uppercase outline-none placeholder:text-[#64748B]/60"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="px-3 h-11 text-[#EF4444] hover:bg-[#FEF2F2] font-black text-xs uppercase cursor-pointer shrink-0" title="Limpiar búsqueda">
            Limpiar
          </button>
        )}
      </div>

      {/* FILTROS: estado del ticket y estado de la deuda (se aplican sobre lo ya cargado) */}
      <div className="flex flex-wrap gap-3 shrink-0">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="h-10 px-3 bg-white border-2 border-[#1E293B] text-xs font-black uppercase text-[#1E293B] outline-none cursor-pointer rounded-none"
        >
          <option value="TODOS">Estado: Todos</option>
          <option value="COMPLETADO">Estado: Completado</option>
          <option value="ANULADO">Estado: Anulado</option>
        </select>

        <select
          value={filtroDeuda}
          onChange={(e) => setFiltroDeuda(e.target.value as typeof filtroDeuda)}
          className="h-10 px-3 bg-white border-2 border-[#1E293B] text-xs font-black uppercase text-[#1E293B] outline-none cursor-pointer rounded-none"
        >
          <option value="TODOS">Deuda: Todos</option>
          <option value="PENDIENTE">Deuda: Pendiente</option>
          <option value="PAGADO">Deuda: Pagado / Sin deuda</option>
        </select>

        {(filtroEstado !== 'TODOS' || filtroDeuda !== 'TODOS') && (
          <button
            onClick={() => { setFiltroEstado('TODOS'); setFiltroDeuda('TODOS'); }}
            className="h-10 px-3 text-[#EF4444] hover:bg-[#FEF2F2] font-black text-xs uppercase cursor-pointer rounded-none border-2 border-[#EF4444]"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {/* BARRA DE CONTROLES TÉCNICOS */}
      <div className={`flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 shrink-0 ${busquedaDebounced ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* BOTONES RÁPIDOS */}
        <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3 w-full lg:w-auto">
          <button onClick={filtrarHoy} className="bg-white border-2 border-[#1E293B] px-2 sm:px-6 py-3 text-xs sm:text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            Hoy
          </button>
          <button onClick={filtrarSemana} className="bg-white border-2 border-[#1E293B] px-2 sm:px-6 py-3 text-xs sm:text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            7 Días
          </button>
          <button onClick={filtrarMes} className="bg-white border-2 border-[#1E293B] px-2 sm:px-6 py-3 text-xs sm:text-sm font-black uppercase text-[#1E293B] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer rounded-none shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            Mes
          </button>
        </div>

        {/* SELECTOR DE FECHAS PERSONALIZADO */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 bg-white border-2 border-[#E2E8F0] p-3 sm:p-4 shadow-[4px_4px_0_0_#E2E8F0] rounded-none w-full lg:w-auto">
          <div className="flex flex-col flex-1 min-w-[130px]">
            <label className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-1">Desde</label>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[#94A3B8]" />
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full min-w-0 text-sm sm:text-base font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
          <div className="hidden sm:block w-[2px] h-10 bg-[#E2E8F0]"></div>
          <div className="flex flex-col flex-1 min-w-[130px]">
            <label className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-1">Hasta</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#94A3B8]" />
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full min-w-0 text-sm sm:text-base font-black text-[#1E293B] outline-none bg-transparent uppercase cursor-pointer" />
            </div>
          </div>
          
          {/* BOTÓN LIMPIAR */}
          {(fechaInicio || fechaFin) && (
             <div className="sm:pl-4 sm:ml-2 sm:border-l-2 border-[#E2E8F0]">
               <button onClick={limpiarFiltros} className="text-[#EF4444] hover:bg-[#FEF2F2] p-2 transition-colors cursor-pointer rounded-none" title="Limpiar Filtros">
                 <RotateCcw size={16} />
               </button>
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TablaTickets tickets={ticketsFiltrados} onAnular={handleAnularTicket} onDelete={handleDeleteTicket} />
      </div>
    </div>
  );
};