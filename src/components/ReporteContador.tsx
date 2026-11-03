import React, { useEffect, useState } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import { supabase } from '../db/supabase';
import { fetchAllRango, rangoUTCPeru, fechaLocalPeru } from '../utils/ingresos';
import { calcularTotalesCPE, MOTIVO_NOTA_CREDITO, numeroComprobante, type TotalesCPE } from '../utils/comprobante';

// Reporte para el contador (fase 11.6): registro de ventas del mes (boletas, facturas y notas de crédito
// con base, IGV, exonerado, inafecto e ICBPER) para descargar en Excel (CSV), y el resumen del mes.
// Las notas de crédito van en negativo. Las notas de venta (sin comprobante) se informan aparte.

interface FilaRegistro {
  fecha: string;
  codigo: '01' | '03' | '07';
  tipo: string;
  serie: string;
  numero: string;
  clienteTipoDoc: string;
  clienteNumDoc: string;
  cliente: string;
  totales: TotalesCPE;
  estado: string;
  modifica: string;
  motivo: string;
  anulada: boolean;
  pdf: string;
}

interface Resumen {
  boletas: { n: number; total: number };
  facturas: { n: number; total: number };
  notas: { n: number; total: number };
  igv: number;
  neto: number;
  notasVenta: { n: number; total: number };
  rechazados: number;
  sinEnviar: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const neg = (t: TotalesCPE): TotalesCPE => ({ gravada: -t.gravada, exonerada: -t.exonerada, inafecta: -t.inafecta, igv: -t.igv, icbper: -t.icbper, total: -t.total });
const fechaPeru = (f: string) => fechaLocalPeru(new Date(f)).split('-').reverse().join('/'); // dd/mm/aaaa

const rangoDelMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return rangoUTCPeru(`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`);
};

export const armarRegistro = async (mes: string): Promise<{ filas: FilaRegistro[]; resumen: Resumen }> => {
  const { inicioUTC, finUTC } = rangoDelMes(mes);
  const { data: cfg } = await supabase.from('facturacion_config').select('igv_porcentaje, icbper_monto').eq('id', 1).maybeSingle();
  const igvPct = Number(cfg?.igv_porcentaje ?? 18);
  const icbper = Number(cfg?.icbper_monto ?? 0.5);
  const [ventas, notas] = await Promise.all([
    fetchAllRango('sales', 'id, created_at, total, doc_type, doc_serial, doc_number, cpe_estado, cpe_pdf, cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre, sunat_status', inicioUTC, finUTC),
    fetchAllRango('notas_credito', '*', inicioUTC, finUTC).catch(() => []),
  ]);
  const conComprobante = ventas.filter((v) => v.doc_type);
  // Productos de cada venta con comprobante (para separar base, IGV, exonerado, inafecto y bolsas)
  const detallesPor: Record<string, any[]> = {};
  const ids = conComprobante.map((v) => v.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from('sale_details').select('sale_id, quantity, subtotal, tipo_igv, es_bolsa').in('sale_id', ids.slice(i, i + 100));
    for (const d of data || []) (detallesPor[d.sale_id] ||= []).push(d);
  }
  const lineas = (lista: any[]) => lista.map((d) => ({ subtotal: Number(d.subtotal), cantidad: Number(d.quantity), tipoIgv: d.tipo_igv, esBolsa: d.es_bolsa }));

  const filas: FilaRegistro[] = [
    ...conComprobante.map((v): FilaRegistro => ({
      fecha: v.created_at,
      codigo: v.doc_type === 1 ? '01' : '03',
      tipo: v.doc_type === 1 ? 'FACTURA' : 'BOLETA',
      serie: v.doc_serial || '',
      numero: v.doc_number || '',
      clienteTipoDoc: v.cpe_cliente_tipo_doc === 'RUC' ? '6' : v.cpe_cliente_tipo_doc === 'DNI' ? '1' : v.cpe_cliente_tipo_doc === 'CE' ? '4' : '-',
      clienteNumDoc: v.cpe_cliente_num_doc || '',
      cliente: v.cpe_cliente_nombre || 'CLIENTES VARIOS',
      totales: calcularTotalesCPE(lineas(detallesPor[v.id] || []), igvPct, icbper),
      estado: v.cpe_estado || '',
      modifica: '',
      motivo: '',
      anulada: v.sunat_status === 'ANULADO',
      pdf: v.cpe_pdf || '',
    })),
    ...notas.map((n: any): FilaRegistro => ({
      fecha: n.created_at,
      codigo: '07',
      tipo: 'NOTA DE CRÉDITO',
      serie: n.doc_serial || '',
      numero: n.doc_number || '',
      clienteTipoDoc: '',
      clienteNumDoc: '',
      cliente: '',
      totales: neg(calcularTotalesCPE(lineas(n.items || []), igvPct, icbper)),
      estado: n.cpe_estado || '',
      modifica: `${n.ref_doc_type === 1 ? '01' : '03'} ${numeroComprobante(n.ref_serial, n.ref_number)}`,
      motivo: `${n.motivo} ${MOTIVO_NOTA_CREDITO[n.motivo] || ''}${n.descripcion ? ` - ${n.descripcion}` : ''}`,
      anulada: false,
      pdf: n.cpe_pdf || '',
    })),
  ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || `${a.serie}${a.numero.padStart(8, '0')}`.localeCompare(`${b.serie}${b.numero.padStart(8, '0')}`));

  // Resumen: los rechazados por SUNAT no cuentan (no tienen valor)
  const validos = filas.filter((f) => f.estado !== 'RECHAZADO');
  const suma = (lista: FilaRegistro[]) => ({ n: lista.length, total: r2(lista.reduce((t, f) => t + f.totales.total, 0)) });
  const notasVenta = ventas.filter((v) => !v.doc_type && v.sunat_status !== 'ANULADO');
  return {
    filas,
    resumen: {
      boletas: suma(validos.filter((f) => f.codigo === '03')),
      facturas: suma(validos.filter((f) => f.codigo === '01')),
      notas: suma(validos.filter((f) => f.codigo === '07')),
      igv: r2(validos.reduce((t, f) => t + f.totales.igv, 0)),
      neto: r2(validos.reduce((t, f) => t + f.totales.total, 0)),
      notasVenta: { n: notasVenta.length, total: r2(notasVenta.reduce((t, v) => t + Number(v.total || 0), 0)) },
      rechazados: filas.filter((f) => f.estado === 'RECHAZADO').length,
      sinEnviar: filas.filter((f) => ['PENDIENTE', 'ENVIANDO', 'ERROR'].includes(f.estado)).length,
    },
  };
};

