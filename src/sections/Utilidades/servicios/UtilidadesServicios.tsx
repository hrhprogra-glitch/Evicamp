// Utilidades de Talleres y servicios (SiuMax Nego, paso 3h, parte 2). Base: "Gráficos" (Utilidades) de SiuMax Servic,
// con los cálculos corregidos para las tablas reales de la base:
// - Salidas: su código es `codigo` (no `numero`) y la cancelada es CANCELADO.
// - Consumos de contratos: costo en `subtotal_costo` y nombre en `descripcion` (Servic leía columnas que no existen).
// - Visitas hechas: estado REALIZADO y `fecha_ejecutada`.
// - Saldos: se calculan (total − pagado); las cuotas de contratos no guardan saldo.
// - NUEVO: el Taller (órdenes con su total y el costo de sus repuestos) en Rentabilidad, Materiales y Cobranzas.
// - Cotizaciones: solo las aprobadas o convertidas en trabajo, en soles y que NO se vendieron en la Caja (esas ya
//   están en la pestaña Productos).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { HeaderServicios } from './HeaderServicios';
import { TabRentabilidad } from './TabRentabilidad';
import { TabTecnicos } from './TabTecnicos';
import { TabMateriales } from './TabMateriales';
import { TabCobranzas } from './TabCobranzas';
import type { PestanaUtilidades } from '../PestanasUtilidades';
import type { PeriodoFiltro, MetricasGlobales, ItemRentabilidad, ItemTecnico, ItemMaterialTop, ItemCuentaPorCobrar, PestanaServicios } from './types';

interface Props {
  pestana: PestanaServicios;
  onCambiarPestana: (p: PestanaUtilidades) => void;
  conComercio: boolean;
}

