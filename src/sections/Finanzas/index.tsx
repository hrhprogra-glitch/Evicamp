import { coincideBusqueda } from '../../utils/busqueda';
import { formatearCantidadDetalle } from '../../utils/formato';
// src/sections/Finanzas/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ArrowDownToLine, Lock, CreditCard, Smartphone, Banknote, ReceiptText, Search, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { CashSession, CashMovement, SuperMetricas, UnifiedItem } from './types';

import { ModalApertura } from './components/ModalApertura';
import { TablaMovimientos } from './components/TablaMovimientos';
import { ModalNuevoMovimiento } from './components/ModalNuevoMovimiento';
import { ModalCierre } from './components/ModalCierre';
import { TablaHistorial } from './components/TablaHistorial';
import { FiltroFechas } from './components/FiltroFechas';
import { ModalDetalleTicket } from '../../components/ModalDetalleTicket';
import { ModalCambioProducto } from './components/ModalCambioProducto';
import { ModalConsultarGarantia } from './components/ModalConsultarGarantia';
// de Efectivo/Yape/Tarjeta al cerrar caja.)
import { rangoUTCPeru } from '../../utils/ingresos';
import { usePermiso, useEmpleado, avisarSinPermiso } from '../../utils/permisos';
import { traerTodo } from '../../utils/traerTodo';
import { numeroTicketDe, autorDe } from '../../utils/movimientosCaja';
import { confirmar } from '../../utils/dialogos';
import { conAutorizacion } from '../../utils/autorizacion';

