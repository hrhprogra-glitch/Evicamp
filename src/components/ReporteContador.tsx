import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { supabase } from '../db/supabase';
import { fetchAllRango, rangoUTCPeru, fechaLocalPeru } from '../utils/ingresos';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { calcularTotalesCPE, MOTIVO_NOTA_CREDITO, numeroComprobante, type TotalesCPE } from '../utils/comprobante';
import { formatearMonto } from '../utils/formato';

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
  generadas: number; // generadas por el proveedor (PDF), SUNAT las confirma en su resumen diario
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
      // Motivo SUNAT y, si dice algo más, la descripción (sin repetir "ANULACIÓN DE LA OPERACIÓN")
      motivo: [`${n.motivo} ${MOTIVO_NOTA_CREDITO[n.motivo] || ''}`.trim(), n.descripcion && n.descripcion.trim().toUpperCase() !== (MOTIVO_NOTA_CREDITO[n.motivo] || '').toUpperCase() ? n.descripcion : ''].filter(Boolean).join(' - '),
      anulada: false,
      pdf: n.cpe_pdf || '',
    })),
  ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || `${a.serie}${a.numero.padStart(8, '0')}`.localeCompare(`${b.serie}${b.numero.padStart(8, '0')}`));

  // Resumen: los rechazados por SUNAT no cuentan (no tienen valor)
  const validos = filas.filter((f) => f.estado !== 'RECHAZADO' && f.estado !== 'NO_EMITIDO');
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
      sinEnviar: filas.filter((f) => ['PENDIENTE', 'ENVIANDO', 'ERROR', 'ANULANDO'].includes(f.estado) && !(f.estado === 'PENDIENTE' && f.pdf)).length,
      generadas: filas.filter((f) => f.estado === 'PENDIENTE' && f.pdf).length,
    },
  };
};

// Estado SUNAT en palabras simples (para el contador)
const estadoTexto = (f: FilaRegistro) =>
  f.estado === 'PENDIENTE' && f.pdf ? 'Generada (SUNAT por confirmar)'
    : ({ ACEPTADO: 'Aceptada', OBSERVADO: 'Aceptada con observación', PENDIENTE: 'Pendiente de envío', ENVIANDO: 'Enviando', ERROR: 'Con error',
      RECHAZADO: 'Rechazada (no cuenta)', ANULANDO: 'Anulando', NO_EMITIDO: 'No emitida (no cuenta)' } as Record<string, string>)[f.estado] || f.estado;
const noCuenta = (f: FilaRegistro) => f.estado === 'RECHAZADO' || f.estado === 'NO_EMITIDO';

/** Excel (.xlsx) del registro de ventas: título, tabla con filtros, montos en soles, totales y hoja de resumen.
 *  La librería (exceljs) se carga solo al descargar, para no hacer más pesado el sistema. */