type Fila = Record<string, any>;
const num = (v: unknown) => Number(v) || 0;
const campoFecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const UtilidadesServicios: React.FC<Props> = ({ pestana, onCambiarPestana, conComercio }) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoRentabilidad, setFiltroTipoRentabilidad] = useState('TODOS');
  const [filtroTipoCobranzas, setFiltroTipoCobranzas] = useState('TODOS');
  const hoy = new Date();
  const [fechaDesde, setFechaDesde] = useState(campoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
  const [fechaHasta, setFechaHasta] = useState(campoFecha(hoy));
  const [cargando, setCargando] = useState(true);
  const [d, setD] = useState<Record<string, Fila[]>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const tablas: [string, string][] = [
        ['cotizaciones', 'id, numero, estado, total, adelanto, moneda, sale_id, salida_id, observaciones, cliente_nombre, fecha_emision, fecha_vencimiento, created_at'],
        ['salidas', 'id, codigo, tipo, estado, customer_id, observaciones, created_at'],
        ['salida_items', 'salida_id, product_id, descripcion, unidad, cantidad, cantidad_devuelta, costo_unitario'],
        ['salida_trabajadores', 'salida_id, trabajador_id'],
        ['contratos', 'id, codigo, titulo, estado, customer_id, created_at'],
        ['contrato_visitas', 'id, contrato_id, tecnico_id, estado, fecha_programada, fecha_ejecutada, created_at'],
        ['contrato_consumos', 'visita_id, product_id, descripcion, unidad, cantidad, costo_unitario, subtotal_costo, created_at'],
        ['contrato_cobros', 'id, contrato_id, periodo, monto, monto_pagado, estado, fecha_emision, fecha_vencimiento, created_at'],
        ['agenda_trabajos', 'id, estado, fecha, created_at'],
        ['agenda_trabajadores', 'trabajo_id, trabajador_id'],
        ['trabajadores', 'id, nombre, cargo, estado'],
        ['taller_ordenes', 'id, codigo, tipo_equipo, marca, modelo, customer_id, tecnico_id, estado, total, adelanto, fecha_ingreso, fecha_entrega, created_at'],
        ['taller_repuestos', 'orden_id, product_id, descripcion, cantidad, costo_unitario'],
        ['customers', 'id, name'],
      ];
      const r = await Promise.all(tablas.map(([t, c]) => traerTodo(() => supabase.from(t).select(c).order('id'))));
      const datos: Record<string, Fila[]> = {};
      tablas.forEach(([t], i) => { datos[t] = (r[i].data as Fila[]) || []; if (r[i].error) console.error('Utilidades de servicios:', t, r[i].error); });
      setD(datos);
    } catch (err) {
      console.error('Utilidades de servicios: no se pudieron cargar los datos', err);
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const rango = useMemo(() => {
    const a = new Date();
    let desde: Date; let hasta: Date;
    if (periodo === 'hoy') { desde = new Date(a.getFullYear(), a.getMonth(), a.getDate()); hasta = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59); }
    else if (periodo === 'semana') { const ds = a.getDay() || 7; desde = new Date(a.getFullYear(), a.getMonth(), a.getDate() - ds + 1); hasta = new Date(a.getFullYear(), a.getMonth(), a.getDate() + (7 - ds), 23, 59, 59); }
    else if (periodo === 'anio') { desde = new Date(a.getFullYear(), 0, 1); hasta = new Date(a.getFullYear(), 11, 31, 23, 59, 59); }
    else if (periodo === 'personalizado') { desde = new Date(`${fechaDesde}T00:00:00`); hasta = new Date(`${fechaHasta}T23:59:59`); }
    else { desde = new Date(a.getFullYear(), a.getMonth(), 1); hasta = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59); }
    return { desde: desde.getTime(), hasta: hasta.getTime() };
  }, [periodo, fechaDesde, fechaHasta]);
  // Fechas "aaaa-mm-dd" (sin hora) se toman al mediodía local para no caer en el día anterior
  const enPeriodo = (f: string | null | undefined) => {
    if (!f) return false;
    const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(f) ? `${f}T12:00:00` : f).getTime();
    return t >= rango.desde && t <= rango.hasta;
  };

  const cliente = useMemo(() => new Map((d.customers || []).map((c) => [Number(c.id), c.name as string])), [d]);
  const itemsPorSalida = useMemo(() => {
    const m = new Map<number, Fila[]>();
    (d.salida_items || []).forEach((it) => { const k = Number(it.salida_id); m.set(k, [...(m.get(k) || []), it]); });
    return m;
  }, [d]);
  const costoSalida = (id: number) => (itemsPorSalida.get(id) || []).reduce((s, it) => s + Math.max(0, num(it.cantidad) - num(it.cantidad_devuelta)) * num(it.costo_unitario), 0);
  const repuestosPorOrden = useMemo(() => {
    const m = new Map<number, Fila[]>();
    (d.taller_repuestos || []).forEach((r) => { const k = Number(r.orden_id); m.set(k, [...(m.get(k) || []), r]); });
    return m;
  }, [d]);
  const fechaOrden = (o: Fila) => (o.estado === 'ENTREGADO' && o.fecha_entrega ? o.fecha_entrega : o.fecha_ingreso || o.created_at);
  const ordenValida = (o: Fila) => o.estado !== 'CANCELADO' && o.estado !== 'ANULADO';
  const cotiDeServicio = (c: Fila) => (c.estado === 'APROBADA' || c.estado === 'CONVERTIDA') && !c.sale_id && c.moneda !== 'USD';

  // Rentabilidad: cotizaciones de servicio, salidas sin cotización, contratos (cuotas del período) y taller
  const itemsRentabilidad = useMemo<ItemRentabilidad[]>(() => {
    const list: ItemRentabilidad[] = [];
    const salidasConCoti = new Set<number>();
    (d.cotizaciones || []).filter((c) => cotiDeServicio(c) && enPeriodo(c.fecha_emision || c.created_at)).forEach((c) => {
      const ingreso = num(c.total);
      const costo = c.salida_id ? costoSalida(Number(c.salida_id)) : 0;
      if (c.salida_id) salidasConCoti.add(Number(c.salida_id));
      list.push({ id: c.id, tipo: c.salida_id ? 'OBRA' : 'SERVICIO', codigo: c.numero || `COT-${c.id}`, nombre: c.observaciones || 'Servicio', cliente: c.cliente_nombre || 'Cliente', ingreso, costoMateriales: costo, utilidad: ingreso - costo, margen: ingreso > 0 ? ((ingreso - costo) / ingreso) * 100 : 0, fecha: c.fecha_emision || c.created_at });
    });
    (d.salidas || []).filter((s) => s.estado !== 'CANCELADO' && !salidasConCoti.has(Number(s.id)) && enPeriodo(s.created_at)).forEach((s) => {
      const costo = costoSalida(Number(s.id));
      list.push({ id: s.id, tipo: s.tipo === 'OBRA' ? 'OBRA' : 'SERVICIO', codigo: s.codigo || `SAL-${s.id}`, nombre: s.observaciones || `Salida (${String(s.tipo || '').toLowerCase()}) sin cotización`, cliente: cliente.get(Number(s.customer_id)) || '—', ingreso: 0, costoMateriales: costo, utilidad: -costo, margen: 0, fecha: s.created_at });
    });
    const visitasPorContrato = new Map<number, Set<number>>();
    (d.contrato_visitas || []).forEach((v) => { const k = Number(v.contrato_id); const set = visitasPorContrato.get(k) || new Set(); set.add(Number(v.id)); visitasPorContrato.set(k, set); });
    (d.contratos || []).forEach((con) => {
      const cuotas = (d.contrato_cobros || []).filter((cb) => cb.contrato_id === con.id && cb.estado !== 'ANULADO' && enPeriodo(cb.fecha_emision || cb.created_at));
      const vIds = visitasPorContrato.get(Number(con.id)) || new Set<number>();
      const consumos = (d.contrato_consumos || []).filter((cs) => vIds.has(Number(cs.visita_id)) && enPeriodo(cs.created_at));
      if (cuotas.length === 0 && consumos.length === 0) return;
      const ingreso = cuotas.reduce((s, cb) => s + num(cb.monto), 0);
      const costo = consumos.reduce((s, cs) => s + (num(cs.subtotal_costo) || num(cs.cantidad) * num(cs.costo_unitario)), 0);
      list.push({ id: con.id, tipo: 'CONTRATO', codigo: con.codigo || `CON-${con.id}`, nombre: con.titulo || 'Contrato', cliente: cliente.get(Number(con.customer_id)) || '—', ingreso, costoMateriales: costo, utilidad: ingreso - costo, margen: ingreso > 0 ? ((ingreso - costo) / ingreso) * 100 : 0, fecha: con.created_at });
    });
    (d.taller_ordenes || []).filter((o) => ordenValida(o) && enPeriodo(fechaOrden(o))).forEach((o) => {
      const ingreso = num(o.total);
      const costo = (repuestosPorOrden.get(Number(o.id)) || []).reduce((s, r) => s + num(r.cantidad) * num(r.costo_unitario), 0);
      list.push({ id: o.id, tipo: 'TALLER', codigo: o.codigo || `ORD-${o.id}`, nombre: [o.tipo_equipo, o.marca, o.modelo].filter(Boolean).join(' · ') || 'Orden de taller', cliente: cliente.get(Number(o.customer_id)) || '—', ingreso, costoMateriales: costo, utilidad: ingreso - costo, margen: ingreso > 0 ? ((ingreso - costo) / ingreso) * 100 : 0, fecha: fechaOrden(o) });
    });
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [d, rango, cliente, itemsPorSalida, repuestosPorOrden]);

  // Técnicos: trabajos de la Agenda, salidas, visitas hechas (y órdenes del taller como "trabajos")
  const itemsTecnicos = useMemo<ItemTecnico[]>(() => (d.trabajadores || []).filter((t) => t.estado !== 'INACTIVO').map((tr) => {
    const ids = new Set((d.agenda_trabajadores || []).filter((x) => x.trabajador_id === tr.id).map((x) => Number(x.trabajo_id)));
    const trabs = (d.agenda_trabajos || []).filter((t) => ids.has(Number(t.id)) && t.estado !== 'CANCELADO' && enPeriodo(t.fecha || t.created_at));
    const ordenes = (d.taller_ordenes || []).filter((o) => o.tecnico_id === tr.id && ordenValida(o) && enPeriodo(fechaOrden(o)));
    const asignados = trabs.length + ordenes.length;
    const completados = trabs.filter((t) => t.estado === 'COMPLETADO').length + ordenes.filter((o) => o.estado === 'ENTREGADO' || o.estado === 'LISTO').length;
    const salIds = new Set((d.salida_trabajadores || []).filter((x) => x.trabajador_id === tr.id).map((x) => Number(x.salida_id)));
    return {
      id: tr.id, nombre: tr.nombre, cargo: tr.cargo || 'Técnico',
      trabajosAsignados: asignados, trabajosCompletados: completados,
      trabajosSeguimiento: trabs.filter((t) => t.estado === 'SEGUIMIENTO').length,
      salidasParticipadas: (d.salidas || []).filter((s) => salIds.has(Number(s.id)) && s.estado !== 'CANCELADO' && enPeriodo(s.created_at)).length,
      visitasRealizadas: (d.contrato_visitas || []).filter((v) => v.tecnico_id === tr.id && v.estado === 'REALIZADO' && enPeriodo(v.fecha_ejecutada || v.fecha_programada)).length,
      eficiencia: asignados > 0 ? (completados / asignados) * 100 : 0,
    };
  }), [d, rango]);

  // Materiales: lo que salió en salidas (neto de devoluciones) y repuestos del taller; consumos de contratos aparte
  const itemsMateriales = useMemo<ItemMaterialTop[]>(() => {
    const m = new Map<string, ItemMaterialTop>();
    const sumar = (pid: unknown, nombre: string, unidad: string, cant: number, costo: number, enContrato: boolean) => {
      if (cant <= 0) return;
      const k = pid ? `p-${pid}` : `d-${nombre.trim().toUpperCase()}`;
      const x = m.get(k) || { productoId: (pid as number) || k, nombre: nombre || 'Material', unidad: unidad || 'UND', cantidadConsumida: 0, costoTotal: 0, usadoEnObras: 0, usadoEnContratos: 0 };
      x.cantidadConsumida += cant; x.costoTotal += costo;
      if (enContrato) x.usadoEnContratos += cant; else x.usadoEnObras += cant;
      m.set(k, x);
    };
    const salidasOk = new Set((d.salidas || []).filter((s) => s.estado !== 'CANCELADO' && enPeriodo(s.created_at)).map((s) => Number(s.id)));
    (d.salida_items || []).filter((it) => salidasOk.has(Number(it.salida_id))).forEach((it) => {
      const neto = Math.max(0, num(it.cantidad) - num(it.cantidad_devuelta));
      sumar(it.product_id, it.descripcion, it.unidad, neto, neto * num(it.costo_unitario), false);
    });
    const ordenesOk = new Set((d.taller_ordenes || []).filter((o) => ordenValida(o) && enPeriodo(fechaOrden(o))).map((o) => Number(o.id)));
    (d.taller_repuestos || []).filter((r) => ordenesOk.has(Number(r.orden_id))).forEach((r) => sumar(r.product_id, r.descripcion, 'UND', num(r.cantidad), num(r.cantidad) * num(r.costo_unitario), false));
    (d.contrato_consumos || []).filter((cs) => enPeriodo(cs.created_at)).forEach((cs) => sumar(cs.product_id, cs.descripcion, cs.unidad, num(cs.cantidad), num(cs.subtotal_costo) || num(cs.cantidad) * num(cs.costo_unitario), true));
    return [...m.values()].sort((a, b) => b.costoTotal - a.costoTotal);
  }, [d, rango]);

  // Cobranzas: saldos de hoy (no dependen del período)
  const itemsCobranzas = useMemo<ItemCuentaPorCobrar[]>(() => {
    const list: ItemCuentaPorCobrar[] = [];
    (d.cotizaciones || []).filter(cotiDeServicio).forEach((c) => {
      const saldo = num(c.total) - num(c.adelanto);
      if (saldo > 0.009) list.push({ id: c.id, tipo: 'COTIZACION', codigo: c.numero || `COT-${c.id}`, cliente: c.cliente_nombre || 'Cliente', total: num(c.total), pagado: num(c.adelanto), saldo, fechaEmision: c.fecha_emision || c.created_at, fechaVencimiento: c.fecha_vencimiento, estado: c.estado });
    });
    (d.contrato_cobros || []).filter((cb) => cb.estado !== 'PAGADO' && cb.estado !== 'ANULADO').forEach((cb) => {
      const saldo = num(cb.monto) - num(cb.monto_pagado);
      if (saldo <= 0.009) return;
      const con = (d.contratos || []).find((c) => c.id === cb.contrato_id);
      list.push({ id: cb.id, tipo: 'CONTRATO', codigo: `${con?.codigo || 'CON'} · ${cb.periodo || cb.id}`, cliente: cliente.get(Number(con?.customer_id)) || '—', total: num(cb.monto), pagado: num(cb.monto_pagado), saldo, fechaEmision: cb.fecha_emision || cb.created_at, fechaVencimiento: cb.fecha_vencimiento, estado: cb.estado });
    });
    (d.taller_ordenes || []).filter(ordenValida).forEach((o) => {
      const saldo = num(o.total) - num(o.adelanto);
      if (saldo <= 0.009) return;
      list.push({ id: o.id, tipo: 'TALLER', codigo: o.codigo || `ORD-${o.id}`, cliente: cliente.get(Number(o.customer_id)) || '—', total: num(o.total), pagado: num(o.adelanto), saldo, fechaEmision: o.fecha_ingreso || o.created_at, fechaVencimiento: null, estado: o.estado });
    });
    return list.sort((a, b) => b.saldo - a.saldo);
  }, [d, cliente]);

  const metricas = useMemo<MetricasGlobales>(() => {
    const ingresos = itemsRentabilidad.reduce((s, it) => s + it.ingreso, 0);
    const costo = itemsRentabilidad.reduce((s, it) => s + it.costoMateriales, 0);
    const trabs = (d.agenda_trabajos || []).filter((t) => enPeriodo(t.fecha || t.created_at));
    return {
      ingresosTotales: ingresos, costoMateriales: costo, utilidadBruta: ingresos - costo,
      margenPorcentaje: ingresos > 0 ? ((ingresos - costo) / ingresos) * 100 : 0,
      cuentasPorCobrar: itemsCobranzas.reduce((s, c) => s + c.saldo, 0),
      totalTrabajos: trabs.length, totalTrabajosCompletados: trabs.filter((t) => t.estado === 'COMPLETADO').length,
      totalContratosActivos: (d.contratos || []).filter((c) => c.estado === 'ACTIVO').length,
    };
  }, [itemsRentabilidad, itemsCobranzas, d, rango]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative pb-10">
      <HeaderServicios
        tabActiva={pestana}
        onCambiarPestana={(p) => { setBusqueda(''); onCambiarPestana(p); }}
        conComercio={conComercio}
        periodo={periodo}
        setPeriodo={setPeriodo}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        metricas={metricas}
        onImprimir={() => window.print()}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroTipo={pestana === 'cobranzas' ? filtroTipoCobranzas : filtroTipoRentabilidad}
        onFiltroTipoChange={(v) => (pestana === 'cobranzas' ? setFiltroTipoCobranzas(v) : setFiltroTipoRentabilidad(v))}
      />
      <div className="px-3 sm:px-4 lg:px-6 flex flex-col gap-4">
        {cargando ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-sm">Calculando…</div>
        ) : pestana === 'rentabilidad' ? (
          // La key reinicia la paginación al cambiar búsqueda, filtro o período
          <TabRentabilidad
            key={`${periodo}-${fechaDesde}-${fechaHasta}-${busqueda}-${filtroTipoRentabilidad}`}
            items={itemsRentabilidad}
            busqueda={busqueda}
            filtroTipo={filtroTipoRentabilidad}
          />
        ) : pestana === 'tecnicos' ? (
          <TabTecnicos
            key={`${periodo}-${fechaDesde}-${fechaHasta}-${busqueda}`}
            tecnicos={itemsTecnicos}
            busqueda={busqueda}
          />
        ) : pestana === 'materiales' ? (
          <TabMateriales
            key={`${periodo}-${fechaDesde}-${fechaHasta}-${busqueda}`}
            materiales={itemsMateriales}
            busqueda={busqueda}
          />
        ) : (
          <TabCobranzas
            key={`${busqueda}-${filtroTipoCobranzas}`}
            cuentas={itemsCobranzas}
            busqueda={busqueda}
            filtroTipo={filtroTipoCobranzas}
          />
        )}
      </div>
    </div>
  );
};