export const Finanzas: React.FC = () => {
  // Abrir/cerrar caja y registrar ingresos/egresos son permisos distintos
  const puedeTurno = usePermiso('caja_abrir_cerrar_turno');
  const puedeMovimientos = usePermiso('caja_ingresos_egresos');
  const puedeAnular = usePermiso('reportes_anular_ventas');
  // Sin "Ver Reportes Globales" (cajero): cierre a ciegas. No ve totales ni lo esperado en caja,
  // ni los turnos anteriores; solo las ventas y movimientos de su turno.
  const veMontos = usePermiso('reportes_ver_globales');
  const veVentasTurno = usePermiso('reportes_ver_historial_ventas') || veMontos;
  const empleado = useEmpleado();
  const [sessionActiva, setSessionActiva] = useState<CashSession | null>(null);
  const [movimientos, setMovimientos] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Clásicos y Nuevos
  const [superMetricas, setSuperMetricas] = useState<SuperMetricas | null>(null);

  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false);
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [isCambioModalOpen, setIsCambioModalOpen] = useState(false);
  const [ticketIdParaCambio, setTicketIdParaCambio] = useState<string | null>(null);
  const [isGarantiaModalOpen, setIsGarantiaModalOpen] = useState(false);

  // NUEVO: Estados y funciones para el Historial y Limpieza
  const [vistaActual, setVistaActual] = useState<'ACTUAL' | 'HISTORIAL'>('ACTUAL');
  const [pestañaFlujo, setPestañaFlujo] = useState<'INTERNO' | 'EXTERNO'>('INTERNO'); // <-- Control de Pestañas
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDeuda, setFiltroDeuda] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [historialCajas, setHistorialCajas] = useState<CashSession[]>([]);
  
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const ITEMS_POR_PAGINA = 20;

  const cargarHistorial = async (page = 1, desde = fechaDesde, hasta = fechaHasta) => {
    let query = supabase
      .from('cash_sessions')
      .select('*', { count: 'exact' })
      .eq('status', 'CLOSED');

    if (desde && hasta) {
      // 🛠️ ZONA HORARIA PERÚ (UTC-5): igual que Reportes/Resumen/Utilidades (ver
      // utils/ingresos.ts). Antes se usaba el límite UTC "pelado" (T00:00/T23:59 UTC), que
      // corre el día 5 horas en Perú: una caja abierta de noche podía aparecer en el día
      // equivocado, o desaparecer del historial al filtrar por un solo día.
      const { inicioUTC, finUTC } = rangoUTCPeru(desde, hasta);
      query = query
        .gte('opened_at', inicioUTC)
        .lt('opened_at', finUTC);
    }

    const from = (page - 1) * ITEMS_POR_PAGINA;
    const to = from + ITEMS_POR_PAGINA - 1;

    query = query.order('opened_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error cargando historial:", error);
      return;
    }

    if (data) {
      setHistorialCajas(data as CashSession[]);
      setTotalPaginas(count ? Math.ceil(count / ITEMS_POR_PAGINA) : 1);
    }
  };

  const handleFilterChange = (desde: string, hasta: string) => {
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setPaginaActual(1);
    cargarHistorial(1, desde, hasta);
  };

  useEffect(() => {
    cargarDatosCaja();

    // 🛡️ EVICAMP: Si la pestaña estuvo inactiva (u otra caja/dispositivo registró ventas),
    // al volver a mirarla se refrescan los totales para no quedar con datos viejos.
    // Se hace en modo silencioso para no tapar la pantalla con el loader cada vez que se regresa.
    const refrescarSilencioso = () => cargarDatosCaja(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refrescarSilencioso();
    };
    window.addEventListener('focus', refrescarSilencioso);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refrescarSilencioso);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const cargarDatosCaja = async (silencioso = false) => {
    if (!silencioso) setIsLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // <-- SOLUCIÓN: maybeSingle no hace explotar el sistema si la caja está cerrada

      if (sessionData) {
        setSessionActiva(sessionData as CashSession);
        
        // 1. Movimientos Manuales
        // Paginado (Supabase corta en 1000 filas); orden estable por id para que los bloques no se crucen.
        const { data: movData } = await traerTodo<any>(() => supabase.from('cash_movements').select('*').eq('session_id', sessionData.id).order('id'));
        
        // .neq('sunat_status','ANULADO') en Supabase descarta también las filas con sunat_status
        // NULL, y además necesitamos saber qué tickets anulados son de esta caja (ver DEVOLUCION).
        const { data: salesData } = await traerTodo<any>(() => supabase.from('sales').select('*').gte('created_at', sessionData.opened_at).order('id'));
        const salesIds = (salesData || []).map((s: any) => s.id);
        let saleDetailsData: any[] = [];
        if (salesIds.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < salesIds.length; i += chunkSize) {
            const chunk = salesIds.slice(i, i + chunkSize);
            const { data } = await supabase.from('sale_details').select('sale_id, product_name, quantity').in('sale_id', chunk);
            if (data) {
              saleDetailsData.push(...data);
            }
          }
        }
        const detailsBySale: Record<string, string[]> = {};
        saleDetailsData.forEach((d: any) => {
          if (!detailsBySale[d.sale_id]) detailsBySale[d.sale_id] = [];
          const qty = Number(d.quantity);
          const qtyStr = formatearCantidadDetalle(d.quantity);
          const str = qty > 1 ? `${qtyStr}x ${d.product_name}` : d.product_name;
          detailsBySale[d.sale_id].push(str);
        });
        salesData?.forEach((s: any) => {
          s.productosStr = detailsBySale[s.id]?.join(', ') || '';
        });

        // Cada movimiento cuenta en la bolsa de SU método de pago (no todo es efectivo).
        const bolsaDe = (tipo: string | null | undefined): 'efectivo' | 'yape' | 'tarjeta' => {
          const t = (tipo || 'efectivo').toLowerCase();
          if (t === 'yape' || t === 'plin' || t === 'transferencia') return 'yape';
          if (t === 'tarjeta' || t === 'card') return 'tarjeta';
          return 'efectivo';
        };

        const esAnulada = (s: any) => s.status === 'ANULADO' || s.sunat_status === 'ANULADO';
        // Tickets anulados que se vendieron en ESTA caja: su venta ya no se suma, así que su
        // contraasiento DEVOLUCION no debe restarse otra vez (sería doble descuento).
        // Reportes guarda en la descripción los últimos 6 caracteres del id ("#xxxxxx").
        const anuladasDeEstaCaja = new Set(
          (salesData || []).filter(esAnulada).map((s: any) => String(s.id).slice(-6))
        );
        // Devoluciones por ticket: el ticket anulado muestra quién la hizo y cuánto se devolvió
        // (la fila aparte de la devolución se oculta abajo para no repetir lo mismo)
        const devolucionesPorTicket = new Map<string, { monto: number; autor: string | null }>();
        (movData || []).forEach((m: any) => {
          if (m.flujo !== 'DEVOLUCION') return;
          const ticket = numeroTicketDe(m.description);
          if (!ticket) return;
          const previa = devolucionesPorTicket.get(ticket);
          devolucionesPorTicket.set(ticket, {
            monto: (previa?.monto || 0) + Number(m.amount || 0),
            autor: previa?.autor || autorDe(m.description),
          });
        });

        let gastos = 0, gastosYape = 0, gastosTarjeta = 0;
        let ingresosExtra = 0, ingresosExtraYape = 0, ingresosExtraTarjeta = 0;
        let vEfectivo = 0, vYape = 0, vTarjeta = 0;
        let dEfectivo = 0, dYape = 0, dTarjeta = 0;

        // 🔥 INGENIERÍA EVICAMP: El Trigger de la BD ya mete los abonos en cash_movements con flujo='INGRESO_FIADO'.
        movData?.forEach(m => {
          if (m.flujo === 'EXTERNO') return;
          if (m.description && m.description.toUpperCase().includes('DIFERENCIA POR CAMBIO')) return;
          const monto = Number(m.amount) || 0;
          const bolsa = bolsaDe(m.payment_type);

          if (m.type === 'INGRESO') {
            // 🔥 BYPASS TYPESCRIPT: Forzamos la validación como String puro
            if (String(m.flujo) === 'INGRESO_FIADO') {
              // Abono de deuda inyectado automáticamente por la base de datos
              if (bolsa === 'yape') dYape += monto;
              else if (bolsa === 'tarjeta') dTarjeta += monto;
              else dEfectivo += monto;
            } else {
              // Ingreso manual a caja (Ej: Sencillo, Vueltos)
              if (bolsa === 'yape') ingresosExtraYape += monto;
              else if (bolsa === 'tarjeta') ingresosExtraTarjeta += monto;
              else ingresosExtra += monto;
            }
          }
          if (m.type === 'EGRESO') {
            if (m.flujo === 'DEVOLUCION') {
              const ticket = numeroTicketDe(m.description);
              // Anulación de un ticket de esta caja: la venta ya no cuenta, no se resta de nuevo.
              if (ticket && anuladasDeEstaCaja.has(ticket)) return;
              // Si el ticket era de una caja anterior, el dinero sí sale ahora: se resta abajo.
            }
            if (bolsa === 'yape') gastosYape += monto;
            else if (bolsa === 'tarjeta') gastosTarjeta += monto;
            else gastos += monto;
          }
        });

        salesData?.forEach(s => {
          // BLOQUEO MATEMÁTICO: Ignorar tickets FIADOS y ANULADOS (una venta anulada simplemente no cuenta)
          if (s.payment_method === 'FIADO' || s.payment_type === 'FIADO' || s.status === 'FIADO') return;
          if (esAnulada(s)) return;

          vEfectivo += Number(s.amount_cash || 0);
          vYape += Number(s.amount_yape || 0) + Number(s.amount_transfer || 0);
          vTarjeta += Number(s.amount_card || 0);
        });

        const fondoInicial = Number(sessionData.opening_balance) || 0;
        const efectivoFisicoQueDebeHaber = fondoInicial + vEfectivo + dEfectivo + ingresosExtra - gastos;
        const yapeEsperado = vYape + dYape + ingresosExtraYape - gastosYape;
        const tarjetaEsperada = vTarjeta + dTarjeta + ingresosExtraTarjeta - gastosTarjeta;

        setSuperMetricas({
          fondoInicial, ingresosExtra, gastos,
          ingresosExtraYape, ingresosExtraTarjeta, gastosYape, gastosTarjeta,
          ventasEfectivo: vEfectivo, ventasYape: vYape, ventasTarjeta: vTarjeta,
          cobroDeudasEfectivo: dEfectivo, cobroDeudasYape: dYape, cobroDeudasTarjeta: dTarjeta,
          efectivoEsperadoCaja: efectivoFisicoQueDebeHaber,
          yapeEsperado, tarjetaEsperada,
          totalFacturado: vEfectivo + vYape + vTarjeta
        });

        // 🔥 ARQUITECTURA TÉCNICA: Ya no necesitamos inyectar datos falsos.
        // El Trigger de la BD nos trajo los abonos reales en 'movData'.
        
        // UNIFICACIÓN DE TICKETS Y MOVIMIENTOS PARA LA TABLA
        const fiadosMap: Record<string, any> = {};
        const idsConCredito = salesData?.filter((t: any) => Number(t.amount_credit || 0) > 0).map((t: any) => t.id) || [];
        if (idsConCredito.length > 0) {
          const { data: fiadosData } = await supabase.from('fiados').select('sale_id, customer_name, amount, paid_amount').in('sale_id', idsConCredito);
          if (fiadosData) {
            fiadosData.forEach(f => fiadosMap[f.sale_id] = f);
          }
        }

        const ticketsUnificados: UnifiedItem[] = (salesData || []).map((t: any) => {
          const fiado = t.id ? fiadosMap[String(t.id)] : null;
          const creditoOriginal = Number(t.amount_credit || 0);
          const esFiado = creditoOriginal > 0;
          return {
            id: String(t.id),
            created_at: t.created_at,
            isTicket: true,
            tipo: 'VENTA',
            descripcion: `Ticket #${String(t.id).slice(-6)}`,
            metodo_pago: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
            monto: Number(t.total) || 0,
            estado: esAnulada(t) ? 'ANULADO' : 'COMPLETADO',
            es_fiado: esFiado,
            cliente_nombre: t.customer_name || fiado?.customer_name,
            flujo: 'INTERNO', // Ventas siempre son del negocio
            monto_pagado: Number(t.amount_cash || 0) + Number(t.amount_yape || 0) + Number(t.amount_card || 0) + Number(t.amount_transfer || 0),
            monto_deuda: esFiado && fiado ? Number(fiado.amount) - Number(fiado.paid_amount) : 0,
            total: Number(t.total) || 0,
            productosStr: t.productosStr,
            vendedor: t.vendedor || null, // quién hizo la venta (lo guarda el servidor con la sesión)
            devolucion: esAnulada(t) ? devolucionesPorTicket.get(String(t.id).slice(-6)) || null : null
          };
        });

        const custIds = new Set();
        (movData || []).forEach((m: any) => {
          if (m.description) {
            const match = m.description.match(/Cliente ID: (\d+)/);
            if (match) custIds.add(match[1]);
          }
        });
        const customersMap: Record<string, string> = {};
        if (custIds.size > 0) {
          const { data: custData } = await supabase.from('customers').select('id, name').in('id', Array.from(custIds));
          if (custData) {
            custData.forEach(c => customersMap[c.id] = c.name);
          }
        }

        const movsUnificados: UnifiedItem[] = (movData || []).filter((m: any) => {
          if (m.flujo === 'DEVOLUCION') {
            const ticket = numeroTicketDe(m.description);
            if (ticket && anuladasDeEstaCaja.has(ticket)) return false;
          }
          if (m.description && m.description.toUpperCase().includes('DIFERENCIA POR CAMBIO')) {
            return false;
          }
          return true;
        }).map((m: any) => {
          let desc = m.description;
          if (desc) {
            const match = desc.match(/Cliente ID: (\d+)/);
            if (match && customersMap[match[1]]) {
              desc = desc.replace(`Cliente ID: ${match[1]}`, `Cliente: ${customersMap[match[1]]}`);
            }
          }
          return {
          id: String(m.id),
          created_at: m.created_at,
          isTicket: false,
          tipo: m.type,
          descripcion: desc,
          metodo_pago: m.payment_type,
          monto: Number(m.amount) || 0,
          flujo: m.flujo
        };
      });

        const unificados = [...movsUnificados, ...ticketsUnificados];
        unificados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setMovimientos(unificados);
      } else {
        setSessionActiva(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!silencioso) setIsLoading(false);
    }
  };

  // FUNCIÓN PARA ELIMINAR O ANULAR UNIFICADO
  const idsAnulandoRef = useRef<Set<string>>(new Set());
  const [idsAnulando, setIdsAnulando] = useState<Set<string>>(new Set());
  const [ticketSeleccionadoParaVer, setTicketSeleccionadoParaVer] = useState<string | null>(null);

  const handleDeleteMovimiento = async (idMov: string, isTicket?: boolean) => {
    if (isTicket) {
      if (!await confirmar('⚠️ ¿Seguro que deseas ELIMINAR permanentemente esta venta de la base de datos?\n(ESTO NO DEVUELVE EL STOCK. SI QUIERES DEVOLVER STOCK, USA "ANULAR/DEVOLVER" EN VEZ DE ESTE BOTÓN).')) return;
      const { error } = await supabase.from('sales').delete().eq('id', idMov);
      if (error) {
        alert('No se pudo eliminar la venta: ' + error.message);
      } else {
        cargarDatosCaja(true);
      }
      return;
    }

    const mov = movimientos.find(m => String(m.id) === String(idMov));
    if (mov && (String(mov.flujo) === 'INGRESO_FIADO' || (mov.descripcion && mov.descripcion.includes('ABONO DE FIADO')))) {
      if (!await confirmar('⚠️ ¿Seguro que deseas ANULAR este pago de fiado? La deuda regresará al cliente y el dinero se descontará de la caja.')) return;
      
      const { data: pagos } = await supabase
        .from('debt_payments')
        .select('id')
        .eq('amount', mov.monto)
        .eq('created_at', mov.created_at);
        
      if (pagos && pagos.length > 0) {
        await supabase.from('debt_payments').delete().eq('id', pagos[0].id);
      }
      
      const { error } = await supabase.from('cash_movements').delete().eq('id', idMov);
      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        cargarDatosCaja(true);
      }
      return;
    }

    if (await confirmar('⚠️ ¿Seguro que deseas ELIMINAR este movimiento? Esta acción recalculará la caja.')) {
      const { error } = await supabase.from('cash_movements').delete().eq('id', idMov);
      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        cargarDatosCaja(true);
      }
    }
  };

  const handleAnularTicket = async (id: string) => {
    if (idsAnulandoRef.current.has(id)) return;
    if (id.startsWith('ERR-')) return;
    if (!await confirmar('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock regresará y el dinero se descontará de la caja actual.')) return;
    // Sin permiso de anular (cajero): el administrador o encargado autoriza con su clave en esta pantalla
    await conAutorizacion('anular esta venta', 'reportes_anular_ventas', puedeAnular, (autorizo) => anularTicket(id, autorizo));
  };

  // autorizo: nombre del administrador que lo autorizó en la PC del cajero (null si lo hizo alguien con permiso)
  const anularTicket = async (id: string, autorizo: string | null) => {
    idsAnulandoRef.current.add(id);
    setIdsAnulando(new Set(idsAnulandoRef.current));

    try {
      const { data: venta, error: errVenta } = await supabase.from('sales').select('*').eq('id', id).single();
      if (errVenta || !venta) throw errVenta || new Error('No se encontró la venta.');
      if (venta.sunat_status === 'ANULADO') {
        alert('Este ticket ya estaba anulado.');
        return;
      }

      // Lo hace el SERVIDOR, todo junto (fn_anular_venta en servidor/sql/seguridad-sesion.sql): devuelve el
      // stock a cada lote según los movimientos de la venta, deja el movimiento ANULACION, anula la venta y su
      // fiado y registra el egreso de la devolución. Sin internet la cola lo imita y lo sube después
      // (src/utils/sinInternet.ts → IMITAR_RPC). El autor (quien autorizó) lo pone el servidor con la sesión.
      const { error: errAnular } = await supabase.rpc('fn_anular_venta', {
        p_sale_id: Number(id),
        p_sesion_caja: sessionActiva ? String(sessionActiva.id) : null,
        p_pidio: autorizo ? (empleado?.nombre || 'cajero') : null,
        p_cuando: new Date().toISOString(),
      });
      if (errAnular) throw errAnular;

      alert('✅ Ticket anulado. Stock devuelto y caja actualizada.');
      cargarDatosCaja(true);

    } catch (err: any) {
      alert('❌ Error al anular: ' + err.message);
    } finally {
      idsAnulandoRef.current.delete(id);
      setIdsAnulando(new Set(idsAnulandoRef.current));
    }
  };

  const focusPrimerRegistro = () => {
    const visibleRows = Array.from(document.querySelectorAll('tr[data-row="true"][role="button"]'))
      .filter((el): el is HTMLElement => {
        const htmlEl = el as HTMLElement;
        return !htmlEl.closest('.hidden');
      });
    const firstRow = visibleRows[0];
    if (firstRow) {
      firstRow.focus();
      firstRow.scrollIntoView({ block: 'nearest' });
    }
  };

  // Navegación de Grilla con Teclado (Patrón Selector de Evicamp)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abortar si hay algún modal abierto
      if (
        isAperturaModalOpen ||
        isMovimientoModalOpen ||
        isCierreModalOpen ||
        !!ticketSeleccionadoParaVer ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) {
        return;
      }

      const active = document.activeElement as HTMLElement;

      // 🛡️ PRIORIDAD DEL SIDEBAR: Si el sidebar está abierto, Finanzas no interfiere
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') {
        return;
      }

      // Ignorar si el foco o target es un input / textarea / select (cada uno maneja sus flechas)
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const rowSelector = 'tr[data-row="true"][role="button"]';
      const targetRow = e.target ? ((e.target as HTMLElement).closest(rowSelector) as HTMLElement) : null;

      // Si el evento se originó en un botón u otro control fuera de las filas de la tabla,
      // no debemos procesar la navegación de filas (evita saltos dobles)
      if (!targetRow && (e.target as HTMLElement)?.closest('button')) {
        return;
      }

      const currentRow = targetRow || (active ? (active.closest(rowSelector) as HTMLElement) : null);

      const getRows = () => {
        return Array.from(document.querySelectorAll(rowSelector))
          .filter((el): el is HTMLElement => {
            const htmlEl = el as HTMLElement;
            return !htmlEl.closest('.hidden');
          });
      };

      if (currentRow) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          const rows = getRows();
          const rowIndex = rows.indexOf(currentRow);

          if (e.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) {
              nextRow.focus();
              nextRow.scrollIntoView({ block: 'nearest' });
            } else if (vistaActual === 'HISTORIAL') {
              const btnAntBottom = document.getElementById('btn-historial-anterior-bottom');
              if (btnAntBottom) {
                btnAntBottom.focus();
                btnAntBottom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) {
              const prevRow = rows[rowIndex - 1];
              if (prevRow) {
                prevRow.focus();
                prevRow.scrollIntoView({ block: 'nearest' });
              }
            } else {
              // Fila 0: Subir a la interfaz superior
              if (vistaActual === 'ACTUAL') {
                const searchInput = document.getElementById('buscador-finanzas') as HTMLInputElement | null;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              } else {
                const buscadorHistorial = document.getElementById('buscador-historial-cajas') as HTMLInputElement | null;
                if (buscadorHistorial) {
                  buscadorHistorial.focus();
                  buscadorHistorial.select();
                  buscadorHistorial.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                  const btnAnt = document.getElementById('btn-historial-anterior');
                  if (btnAnt) {
                    btnAnt.focus();
                    btnAnt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  } else {
                    const fechaInput = document.getElementById('filtro-fecha-desde-finanzas') as HTMLInputElement | null;
                    if (fechaInput) {
                      fechaInput.focus();
                      fechaInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }
                }
              }
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            // Navegación horizontal DENTRO de la fila hacia botones de acción
            const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll('button:not([disabled])'))] as HTMLElement[];
            const focusIndex = focusables.indexOf(active);

            if (e.key === 'ArrowRight') {
              const nextTarget = focusables[focusIndex + 1];
              if (nextTarget) nextTarget.focus();
            } else if (e.key === 'ArrowLeft') {
              const prevTarget = focusables[focusIndex - 1];
              if (prevTarget) prevTarget.focus();
            }
          }
        } else if (e.key === 'Escape') {
          if (vistaActual === 'ACTUAL') {
            const searchInput = document.getElementById('buscador-finanzas') as HTMLInputElement | null;
            if (searchInput) {
              e.preventDefault();
              searchInput.focus();
              searchInput.select();
            }
          } else {
            const fechaInput = document.getElementById('filtro-fecha-desde-finanzas') as HTMLInputElement | null;
            if (fechaInput) {
              e.preventDefault();
              fechaInput.focus();
            }
          }
        }
      } else {
        // Rescate de foco si el usuario está en body o contenedor general
        if (e.key === 'ArrowUp') {
          // 🛡️ TOPE: Si el foco está en un botón o control superior, actuar como límite y no devolver el foco abajo
          if (active && (active.tagName === 'BUTTON' || active.closest('button'))) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          if (vistaActual === 'ACTUAL') {
            const searchInput = document.getElementById('buscador-finanzas') as HTMLInputElement | null;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          } else {
            document.getElementById('filtro-fecha-desde-finanzas')?.focus();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const rows = getRows();
          if (rows.length > 0) {
            rows[0].focus();
            rows[0].scrollIntoView({ block: 'nearest' });
          } else {
            if (vistaActual === 'ACTUAL') {
              document.getElementById('buscador-finanzas')?.focus();
            } else {
              document.getElementById('filtro-fecha-desde-finanzas')?.focus();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isAperturaModalOpen,
    isMovimientoModalOpen,
    isCierreModalOpen,
    ticketSeleccionadoParaVer,
    vistaActual,
    sessionActiva,
    isLoading
  ]);

  // Auto-Focus Magnet (Patrón Selector Evicamp)
  useEffect(() => {
    if (isLoading) return;

    const enfocarBuscador = () => {
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) return;

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      // 🛡️ Si el usuario ya está interactuando con un botón, input, select o fila de la tabla, NO robarle el foco
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#evicamp-sidebar')) {
        const tag = active.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
        if (active.closest('tr[data-row="true"]')) return;
        if (active.getAttribute('role') === 'button') return;
      }

      if (vistaActual === 'ACTUAL') {
        const searchInput = document.getElementById('buscador-finanzas') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          const btnAperturar = document.getElementById('btn-aperturar-caja');
          if (btnAperturar) {
            btnAperturar.focus();
          } else {
            document.getElementById('btn-ver-historial')?.focus();
          }
        }
      } else {
        const dateInput = document.getElementById('filtro-fecha-desde-finanzas') as HTMLInputElement | null;
        if (dateInput) {
          dateInput.focus();
          dateInput.select();
        } else {
          document.getElementById('btn-ver-historial')?.focus();
        }
      }
    };

    const enforceFocus = () => {
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) return;

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#evicamp-sidebar')) {
        const tag = active.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
        if (active.closest('tr[data-row="true"]')) return;
        if (active.getAttribute('role') === 'button') return;
      }

      enfocarBuscador();
    };

    const handleWindowFocus = () => setTimeout(enforceFocus, 50);
    const handleGlobalClick = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    // Forzar el foco de inmediato al terminar la carga / entrar a Finanzas
    enfocarBuscador();
    const t1 = setTimeout(enfocarBuscador, 50);
    const t2 = setTimeout(enfocarBuscador, 150);
    const t3 = setTimeout(enfocarBuscador, 300);
    const t4 = setTimeout(enfocarBuscador, 600);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [vistaActual, sessionActiva, isLoading]);

  if (isLoading) return <div className="flex h-full items-center justify-center font-mono">Calculando Bóveda...</div>;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono">
      
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-end gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
            <Wallet size={24} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-[var(--color-ink)] uppercase tracking-tighter">
              Tesorería
            </h1>
            <p className="text-[var(--color-muted)] text-xs font-bold tracking-widest uppercase mt-1">
              Arqueo de Yape, Efectivo y Deudas en tiempo real
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            id="btn-ver-historial"
            onClick={() => {
              if (vistaActual === 'ACTUAL' && !veMontos) {
                avisarSinPermiso('ver los turnos anteriores (solo el administrador o encargado)');
                return;
              }
              if (vistaActual === 'ACTUAL') {
                setVistaActual('HISTORIAL');
                cargarHistorial();
              } else {
                setVistaActual('ACTUAL');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const btnNext = document.getElementById('btn-nuevo-movimiento') || document.getElementById('btn-aperturar-caja');
                if (btnNext) btnNext.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (vistaActual === 'ACTUAL') {
                  const b = document.getElementById('buscador-finanzas');
                  if (b) {
                    b.focus();
                  } else {
                    document.getElementById('btn-aperturar-caja')?.focus();
                  }
                } else {
                  document.getElementById('filtro-fecha-desde-finanzas')?.focus();
                }
              }
            }}
            className="flex-1 sm:flex-none justify-center bg-[var(--color-bg)] text-[var(--color-ink)] px-4 sm:px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-[4px_4px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer mr-2 flex items-center gap-2"
          >
            <ReceiptText size={16} /> {vistaActual === 'ACTUAL' ? 'Ver Historial' : 'Volver a Caja'}
          </button>

          {vistaActual === 'ACTUAL' && (
            !sessionActiva ? (puedeTurno && (
              <button 
                id="btn-aperturar-caja"
                onClick={() => setIsAperturaModalOpen(true)} 
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-ver-historial')?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-ver-historial')?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-ver-historial')?.focus();
                  }
                }}
                className="flex-1 sm:flex-none bg-[var(--color-accent)] text-white px-4 sm:px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-[0.2em] shadow-[4px_4px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
              >
                Aperturar Caja
              </button>)
            ) : (
              <>
                {puedeMovimientos && (
                <button 
                  id="btn-nuevo-movimiento"
                  onClick={() => setIsMovimientoModalOpen(true)} 
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      document.getElementById('btn-ver-historial')?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      document.getElementById('btn-consultar-garantia')?.focus();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const filtroEst = document.getElementById('filtro-estado-finanzas');
                      if (filtroEst) filtroEst.focus();
                      else document.getElementById('buscador-finanzas')?.focus();
                    }
                  }}
                  className="flex-1 sm:flex-none justify-center bg-white text-[var(--color-ink)] px-4 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
                >
                  + Nuevo Movimiento
                </button>
                )}

                <button 
                  id="btn-consultar-garantia"
                  onClick={() => setIsGarantiaModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const btnPrev = document.getElementById('btn-nuevo-movimiento') || document.getElementById('btn-ver-historial');
                      btnPrev?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      document.getElementById('btn-cerrar-caja')?.focus();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      document.getElementById('buscador-finanzas')?.focus();
                    }
                  }}
                  className="flex-1 sm:flex-none justify-center bg-white text-emerald-800 border-2 border-[var(--color-ink)] px-3.5 py-3 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-[4px_4px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
                  title="Consultar vigencia de garantía y serie/IMEI"
                >
                  <ShieldCheck size={15} /> Garantías
                </button>

                {puedeTurno && (
                <button 
                  id="btn-cerrar-caja"
                  onClick={() => setIsCierreModalOpen(true)} 
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const btnPrev = document.getElementById('btn-consultar-garantia') || document.getElementById('btn-nuevo-movimiento') || document.getElementById('btn-ver-historial');
                      if (btnPrev) btnPrev.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const filtroDeuda = document.getElementById('filtro-deuda-finanzas');
                      if (filtroDeuda) filtroDeuda.focus();
                      else document.getElementById('buscador-finanzas')?.focus();
                    }
                  }}
                  className="flex-1 sm:flex-none justify-center bg-[var(--color-danger)] text-white px-4 sm:px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
                >
                  <Lock size={16} /> Cerrar Caja
                </button>
                )}
              </>
            )
          )}
        </div>
      </div>

      {vistaActual === 'HISTORIAL' ? (
        <div className="flex flex-col h-full min-h-0">
          <FiltroFechas onFilter={handleFilterChange} />
          <TablaHistorial 
            historialCajas={historialCajas} 
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onPageChange={(nuevaPagina) => {
              setPaginaActual(nuevaPagina);
              cargarHistorial(nuevaPagina);
            }}
            onAnular={handleAnularTicket}
            onDelete={handleDeleteMovimiento}
            onCambiarProducto={(id) => {
              setTicketIdParaCambio(id);
              setIsCambioModalOpen(true);
            }}
          />
        </div>
      ) : sessionActiva && superMetricas ? (
        <div className="flex flex-col gap-4 sm:gap-6 pb-8 lg:pr-2">

          {veMontos ? (
          <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 shrink-0">

            {/* PANEL MAESTRO DE RECAUDACIÓN (ESTILO EVICAMP) */}

            <div className="xl:w-[25%] flex flex-col justify-center items-center bg-[var(--color-ink)] border border-[var(--color-ink)] rounded-none p-4 sm:p-6 text-center shadow-none">

              <span className="text-[var(--color-muted)] text-xs sm:text-[10px] 2xl:text-xs uppercase tracking-widest font-bold">Gran Total de ESTA Caja</span>

              <h1 className="text-white text-3xl sm:text-4xl 2xl:text-5xl font-mono font-black mt-2">

                S/ {(superMetricas.efectivoEsperadoCaja + superMetricas.yapeEsperado + superMetricas.tarjetaEsperada).toFixed(2)}

              </h1>

              <p className="text-[var(--color-subtle)] text-[10px] mt-2 uppercase max-w-[200px] xl:max-w-full">Incluye Efectivo (con fondo inicial), Yape, Transferencias y Tarjetas de ESTE turno</p>

            </div>


            {/* SÚPER PANEL DE MÉTRICAS */}

            <div className="xl:w-[75%] grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 flex flex-col justify-between transition-transform hover:-translate-y-1">
               <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-2">
                 <span className="w-6 h-6 flex items-center justify-center bg-[var(--color-bg)] border-2 border-[var(--color-ink)]"><Banknote size={12} className="text-[var(--color-ink)]"/></span> 
                 Efectivo Esperado
               </p>
               <p className="text-xl sm:text-3xl font-black text-[var(--color-accent)] mt-2">S/ {superMetricas.efectivoEsperadoCaja.toFixed(2)}</p>
               <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase mt-2 border-t border-[var(--color-border)] pt-2">(Fondo + Ventas Físicas + Cobros - Gastos)</p>
            </div>
            
            <div className="bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 transition-transform hover:-translate-y-1">
               <p className="text-[12px] font-black text-[var(--color-info)] uppercase tracking-widest flex items-center gap-2">
                 <span className="w-6 h-6 flex items-center justify-center bg-blue-50 border-2 border-[var(--color-info)]"><Smartphone size={12} className="text-[var(--color-info)]"/></span> 
                 Yape / Transf
               </p>
               <p className="text-xl sm:text-2xl font-black text-[var(--color-ink)] mt-1">S/ {superMetricas.yapeEsperado.toFixed(2)}</p>
               <div className="text-[11px] font-bold text-[var(--color-muted)] uppercase mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
                 <p>Ventas: S/ {superMetricas.ventasYape.toFixed(2)}</p>
                 <p>Cobros: S/ {superMetricas.cobroDeudasYape.toFixed(2)}</p>
                 {superMetricas.ingresosExtraYape > 0 && <p>Ingresos: S/ {superMetricas.ingresosExtraYape.toFixed(2)}</p>}
                 {superMetricas.gastosYape > 0 && <p className="text-[var(--color-danger)]">Egresos: -S/ {superMetricas.gastosYape.toFixed(2)}</p>}
               </div>
            </div>

            <div className="bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 transition-transform hover:-translate-y-1">
               <p className="text-[12px] font-black text-[var(--color-purple)] uppercase tracking-widest flex items-center gap-2">
                 <span className="w-6 h-6 flex items-center justify-center bg-purple-50 border-2 border-[var(--color-purple)]"><CreditCard size={12} className="text-[var(--color-purple)]"/></span> 
                 Pagos Tarjeta
               </p>
               <p className="text-xl sm:text-2xl font-black text-[var(--color-ink)] mt-1">S/ {superMetricas.tarjetaEsperada.toFixed(2)}</p>
               <div className="text-[11px] font-bold text-[var(--color-muted)] uppercase mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
                 <p>Ventas: S/ {superMetricas.ventasTarjeta.toFixed(2)}</p>
                 {superMetricas.cobroDeudasTarjeta > 0 && <p>Cobros: S/ {superMetricas.cobroDeudasTarjeta.toFixed(2)}</p>}
                 {superMetricas.ingresosExtraTarjeta > 0 && <p>Ingresos: S/ {superMetricas.ingresosExtraTarjeta.toFixed(2)}</p>}
                 {superMetricas.gastosTarjeta > 0 && <p className="text-[var(--color-danger)]">Egresos: -S/ {superMetricas.gastosTarjeta.toFixed(2)}</p>}
               </div>
            </div>

            <div className="bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] shadow-[4px_4px_0_0_var(--color-danger)] p-4 transition-transform hover:-translate-y-1">
               <p className="text-[12px] font-black text-[var(--color-danger)] uppercase tracking-widest flex items-center gap-2">
                 <span className="w-6 h-6 flex items-center justify-center bg-white border-2 border-[var(--color-danger)]"><ArrowDownToLine size={12} className="text-[var(--color-danger)]"/></span> 
                 Gastos y Retiros
               </p>
               <p className="text-xl sm:text-2xl font-black text-[var(--color-danger)] mt-1">S/ {superMetricas.gastos.toFixed(2)}</p>
               <p className="text-[11px] font-bold text-[var(--color-danger)] uppercase mt-2 border-t border-[var(--color-danger)]/20 pt-2">Salió del cajón</p>
                 </div>
               </div>
               </div>
          ) : (
            // Cierre a ciegas: el cajero no ve cuánto debería haber; lo cuenta al cerrar y recién ahí ve la diferencia
            <div className="bg-[var(--color-bg)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 flex items-center gap-3 shrink-0">
              <Lock size={18} className="text-[var(--color-ink)] shrink-0" />
              <p className="text-xs font-black uppercase tracking-widest text-[var(--color-ink)]">
                Turno abierto · Los totales de caja los ve el administrador. Al cerrar, cuenta el dinero y el sistema te dirá si cuadra.
              </p>
            </div>
          )}

          <div className="bg-white border-2 border-[var(--color-border)] shadow-[4px_4px_0_0_var(--color-border)] sm:shadow-[8px_8px_0_0_var(--color-border)] flex flex-col">
             
             <div className="p-3 sm:p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3">
               <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-[var(--color-ink)] text-white w-10 justify-center">
                   <Search size={16} />
                 </div>
                <input
                  id="buscador-finanzas"
                  type="text"
                  placeholder="BUSCAR POR CLIENTE, N° TICKET O DETALLE"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      e.stopPropagation();
                      focusPrimerRegistro();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                      document.getElementById('btn-ver-historial')?.focus();
                    } else if (e.key === 'ArrowRight') {
                      const input = e.currentTarget;
                      if (input.selectionStart === input.value.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('filtro-categoria-finanzas')?.focus();
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setSearchTerm('');
                    }
                  }}
                  className="w-full pl-12 pr-3 py-2.5 text-xs font-bold uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                />
               </div>
               <select
                 id="filtro-categoria-finanzas"
                 value={filtroCategoria}
                 onChange={(e) => setFiltroCategoria(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'ArrowUp') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('btn-ver-historial')?.focus();
                   } else if (e.key === 'ArrowDown') {
                     e.preventDefault();
                     e.stopPropagation();
                     focusPrimerRegistro();
                   } else if (e.key === 'ArrowLeft') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('buscador-finanzas')?.focus();
                   } else if (e.key === 'ArrowRight') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('filtro-estado-finanzas')?.focus();
                   }
                 }}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Tipo: TODOS</option>
                 <option value="VENTA">Solo Ventas</option>
                 <option value="INGRESO">Solo Ingresos</option>
                 <option value="EGRESO">Solo Egresos</option>
               </select>
               <select
                 id="filtro-estado-finanzas"
                 value={filtroEstado}
                 onChange={(e) => setFiltroEstado(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'ArrowUp') {
                     e.preventDefault();
                     e.stopPropagation();
                     const btnNuevo = document.getElementById('btn-nuevo-movimiento');
                     if (btnNuevo) btnNuevo.focus();
                     else document.getElementById('btn-ver-historial')?.focus();
                   } else if (e.key === 'ArrowDown') {
                     e.preventDefault();
                     e.stopPropagation();
                     focusPrimerRegistro();
                   } else if (e.key === 'ArrowLeft') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('filtro-categoria-finanzas')?.focus();
                   } else if (e.key === 'ArrowRight') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('filtro-deuda-finanzas')?.focus();
                   }
                 }}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Estado: TODOS</option>
                 <option value="COMPLETADO">COMPLETADOS</option>
                 <option value="ANULADO">ANULADOS</option>
               </select>
               <select
                 id="filtro-deuda-finanzas"
                 value={filtroDeuda}
                 onChange={(e) => setFiltroDeuda(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'ArrowUp') {
                     e.preventDefault();
                     e.stopPropagation();
                     const btnCerrar = document.getElementById('btn-cerrar-caja');
                     if (btnCerrar) btnCerrar.focus();
                     else document.getElementById('btn-ver-historial')?.focus();
                   } else if (e.key === 'ArrowDown') {
                     e.preventDefault();
                     e.stopPropagation();
                     focusPrimerRegistro();
                   } else if (e.key === 'ArrowLeft') {
                     e.preventDefault();
                     e.stopPropagation();
                     document.getElementById('filtro-estado-finanzas')?.focus();
                   }
                 }}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Deuda: TODAS</option>
                 <option value="CON_DEUDA">CON DEUDA</option>
                 <option value="SIN_DEUDA">SIN DEUDA</option>
               </select>
             </div>
             
             {!veVentasTurno && (
               <p className="p-3 text-xs font-black uppercase tracking-widest text-[var(--color-muted)] border-b border-[var(--color-border)]">🔒 Tu cuenta no tiene permiso para ver las ventas del turno.</p>
             )}
             {/* TABLA FILTRADA CON FUNCIÓN ONDELTE */}
             <TablaMovimientos 
               movimientos={(veVentasTurno ? movimientos : []).filter(m => {
                  // SEARCH
                  if (searchTerm && searchTerm.trim()) {
                     const ticketId = m.isTicket ? ('#' + String(m.id).slice(-6)) : '';
                     const match = coincideBusqueda(
                       [m.descripcion, m.cliente_nombre, m.productosStr, ticketId, String(m.monto)],
                       searchTerm
                     );
                     if (!match) return false;
                  }
                 // ESTADO (Por defecto completado si no tiene estado)
                 const st = m.estado || 'COMPLETADO';
                 if (filtroEstado !== 'TODOS' && st !== filtroEstado) return false;
                 // DEUDA
                 if (filtroDeuda === 'CON_DEUDA' && !(Number(m.monto_deuda) > 0)) return false;
                 if (filtroDeuda === 'SIN_DEUDA' && Number(m.monto_deuda) > 0) return false;
                 // CATEGORIA
                 if (filtroCategoria !== 'TODOS') {
                   if (filtroCategoria === 'VENTA' || filtroCategoria === 'VENTAS') {
                     if (!m.isTicket && m.tipo !== 'VENTA') return false;
                   } else if (filtroCategoria === 'INGRESO') {
                     if (m.tipo !== 'INGRESO') return false;
                   } else if (filtroCategoria === 'EGRESO') {
                     if (m.tipo !== 'EGRESO') return false;
                   }
                 }
                 return true;
               })} 
               onDelete={handleDeleteMovimiento}
               onVerTicket={(id) => setTicketSeleccionadoParaVer(id)}
               onAnularTicket={handleAnularTicket}
               onCambiarProducto={(id) => {
                 setTicketIdParaCambio(id);
                 setIsCambioModalOpen(true);
               }}
               idsAnulando={idsAnulando}
             />
          </div>
        </div>
      ) : (
        <div className="flex-1 border-4 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center p-6">
           <Wallet size={64} className="text-[var(--color-line-light)] mb-4" />
           <h2 className="text-[var(--color-ink)] font-black text-xl uppercase tracking-widest mb-2">Caja Cerrada</h2>
        </div>
      )}

      <ModalApertura isOpen={isAperturaModalOpen} onClose={() => setIsAperturaModalOpen(false)} onSuccess={cargarDatosCaja} />
      {sessionActiva && (
        <>
          <ModalNuevoMovimiento isOpen={isMovimientoModalOpen} onClose={() => setIsMovimientoModalOpen(false)} onSuccess={cargarDatosCaja} sessionId={sessionActiva.id} />
          {superMetricas && (
            <ModalCierre isOpen={isCierreModalOpen} onClose={() => setIsCierreModalOpen(false)} onSuccess={cargarDatosCaja} sessionActiva={sessionActiva} superMetricas={superMetricas} aCiegas={!veMontos} />
          )}
        </>
      )}

      <ModalDetalleTicket 
        ticketId={ticketSeleccionadoParaVer} 
        onClose={() => setTicketSeleccionadoParaVer(null)} 
        onCambiarProducto={(id) => {
          setTicketSeleccionadoParaVer(null);
          setTicketIdParaCambio(id);
          setIsCambioModalOpen(true);
        }}
      />

      <ModalCambioProducto
        isOpen={isCambioModalOpen}
        onClose={() => {
          setIsCambioModalOpen(false);
          setTicketIdParaCambio(null);
        }}
        initialSaleId={ticketIdParaCambio}
        sessionId={sessionActiva?.id}
        onCambioGuardado={() => {
          void cargarDatosCaja();
        }}
      />

      <ModalConsultarGarantia
        isOpen={isGarantiaModalOpen}
        onClose={() => setIsGarantiaModalOpen(false)}
      />
    </div>
  );
};