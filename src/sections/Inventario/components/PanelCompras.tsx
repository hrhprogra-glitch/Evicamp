// src/sections/Inventario/components/PanelCompras.tsx
// Inventario > Compras: listas de lo que hay que pedir a cada proveedor.
//  - Nueva lista: proveedor + productos (botón "Agregar stock bajo" con cantidad sugerida) o búsqueda.
//  - Enviar / Imprimir: vista previa de la hoja del pedido con WhatsApp, PDF, Descargar e Imprimir.
//  - Recibir pedido: se confirma lo que llegó y su costo, y se crean TODOS los lotes de una vez
//    (igual que "Ingresar lote": lote + movimiento COMPRA + stock del producto recalculado).
// Tablas compras / compras_detalle (servidor/sql/seguridad-sesion.sql). Permiso: almacen_ingresar_lotes.
//
// Teclado (patrón "selector" del sistema): cada elemento navegable lleva data-nav="fila,columna" y las
// flechas van al vecino más cercano en esa dirección (moverEnGrilla). En los campos de número ↑ ↓ ya no
// cambian el valor sin querer; Enter pasa al siguiente campo. Esc cierra las ventanas.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Truck, Send, PackageCheck, Trash2, X, Search, AlertTriangle, Loader2, Ban, Undo2, FileText, Share2, Download, Printer, ArrowLeft, Receipt } from 'lucide-react';
import { imprimirEnTicketera } from '../../../utils/impresion';
import { supabase } from '../../../db/supabase';
import { usePermiso, useEmpleado, avisarSinPermiso } from '../../../utils/permisos';
import { avisar, confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';
import type { Product } from '../types';
import logoSiumax from '../../../assets/logo.png'; // logo predeterminado (el mismo del menú) si el negocio no subió el suyo

interface Proveedor { id: string; razon_social: string; telefono?: string | null }
interface Item { product_id: string; product_name: string; cantidad: number; costo_unit: number; unidad?: string }
interface Compra {
  id: number; provider_id: string | null; proveedor: string | null; estado: 'PENDIENTE' | 'RECIBIDO' | 'ANULADO';
  notas: string | null; documento: string | null; autor: string | null; recibido_por: string | null; recibido_por_id: string | null;
  created_at: string; recibido_at: string | null; compras_detalle: (Item & { id: number; cantidad_recibida: number | null; batch_id: number | null })[];
}

const soles = (n: number) => `S/ ${(Number(n) || 0).toFixed(2)}`;
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
const esPeso = (p?: Pick<Product, 'unit' | 'control_type'>) => !!p && (['KG', 'GR', 'LT', 'ML'].includes(p.unit) || p.control_type === 'WEIGHT');
// Unidad que se muestra junto a cada cantidad: KG / GR / LT / ML (por peso) o UND
const unidadDe = (p?: Pick<Product, 'unit' | 'control_type'>) => (!p ? '' : esPeso(p) ? (['KG', 'GR', 'LT', 'ML'].includes(p.unit) ? p.unit : 'KG') : 'UND');
// Cantidad sugerida: llegar al doble del stock mínimo
const sugerida = (p: Product) => {
  const falta = Math.max(0, (Number(p.minStock) || 0) * 2 - (Number(p.quantity) || 0));
  return esPeso(p) ? Math.max(1, Math.round(falta * 100) / 100) : Math.max(1, Math.ceil(falta));
};
const totalDe = (items: Pick<Item, 'cantidad' | 'costo_unit'>[]) => items.reduce((t, i) => t + (Number(i.cantidad) || 0) * (Number(i.costo_unit) || 0), 0);

const claseInput = 'w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
const claseBoton = 'px-3 py-2 border-2 border-[var(--color-ink)] text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1 cursor-pointer disabled:opacity-50';

// ======================================================= Navegación con flechas
const FILA_PIE = 1000; // los botones de abajo de cada ventana siempre son la última fila
// Primer lugar del selector en Compras: "Nueva lista" o, para el cajero que solo recibe (no tiene ese botón), el filtro marcado
export const inicioCompras = () =>
  document.getElementById('btn-nueva-compra') || document.querySelector<HTMLElement>('#panel-compras [id^="btn-compras-filtro-"][aria-pressed="true"]');

const enfocar = (el: HTMLElement | null | undefined) => {
  if (!el) return false;
  el.focus();
  if (el instanceof HTMLInputElement && ['text', 'number', 'search', 'tel'].includes(el.type)) el.select();
  return true;
};

/** Mueve el foco al vecino [data-nav] en la dirección de la flecha. Devuelve true si se movió. */
const moverEnGrilla = (e: React.KeyboardEvent, contenedor: HTMLElement | null) => {
  const t = e.target as HTMLElement;
  const pos = t.dataset?.nav;
  if (!pos || !contenedor || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return false;
  const tipo = t instanceof HTMLInputElement ? t.type : '';
  // En texto, ← → mueven el cursor salvo en el borde; en fechas, ← → cambian día/mes/año
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && t instanceof HTMLInputElement) {
    if (tipo === 'date') return false;
    if (tipo !== 'number' && t.value) {
      const enBorde = e.key === 'ArrowLeft' ? t.selectionStart === 0 && t.selectionEnd === 0 : t.selectionEnd === t.value.length;
      if (!enBorde) return false;
    }
  }
  const [fila, col] = pos.split(',').map(Number);
  const todos = Array.from(contenedor.querySelectorAll<HTMLElement>('[data-nav]'))
    .filter((el) => el.offsetParent !== null && !(el as HTMLButtonElement).disabled)
    .map((el) => { const [f, c] = el.dataset.nav!.split(',').map(Number); return { el, f, c }; });
  let destino: { el: HTMLElement } | undefined;
  if (e.key === 'ArrowRight') destino = todos.filter((x) => x.f === fila && x.c > col).sort((a, b) => a.c - b.c)[0];
  if (e.key === 'ArrowLeft') destino = todos.filter((x) => x.f === fila && x.c < col).sort((a, b) => b.c - a.c)[0];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const otras = todos.filter((x) => (e.key === 'ArrowDown' ? x.f > fila : x.f < fila));
    if (otras.length) {
      const filaDestino = e.key === 'ArrowDown' ? Math.min(...otras.map((x) => x.f)) : Math.max(...otras.map((x) => x.f));
      const enFila = otras.filter((x) => x.f === filaDestino);
      // Al bajar a los botones de abajo se llega al principal (Guardar / Ingresar), nunca a "Cancelar"
      destino = filaDestino === FILA_PIE
        ? enFila.sort((a, b) => b.c - a.c)[0]
        : enFila.sort((a, b) => Math.abs(a.c - col) - Math.abs(b.c - col) || a.c - b.c)[0];
    }
  }
  // number y select: ↑ ↓ siempre se interceptan (no cambian el valor sin querer)
  if (destino || tipo === 'number' || t.tagName === 'SELECT') e.preventDefault();
  return destino ? enfocar(destino.el) : false;
};

/** Enter en un campo: pasa al siguiente campo [data-nav] (en orden de lectura); al final, al botón principal. */
const siguienteCampo = (e: React.KeyboardEvent, contenedor: HTMLElement | null, principal: string) => {
  const t = e.target as HTMLElement;
  if (e.key !== 'Enter' || !(t instanceof HTMLInputElement) || !contenedor) return;
  e.preventDefault();
  const campos = Array.from(contenedor.querySelectorAll<HTMLElement>('input[data-nav], select[data-nav]')).filter((el) => el.offsetParent !== null);
  const i = campos.indexOf(t);
  if (!enfocar(campos[i + 1])) enfocar(document.getElementById(principal));
};

const abrirLista = (e: React.KeyboardEvent<HTMLSelectElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    try { (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sin showPicker */ }
  }
};

