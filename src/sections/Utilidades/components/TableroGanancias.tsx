// Utilidades › "Gráficos y detalles" (05/11/2026, reemplaza a "Top 5 rentables"). Tablero de ganancias y pérdidas
// con los indicadores que usan las empresas (estado de resultados, margen, punto de equilibrio, ABC, rotación,
// GMROI, merma, cartera). Fórmulas (ver docs/MEMORIA-IA.md):
//   Ganancia bruta = Ingresos − Costo de lo vendido        · Margen bruto % = Ganancia bruta ÷ Ingresos
//   Ganancia neta  = Ganancia bruta − Gastos de caja − Mermas · Margen neto % = Ganancia neta ÷ Ingresos
//   Ticket promedio = Total vendido ÷ N.º de ventas
//   Punto de equilibrio (mes) = Gastos fijos del mes ÷ Margen bruto %  · Margen de seguridad = (Ventas del mes − PE) ÷ Ventas del mes
//   Rotación (al año) = Costo de lo vendido (llevado a 365 días) ÷ Inventario al costo · Días de inventario = 365 ÷ Rotación
//   GMROI (al año) = Ganancia bruta (llevada a 365 días) ÷ Inventario al costo · Merma % = Mermas ÷ Costo de lo vendido
//   ABC: productos ordenados por ganancia; A hasta el 80 % acumulado, B hasta el 95 %, C el resto
// Usa los MISMOS números que la tabla de Utilidades (calcularAnalisis.ts). Solo lee: no cambia ningún dato
// (salvo los gastos fijos del mes, que guarda quien tiene permiso de configuración).
import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, X, TrendingUp, TrendingDown, AlertTriangle, Save } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ComposedChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { usePermiso, avisar } from '../../../utils/permisos';
import { calcularAnalisis, type VentaPeriodo, type ResultadoAnalisis } from '../calcularAnalisis';
import type { AnalisisProducto } from '../types';
import { fechaLocalPeru, primerDiaMesPeru } from '../../../utils/ingresos';

interface Props {
  onClose: () => void;
}

const soles = (n: number) => `S/ ${(Number.isFinite(n) ? n : 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const solesCorto = (n: number) => `${n < 0 ? '− ' : ''}${Math.abs(n) >= 1000 ? `S/ ${(Math.abs(n) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} mil` : `S/ ${Math.round(Math.abs(n))}`}`;
const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`;
const MS_DIA = 86400000;
const fechaPeru = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600000);
const diasEntre = (a: string, b: string) => Math.max(1, Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / MS_DIA) + 1);
const sumarDias = (f: string, n: number) => new Date(new Date(f + 'T12:00:00').getTime() + n * MS_DIA).toISOString().slice(0, 10);
const corta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Totales del período (los mismos que las tarjetas de Utilidades)
const totales = (analisis: AnalisisProducto[], ingresos: number, gastos: number, ventas: VentaPeriodo[]) => {
  const costo = analisis.reduce((a, p) => a + p.costoTotalVentas, 0);
  const mermas = analisis.reduce((a, p) => a + p.perdidaMerma, 0);
  const bruta = ingresos - costo;
  const neta = bruta - gastos - mermas;
  const vendido = ventas.reduce((a, v) => a + Number(v.total || 0), 0);
  return {
    ingresos, costo, mermas, gastos, bruta, neta, vendido, nVentas: ventas.length,
    margenBruto: ingresos > 0 ? (bruta / ingresos) * 100 : 0,
    margenNeto: ingresos > 0 ? (neta / ingresos) * 100 : 0,
    ticket: ventas.length ? vendido / ventas.length : 0,
    mermaPct: costo > 0 ? (mermas / costo) * 100 : 0,
  };
};