export const descargarRegistroExcel = async (filas: FilaRegistro[], resumen: Resumen, mes: string, empresa: { ruc?: string | null; razon?: string | null }) => {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SiuMax';
  const [anio, numMes] = mes.split('-').map(Number);
  const nombreMes = new Date(anio, numMes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();
  const SOLES = '"S/" #,##0.00;[Red]-"S/" #,##0.00';
  const OSCURO = 'FF1E293B';
  const borde = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };

  // ---- Hoja 1: Registro de ventas
  const hoja = libro.addWorksheet('Registro de ventas', { views: [{ state: 'frozen', ySplit: 5 }] });
  const columnas = [
    { titulo: 'Fecha', ancho: 12 }, { titulo: 'Tipo', ancho: 18 }, { titulo: 'Serie', ancho: 8 }, { titulo: 'Número', ancho: 11 },
    { titulo: 'Doc. cliente', ancho: 12 }, { titulo: 'Nº doc. cliente', ancho: 15 }, { titulo: 'Cliente', ancho: 32 },
    { titulo: 'Op. gravada', ancho: 14 }, { titulo: 'Op. exonerada', ancho: 14 }, { titulo: 'Op. inafecta', ancho: 13 },
    { titulo: 'IGV', ancho: 12 }, { titulo: 'ICBPER (bolsas)', ancho: 14 }, { titulo: 'Total', ancho: 14 },
    { titulo: 'Estado SUNAT', ancho: 28 }, { titulo: 'Corrige a', ancho: 18 }, { titulo: 'Motivo', ancho: 30 }, { titulo: 'Venta anulada', ancho: 13 }, { titulo: 'PDF', ancho: 10 },
  ];
  columnas.forEach((c, i) => { hoja.getColumn(i + 1).width = c.ancho; });
  const ultimaCol = columnas.length;
  hoja.mergeCells(1, 1, 1, ultimaCol);
  hoja.getCell(1, 1).value = `REGISTRO DE VENTAS · ${nombreMes}`;
  hoja.getCell(1, 1).font = { bold: true, size: 14 };
  hoja.mergeCells(2, 1, 2, ultimaCol);
  hoja.getCell(2, 1).value = `RUC ${empresa.ruc || '—'} · ${empresa.razon || ''}`;
  hoja.getCell(2, 1).font = { bold: true, size: 11 };
  hoja.mergeCells(3, 1, 3, ultimaCol);
  hoja.getCell(3, 1).value = `Generado por SiuMax el ${new Date().toLocaleString('es-PE')} · Montos en soles · Las notas de crédito restan · Los rechazados y no emitidos no se suman`;
  hoja.getCell(3, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

  const cab = hoja.getRow(5);
  columnas.forEach((c, i) => {
    const celda = cab.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OSCURO } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    celda.border = bordes;
  });
  cab.height = 30;

  const tipoDoc: Record<string, string> = { '1': 'DNI', '4': 'CE', '6': 'RUC', '-': '—' };
  filas.forEach((fi, n) => {
    const fila = hoja.getRow(6 + n);
    fila.values = [
      fechaPeru(fi.fecha), `${fi.tipo} (${fi.codigo})`, fi.serie, fi.numero.padStart(8, '0'),
      tipoDoc[fi.clienteTipoDoc] ?? fi.clienteTipoDoc, fi.clienteNumDoc, fi.cliente,
      fi.totales.gravada, fi.totales.exonerada, fi.totales.inafecta, fi.totales.igv, fi.totales.icbper, fi.totales.total,
      estadoTexto(fi), fi.modifica, fi.motivo, fi.anulada ? 'SÍ' : '', fi.pdf ? { text: 'Ver PDF', hyperlink: fi.pdf } : '',
    ];
    fila.eachCell({ includeEmpty: true }, (celda, col) => {
      celda.border = bordes;
      if (col >= 8 && col <= 13) celda.numFmt = SOLES;
      if (noCuenta(fi)) celda.font = { italic: true, color: { argb: 'FF94A3B8' } };
      else if (col === 18 && fi.pdf) celda.font = { color: { argb: 'FF2563EB' }, underline: true };
    });
    if (fi.codigo === '07' && !noCuenta(fi)) fila.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
  });

  // Totales con fórmula (sin rechazados ni no emitidos)
  const desde = 6, hasta = 5 + Math.max(filas.length, 1);
  const tot = hoja.getRow(hasta + 1);
  tot.getCell(7).value = 'TOTALES';
  for (let col = 8; col <= 13; col++) {
    const letra = hoja.getColumn(col).letter;
    const est = hoja.getColumn(14).letter;
    tot.getCell(col).value = { formula: `SUMIFS(${letra}${desde}:${letra}${hasta},${est}${desde}:${est}${hasta},"<>Rechazada (no cuenta)",${est}${desde}:${est}${hasta},"<>No emitida (no cuenta)")` };
    tot.getCell(col).numFmt = SOLES;
  }
  for (let col = 1; col <= ultimaCol; col++) {
    const celda = tot.getCell(col);
    celda.font = { bold: true };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    celda.border = { ...bordes, top: { style: 'medium', color: { argb: OSCURO } } };
  }
  hoja.autoFilter = { from: { row: 5, column: 1 }, to: { row: hasta, column: ultimaCol } };

  // ---- Hoja 2: Resumen
  const res = libro.addWorksheet('Resumen');
  res.getColumn(1).width = 46; res.getColumn(2).width = 12; res.getColumn(3).width = 16;
  res.mergeCells('A1:C1');
  res.getCell('A1').value = `RESUMEN · ${nombreMes}`;
  res.getCell('A1').font = { bold: true, size: 14 };
  res.getCell('A2').value = `RUC ${empresa.ruc || '—'} · ${empresa.razon || ''}`;
  res.getCell('A2').font = { bold: true };
  const cabRes = res.getRow(4);
  ['Concepto', 'Cantidad', 'Total'].forEach((t, i) => {
    const c = cabRes.getCell(i + 1);
    c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OSCURO } }; c.border = bordes; c.alignment = { horizontal: 'center' };
  });
  const lineasRes: [string, number | null, number, boolean?][] = [
    ['Boletas', resumen.boletas.n, resumen.boletas.total],
    ['Facturas', resumen.facturas.n, resumen.facturas.total],
    ['Notas de crédito (restan)', resumen.notas.n, resumen.notas.total],
    ['TOTAL DE COMPROBANTES (NETO)', null, resumen.neto, true],
    ['IGV DEL MES (NETO)', null, resumen.igv, true],
    ['Ventas con nota de venta (sin comprobante, no van a SUNAT)', resumen.notasVenta.n, resumen.notasVenta.total],
  ];
  lineasRes.forEach(([concepto, n, total, fuerte], i) => {
    const fila = res.getRow(5 + i);
    fila.values = [concepto, n ?? '', total];
    fila.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = bordes;
      if (col === 3) c.numFmt = SOLES;
      if (col === 2) c.alignment = { horizontal: 'center' };
      if (fuerte) { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; }
    });
  });
  const notas: string[] = [];
  if (resumen.generadas) notas.push(`${resumen.generadas} generada(s) por el proveedor: SUNAT las confirma en su resumen diario (ya cuentan).`);
  if (resumen.sinEnviar) notas.push(`${resumen.sinEnviar} todavía sin aceptar: revísalas antes de declarar.`);
  if (resumen.rechazados) notas.push(`${resumen.rechazados} rechazada(s) por SUNAT: no cuentan.`);
  notas.push('Confirma estos montos con tu contador.');
  notas.forEach((t, i) => { const c = res.getCell(`A${13 + i}`); c.value = t; c.font = { italic: true, size: 10, color: { argb: 'FF475569' } }; });

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `registro-ventas-${empresa.ruc || 'siumax'}-${mes}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const Linea: React.FC<{ nombre: string; n?: number; total: number; resaltar?: boolean }> = ({ nombre, n, total, resaltar }) => (
  <div className={`flex justify-between gap-3 py-1 border-b border-[var(--color-border)] ${resaltar ? 'font-black text-[var(--color-ink)]' : 'font-bold'}`}>
    <span>{nombre}{n !== undefined ? ` (${n})` : ''}</span>
    <span className="tabular-nums">S/ {formatearMonto(total)}</span>
  </div>
);

/** Ventana "Reporte para el contador" (botón de Finanzas). */
export const ReporteContador: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [mes, setMes] = useState(() => fechaLocalPeru().slice(0, 7));
  const [datos, setDatos] = useState<{ filas: FilaRegistro[]; resumen: Resumen } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [empresa, setEmpresa] = useState<{ ruc?: string | null; razon?: string | null }>({});
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    supabase.from('empresa_config').select('ruc, razon_social, nombre_empresa').order('id').limit(1).maybeSingle()
      .then(({ data }) => { const e = data as { ruc?: string; razon_social?: string; nombre_empresa?: string } | null; setEmpresa({ ruc: e?.ruc || null, razon: e?.razon_social || e?.nombre_empresa || null }); });
    setTimeout(() => document.getElementById('rep-mes')?.focus(), 60);
  }, []);
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    let vigente = true;
    setCargando(true);
    armarRegistro(mes).then((d) => { if (vigente) { setDatos(d); setCargando(false); } });
    return () => { vigente = false; };
  }, [mes]);

  useCerrarConEscape(true, onClose);
  const r = datos?.resumen;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-reporte-contador" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
    <div className="ventana-sobria bg-white border-2 border-[var(--color-ink)] w-full max-w-2xl max-h-[calc(var(--alto-pantalla)*0.94)] flex flex-col rounded-none">
      <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera flex justify-between items-center border-b-2 border-[var(--color-ink)] p-4 bg-[var(--color-bg)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent-shadow)] flex items-center justify-center border border-[var(--color-ink)]">
            <FileSpreadsheet size={18} className="text-white" />
          </div>
          <div>
            <h3 id="titulo-reporte-contador" className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest text-[var(--color-ink)]">Reporte para el contador</h3>
            <p className="text-[12px] font-bold text-[var(--color-muted)]">Registro de ventas del mes (boletas, facturas y notas de crédito) para Excel, y el resumen para declarar.</p>
          </div>
        </div>
        <button
          id="btn-rep-cerrar"
          type="button"
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('rep-mes')?.focus(); } }}
          className="ventana-cerrar text-[var(--color-muted)] hover:text-white hover:bg-red-600 border border-[var(--color-border)] p-1.5 rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
          title="Cerrar (Esc)"
        >
          <X size={18} />
        </button>
      </div>
    <div className="overflow-y-auto p-4 flex-1 custom-scrollbar space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-black uppercase">
          Mes
          <input
            id="rep-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            onKeyDown={(e) => {
              // Enter abre el calendario (como en el resto del sistema); → al botón de descarga (está al lado), ↑ a la X.
              // Las flechas no cambian el mes (eso se hace en el calendario)
              if (e.key === 'Enter') { e.preventDefault(); try { (e.target as HTMLInputElement).showPicker(); } catch { /* sin calendario */ } }
              else if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-rep-descargar')?.focus(); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-rep-cerrar')?.focus(); }
              else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); }
            }}
            className="block mt-1 border-2 border-[var(--color-ink)] p-2 text-sm font-black outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
          />
        </label>
        <button
          id="btn-rep-descargar"
          type="button"
          aria-disabled={!datos || cargando || descargando}
          onClick={async () => {
            if (!datos || cargando || descargando) return;
            setDescargando(true);
            try { await descargarRegistroExcel(datos.filas, datos.resumen, mes, empresa); } finally { setDescargando(false); }
          }}
          onKeyDown={(e) => {
            // ← al mes (está al lado), ↑ a la X; → y ↓ no tienen nada más en esa dirección
            if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('rep-mes')?.focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-rep-cerrar')?.focus(); }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white text-[12px] font-black uppercase tracking-wider cursor-pointer rounded-none shadow-[3px_3px_0_0_var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <Download size={14} /> {descargando ? 'Preparando Excel…' : 'Descargar registro de ventas (Excel)'}
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
          {r.generadas > 0 && (
            <p className="mt-2 text-[12px] font-bold text-[var(--color-muted)]">{r.generadas} generada(s) por el proveedor: SUNAT las confirma en su resumen diario (ya cuentan).</p>
          )}
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
    </div>
    </div>
  );
};