// CSV que Excel abre directo (con tildes gracias al BOM y montos con punto decimal)
export const descargarRegistroCSV = (filas: FilaRegistro[], mes: string, ruc?: string | null) => {
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const m = (n: number) => n.toFixed(2);
  const encabezado = ['Fecha', 'Tipo (código)', 'Tipo', 'Serie', 'Número', 'Doc. cliente (tipo)', 'Doc. cliente (número)', 'Cliente', 'Op. gravada', 'Op. exonerada',
    'Op. inafecta', 'IGV', 'ICBPER', 'Total', 'Moneda', 'Estado SUNAT', 'Comprobante que modifica', 'Motivo (nota de crédito)', 'Venta anulada', 'PDF'];
  const filasCsv = filas.map((f) => [fechaPeru(f.fecha), f.codigo, f.tipo, f.serie, f.numero.padStart(8, '0'), f.clienteTipoDoc, f.clienteNumDoc, f.cliente,
    m(f.totales.gravada), m(f.totales.exonerada), m(f.totales.inafecta), m(f.totales.igv), m(f.totales.icbper), m(f.totales.total), 'PEN',
    f.estado, f.modifica, f.motivo, f.anulada ? 'SÍ' : '', f.pdf]);
  const texto = '﻿' + [encabezado, ...filasCsv].map((fila) => fila.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `registro-ventas-${ruc || 'siumax'}-${mes}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const Linea: React.FC<{ nombre: string; n?: number; total: number; resaltar?: boolean }> = ({ nombre, n, total, resaltar }) => (
  <div className={`flex justify-between gap-3 py-1 border-b border-[var(--color-border)] ${resaltar ? 'font-black text-[var(--color-ink)]' : 'font-bold'}`}>
    <span>{nombre}{n !== undefined ? ` (${n})` : ''}</span>
    <span className="tabular-nums">S/ {total.toFixed(2)}</span>
  </div>
);

export const ReporteContador: React.FC<{ onVolver: () => void }> = ({ onVolver }) => {
  const [mes, setMes] = useState(() => fechaLocalPeru().slice(0, 7));
  const [datos, setDatos] = useState<{ filas: FilaRegistro[]; resumen: Resumen } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ruc, setRuc] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('empresa_config').select('ruc').order('id').limit(1).maybeSingle().then(({ data }) => setRuc((data as { ruc?: string } | null)?.ruc || null));
    setTimeout(() => document.getElementById('rep-mes')?.focus(), 60);
  }, []);
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    let vigente = true;
    setCargando(true);
    armarRegistro(mes).then((d) => { if (vigente) { setDatos(d); setCargando(false); } });
    return () => { vigente = false; };
  }, [mes]);

  const r = datos?.resumen;
  return (
    <div className="overflow-y-auto p-4 flex-1 custom-scrollbar space-y-4">
      <button
        id="btn-rep-volver"
        type="button"
        onClick={onVolver}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('rep-mes')?.focus(); } }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--color-border)] text-[12px] font-black uppercase cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] hover:border-[var(--color-ink)]"
      >
        <ArrowLeft size={14} /> Volver a la lista
      </button>
      <div>
        <p className="text-[13px] font-black uppercase">Reporte para el contador</p>
        <p className="text-[12px] font-bold text-[var(--color-muted)]">Registro de ventas del mes (boletas, facturas y notas de crédito) para Excel, y el resumen para declarar.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-black uppercase">
          Mes
          <input
            id="rep-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            onKeyDown={(e) => {
              // Enter abre el calendario (como en el resto del sistema); ↓ / → van al botón de descarga
              if (e.key === 'Enter') { e.preventDefault(); try { (e.target as HTMLInputElement).showPicker(); } catch { /* sin calendario */ } }
              else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('btn-rep-descargar')?.focus(); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-rep-volver')?.focus(); }
            }}
            className="block mt-1 border-2 border-[var(--color-ink)] p-2 text-sm font-black outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
          />
        </label>
        <button
          id="btn-rep-descargar"
          type="button"
          aria-disabled={!datos || cargando}
          onClick={() => datos && !cargando && descargarRegistroCSV(datos.filas, mes, ruc)}
          onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('rep-mes')?.focus(); } }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white text-[12px] font-black uppercase tracking-wider cursor-pointer rounded-none shadow-[3px_3px_0_0_var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <Download size={14} /> Descargar registro de ventas (Excel)
        </button>
      </div>

      {cargando || !r ? (
        <p className="text-xs font-bold uppercase text-[var(--color-muted)]">Calculando…</p>
      ) : (
        <div className="border-2 border-[var(--color-ink)] p-3 text-[13px] max-w-xl">
          <p className="text-[12px] font-black uppercase tracking-widest mb-2">Resumen de {mes.split('-').reverse().join('/')}</p>
          <Linea nombre="Boletas" n={r.boletas.n} total={r.boletas.total} />
          <Linea nombre="Facturas" n={r.facturas.n} total={r.facturas.total} />
          <Linea nombre="Notas de crédito" n={r.notas.n} total={r.notas.total} />
          <Linea nombre="Total de comprobantes (neto)" total={r.neto} resaltar />
          <Linea nombre="IGV del mes (neto)" total={r.igv} resaltar />
          <Linea nombre="Ventas con nota de venta (sin comprobante)" n={r.notasVenta.n} total={r.notasVenta.total} />
          {(r.rechazados > 0 || r.sinEnviar > 0) && (
            <p className="mt-2 text-[12px] font-bold text-[var(--color-danger)]">
              {r.rechazados > 0 && `${r.rechazados} rechazado(s) por SUNAT (no cuentan). `}
              {r.sinEnviar > 0 && `${r.sinEnviar} todavía sin aceptar: revísalos antes de declarar.`}
            </p>
          )}
          <p className="mt-2 text-[11px] font-bold text-[var(--color-muted)]">Las notas de crédito restan. Los rechazados por SUNAT no se suman. Confirma con tu contador.</p>
        </div>
      )}
    </div>
  );
};