// Logo para la hoja y el PDF: el de Ajustes > Datos de la empresa o, si no hay, el de SiuMax.
// Se achica a 240 px para que el PDF no pese.
const logoParaPdf = (src: string) => new Promise<{ data: string; ancho: number; alto: number } | null>((resolve) => {
  const img = new Image();
  img.onload = () => {
    const escala = Math.min(1, 240 / Math.max(img.width, img.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(img.width * escala)); lienzo.height = Math.max(1, Math.round(img.height * escala));
    lienzo.getContext('2d')?.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    try { resolve({ data: lienzo.toDataURL('image/png'), ancho: lienzo.width, alto: lienzo.height }); } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = src;
});

// PDF de un pedido (jsPDF se carga solo al pedirlo, para no hacer más pesado el sistema)
const pdfDeCompra = async (c: Compra, empresa: string, unidades: Map<string, string>, logo: string) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const recibida = c.estado === 'RECIBIDO';
  const num = String(c.id).slice(-6);
  let y = 18;
  // Logo arriba a la izquierda (16 mm de alto) y el nombre del negocio a su lado
  const imagen = await logoParaPdf(logo);
  let xNombre = 14;
  if (imagen) {
    const alto = 16, ancho = Math.min(40, (imagen.ancho / imagen.alto) * alto);
    doc.addImage(imagen.data, 'PNG', 14, 10, ancho, (imagen.alto / imagen.ancho) * ancho);
    xNombre = 14 + ancho + 4;
    y = 20;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(empresa || 'Pedido de compra', xNombre, y);
  doc.setFontSize(12);
  doc.text(`${recibida ? 'COMPRA RECIBIDA' : 'PEDIDO DE COMPRA'} #${num}`, 196, y, { align: 'right' });
  y += imagen ? 12 : 9;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const datos = [
    `Proveedor: ${c.proveedor || 'Sin proveedor'}`,
    `Fecha: ${fecha(c.created_at)}${c.autor ? `   Armado por: ${c.autor}` : ''}`,
    ...(recibida ? [`Recibido: ${fecha(c.recibido_at)}${c.recibido_por ? ` por ${c.recibido_por}` : ''}${c.documento ? `   Factura: ${c.documento}` : ''}`] : []),
    `Estado: ${c.estado}`,
  ];
  datos.forEach((t) => { doc.text(t, 14, y); y += 6; });
  y += 3;
  // Tabla
  const col = { prod: 14, cant: 128, costo: 156, sub: 196 };
  doc.setFillColor(30, 41, 59); doc.rect(14, y - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTO', col.prod + 2, y); doc.text(recibida ? 'LLEGÓ' : 'CANT.', col.cant, y, { align: 'right' });
  doc.text('COSTO U.', col.costo, y, { align: 'right' }); doc.text('SUBTOTAL', col.sub - 2, y, { align: 'right' });
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
  y += 8;
  let total = 0;
  for (const d of c.compras_detalle) {
    const cant = recibida ? Number(d.cantidad_recibida ?? 0) : Number(d.cantidad);
    const sub = cant * Number(d.costo_unit || 0);
    total += sub;
    const nombre = doc.splitTextToSize(d.product_name, 100);
    if (y + nombre.length * 5 > 280) { doc.addPage(); y = 18; }
    doc.text(nombre, col.prod + 2, y);
    doc.text(`${cant} ${unidades.get(String(d.product_id)) || ''}`.trim(), col.cant, y, { align: 'right' });
    doc.text(soles(Number(d.costo_unit || 0)), col.costo, y, { align: 'right' });
    doc.text(soles(sub), col.sub - 2, y, { align: 'right' });
    y += nombre.length * 5 + 2;
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 4, 196, y - 4);
  }
  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(`Total aprox.: ${soles(total)}`, 194, y, { align: 'right' });
  if (c.notas) { y += 10; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(doc.splitTextToSize(`Nota: ${c.notas}`, 180), 14, y); }
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleString('es-PE')} · SiuMax`, 14, 290);
  const proveedor = (c.proveedor || 'proveedor').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
  return new File([doc.output('blob')], `Pedido-${num}-${proveedor}.pdf`, { type: 'application/pdf' });
};

// Hoja del pedido en HTML: es la vista previa y lo que se imprime (A4). Mismo contenido que el PDF.
const esc = (t: unknown) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const htmlDeCompra = (c: Compra, empresa: string, unidades: Map<string, string>, logo: string) => {
  const recibida = c.estado === 'RECIBIDO';
  const num = String(c.id).slice(-6);
  let total = 0;
  const filas = c.compras_detalle.map((d) => {
    const cant = recibida ? Number(d.cantidad_recibida ?? 0) : Number(d.cantidad);
    const sub = cant * Number(d.costo_unit || 0);
    total += sub;
    return `<tr><td>${esc(d.product_name)}</td><td class="n">${cant} ${esc(unidades.get(String(d.product_id)) || '')}</td>`
      + `<td class="n">${soles(Number(d.costo_unit || 0))}</td><td class="n b">${soles(sub)}</td></tr>`;
  }).join('');
  const datos = [
    ['Proveedor', c.proveedor || 'Sin proveedor'],
    ['Fecha', fecha(c.created_at)],
    ...(c.autor ? [['Armado por', c.autor]] : []),
    ...(recibida ? [['Recibido', `${fecha(c.recibido_at)}${c.recibido_por ? ` por ${c.recibido_por}` : ''}`]] : []),
    ...(recibida && c.documento ? [['Factura / guía', c.documento]] : []),
    ['Estado', c.estado],
  ].map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Pedido ${num}</title><style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #111; font: 13px/1.4 Arial, Helvetica, sans-serif; }
body { padding: 28px 32px; }
@media print { body { padding: 0; } }
.cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #1e293b; padding-bottom: 10px; }
.cab .marca { display: flex; align-items: center; gap: 14px; }
.cab .marca img { max-height: 64px; max-width: 160px; object-fit: contain; }
.cab h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
.cab .doc { text-align: right; } .cab .doc b { display: block; font-size: 15px; } .cab .doc span { font-size: 22px; font-weight: 900; }
.datos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 14px 0; }
.datos div { display: flex; gap: 8px; } .datos span { color: #555; min-width: 92px; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th { background: #1e293b; color: #fff; text-align: left; padding: 7px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 7px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
.n { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
tr { page-break-inside: avoid; }
.total { text-align: right; font-size: 16px; font-weight: 900; margin-top: 12px; }
.nota { margin-top: 16px; padding: 8px 10px; border: 1px solid #ccc; }
.pie { margin-top: 28px; color: #888; font-size: 10px; }
</style></head><body>
<div class="cab"><div class="marca"><img src="${esc(new URL(logo, location.href).href)}" alt="Logo"><h1>${esc(empresa || 'Pedido de compra')}</h1></div><div class="doc"><b>${recibida ? 'COMPRA RECIBIDA' : 'PEDIDO DE COMPRA'}</b><span>#${num}</span></div></div>
<div class="datos">${datos}</div>
<table><thead><tr><th>Producto</th><th class="n">${recibida ? 'Llegó' : 'Cantidad'}</th><th class="n">Costo u.</th><th class="n">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
<div class="total">Total aprox.: ${soles(total)}</div>
${c.notas ? `<div class="nota"><b>Nota:</b> ${esc(c.notas)}</div>` : ''}
<div class="pie">Generado el ${esc(new Date().toLocaleString('es-PE'))} · SiuMax</div>
</body></html>`;
};

// El mismo pedido en ticket de 80 mm (como las boletas de venta): logo en gris, letra de ticketera, una línea por producto
const ticketDeCompra = (c: Compra, empresa: string, unidades: Map<string, string>, logo: string) => {
  const recibida = c.estado === 'RECIBIDO';
  const num = String(c.id).slice(-6);
  let total = 0;
  const items = c.compras_detalle.map((d) => {
    const cant = recibida ? Number(d.cantidad_recibida ?? 0) : Number(d.cantidad);
    const sub = cant * Number(d.costo_unit || 0);
    total += sub;
    return `<div class="item"><div class="nom">${esc(d.product_name)}</div>`
      + `<div class="fila"><span>${cant} ${esc(unidades.get(String(d.product_id)) || '')} x ${soles(Number(d.costo_unit || 0))}</span><b>${soles(sub)}</b></div></div>`;
  }).join('');
  const datos = [
    ['Proveedor', c.proveedor || 'Sin proveedor'],
    ['Fecha', fecha(c.created_at)],
    ...(c.autor ? [['Armado por', c.autor]] : []),
    ...(recibida ? [['Recibido', `${fecha(c.recibido_at)}${c.recibido_por ? ` por ${c.recibido_por}` : ''}`]] : []),
    ...(recibida && c.documento ? [['Factura', c.documento]] : []),
    ['Estado', c.estado],
  ].map(([k, v]) => `<div>${esc(k)}: <b>${esc(v)}</b></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Pedido ${num}</title><style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #000; font: 12px/1.35 'Courier New', Courier, monospace; }
body { width: 80mm; padding: 4mm 4mm 6mm; }
.cab { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
.cab img { display: block; margin: 0 auto 4px; max-height: 22mm; max-width: 50mm; object-fit: contain; filter: grayscale(1); }
.cab h1 { margin: 0; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
.cab .tipo { margin-top: 6px; font-weight: 900; text-transform: uppercase; }
.cab .num { font-size: 16px; font-weight: 900; letter-spacing: .12em; }
.datos { text-transform: uppercase; font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 4px; }
.item { padding: 4px 0; border-bottom: 1px dotted #999; }
.item .nom { font-weight: 700; text-transform: uppercase; }
.fila { display: flex; justify-content: space-between; gap: 6px; }
.total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #000; margin-top: 6px; padding-top: 4px; }
.nota { margin-top: 8px; border: 1px solid #000; padding: 4px; }
.pie { margin-top: 10px; text-align: center; font-size: 10px; }
</style></head><body>
<div class="cab"><img src="${esc(new URL(logo, location.href).href)}" alt=""><h1>${esc(empresa || 'Mi negocio')}</h1>
<div class="tipo">${recibida ? 'Compra recibida' : 'Pedido de compra'}</div><div class="num">#${num}</div></div>
<div class="datos">${datos}</div>
${items}
<div class="total"><span>TOTAL APROX.</span><span>${soles(total)}</span></div>
${c.notas ? `<div class="nota">NOTA: ${esc(c.notas)}</div>` : ''}
<div class="pie">${esc(new Date().toLocaleString('es-PE'))}<br>SiuMax</div>
</body></html>`;
};

interface Props {
  productos: Product[];
  // Al recibir un pedido: stock nuevo de cada producto (para refrescar la pantalla sin recargar)
  onStockActualizado: (cambios: { id: string; quantity: number }[]) => void;
}

export const PanelCompras: React.FC<Props> = ({ productos, onStockActualizado }) => {
  const puede = usePermiso('almacen_ingresar_lotes');
  // 'Recibir pedidos' sin permiso de almacén (cajero): solo ve pedidos (sin costos), los recibe y devuelve lo que
  // él mismo recibió. No arma, edita, anula ni envía. El servidor aplica las mismas reglas (fn_recibir/devolver_compra).
  const recibePedidos = usePermiso('compras_recibir');
  const soloRecibe = !puede && recibePedidos;
  const empleado = useEmpleado();
  const panel = useRef<HTMLDivElement>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'PENDIENTE' | 'RECIBIDO' | 'TODAS'>('PENDIENTE');
  const [editando, setEditando] = useState<Compra | 'nueva' | null>(null);
  const [recibiendo, setRecibiendo] = useState<Compra | null>(null);
  const [viendo, setViendo] = useState<Compra | null>(null); // detalle abierto (Enter sobre una lista)
  const [empresa, setEmpresa] = useState({ nombre: '', telefono: '', logo: logoSiumax }); // WhatsApp y logo de Ajustes
  const [previa, setPrevia] = useState<Compra | null>(null); // Enviar / Imprimir: vista previa de la hoja

  const cargar = async () => {
    setCargando(true);
    const [c, p, e] = await Promise.all([
      supabase.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('providers').select('id, razon_social, telefono').eq('estado', 'ACTIVO').order('razon_social'),
      supabase.from('empresa_config').select('nombre_empresa, telefono, logo_url').limit(1).maybeSingle(),
    ]);
    setEmpresa({ nombre: String(e.data?.nombre_empresa || ''), telefono: String(e.data?.telefono || ''), logo: String(e.data?.logo_url || '') || logoSiumax });
    if (c.error) void avisar(`No se pudieron cargar las compras: ${c.error.message}`);
    setCompras((c.data as Compra[]) || []);
    setProveedores((p.data as Proveedor[]) || []);
    setCargando(false);
  };
  useEffect(() => { void cargar(); }, []);

  // El selector no se pierde al volver de otra ventana (p. ej. WhatsApp) ni al hacer clic en un espacio vacío:
  // se vuelve a marcar el último elemento elegido de Compras (o "Nueva lista")
  const ultimo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const recordar = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t?.dataset?.nav && panel.current?.contains(t) && !t.closest('[role="dialog"]')) ultimo.current = t;
    };
    const recuperar = () => setTimeout(() => {
      const activo = document.activeElement;
      if (activo && activo !== document.body) return;                       // ya hay algo seleccionado
      if (document.querySelector('[role="dialog"], [data-dialogo-sistema]')) return;
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;
      const destino = ultimo.current?.isConnected && ultimo.current.offsetParent !== null ? ultimo.current : inicioCompras();
      enfocar(destino);
    }, 80);
    document.addEventListener('focusin', recordar);
    window.addEventListener('focus', recuperar);
    document.addEventListener('click', recuperar);
    return () => {
      document.removeEventListener('focusin', recordar);
      window.removeEventListener('focus', recuperar);
      document.removeEventListener('click', recuperar);
    };
  }, []);

  // Al volver de la vista previa al detalle, el selector queda en "Enviar / Imprimir"
  const focoDetalle = useRef<string | undefined>(undefined);
  useEffect(() => { if (!viendo && !previa) focoDetalle.current = undefined; }, [viendo, previa]);

  const visibles = compras.filter((c) => filtro === 'TODAS' || c.estado === filtro);
  const stockBajo = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));

  const unidadPorId = useMemo(() => new Map(productos.map((p) => [String(p.id), unidadDe(p)])), [productos]);
  const conPermiso = (accion: string, hacer: () => void) => (puede ? hacer() : avisarSinPermiso(accion));
  const conPermisoRecibir = (accion: string, hacer: () => void) => (puede || recibePedidos ? hacer() : avisarSinPermiso(accion));
  // Devolver: el admin / almacén cualquier pedido; con solo 'Recibir pedidos', únicamente lo que uno recibió
  const puedeDevolver = (c: Compra) => puede || (recibePedidos && !!empleado?.id && c.recibido_por_id === String(empleado.id));
  // Al cerrar una ventana el foco vuelve a la lista (o a "Nueva lista")
  const volverFoco = (compraId?: number) => setTimeout(() => {
    enfocar((compraId && document.querySelector<HTMLElement>(`[data-compra="${compraId}"]`)) || inicioCompras());
  }, 350); // después de que los avisos devuelvan su foco (navegacionSesion), para que no lo pisen

  // Número de WhatsApp de Ajustes > Datos de la empresa (Teléfono). Solo se usa si es un CELULAR peruano válido
  // (9 dígitos que empiezan en 9, con o sin 51): un fijo u otro formato hacía que WhatsApp diera "número no válido".
  // Si no sirve, WhatsApp se abre para elegir el chat.
  const numeroWhatsApp = () => {
    const d = empresa.telefono.replace(/\D/g, '');
    if (/^9\d{8}$/.test(d)) return `51${d}`;
    if (/^519\d{8}$/.test(d)) return d;
    return '';
  };
  const abrirWhatsApp = (texto: string) => {
    const numero = numeroWhatsApp();
    window.open(`https://api.whatsapp.com/send?${numero ? `phone=${numero}&` : ''}text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const enviarWhatsApp = (c: Compra) => {
    const recibida = c.estado === 'RECIBIDO';
    const lineas = c.compras_detalle.map((d) => {
      const cant = recibida ? (d.cantidad_recibida ?? 0) : d.cantidad;
      return `- ${cant} ${unidadPorId.get(String(d.product_id)) || ''} x ${d.product_name} (S/ ${(Number(d.costo_unit) || 0).toFixed(2)} c/u)`;
    }).join('\n');
    const total = totalDe(c.compras_detalle.map((d) => ({ cantidad: recibida ? Number(d.cantidad_recibida ?? 0) : d.cantidad, costo_unit: d.costo_unit })));
    const texto = [
      `*${recibida ? 'Compra recibida' : 'Pedido de compra'} #${String(c.id).slice(-6)}*${empresa.nombre ? ` - ${empresa.nombre}` : ''}`,
      `Proveedor: ${c.proveedor || 'Sin proveedor'}`,
      `Fecha: ${fecha(c.created_at)}${recibida ? ` - recibido ${fecha(c.recibido_at)}${c.documento ? ` (${c.documento})` : ''}` : ''}`,
      '', lineas, '', `Total aprox.: ${soles(total)}`,
      ...(c.notas ? ['', `Nota: ${c.notas}`] : []),
    ].join('\n');
    abrirWhatsApp(texto);
  };

  // Guarda el PDF en la PC (en el navegador va a Descargas; en la app de escritorio pregunta dónde guardarlo)
  const guardarArchivo = (archivo: File) => {
    const url = URL.createObjectURL(archivo);
    const a = document.createElement('a');
    a.href = url; a.download = archivo.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const descargarPdf = async (c: Compra) => {
    try {
      const archivo = await pdfDeCompra(c, empresa.nombre, unidadPorId, empresa.logo);
      guardarArchivo(archivo);
      await avisar(`📄 PDF descargado: "${archivo.name}".\n\nLo encuentras en Descargas (o en la carpeta que elegiste).`);
    } catch (e: any) {
      void avisar(`No se pudo crear el PDF: ${e?.message || e}`);
    }
  };

  // PDF del pedido: se comparte (ventana de compartir de Windows → WhatsApp) o, si la PC no lo permite, se guarda
  // y se abre el chat para adjuntarlo con el clip.
  const enviarPdf = async (c: Compra) => {
    try {
      const archivo = await pdfDeCompra(c, empresa.nombre, unidadPorId, empresa.logo);
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [archivo] })) {
        try { await navigator.share({ files: [archivo], title: archivo.name, text: `Pedido #${String(c.id).slice(-6)}` }); return; }
        catch (e: any) { if (e?.name === 'AbortError') return; /* sin compartir: se guarda */ }
      }
      guardarArchivo(archivo);
      await avisar(`📄 Se guardó "${archivo.name}" (normalmente en Descargas).\n\nSe abrirá WhatsApp: adjúntalo con el clip 📎 → Documento.`);
      abrirWhatsApp(`Le envío el ${c.estado === 'RECIBIDO' ? 'detalle de la compra' : 'pedido'} #${String(c.id).slice(-6)} en PDF.`);
    } catch (e: any) {
      void avisar(`No se pudo crear el PDF: ${e?.message || e}`);
    }
  };

  const anular = async (c: Compra) => {
    if (!await confirmar(`¿Anular esta lista de compras${c.proveedor ? ` de ${c.proveedor}` : ''}? No se ingresa nada al inventario.`)) return false;
    const { error } = await supabase.from('compras').update({ estado: 'ANULADO' }).eq('id', c.id);
    if (error) { void avisar(`No se pudo anular: ${error.message}`); return false; }
    await cargar();
    volverFoco();
    return true;
  };

  // "Devolver lo ingresado": lo hace el SERVIDOR (fn_devolver_compra, todo o nada): retira los lotes y la compra
  // vuelve a PENDIENTE (no se borra). Revisa que nada se haya vendido ni mermado y, con solo "Recibir pedidos",
  // que lo haya recibido el mismo empleado. Queda en el historial con su nombre.
  const devolver = async (c: Compra) => {
    if (!await confirmar(
      `↩️ DEVOLVER LO INGRESADO\n\nUsa esto si te equivocaste al recibir (cantidades o el pedido equivocado):\n\n`
      + `• Se retirarán del inventario los lotes que se crearon al recibir.\n`
      + `• El stock vuelve a como estaba antes de recibir.\n`
      + `• El pedido NO se borra: vuelve a PENDIENTES para recibirlo bien.\n`
      + `• Queda registrado que tú lo devolviste.\n\n¿Devolver?`,
    )) return false;
    const { data, error } = await supabase.rpc('fn_devolver_compra', { p_compra_id: c.id });
    if (error) { void avisar(`⚠️ No se pudo devolver.\n\n${error.message}`); return false; }
    const cambios = ((data as any)?.cambios || []) as { id: string; quantity: number }[];
    if (cambios.length) onStockActualizado(cambios);
    await cargar();
    await avisar(`✅ Pedido devuelto: ${(data as any)?.lotes ?? 0} lote(s) retirado(s). El pedido #${String(c.id).slice(-6)} volvió a PENDIENTES.`);
    setFiltro('PENDIENTE');
    volverFoco(c.id);
    return true;
  };

  // ↑ desde la primera fila vuelve a la pestaña "Compras"
  const teclasPanel = (e: React.KeyboardEvent) => {
    // Las teclas dentro de una ventana (detalle, vista previa, editor...) las maneja esa ventana
    if (editando || recibiendo || viendo || previa || (e.target as HTMLElement).closest('[role="dialog"]')) return;
    const fila = Number((e.target as HTMLElement).dataset?.nav?.split(',')[0]);
    if (e.key === 'ArrowUp' && fila === 0) { e.preventDefault(); enfocar(document.getElementById('btn-tab-compras')); return; }
    moverEnGrilla(e, panel.current);
  };

  const filtros = [['PENDIENTE', 'Pendientes'], ['RECIBIDO', 'Recibidas'], ['TODAS', 'Todas']] as const;

  return (
    <div id="panel-compras" ref={panel} onKeyDown={teclasPanel} className="flex flex-col gap-4 font-mono">
      {/* Cabecera (fila 0) */}
      {/* En laptops el texto va arriba y los botones abajo (en una fila no entran) */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-3 sm:p-4">
        <div>
          <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-[var(--color-ink)] flex items-center gap-2"><ShoppingCart size={18} /> Listas de compras</h2>
          <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">
            Arma el pedido para tu proveedor y, cuando llegue, recíbelo: los lotes se crean solos. Enter sobre una lista para ver su detalle.
            {!soloRecibe && stockBajo.length > 0 && <span className="text-[var(--color-danger)]"> · {stockBajo.length} producto(s) con stock bajo.</span>}
          </p>
        </div>
        <div className="flex flex-nowrap gap-2 shrink-0 overflow-x-auto">{/* los 4 botones siempre en una fila ("Nueva lista" no baja) */}
          {filtros.map(([f, nombre], i) => (
            <button key={f} id={`btn-compras-filtro-${f}`} type="button" data-nav={`0,${i}`} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
              className={`${claseBoton} ${filtro === f ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'bg-white text-[var(--color-ink)]'}`}>
              {nombre}
            </button>
          ))}
          {!soloRecibe && (
          <button id="btn-nueva-compra" type="button" data-nav="0,3" onClick={() => conPermiso('armar listas de compras', () => setEditando('nueva'))}
            className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[3px_3px_0_0_var(--color-ink)]`}>
            <Plus size={14} /> Nueva lista
          </button>
          )}
        </div>
      </div>

      {/* Listas en tabla; Enter abre el detalle */}
      {cargando ? (
        <div className="p-6 text-center text-xs font-black uppercase text-[var(--color-muted)]"><Loader2 className="inline animate-spin" size={16} /> Cargando...</div>
      ) : visibles.length === 0 ? (
        <div className="p-6 bg-white border-2 border-dashed border-[var(--color-border)] text-center text-xs font-black uppercase text-[var(--color-muted)]">
          {filtro === 'PENDIENTE' ? (soloRecibe ? 'No hay pedidos por recibir.' : 'No hay pedidos pendientes. Crea una lista con "Nueva lista".') : 'No hay listas aquí.'}
        </div>
      ) : (
        // Tabla (mismo estilo que Lotes): una fila por lista; ↑ ↓ para moverse, Enter abre el detalle
        <div className="w-full overflow-x-auto custom-scrollbar border-2 border-[var(--color-ink)] bg-white">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-3 bg-[var(--color-ink)] text-white px-4 py-3 text-xs font-black uppercase tracking-[0.1em]">
              <div className="col-span-2">Fecha / Pedido</div>
              <div className="col-span-3">Proveedor</div>
              <div className="col-span-1 text-center">Productos</div>
              <div className="col-span-1 text-right">{soloRecibe ? '' : 'Total'}</div>
              <div className="col-span-3">Recibido por / Factura</div>
              <div className="col-span-1 text-center">Estado</div>
            </div>
            {visibles.map((c, n) => {
              const recibida = c.estado === 'RECIBIDO';
              const colorEstado = c.estado === 'PENDIENTE' ? 'border-[var(--color-warning)] text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)]'
                : recibida ? 'border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-accent-bg)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-bg)]';
              const total = totalDe(c.compras_detalle.map((d) => ({ cantidad: recibida ? Number(d.cantidad_recibida ?? 0) : d.cantidad, costo_unit: d.costo_unit })));
              return (
                <div key={c.id} data-compra={c.id} role="button" tabIndex={0} data-nav={`${n + 1},0`}
                  aria-label={`Pedido ${String(c.id).slice(-6)} de ${c.proveedor || 'sin proveedor'}, ${c.estado}. Enter para ver el detalle`}
                  onClick={() => setViendo(c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViendo(c); } }}
                  className="grid grid-cols-12 gap-3 items-start px-4 py-3 border-b border-[var(--color-border)] text-sm cursor-pointer hover:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] focus:bg-[var(--color-accent-bg)]">
                  <div className="col-span-2">
                    <p className="font-black text-[var(--color-ink)]">{fecha(c.created_at)}</p>
                    <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase">#{String(c.id).slice(-6)}{c.autor ? ` · ${c.autor}` : ''}</p>
                  </div>
                  <div className="col-span-3 font-black uppercase text-[var(--color-ink)] truncate flex items-center gap-2"><Truck size={14} className="shrink-0" /> <span className="truncate">{c.proveedor || 'Sin proveedor'}</span></div>
                  {/* Los productos se ven en el detalle (Enter); aquí solo cuántos son */}
                  <div className="col-span-1 text-center font-black text-[var(--color-ink)]">{c.compras_detalle.length}</div>
                  <div className="col-span-1 text-right font-black text-[var(--color-ink)]">{soloRecibe ? '' : soles(total)}</div>
                  {/* Quién lo recibió: el empleado con la sesión abierta al recibir (admin o cajero) */}
                  <div className="col-span-3 text-xs font-bold text-[var(--color-muted)] uppercase">
                    {recibida ? <>
                      <span className="block font-black text-[var(--color-ink)]">{c.recibido_por || 'Sin registrar'}</span>
                      {fecha(c.recibido_at)}{c.documento ? ` · ${c.documento}` : ''}
                    </> : '—'}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`inline-block px-2 py-0.5 border-2 text-[10px] font-black uppercase ${colorEstado}`}>{c.estado}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viendo && (
        <DetalleCompra
          compra={viendo}
          unidades={unidadPorId}
          soloRecibe={soloRecibe}
          puedeDevolver={puedeDevolver(viendo)}
          foco={focoDetalle.current}
          onCerrar={() => { const id = viendo.id; setViendo(null); volverFoco(id); }}
          onCompartir={() => { const c = viendo; setViendo(null); setPrevia(c); }}
          onEditar={() => conPermiso('editar listas de compras', () => { const c = viendo; setViendo(null); setEditando(c); })}
          onAnular={() => conPermiso('anular listas de compras', () => { const c = viendo; void anular(c).then((ok) => { if (ok) setViendo(null); }); })}
          onRecibir={() => conPermisoRecibir('recibir pedidos', () => { const c = viendo; setViendo(null); setRecibiendo(c); })}
          onDevolver={() => conPermisoRecibir('devolver compras', () => { const c = viendo; void devolver(c).then((ok) => { if (ok) setViendo(null); }); })}
        />
      )}

      {previa && (
        <VistaPrevia
          compra={previa}
          hoja={htmlDeCompra(previa, empresa.nombre, unidadPorId, empresa.logo)}
          ticket={ticketDeCompra(previa, empresa.nombre, unidadPorId, empresa.logo)}
          onCerrar={() => { const c = previa; setPrevia(null); focoDetalle.current = 'btn-detalle-compartir'; setViendo(c); }}
          onWhatsApp={() => enviarWhatsApp(previa)}
          onEnviarPdf={() => enviarPdf(previa)}
          onDescargar={() => descargarPdf(previa)}
        />
      )}

      {editando && (
        <EditorCompra
          compra={editando === 'nueva' ? null : editando}
          productos={productos}
          proveedores={proveedores}
          autor={empleado?.nombre || ''}
          onCerrar={async (guardadoId) => {
            const anterior = editando === 'nueva' ? undefined : editando.id;
            setEditando(null);
            if (guardadoId) { setFiltro('PENDIENTE'); await cargar(); }
            volverFoco(guardadoId || anterior);
          }}
        />
      )}
      {recibiendo && (
        <RecibirCompra
          compra={recibiendo}
          productos={productos}
          soloRecibe={soloRecibe}
          onCerrar={async (cambios) => {
            const id = recibiendo.id;
            setRecibiendo(null);
            if (cambios) { onStockActualizado(cambios); await cargar(); }
            volverFoco(id);
          }}
        />
      )}
    </div>
  );
};

// ======================================================= Ventana base (Esc cierra)
const Ventana: React.FC<{ titulo: string; onCerrar: () => void; children: React.ReactNode; pie: React.ReactNode; cuerpo: React.RefObject<HTMLDivElement | null>; ancho?: string }> = ({ titulo, onCerrar, children, pie, cuerpo, ancho = 'max-w-3xl' }) => {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo-sistema]')) return;
      // Esc en un buscador con texto: primero borra la búsqueda (lo maneja el buscador)
      const activo = document.activeElement as HTMLInputElement | null;
      if (activo?.dataset?.escLimpia) return; // el buscador cierra primero su desplegable / borra su texto
      e.preventDefault(); e.stopPropagation(); onCerrar();
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onCerrar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div ref={cuerpo} className={`bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full ${ancho} max-h-[calc(var(--alto-pantalla,100vh)*0.94)] flex flex-col`}
        onKeyDown={(e) => moverEnGrilla(e, cuerpo.current)}>
        <div className="bg-[var(--color-ink)] text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">{titulo}</h3>
          <button type="button" data-nav="-1,0" onClick={onCerrar} aria-label="Cerrar (Esc)" title="Cerrar (Esc)" className="p-1 hover:text-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">{children}</div>
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex flex-wrap justify-end gap-2 shrink-0">{pie}</div>
      </div>
    </div>
  );
};

// ======================================================= Detalle (Enter sobre una lista). Tamaño de letra normal: Ajustes > Apariencia lo agranda
// Con 'soloRecibe' (cajero con 'Recibir pedidos'): sin costos ni totales; solo Recibir y, si él lo recibió, Devolver.
// Abajo, el registro de modificaciones (compras_historial): quién creó, editó, recibió, devolvió o anuló, y cuándo.
const ACCIONES: Record<string, string> = { CREADA: 'Creó la lista', EDITADA: 'Editó la lista', ANULADA: 'Anuló el pedido', RECIBIDA: 'Recibió el pedido', DEVUELTA: 'Devolvió lo ingresado' };

const DetalleCompra: React.FC<{
  compra: Compra; unidades: Map<string, string>; soloRecibe: boolean; puedeDevolver: boolean; foco?: string; onCerrar: () => void; onCompartir: () => void; onEditar: () => void;
  onAnular: () => void; onRecibir: () => void; onDevolver: () => void;
}> = ({ compra: c, unidades, soloRecibe, puedeDevolver, foco, onCerrar, onCompartir, onEditar, onAnular, onRecibir, onDevolver }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const recibida = c.estado === 'RECIBIDO';
  const parcial = c.compras_detalle.some((d) => d.batch_id != null);
  const filas = c.compras_detalle.map((d) => ({ ...d, mostrar: recibida ? Number(d.cantidad_recibida ?? 0) : Number(d.cantidad) }));
  const total = totalDe(filas.map((f) => ({ cantidad: f.mostrar, costo_unit: f.costo_unit })));
  const [historial, setHistorial] = useState<{ id: number; accion: string; empleado: string | null; detalle: string | null; created_at: string }[]>([]);
  useEffect(() => {
    void supabase.from('compras_historial').select('id, accion, empleado, detalle, created_at').eq('compra_id', c.id).order('created_at')
      .then(({ data }) => setHistorial((data as any[]) || []));
  }, [c.id]);

  // Botones: el principal va al final (↓ llega a él y es el que queda marcado al abrir)
  // Enviar (WhatsApp / PDF), descargar e imprimir están juntos en la vista previa
  const compartir = { clave: 'compartir', contenido: <><Share2 size={16} /> Enviar / Imprimir</>, clase: 'bg-white text-[var(--color-ink)]', hacer: onCompartir };
  const botones = c.estado === 'PENDIENTE'
    ? (soloRecibe
      ? [{ clave: 'recibir', contenido: <><PackageCheck size={16} /> Recibir</>, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]', hacer: onRecibir }]
      : [
        compartir,
        ...(!parcial ? [{ clave: 'editar', contenido: <>Editar</>, clase: 'bg-white text-[var(--color-ink)]', hacer: onEditar }] : []),
        { clave: 'anular', contenido: <><Ban size={16} /> Anular</>, clase: 'bg-white text-[var(--color-muted)]', hacer: onAnular },
        { clave: 'recibir', contenido: <><PackageCheck size={16} /> Recibir</>, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]', hacer: onRecibir },
      ])
    : recibida
      ? [
        ...(puedeDevolver ? [{ clave: 'devolver', contenido: <><Undo2 size={16} /> Devolver lo ingresado</>, clase: 'bg-white text-[var(--color-danger)] border-[var(--color-danger)]', hacer: onDevolver }] : []),
        ...(!soloRecibe ? [{ ...compartir, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]' }] : []),
      ]
      : (!soloRecibe ? [{ ...compartir, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]' }] : []);

  // Al abrir, el foco va al botón principal; si no hay botones, a la X
  useEffect(() => {
    setTimeout(() => enfocar((foco && document.getElementById(foco)) || (botones.length ? document.getElementById(`btn-detalle-${botones[botones.length - 1].clave}`) : null)
      || cuerpo.current?.querySelector<HTMLElement>('[data-nav="-1,0"]')), 30);
  }, []);

  return (
    <Ventana cuerpo={cuerpo} titulo={`Pedido #${String(c.id).slice(-6)} · ${c.estado}`} onCerrar={onCerrar}
      pie={<>{botones.length === 0 && <span className="mr-auto self-center text-[10px] font-bold uppercase text-[var(--color-muted)]">Solo lectura · Esc para cerrar</span>}
        {botones.map((b, i) => (
          <button key={b.clave} id={`btn-detalle-${b.clave}`} type="button" data-nav={`${FILA_PIE},${i}`} onClick={b.hacer}
            className={`${claseBoton} ${b.clase}`}>{b.contenido}</button>
        ))}</>}>
      <div className="flex flex-col gap-1">
        <p className="text-sm sm:text-base font-black uppercase text-[var(--color-ink)] flex items-center gap-2"><Truck size={16} /> {c.proveedor || 'Sin proveedor'}</p>
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
          {fecha(c.created_at)}{c.autor ? ` · armado por ${c.autor}` : ''}
          {recibida && ` · recibido ${fecha(c.recibido_at)}${c.recibido_por ? ` por ${c.recibido_por}` : ''}${c.documento ? ` · ${c.documento}` : ''}`}
        </p>
        {c.notas && <p className="text-xs font-bold text-[var(--color-ink)] mt-1">📝 {c.notas}</p>}
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)] border-b-2 border-[var(--color-ink)]">
          <th className="py-2 pr-2">Producto</th><th className="py-2 px-2 text-right">{recibida ? 'Llegó' : 'Pedir'}</th>
          {!soloRecibe && <><th className="py-2 px-2 text-right">Costo u.</th><th className="py-2 pl-2 text-right">Subtotal</th></>}
        </tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-[var(--color-border)]">
              <td className="py-2 pr-2 font-black text-[var(--color-ink)]">{f.product_name}
                {recibida && Number(f.cantidad_recibida ?? 0) !== Number(f.cantidad) && <span className="block text-[10px] font-bold text-[var(--color-warning-dark)]">pedido: {f.cantidad} {unidades.get(String(f.product_id))}</span>}
              </td>
              <td className="py-2 px-2 text-right font-black whitespace-nowrap">{f.mostrar} <span className="text-[10px] text-[var(--color-muted)]">{unidades.get(String(f.product_id))}</span></td>
              {!soloRecibe && <>
                <td className="py-2 px-2 text-right font-bold text-[var(--color-muted)]">{soles(f.costo_unit)}</td>
                <td className="py-2 pl-2 text-right font-black">{soles(f.mostrar * Number(f.costo_unit))}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
      {!soloRecibe && <p className="text-right text-sm font-black text-[var(--color-ink)]">Total aprox. {soles(total)}</p>}
      {/* Registro de modificaciones */}
      <div className="border-t-2 border-[var(--color-ink)] pt-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1">Registro de cambios</p>
        {historial.length === 0 ? (
          <p className="text-[11px] font-bold text-[var(--color-muted)]">Sin cambios registrados.</p>
        ) : (
          <ul className="space-y-0.5">
            {historial.map((h) => (
              <li key={h.id} className="text-[11px] font-bold text-[var(--color-ink)]">
                <span className="text-[var(--color-muted)]">{new Date(h.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {' · '}<b>{h.empleado || 'Sistema'}</b> — {ACCIONES[h.accion] || h.accion}{h.detalle ? ` (${h.detalle})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Ventana>
  );
};

// ======================================================= Enviar / Imprimir: vista previa de la hoja del pedido
// La hoja se ve tal cual se imprime. Botones agrupados: Enviar (WhatsApp texto / PDF), Guardar (Descargar PDF) e Imprimir.
// "Imprimir en": Hoja A4 (ventana de impresión: elegir impresora, copias, guardar como PDF) o Ticket de 80 mm
// (en la app de escritorio va directo a la ticketera, igual que las boletas). La vista previa cambia con la opción.
type Formato = 'HOJA' | 'TICKET';
const CLAVE_FORMATO = 'compras_formato_impresion';
const VistaPrevia: React.FC<{
  compra: Compra; hoja: string; ticket: string; onCerrar: () => void; onWhatsApp: () => void; onEnviarPdf: () => Promise<void>; onDescargar: () => Promise<void>;
}> = ({ compra: c, hoja, ticket, onCerrar, onWhatsApp, onEnviarPdf, onDescargar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLIFrameElement>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  // Se recuerda la última opción elegida en esta PC
  const [formato, setFormato] = useState<Formato>(() => {
    try { return localStorage.getItem(CLAVE_FORMATO) === 'TICKET' ? 'TICKET' : 'HOJA'; } catch { return 'HOJA'; }
  });
  const elegirFormato = (f: Formato) => {
    setFormato(f);
    try { localStorage.setItem(CLAVE_FORMATO, f); } catch { /* sin almacenamiento: solo por esta vez */ }
  };
  const html = formato === 'TICKET' ? ticket : hoja;
  // Al volver de la ventana de impresión o de WhatsApp, el selector regresa al último botón usado
  const ultimo = useRef('btn-previa-imprimir');
  useEffect(() => {
    const recuperar = () => setTimeout(() => {
      const a = document.activeElement;
      if ((!a || a === document.body || a.tagName === 'IFRAME') && !document.querySelector('[data-dialogo-sistema]')) enfocar(document.getElementById(ultimo.current));
    }, 80);
    window.addEventListener('focus', recuperar);
    return () => window.removeEventListener('focus', recuperar);
  }, []);
  const hacer = async (id: string, accion: () => void | Promise<void>) => {
    if (ocupado) return;
    ultimo.current = id;
    setOcupado(id);
    try { await accion(); } finally {
      setOcupado(null);
      setTimeout(() => enfocar(document.getElementById(id)), 60); // el selector vuelve al botón usado
    }
  };
  const imprimir = async () => {
    if (formato === 'TICKET') {
      const r = await imprimirEnTicketera(ticket, `Pedido ${String(c.id).slice(-6)}`);
      if (r) { // app de escritorio: ya se mandó a la ticketera
        if (!r.ok) await avisar(`No se pudo imprimir el ticket: ${r.motivo}\n\nRevisa que la ticketera esté encendida y elegida en el menú de la app (tecla Alt > Impresora de tickets).`);
        return;
      }
    }
    marco.current?.contentWindow?.print();
  };
  // La hoja toma el alto de su contenido: se desplaza con la rueda dentro de la ventana
  const ajustarAlto = () => {
    const d = marco.current?.contentDocument;
    if (marco.current && d) marco.current.style.height = `${d.documentElement.scrollHeight + 4}px`;
  };
  useEffect(() => { setTimeout(() => enfocar(document.getElementById('btn-previa-imprimir')), 30); }, []);

  const botones: { grupo: string; id: string; contenido: React.ReactNode; clase: string; accion: () => void | Promise<void> }[] = [
    { grupo: 'Enviar', id: 'btn-previa-whatsapp', contenido: <><Send size={16} /> WhatsApp</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', accion: onWhatsApp },
    { grupo: 'Enviar', id: 'btn-previa-pdf', contenido: <><FileText size={16} /> PDF por WhatsApp</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', accion: onEnviarPdf },
    { grupo: 'Guardar', id: 'btn-previa-descargar', contenido: <><Download size={16} /> Descargar PDF</>, clase: 'bg-white text-[var(--color-ink)]', accion: onDescargar },
    { grupo: 'Imprimir', id: 'btn-previa-imprimir', contenido: <><Printer size={16} /> Imprimir</>, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]', accion: imprimir },
  ];
  const grupos = [...new Set(botones.map((b) => b.grupo))];

  return (
    <Ventana cuerpo={cuerpo} ancho="max-w-4xl" titulo={`Enviar, descargar o imprimir · Pedido #${String(c.id).slice(-6)}`} onCerrar={onCerrar}
      pie={<div className="w-full flex flex-wrap items-end justify-end gap-x-5 gap-y-2">
        <button id="btn-previa-volver" type="button" data-nav={`${FILA_PIE},-1`} onClick={onCerrar} title="Volver al detalle (Esc)"
          className={`${claseBoton} bg-white text-[var(--color-ink)] mr-auto self-end`}><ArrowLeft size={16} /> Volver</button>
        {grupos.map((g) => (
          <div key={g} className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">{g}</span>
            <div className="flex flex-wrap gap-2">
              {botones.filter((b) => b.grupo === g).map((b) => (
                <button key={b.id} id={b.id} type="button" data-nav={`${FILA_PIE},${botones.indexOf(b)}`} aria-disabled={!!ocupado}
                  onClick={() => void hacer(b.id, b.accion)} className={`${claseBoton} ${b.clase}`}>
                  {ocupado === b.id ? <Loader2 size={16} className="animate-spin" /> : b.contenido}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Imprimir en:</span>
          {([['HOJA', 'Hoja A4', FileText], ['TICKET', 'Ticket', Receipt]] as const).map(([f, nombre, Icono], i) => (
            <button key={f} id={`btn-formato-${f}`} type="button" data-nav={`0,${i}`} aria-pressed={formato === f} onClick={() => elegirFormato(f)}
              className={`${claseBoton} ${formato === f ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'bg-white text-[var(--color-ink)]'}`}>
              <Icono size={14} /> {nombre}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">
          Vista previa · {formato === 'TICKET' ? 'ticket de 80 mm' : 'hoja A4'}
        </p>
      </div>
      <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-2 sm:p-4">
        {/* Sin foco ni clics dentro de la hoja: el selector siempre queda en los botones */}
        <iframe ref={marco} title="Vista previa del pedido" srcDoc={html} tabIndex={-1} onLoad={ajustarAlto}
          className={`${formato === 'TICKET' ? 'w-[80mm] mx-auto border-2 border-dashed border-gray-400' : 'w-full border border-[var(--color-border)]'} min-h-[300px] bg-white shadow-[4px_4px_0_0_var(--color-border)] pointer-events-none block`} />
      </div>
    </Ventana>
  );
};

// ======================================================= Crear / editar una lista
const EditorCompra: React.FC<{
  compra: Compra | null; productos: Product[]; proveedores: Proveedor[]; autor: string; onCerrar: (guardadoId: number | null) => void;
}> = ({ compra, productos, proveedores, autor, onCerrar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const [proveedorId, setProveedorId] = useState(compra?.provider_id || '');
  const [listaProveedores, setListaProveedores] = useState(proveedores);
  useEffect(() => {
    void supabase.from('providers').select('id, razon_social, telefono').eq('estado', 'ACTIVO').order('razon_social')
      .then(({ data }) => { if (data) setListaProveedores(data as Proveedor[]); });
  }, []);
  const [notas, setNotas] = useState(compra?.notas || '');
  const [items, setItems] = useState<Item[]>(compra?.compras_detalle.map((d) => ({
    product_id: String(d.product_id), product_name: d.product_name, cantidad: Number(d.cantidad), costo_unit: Math.round(Number(d.costo_unit) * 100) / 100,
  })) || []);
  const [busqueda, setBusqueda] = useState('');
  const [marcado, setMarcado] = useState(-1); // resultado marcado con ↑ ↓ (-1 = escribiendo)
  const [guardando, setGuardando] = useState(false);
  const ocupado = useRef(false); // un segundo Enter mientras guarda no hace nada
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  // Al abrir: una lista nueva empieza por el proveedor; una existente, por el buscador
  useEffect(() => { setTimeout(() => enfocar(document.getElementById(compra ? 'compra-buscar' : 'compra-proveedor')), 30); }, []);

  const agregar = (p: Product, cantidad = 1) => setItems((prev) => (prev.some((i) => i.product_id === String(p.id))
    ? prev
    : [...prev, { product_id: String(p.id), product_name: p.name, cantidad, costo_unit: Math.round((Number(p.cost) || 0) * 100) / 100, unidad: p.unit }]));
  const agregarStockBajo = () => {
    const bajos = productos.filter((p) => p.unit !== 'CONSUMO' && Number(p.quantity) <= Number(p.minStock));
    if (!bajos.length) { void avisar('No hay productos con stock bajo. 👍'); return; }
    bajos.forEach((p) => agregar(p, sugerida(p)));
  };
  // Lo que se está escribiendo en cada campo se guarda como TEXTO mientras tanto: antes se guardaba el número y,
  // al borrar, volvía a salir 0 (y al escribir quedaba "05"). Un campo en 0 se ve vacío (con un "0" gris de ayuda).
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const valorCampo = (id: string, campo: 'cantidad' | 'costo_unit', numero: number) =>
    borrador[`${id}:${campo}`] ?? (numero === 0 ? '' : String(numero));
  const cambiar = (id: string, campo: 'cantidad' | 'costo_unit', valor: string) => {
    setBorrador((prev) => ({ ...prev, [`${id}:${campo}`]: valor }));
    setItems((prev) => prev.map((i) => (i.product_id === id ? { ...i, [campo]: Math.max(0, Number(valor) || 0) } : i)));
  };
  const soltarCampo = (id: string, campo: 'cantidad' | 'costo_unit') =>
    setBorrador((prev) => { const { [`${id}:${campo}`]: _, ...resto } = prev; return resto; });
  const quitar = (id: string, fila: number) => {
    setItems((prev) => prev.filter((x) => x.product_id !== id));
    // El foco pasa a la fila que quedó en su lugar (o al buscador si ya no hay)
    setTimeout(() => enfocar(cuerpo.current?.querySelector<HTMLElement>(`[data-nav="${fila},2"]`)
      || cuerpo.current?.querySelector<HTMLElement>(`[data-nav="${fila - 1},2"]`) || document.getElementById('compra-buscar')), 30);
  };

  // Desplegable: se abre al escribir (desde la 1ra letra) o con ↓ en el buscador vacío (todos, stock bajo primero)
  const [abierto, setAbierto] = useState(false);
  // El desplegable FLOTA sobre la ventana (posición fija bajo el buscador): antes iba dentro y la agrandaba,
  // y como la ventana está centrada, se movía entera. Se recalcula al desplazar o cambiar el tamaño.
  const [posLista, setPosLista] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  useEffect(() => {
    if (!abierto) { setPosLista(null); return; }
    const medir = () => {
      const input = document.getElementById('compra-buscar');
      const r = input?.getBoundingClientRect();
      if (!input || !r) return;
      const zoom = r.width / (input.offsetWidth || r.width) || 1; // Ajustes > Apariencia puede agrandar todo
      setPosLista({ top: (r.bottom + 4) / zoom, left: r.left / zoom, width: r.width / zoom,
        maxHeight: Math.max(120, Math.min(280, (window.innerHeight - r.bottom - 16) / zoom)) });
    };
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true); };
  }, [abierto]);
  // TODOS los productos (antes se ocultaban los que ya estaban en la lista y parecía que faltaban); esos salen
  // marcados 'YA EN LA LISTA' y al elegirlos se va a su cantidad, sin duplicarlos
  const enLista = new Set(items.map((i) => i.product_id));
  const disponibles = productos;
  const resultados = !abierto ? [] : busqueda.trim()
    ? disponibles.filter((p) => coincideBusqueda([p.name, p.code, p.barcode], busqueda)) // todos (antes se cortaba en 50)
    : [...disponibles].sort((a, b) => Number(b.unit !== 'CONSUMO' && Number(b.quantity) <= Number(b.minStock)) - Number(a.unit !== 'CONSUMO' && Number(a.quantity) <= Number(a.minStock))
      || a.name.localeCompare(b.name));
  useEffect(() => { setMarcado(-1); }, [busqueda]);
  // El marcado siempre a la vista
  useEffect(() => { if (marcado >= 0) document.getElementById(`compra-resultado-${marcado}`)?.scrollIntoView({ block: 'nearest' }); }, [marcado]);
  const elegir = (p: Product) => {
    agregar(p);
    setBusqueda('');
    setAbierto(false);
    // Queda listo para escribir la cantidad del producto recién agregado
    setTimeout(() => enfocar(cuerpo.current?.querySelector<HTMLElement>(`[data-producto="${p.id}"] input`)), 30);
  };

  const teclasBuscador = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(true); setMarcado(0); return; }
    if (e.key === 'Escape' && abierto && !busqueda) { e.preventDefault(); setAbierto(false); return; }
    if (resultados.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setMarcado((m) => Math.min(resultados.length - 1, m + 1)); return; }
      if (e.key === 'ArrowUp' && marcado >= 0) { e.preventDefault(); e.stopPropagation(); setMarcado((m) => m - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); elegir(resultados[Math.max(0, marcado)]); return; }
    }
    if (e.key === 'Escape' && busqueda) { e.preventDefault(); setBusqueda(''); setAbierto(false); return; }
    // Sin resultados: Enter pasa a la primera cantidad de la lista (o a Guardar)
    if (e.key === 'Enter') {
      e.preventDefault();
      enfocar(cuerpo.current?.querySelector<HTMLElement>('[data-producto] input') || document.getElementById('btn-guardar-compra'));
    }
  };

  const guardar = async () => {
    if (ocupado.current) return;
    const validos = items.filter((i) => i.cantidad > 0);
    if (!validos.length) { void avisar('Agrega al menos un producto con cantidad.'); return; }
    ocupado.current = true;
    setGuardando(true);
    try {
      const prov = listaProveedores.find((p) => p.id === proveedorId);
      const id = compra?.id ?? Date.now();
      const cabecera = { provider_id: prov?.id || null, proveedor: prov?.razon_social || null, notas: notas.trim() || null };
      const r1 = compra
        ? await supabase.from('compras').update(cabecera).eq('id', id)
        : await supabase.from('compras').insert([{ id, ...cabecera, estado: 'PENDIENTE', autor: autor || null }]);
      if (r1.error) throw r1.error;
      if (compra) {
        const r2 = await supabase.from('compras_detalle').delete().eq('compra_id', id);
        if (r2.error) throw r2.error;
      }
      const r3 = await supabase.from('compras_detalle').insert(validos.map((i) => ({
        compra_id: id, product_id: Number(i.product_id), product_name: i.product_name, cantidad: i.cantidad, costo_unit: i.costo_unit,
      })));
      if (r3.error) throw r3.error;
      onCerrar(id);
    } catch (e: any) {
      void avisar(`No se pudo guardar la lista: ${e?.message || e}`);
    } finally {
      ocupado.current = false;
      setGuardando(false);
    }
  };

  return (
    <Ventana cuerpo={cuerpo} titulo={compra ? `Editar pedido #${String(compra.id).slice(-6)}` : 'Nueva lista de compras'} onCerrar={() => onCerrar(null)}
      pie={<>
        <span className="mr-auto self-center text-[10px] font-bold text-[var(--color-muted)] uppercase hidden sm:inline">Flechas para moverte · Enter siguiente · Esc o X para cerrar</span>
        <button id="btn-guardar-compra" type="button" data-nav={`${FILA_PIE},1`} aria-disabled={guardando} onClick={() => void guardar()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)] ${guardando ? 'opacity-60' : ''}`}>{guardando ? 'Guardando...' : 'Guardar lista'}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Proveedor (Enter para elegir)</span>
          <select id="compra-proveedor" data-nav="0,0" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} onKeyDown={abrirLista} className={claseInput}>
            <option value="">— Sin proveedor —</option>
            {listaProveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Nota para el proveedor (opcional)</span>
          <input id="compra-notas" data-nav="0,1" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej: entregar el lunes en la mañana"
            onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')} className={claseInput} />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input id="compra-buscar" data-nav="1,0" data-esc-limpia={abierto || busqueda ? '1' : undefined} value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            placeholder="Escribe para buscar o ↓ para ver todos..." onKeyDown={teclasBuscador} autoComplete="off"
            role="combobox" aria-expanded={abierto} aria-controls="compra-resultados"
            aria-activedescendant={marcado >= 0 ? `compra-resultado-${marcado}` : undefined}
            className={`${claseInput} pl-7`} />
        </div>
        <button type="button" data-nav="1,1" onClick={agregarStockBajo} className={`${claseBoton} bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] border-[var(--color-warning)]`}>
          <AlertTriangle size={14} /> Agregar stock bajo
        </button>
      </div>
      {abierto && posLista && createPortal(
        <ul id="compra-resultados" role="listbox" aria-label="Productos" style={{ position: 'fixed', ...posLista }} className="z-[60] font-mono bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] overflow-auto custom-scrollbar">
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-xs font-black uppercase text-[var(--color-muted)]">Sin resultados para "{busqueda}"</li>
          ) : resultados.map((p, i) => (
            <li key={p.id} id={`compra-resultado-${i}`} role="option" aria-selected={marcado === i}
              onMouseDown={(e) => { e.preventDefault(); elegir(p); }}
              className={`px-3 py-2 text-sm font-bold flex justify-between gap-2 cursor-pointer border-b border-[var(--color-border)] ${marcado === i ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-bg)]'}`}>
              <span className="truncate">{p.name}{enLista.has(String(p.id)) && <span className="ml-2 text-[10px] font-black uppercase opacity-70">· ya en la lista</span>}</span>
              <span className={`shrink-0 text-xs ${marcado === i ? '' : Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>stock {p.quantity} {unidadDe(p)}</span>
            </li>
          ))}
        </ul>, document.getElementById('root') ?? document.body)
      }

      {items.length === 0 ? (
        <p className="p-4 border-2 border-dashed border-[var(--color-border)] text-center text-xs font-black uppercase text-[var(--color-muted)]">
          Busca productos o usa "Agregar stock bajo".
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              <th className="p-1">Producto</th><th className="p-1 w-20">Stock</th><th className="p-1 w-24">Pedir</th><th className="p-1 w-24">Costo u.</th><th className="p-1 w-24 text-right">Subtotal</th><th className="w-8" />
            </tr></thead>
            <tbody>
              {items.map((i, n) => {
                const p = porId.get(i.product_id);
                const fila = 2 + n;
                return (
                  <tr key={i.product_id} data-producto={i.product_id} className="border-t border-[var(--color-border)]">
                    <td className="p-1 font-black">{i.product_name}</td>
                    <td className={`p-1 font-bold ${p && Number(p.quantity) <= Number(p.minStock) ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{p ? `${p.quantity} / mín ${p.minStock} ${unidadDe(p)}` : '-'}</td>
                    <td className="p-1"><div className="flex items-center gap-1"><input type="number" data-nav={`${fila},0`} min="0" step={esPeso(p) ? '0.01' : '1'}
                      value={valorCampo(i.product_id, 'cantidad', i.cantidad)} placeholder="0"
                      onChange={(e) => cambiar(i.product_id, 'cantidad', e.target.value)} onBlur={() => soltarCampo(i.product_id, 'cantidad')}
                      onFocus={(e) => e.currentTarget.select()} onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')}
                      className={claseInput} aria-label={`Cantidad de ${i.product_name}`} />
                      <span className="w-8 shrink-0 text-[10px] font-black text-[var(--color-muted)]">{unidadDe(p)}</span></div></td>
                    <td className="p-1"><input type="number" data-nav={`${fila},1`} min="0" step="0.01"
                      value={valorCampo(i.product_id, 'costo_unit', i.costo_unit)} placeholder="0"
                      onChange={(e) => cambiar(i.product_id, 'costo_unit', e.target.value)} onBlur={() => soltarCampo(i.product_id, 'costo_unit')}
                      onFocus={(e) => e.currentTarget.select()} onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-guardar-compra')}
                      className={claseInput} aria-label={`Costo de ${i.product_name}`} /></td>
                    <td className="p-1 text-right font-black">{soles(i.cantidad * i.costo_unit)}</td>
                    <td className="p-1"><button type="button" data-nav={`${fila},2`} onClick={() => quitar(i.product_id, fila)} aria-label={`Quitar ${i.product_name}`} title="Quitar (Enter)"
                      className="p-1 text-[var(--color-muted)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] cursor-pointer"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-right text-sm font-black text-[var(--color-ink)] mt-2">Total aprox. {soles(totalDe(items))}</p>
        </div>
      )}
    </Ventana>
  );
};

// ======================================================= Recibir: crea los lotes
const RecibirCompra: React.FC<{
  compra: Compra; productos: Product[]; soloRecibe: boolean; onCerrar: (cambios: { id: string; quantity: number }[] | null) => void;
}> = ({ compra, productos, soloRecibe, onCerrar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  // Lo que ya entró en un intento anterior (tiene lote) no se vuelve a ingresar
  const [filas, setFilas] = useState(compra.compras_detalle.filter((d) => d.batch_id == null).map((d) => ({
    detalle_id: d.id, product_id: String(d.product_id), product_name: d.product_name,
    pedida: Number(d.cantidad), llego: String(d.cantidad), costo: String(d.costo_unit), vence: '',
  })));
  const [documento, setDocumento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const ocupado = useRef(false); // un segundo Enter mientras ingresa no hace nada (no duplica lotes)
  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);
  const cambiar = (i: number, campo: 'llego' | 'costo' | 'vence', valor: string) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const total = filas.reduce((t, f) => t + (Number(f.llego) || 0) * (Number(f.costo) || 0), 0);

  useEffect(() => { setTimeout(() => enfocar(document.getElementById('compra-documento')), 30); }, []);

  // Lo hace el SERVIDOR (fn_recibir_compra): todo o nada, y quién recibió sale de la sesión.
  // Con solo "Recibir pedidos" el costo no se manda: el servidor usa el de la lista (lo puso el admin).
  const recibir = async () => {
    if (ocupado.current) return;
    const llegan = filas.filter((f) => Number(f.llego) > 0);
    if (!llegan.length) { void avisar('Escribe cuánto llegó de al menos un producto.'); return; }
    ocupado.current = true;
    const pregunta = soloRecibe
      ? `¿Confirmas que llegaron ${llegan.length} producto(s)?\nSe ingresarán al inventario con tu nombre.`
      : `¿Ingresar al inventario ${llegan.length} producto(s) por ${soles(total)}?\nSe creará un lote por cada producto.`;
    if (!await confirmar(pregunta)) { ocupado.current = false; return; }
    setGuardando(true);
    const items = filas.map((f) => ({
      detalle_id: f.detalle_id, cantidad: Math.max(0, Number(f.llego) || 0), vence: f.vence || null,
      ...(soloRecibe ? {} : { costo: Math.max(0, Number(f.costo) || 0) }),
    }));
    const { data, error } = await supabase.rpc('fn_recibir_compra', { p_compra_id: compra.id, p_items: items, p_documento: documento.trim() || null });
    setGuardando(false);
    ocupado.current = false;
    if (error) { void avisar(`⚠️ No se pudo recibir el pedido.\n\n${error.message}\n\nNo se ingresó nada: puedes intentarlo de nuevo.`); return; }
    const cambios = ((data as any)?.cambios || []) as { id: string; quantity: number }[];
    await avisar(`✅ Pedido recibido: ${(data as any)?.lotes ?? 0} lote(s) creado(s). El stock ya está actualizado.`);
    onCerrar(cambios);
  };

  return (
    <Ventana cuerpo={cuerpo} titulo={`Recibir pedido #${String(compra.id).slice(-6)} · ${compra.proveedor || 'Sin proveedor'}`} onCerrar={() => onCerrar(null)}
      pie={<>
        {!soloRecibe && <span className="mr-auto self-center text-sm font-black text-[var(--color-ink)]">Total: {soles(total)}</span>}
        <button id="btn-confirmar-recepcion" type="button" data-nav={`${FILA_PIE},1`} aria-disabled={guardando} onClick={() => void recibir()}
          className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)] ${guardando ? 'opacity-60' : ''}`}>
          {guardando ? <><Loader2 size={14} className="animate-spin" /> Ingresando...</> : <><PackageCheck size={14} /> {soloRecibe ? 'Confirmar recepción' : 'Ingresar al inventario'}</>}
        </button>
      </>}>
      <p className="text-[11px] font-bold text-[var(--color-muted)]">
        {soloRecibe
          ? 'Cuenta lo que llegó y escríbelo. Si algo no vino, déjalo en 0. Flechas para moverte · Enter siguiente.'
          : 'Revisa lo que llegó. Si algo no vino, déjalo en 0. Puedes corregir el costo según la factura. Flechas para moverte · Enter siguiente.'}
      </p>
      <label className="space-y-1 max-w-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">N° de factura o boleta (opcional)</span>
        <input id="compra-documento" data-nav="0,0" value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={40} placeholder="Ej: F001-000123"
          onKeyDown={(e) => siguienteCampo(e, cuerpo.current, 'btn-confirmar-recepcion')} className={claseInput} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            <th className="p-1">Producto</th><th className="p-1 w-16">Pedido</th><th className="p-1 w-24">Llegó</th>
            {!soloRecibe && <th className="p-1 w-24">Costo u.</th>}
            <th className="p-1 w-36">Vence (opcional)</th>
          </tr></thead>
          <tbody>
            {filas.map((f, i) => {
              const p = porId.get(f.product_id);
              const fila = 1 + i;
              const enter = (e: React.KeyboardEvent) => siguienteCampo(e, cuerpo.current, 'btn-confirmar-recepcion');
              return (
                <tr key={f.detalle_id} className="border-t border-[var(--color-border)]">
                  <td className="p-1 font-black">{f.product_name}</td>
                  <td className="p-1 font-bold text-[var(--color-muted)] whitespace-nowrap">{f.pedida} {unidadDe(p)}</td>
                  <td className="p-1"><div className="flex items-center gap-1"><input type="number" data-nav={`${fila},0`} min="0" step={esPeso(p) ? '0.01' : '1'} value={f.llego} placeholder="0" onFocus={(e) => e.currentTarget.select()} onChange={(e) => cambiar(i, 'llego', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Llegó de ${f.product_name}`} />
                    <span className="w-8 shrink-0 text-[10px] font-black text-[var(--color-muted)]">{unidadDe(p)}</span></div></td>
                  {!soloRecibe && <td className="p-1"><input type="number" data-nav={`${fila},1`} min="0" step="0.01" value={f.costo} placeholder="0" onFocus={(e) => e.currentTarget.select()} onChange={(e) => cambiar(i, 'costo', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Costo de ${f.product_name}`} /></td>}
                  <td className="p-1"><input type="date" data-nav={`${fila},2`} value={f.vence} onChange={(e) => cambiar(i, 'vence', e.target.value)} onKeyDown={enter} className={claseInput} aria-label={`Vencimiento de ${f.product_name}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Ventana>
  );
};