// Tarjeta de cifra clave con la comparación contra el período anterior
const Cifra: React.FC<{ titulo: string; valor: string; actual: number; anterior?: number; menosEsMejor?: boolean; nota?: string; resaltar?: boolean }> =
  ({ titulo, valor, actual, anterior, menosEsMejor, nota, resaltar }) => {
    let cambio: React.ReactNode = <span className="text-[var(--color-muted)]">sin dato anterior</span>;
    if (anterior !== undefined && Math.abs(anterior) > 0.009) {
      const v = ((actual - anterior) / Math.abs(anterior)) * 100;
      const bueno = menosEsMejor ? v <= 0 : v >= 0;
      cambio = (
        <span className={`inline-flex items-center gap-1 font-black ${bueno ? 'text-[var(--color-accent-dark,#047857)]' : 'text-[var(--color-danger)]'}`}>
          {v >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {v >= 0 ? '▲' : '▼'} {pct(Math.abs(v))}
        </span>
      );
    }
    return (
      <div className={`p-3 bg-[var(--color-surface)] ${resaltar ? 'border-2 border-[var(--color-ink)]' : ''}`}>
        <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{titulo}</p>
        <p className={`text-lg font-black font-mono ${actual < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>{valor}</p>
        <p className="text-[11px]">{cambio}{nota && <span className="block text-[var(--color-muted)] font-bold">{nota}</span>}</p>
      </div>
    );
  };

// Recuadro de una sección (se puede recorrer con las flechas y se lee como región)
const Seccion: React.FC<{ id: string; titulo: string; ayuda?: string; children: React.ReactNode; className?: string }> = ({ id, titulo, ayuda, children, className = '' }) => (
  <section id={id} tabIndex={0} aria-label={titulo} className={`ventana-recuadro bg-[var(--color-surface)] p-4 flex flex-col gap-3 outline-none ${className}`}>
    <div>
      <h3 className="text-[12px] font-black uppercase tracking-widest text-[var(--color-ink)]">{titulo}</h3>
      {ayuda && <p className="text-[11px] font-bold text-[var(--color-muted)] mt-0.5">{ayuda}</p>}
    </div>
    {children}
  </section>
);

const estiloTooltip = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 0, fontSize: 12, fontFamily: 'inherit', color: 'var(--color-ink)' };
const ejes = { stroke: 'var(--color-muted)', fontSize: 11, tickLine: false };

export const TableroGanancias: React.FC<Props> = ({ onClose }) => {
  useCerrarConEscape(true, onClose);
  const puedeConfigurar = usePermiso('gerencia_configuracion_sistema');

  // Rango propio del tablero (pedido del dueño 05/11/2026): por defecto ESTE MES (del 1 hasta hoy)
  const [desde, setDesde] = useState(primerDiaMesPeru());
  const [hasta, setHasta] = useState(fechaLocalPeru());
  const [fechaInicio, fechaFin] = desde <= hasta ? [desde, hasta] : [hasta, desde];
  const [datos, setDatos] = useState<ResultadoAnalisis | null>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    const espera = setTimeout(() => {
      void calcularAnalisis(fechaInicio, fechaFin)
        .then((r) => { if (vivo) setDatos(r); })
        .finally(() => { if (vivo) setCargando(false); });
    }, 350);                                       // por si se escribe la fecha con el teclado
    return () => { vivo = false; clearTimeout(espera); };
  }, [fechaInicio, fechaFin]);
  const analisis: AnalisisProducto[] = datos?.analisis || [];
  const gastos = datos?.gastos || 0;
  const ingresoTotal = datos?.ingresoTotal || 0;
  const ventas: VentaPeriodo[] = datos?.ventas || [];
  const costoUnitario: Record<string, number> = datos?.costoUnitario || {};

  // Calendarios: Enter lo abre y el selector se queda en la fecha; ← → entre Desde y Hasta; ↓ a los recuadros; ↑ a la X
  const ultimoCambio = React.useRef(0);
  const teclasFecha = (izq: string | null, der: string | null) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const ir = (id: string | null) => { if (id) document.getElementById(id)?.focus(); };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (Date.now() - ultimoCambio.current < 500) return;    // el Enter que eligió el día no lo vuelve a abrir
      try { e.currentTarget.showPicker?.(); } catch { /* sin calendario */ }
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); ir(izq); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); ir(der); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); ir('tablero-cifras'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); ir('btn-cerrar-tablero'); }
  };
  const alCambiarFecha = (id: string, poner: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    ultimoCambio.current = Date.now();
    if (e.target.value) poner(e.target.value);
    setTimeout(() => document.getElementById(id)?.focus(), 50);
  };

  const dias = diasEntre(fechaInicio, fechaFin);
  const prevFin = sumarDias(fechaInicio, -1);
  const prevInicio = sumarDias(fechaInicio, -dias);

  // Período anterior (mismo largo, justo antes), fiados por cobrar y gastos fijos del mes
  const [anterior, setAnterior] = useState<ReturnType<typeof totales> | null>(null);
  const [porCobrar, setPorCobrar] = useState<{ tramo: string; monto: number; clientes: number }[]>([]);
  const [gastosFijos, setGastosFijos] = useState<number>(0);
  const [gastosFijosTexto, setGastosFijosTexto] = useState('');
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    void calcularAnalisis(prevInicio, prevFin).then((r) => { if (vivo) setAnterior(totales(r.analisis, r.ingresoTotal, r.gastos, r.ventas)); });
    void supabase.from('fiados').select('amount, paid_amount, date_given, status, customer_name').then(({ data }) => {
      if (!vivo) return;
      const hoy = Date.now();
      const tramos = [{ tramo: 'Hasta 30 días', monto: 0, clientes: new Set<string>() }, { tramo: '31 a 60 días', monto: 0, clientes: new Set<string>() }, { tramo: 'Más de 60 días', monto: 0, clientes: new Set<string>() }];
      (data || []).forEach((f: any) => {
        if (f.status === 'ANULADO') return;
        const resta = Number(f.amount || 0) - Number(f.paid_amount || 0);
        if (resta <= 0.009) return;
        const d = f.date_given ? (hoy - new Date(f.date_given).getTime()) / MS_DIA : 0;
        const t = tramos[d <= 30 ? 0 : d <= 60 ? 1 : 2];
        t.monto += resta; t.clientes.add(f.customer_name || '—');
      });
      setPorCobrar(tramos.map((t) => ({ tramo: t.tramo, monto: t.monto, clientes: t.clientes.size })));
    });
    void supabase.from('empresa_config').select('id, gastos_fijos_mes').order('id').limit(1).then(({ data }) => {
      if (!vivo || !data?.[0]) return;
      setEmpresaId(data[0].id);
      const v = Number(data[0].gastos_fijos_mes || 0);
      setGastosFijos(v); setGastosFijosTexto(v ? String(v) : '');
    });
    return () => { vivo = false; };
  }, [prevInicio, prevFin]);

  // Al abrir, el selector va al primer recuadro
  useEffect(() => { setTimeout(() => document.getElementById('tablero-desde')?.focus(), 80); }, []);

  const t = useMemo(() => totales(analisis, ingresoTotal, gastos, ventas), [analisis, ingresoTotal, gastos, ventas]);

  // Cómo se forma la ganancia (cascada): cada barra va de "desde" a "hasta"
  const cascada = useMemo(() => {
    // corto: nombre bajo la barra (el completo va en el recuadro al pasar el mouse)
    const paso = (nombre: string, corto: string, desde: number, hasta: number, tipo: 'total' | 'resta') =>
      ({ nombre, corto, base: Math.min(desde, hasta), alto: Math.abs(hasta - desde), valor: tipo === 'resta' ? -(desde - hasta) : hasta, tipo });
    return [
      paso('Ingresos', 'Ingresos', 0, t.ingresos, 'total'),
      paso('Costo de lo vendido', 'Costo', t.ingresos, t.bruta, 'resta'),
      paso('Ganancia bruta', 'G. bruta', 0, t.bruta, 'total'),
      paso('Gastos de caja', 'Gastos', t.bruta, t.bruta - t.gastos, 'resta'),
      paso('Mermas', 'Mermas', t.bruta - t.gastos, t.neta, 'resta'),
      paso('Ganancia neta', 'G. neta', 0, t.neta, 'total'),
    ];
  }, [t]);

  // Por día: lo vendido y la ganancia bruta (costo repartido según lo cobrado de cada línea)
  const porDia = useMemo(() => {
    const mapa = new Map<string, { fecha: string; vendido: number; ganancia: number }>();
    for (let i = 0; i < dias; i++) { const f = sumarDias(fechaInicio, i); mapa.set(f, { fecha: f, vendido: 0, ganancia: 0 }); }
    ventas.forEach((v) => { const f = fechaPeru(v.created_at).toISOString().slice(0, 10); const d = mapa.get(f); if (d) d.vendido += Number(v.total || 0); });
    analisis.forEach((p) => {
      if (!p.ingresosTotales) return;
      (p.ventasDetalle || []).forEach((det) => {
        if (det.ventaAnterior || !det.fecha) return;
        const cobrado = Number(det.cobradoEnPeriodo || 0);
        const costo = p.costoTotalVentas * (cobrado / p.ingresosTotales);
        const d = mapa.get(fechaPeru(det.fecha).toISOString().slice(0, 10));
        if (d) d.ganancia += cobrado - costo;
      });
    });
    return [...mapa.values()].map((d) => ({ ...d, etiqueta: corta(d.fecha) }));
  }, [ventas, analisis, dias, fechaInicio]);

  // Punto de equilibrio con los gastos fijos del mes
  const pe = useMemo(() => {
    if (!gastosFijos || t.margenBruto <= 0) return null;
    const mes = gastosFijos / (t.margenBruto / 100);
    const ventasMes = (t.ingresos / dias) * 30;
    return { mes, dia: mes / 30, ventasMes, seguridad: ventasMes > 0 ? ((ventasMes - mes) / ventasMes) * 100 : -100 };
  }, [gastosFijos, t, dias]);

  // Por categoría: ganancia, margen, inventario al costo, rotación, días de inventario y GMROI (llevados a un año)
  const categorias = useMemo(() => {
    const m = new Map<string, { categoria: string; ingresos: number; costo: number; ganancia: number; inventario: number }>();
    analisis.forEach((p) => {
      const c = m.get(p.categoria) || { categoria: p.categoria, ingresos: 0, costo: 0, ganancia: 0, inventario: 0 };
      c.ingresos += p.ingresosTotales; c.costo += p.costoTotalVentas; c.ganancia += p.utilidadReal;
      if (p.tipoControl !== 'CONSUMO' && (p.stockActual || 0) > 0) c.inventario += (p.stockActual || 0) * (costoUnitario[p.id] || 0);
      m.set(p.categoria, c);
    });
    return [...m.values()].filter((c) => c.ingresos > 0 || c.inventario > 0).map((c) => {
      const costoAnual = c.costo * (365 / dias);
      const rotacion = c.inventario > 0 ? costoAnual / c.inventario : 0;
      return {
        ...c,
        margen: c.ingresos > 0 ? ((c.ingresos - c.costo) / c.ingresos) * 100 : 0,
        rotacion,
        diasInventario: rotacion > 0 ? 365 / rotacion : null,
        gmroi: c.inventario > 0 ? ((c.ingresos - c.costo) * (365 / dias)) / c.inventario : null,
      };
    }).sort((a, b) => b.ganancia - a.ganancia);
  }, [analisis, costoUnitario, dias]);

  // Clasificación ABC por ganancia
  const abc = useMemo(() => {
    const ganan = analisis.filter((p) => p.utilidadReal > 0).sort((a, b) => b.utilidadReal - a.utilidadReal);
    const total = ganan.reduce((a, p) => a + p.utilidadReal, 0);
    let acum = 0;
    const filas = ganan.map((p) => { acum += p.utilidadReal; const share = total ? (acum / total) * 100 : 0; return { p, clase: share <= 80 || acum === p.utilidadReal ? 'A' : share <= 95 ? 'B' : 'C' }; });
    const resumen = (['A', 'B', 'C'] as const).map((k) => {
      const de = filas.filter((f) => f.clase === k);
      const g = de.reduce((a, f) => a + f.p.utilidadReal, 0);
      return { clase: k, productos: de.length, ganancia: g, parte: total ? (g / total) * 100 : 0 };
    });
    return { filas, resumen };
  }, [analisis]);

  const pierden = useMemo(() => analisis.filter((p) => p.utilidadReal < 0).sort((a, b) => a.utilidadReal - b.utilidadReal).slice(0, 10), [analisis]);
  const ganan = abc.filas.slice(0, 10);

  const pagos = useMemo(() => {
    const s = (k: keyof VentaPeriodo) => ventas.reduce((a, v) => a + Number(v[k] || 0), 0);
    return [
      { nombre: 'Efectivo', monto: s('amount_cash') },
      { nombre: 'Yape / Transf.', monto: s('amount_yape') + s('amount_transfer') },
      { nombre: 'Tarjeta', monto: s('amount_card') },
      { nombre: 'Fiado', monto: s('amount_credit') },
    ];
  }, [ventas]);

  const porSemana = useMemo(() => {
    const d = DIAS_SEMANA.map((n) => ({ nombre: n, vendido: 0 }));
    ventas.forEach((v) => { d[fechaPeru(v.created_at).getUTCDay()].vendido += Number(v.total || 0); });
    return [...d.slice(1), d[0]];                               // de lunes a domingo
  }, [ventas]);
  const porHora = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ nombre: `${i}h`, vendido: 0 }));
    ventas.forEach((v) => { h[fechaPeru(v.created_at).getUTCHours()].vendido += Number(v.total || 0); });
    const conVentas = h.map((x, i) => ({ ...x, i })).filter((x) => x.vendido > 0);
    if (!conVentas.length) return h.slice(8, 22);
    return h.slice(Math.min(...conVentas.map((x) => x.i)), Math.max(...conVentas.map((x) => x.i)) + 1);
  }, [ventas]);

  const parados = useMemo(() => {
    const lista = analisis.filter((p) => p.tipoControl !== 'CONSUMO' && (p.stockActual || 0) > 0 && p.unidadesVendidas === 0)
      .map((p) => ({ nombre: p.nombre, stock: p.stockActual || 0, valor: (p.stockActual || 0) * (costoUnitario[p.id] || 0) }))
      .sort((a, b) => b.valor - a.valor);
    return { total: lista.reduce((a, p) => a + p.valor, 0), cantidad: lista.length, top: lista.slice(0, 8) };
  }, [analisis, costoUnitario]);
  const totalPorCobrar = porCobrar.reduce((a, x) => a + x.monto, 0);

  const guardarGastosFijos = async () => {
    if (!puedeConfigurar) { await avisar('Solo quien tiene permiso de configuración puede cambiar los gastos fijos.'); return; }
    const v = Number(String(gastosFijosTexto).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) { await avisar('Escribe un monto válido (por ejemplo 2500).'); return; }
    setGuardando(true);
    const { error } = empresaId != null
      ? await supabase.from('empresa_config').update({ gastos_fijos_mes: v }).eq('id', empresaId)
      : { error: { message: 'No hay datos de la empresa' } } as any;
    setGuardando(false);
    if (error) { await avisar('No se pudo guardar: ' + error.message); return; }
    setGastosFijos(v);
  };

  const rangoTxt = `${corta(fechaInicio)}${fechaFin !== fechaInicio ? ` al ${corta(fechaFin)}` : ''}`;
  const anteriorTxt = `${corta(prevInicio)}${prevFin !== prevInicio ? ` al ${corta(prevFin)}` : ''}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" role="dialog" aria-modal="true" aria-label="Gráficos y detalles">
      <div className="ventana-sobria tablero-graficos w-full max-w-7xl h-[calc(var(--alto-pantalla)*0.94)] flex flex-col">
        <div className="ventana-cabecera">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><PieChart size={18} /></div>
            <div className="min-w-0">
              <h2 className="ventana-cabecera__titulo">Gráficos y detalles</h2>
              <p className="ventana-cabecera__subtitulo">Del {rangoTxt} · comparado con el {anteriorTxt}{cargando ? ' · calculando…' : ''}</p>
            </div>
          </div>
          <button id="btn-cerrar-tablero" type="button" onClick={onClose} title="Cerrar (Esc)" className="ventana-cerrar"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 content-start bg-[var(--color-bg)]">
          {/* RANGO DE FECHAS DEL TABLERO (por defecto este mes) */}
          <div className="xl:col-span-2 flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">
              Desde
              <input id="tablero-desde" type="date" value={desde} max={hasta} title="Enter abre el calendario"
                onChange={alCambiarFecha('tablero-desde', setDesde)} onKeyDown={teclasFecha(null, 'tablero-hasta')}
                onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* sin calendario */ } }}
                className="filtro-sobrio mt-1 w-44" />
            </label>
            <label className="flex flex-col text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">
              Hasta
              <input id="tablero-hasta" type="date" value={hasta} min={desde} max={fechaLocalPeru()} title="Enter abre el calendario"
                onChange={alCambiarFecha('tablero-hasta', setHasta)} onKeyDown={teclasFecha('tablero-desde', null)}
                onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* sin calendario */ } }}
                className="filtro-sobrio mt-1 w-44" />
            </label>
            {cargando && <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] pb-3">Calculando…</span>}
          </div>

          {/* 1. CIFRAS CLAVE */}
          <Seccion id="tablero-cifras" titulo="Cifras clave" ayuda="Comparadas con el período anterior del mismo largo." className="xl:col-span-2">
            <div className="ventana-cifras grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-b-0">
              <Cifra titulo="Ingresos cobrados" valor={soles(t.ingresos)} actual={t.ingresos} anterior={anterior?.ingresos} />
              <Cifra titulo="Costo de lo vendido" valor={soles(t.costo)} actual={t.costo} anterior={anterior?.costo} menosEsMejor />
              <Cifra titulo="Ganancia bruta" valor={soles(t.bruta)} actual={t.bruta} anterior={anterior?.bruta} nota={`Margen bruto ${pct(t.margenBruto)}`} />
              <Cifra titulo="Gastos de caja" valor={soles(t.gastos)} actual={t.gastos} anterior={anterior?.gastos} menosEsMejor />
              <Cifra titulo="Ganancia neta" valor={soles(t.neta)} actual={t.neta} anterior={anterior?.neta} nota={`Margen neto ${pct(t.margenNeto)} · lo sano: 5 a 15 %`} resaltar />
              <Cifra titulo="Mermas" valor={soles(t.mermas)} actual={t.mermas} anterior={anterior?.mermas} menosEsMejor nota={`${pct(t.mermaPct)} del costo${t.mermaPct > 2 ? ' · ⚠ más de 2 %' : ''}`} />
              <Cifra titulo="N.º de ventas" valor={String(t.nVentas)} actual={t.nVentas} anterior={anterior?.nVentas} />
              <Cifra titulo="Ticket promedio" valor={soles(t.ticket)} actual={t.ticket} anterior={anterior?.ticket} />
              <Cifra titulo="Por cobrar (fiados)" valor={soles(totalPorCobrar)} actual={totalPorCobrar} nota="Ganancia que aún no está en caja" />
              <Cifra titulo="Mercadería parada" valor={soles(parados.total)} actual={parados.total} nota={`${parados.cantidad} productos sin ventas en el período`} />
            </div>
          </Seccion>

          {/* 2. CÓMO SE FORMA LA GANANCIA */}
          <Seccion id="tablero-cascada" titulo="Cómo se forma tu ganancia" ayuda="Ingresos − costo = ganancia bruta − gastos − mermas = ganancia neta.">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cascada} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid vertical={false} stroke="var(--g-rejilla)" />
                  <XAxis dataKey="corto" {...ejes} interval={0} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                  <YAxis {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={solesCorto} width={70} />
                  <Tooltip cursor={{ fill: 'var(--color-bg)' }} contentStyle={estiloTooltip} formatter={(_v: any, _n: any, it: any) => [soles(it.payload.valor), it.payload.nombre]} labelFormatter={() => ''} />
                  <Bar dataKey="base" stackId="c" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="alto" stackId="c" isAnimationActive={false} maxBarSize={56}>
                    {cascada.map((c, i) => <Cell key={i} fill={c.tipo === 'resta' ? 'var(--g-resta)' : c.valor < 0 ? 'var(--g-perdida)' : c.nombre === 'Ingresos' ? 'var(--g-ventas)' : 'var(--g-ganancia)'} />)}
                    <LabelList dataKey="valor" position="top" formatter={(v: any) => solesCorto(Number(v))} style={{ fill: 'var(--color-ink)', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          {/* 3. PUNTO DE EQUILIBRIO */}
          <Seccion id="tablero-equilibrio" titulo="Punto de equilibrio" ayuda="Cuánto necesitas vender al mes para no perder: gastos fijos del mes ÷ margen bruto.">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">
                Gastos fijos del mes (alquiler, sueldos, luz…)
                <input id="input-gastos-fijos" type="number" min="0" step="0.01" value={gastosFijosTexto} disabled={!puedeConfigurar}
                  onChange={(e) => setGastosFijosTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void guardarGastosFijos(); } }}
                  placeholder="Ej. 2500" className="mt-1 w-44 p-2 text-sm font-black border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]" />
              </label>
              {puedeConfigurar && (
                <button id="btn-guardar-gastos-fijos" type="button" onClick={() => void guardarGastosFijos()} aria-disabled={guardando}
                  className="boton-cabecera px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2"><Save size={14} /> {guardando ? 'Guardando…' : 'Guardar'}</button>
              )}
            </div>
            {pe ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-border)]">
                <div className="bg-[var(--color-surface)] p-3"><p className="text-[11px] font-bold uppercase text-[var(--color-muted)]">Vender al mes para no perder</p><p className="text-lg font-black">{soles(pe.mes)}</p><p className="text-[11px] font-bold text-[var(--color-muted)]">≈ {soles(pe.dia)} por día</p></div>
                <div className="bg-[var(--color-surface)] p-3"><p className="text-[11px] font-bold uppercase text-[var(--color-muted)]">Tu ritmo de ventas al mes</p><p className="text-lg font-black">{soles(pe.ventasMes)}</p><p className="text-[11px] font-bold text-[var(--color-muted)]">según este período</p></div>
                <div className="bg-[var(--color-surface)] p-3"><p className="text-[11px] font-bold uppercase text-[var(--color-muted)]">Margen de seguridad</p>
                  <p className={`text-lg font-black ${pe.seguridad < 0 ? 'text-[var(--color-danger)]' : ''}`}>{pct(pe.seguridad)}</p>
                  <p className="text-[11px] font-bold text-[var(--color-muted)]">{pe.seguridad < 0 ? '⚠ Vendes menos de lo necesario para cubrir tus gastos fijos' : 'Cuánto pueden bajar tus ventas sin perder'}</p></div>
              </div>
            ) : (
              <p className="text-[12px] font-bold text-[var(--color-muted)]">{gastosFijos ? 'Necesitas ventas con ganancia en el período para calcularlo.' : 'Escribe tus gastos fijos del mes y presiona Guardar para ver cuánto necesitas vender.'}</p>
            )}
          </Seccion>

          {/* 4. POR DÍA */}
          <Seccion id="tablero-dias" titulo="Ventas y ganancia por día" ayuda={pe ? 'La línea punteada es lo que necesitas vender por día para no perder.' : 'Lo vendido cada día y la ganancia bruta que dejó.'} className="xl:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={porDia} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--g-rejilla)" />
                  <XAxis dataKey="etiqueta" {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} minTickGap={12} />
                  <YAxis {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={solesCorto} width={70} />
                  <Tooltip contentStyle={estiloTooltip} formatter={(v: any, n: any) => [soles(Number(v)), n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="vendido" name="Vendido" fill="var(--g-ventas)" maxBarSize={28} isAnimationActive={false} />
                  <Line dataKey="ganancia" name="Ganancia bruta" stroke="var(--g-ganancia)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  {pe && <ReferenceLine y={pe.dia} stroke="var(--color-ink)" strokeDasharray="4 4" label={{ value: `Equilibrio ${solesCorto(pe.dia)}`, fill: 'var(--color-muted)', fontSize: 11, position: 'insideTopRight' }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          {/* 5. POR CATEGORÍA */}
          <Seccion id="tablero-categorias" titulo="Ganancia por categoría" ayuda="Rotación, días de inventario y GMROI llevados a un año (con el stock de hoy al costo). GMROI menor a 1: plata parada." className="xl:col-span-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorias.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 70, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--g-rejilla)" />
                  <XAxis type="number" {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={solesCorto} />
                  <YAxis type="category" dataKey="categoria" {...ejes} tick={{ fill: 'var(--color-ink)', fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={estiloTooltip} formatter={(v: any) => [soles(Number(v)), 'Ganancia']} />
                  <Bar dataKey="ganancia" maxBarSize={18} isAnimationActive={false}>
                    {categorias.slice(0, 10).map((c, i) => <Cell key={i} fill={c.ganancia < 0 ? 'var(--g-perdida)' : 'var(--g-ganancia)'} />)}
                    <LabelList dataKey="ganancia" position="right" formatter={(v: any) => solesCorto(Number(v))} style={{ fill: 'var(--color-ink)', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs">
                <thead className="tabla-cabecera"><tr>{['Categoría', 'Ingresos', 'Ganancia', 'Margen', 'Stock al costo', 'Rotación/año', 'Días de stock', 'GMROI'].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.categoria} className="border-b border-[var(--color-border)]">
                      <td className="p-2 font-black">{c.categoria}</td>
                      <td className="p-2">{soles(c.ingresos)}</td>
                      <td className={`p-2 font-black ${c.ganancia < 0 ? 'text-[var(--color-danger)]' : ''}`}>{soles(c.ganancia)}</td>
                      <td className="p-2">{pct(c.margen)}</td>
                      <td className="p-2">{soles(c.inventario)}</td>
                      <td className="p-2">{c.rotacion ? `${c.rotacion.toFixed(1)} veces` : '—'}</td>
                      <td className="p-2">{c.diasInventario != null ? `${Math.round(c.diasInventario)} días` : '—'}</td>
                      <td className={`p-2 font-black ${c.gmroi != null && c.gmroi < 1 ? 'text-[var(--color-danger)]' : ''}`}>{c.gmroi != null ? `${c.gmroi.toFixed(2)}${c.gmroi < 1 ? ' ⚠' : ''}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>

          {/* 6. ABC */}
          <Seccion id="tablero-abc" titulo="Clasificación ABC (regla 80/20)" ayuda="A: los que dejan el 80 % de la ganancia (no deben faltar). B: el 15 % siguiente. C: el resto (revisa si convienen).">
            <div className="grid grid-cols-3 gap-px bg-[var(--color-border)]">
              {abc.resumen.map((r) => (
                <div key={r.clase} className="bg-[var(--color-surface)] p-3">
                  <p className="text-2xl font-black">{r.clase}</p>
                  <p className="text-xs font-black">{r.productos} {r.productos === 1 ? 'producto' : 'productos'}</p>
                  <p className="text-[11px] font-bold text-[var(--color-muted)]">{soles(r.ganancia)} · {pct(r.parte)} de la ganancia</p>
                </div>
              ))}
            </div>
            <ol className="text-xs flex flex-col">
              {abc.filas.filter((f) => f.clase === 'A').slice(0, 12).map(({ p }, i) => (
                <li key={p.id} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border)]"><span className="truncate"><b>{i + 1}.</b> {p.nombre}</span><span className="font-black shrink-0">{soles(p.utilidadReal)}</span></li>
              ))}
            </ol>
          </Seccion>

          {/* 7. GANAN Y PIERDEN */}
          <Seccion id="tablero-productos" titulo="Productos que más ganan y que te hacen perder">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1">Más ganan</p>
                <ol className="text-xs flex flex-col">
                  {ganan.map(({ p }, i) => <li key={p.id} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border)]"><span className="truncate"><b>{i + 1}.</b> {p.nombre}</span><span className="font-black shrink-0">{soles(p.utilidadReal)}</span></li>)}
                  {!ganan.length && <li className="text-[var(--color-muted)]">Sin ventas con ganancia en el período.</li>}
                </ol>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-danger)] mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Te hacen perder</p>
                <ol className="text-xs flex flex-col">
                  {pierden.map((p) => (
                    <li key={p.id} className="py-1 border-b border-[var(--color-border)]">
                      <div className="flex justify-between gap-2"><span className="truncate">{p.nombre}</span><span className="font-black text-[var(--color-danger)] shrink-0">{soles(p.utilidadReal)}</span></div>
                      <span className="text-[11px] text-[var(--color-muted)]">{p.ingresosTotales < p.costoTotalVentas ? 'Se vendió por debajo del costo' : ''}{p.ingresosTotales < p.costoTotalVentas && p.perdidaMerma > 0 ? ' · ' : ''}{p.perdidaMerma > 0 ? `Mermas ${soles(p.perdidaMerma)}` : ''}</span>
                    </li>
                  ))}
                  {!pierden.length && <li className="text-[var(--color-muted)]">Ningún producto con pérdida. 👍</li>}
                </ol>
              </div>
            </div>
          </Seccion>

          {/* 8. CÓMO TE PAGAN */}
          <Seccion id="tablero-pagos" titulo="Cómo te pagan" ayuda="Lo que se pagó en cada forma (el fiado es lo que quedó a crédito).">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagos} layout="vertical" margin={{ top: 0, right: 70, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--g-rejilla)" />
                  <XAxis type="number" {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={solesCorto} />
                  <YAxis type="category" dataKey="nombre" {...ejes} tick={{ fill: 'var(--color-ink)', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={estiloTooltip} formatter={(v: any) => [soles(Number(v)), 'Monto']} />
                  <Bar dataKey="monto" fill="var(--g-ventas)" maxBarSize={20} isAnimationActive={false}>
                    <LabelList dataKey="monto" position="right" formatter={(v: any) => solesCorto(Number(v))} style={{ fill: 'var(--color-ink)', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          {/* 9. CUÁNDO VENDES MÁS */}
          <Seccion id="tablero-cuando" titulo="Cuándo vendes más" ayuda="Lo vendido por día de la semana y por hora: para saber cuándo reforzar la atención y el stock.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porSemana} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--g-rejilla)" />
                    <XAxis dataKey="nombre" {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
                    <YAxis {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={solesCorto} width={56} />
                    <Tooltip contentStyle={estiloTooltip} formatter={(v: any) => [soles(Number(v)), 'Vendido']} />
                    <Bar dataKey="vendido" fill="var(--g-ventas)" maxBarSize={22} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porHora} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--g-rejilla)" />
                    <XAxis dataKey="nombre" {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis {...ejes} tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={solesCorto} width={56} />
                    <Tooltip contentStyle={estiloTooltip} formatter={(v: any) => [soles(Number(v)), 'Vendido']} />
                    <Bar dataKey="vendido" fill="var(--g-ventas)" maxBarSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Seccion>

          {/* 10. PLATA QUE NO ESTÁ EN CAJA */}
          <Seccion id="tablero-fuera" titulo="Plata que no está en caja" ayuda="Fiados por cobrar según su antigüedad (más de 60 días: en riesgo) y mercadería sin ventas en el período.">
            <div className="grid grid-cols-3 gap-px bg-[var(--color-border)]">
              {porCobrar.map((x, i) => (
                <div key={x.tramo} className="bg-[var(--color-surface)] p-3">
                  <p className="text-[11px] font-bold uppercase text-[var(--color-muted)]">{x.tramo}</p>
                  <p className={`text-base font-black ${i === 2 && x.monto > 0 ? 'text-[var(--color-danger)]' : ''}`}>{soles(x.monto)}</p>
                  <p className="text-[11px] font-bold text-[var(--color-muted)]">{x.clientes} cliente(s){i === 2 && x.monto > 0 ? ' · ⚠ en riesgo' : ''}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1">Mercadería parada (más plata invertida primero)</p>
              <ol className="text-xs flex flex-col">
                {parados.top.map((p) => <li key={p.nombre} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border)]"><span className="truncate">{p.nombre} <span className="text-[var(--color-muted)]">· {p.stock} en stock</span></span><span className="font-black shrink-0">{soles(p.valor)}</span></li>)}
                {!parados.top.length && <li className="text-[var(--color-muted)]">Todo lo que tienes en stock se vendió en el período. 👍</li>}
              </ol>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
};
