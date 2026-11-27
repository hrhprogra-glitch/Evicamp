// src/sections/Salidas/components/VistaPreviaSalida.tsx
// Fase 194: al guardar una salida (o al dar Imprimir en una ya ingresada) sale esta vista previa.
// Mismo patrón que Inventario > Compras: hoja A4 o ticket de 80 mm, descargar PDF, WhatsApp y copia local.
// Todo por teclado: flechas entre [data-nav], Enter activa, Escape cierra. Sin internet.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2, Printer, Receipt, Send, X } from 'lucide-react';
import { imprimirTicket80mm } from '../../../utils/impresion';
import logoSiumax from '../../../assets/logo.png';
import { avisar } from '../../../utils/dialogos';
import type { Salida } from '../types';
import type { EmpresaComprobante } from '../empresa';

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]!));

const fechaTexto = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

type Formato = 'HOJA' | 'TICKET';
const CLAVE_FORMATO = 'salidas_formato_impresion';
const FILA_PIE = 1000;
const claseBoton = 'px-3 py-2 border-2 border-[var(--color-ink)] text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1 cursor-pointer disabled:opacity-50';

const enfocar = (el: HTMLElement | null | undefined) => {
  if (!el) return false;
  el.focus();
  return true;
};

/** Mueve el foco al vecino [data-nav] en la dirección de la flecha (mismo selector del sistema). */
const moverEnGrilla = (e: React.KeyboardEvent, contenedor: HTMLElement | null) => {
  const pos = (e.target as HTMLElement).dataset?.nav;
  if (!pos || !contenedor || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
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
      destino = filaDestino === FILA_PIE
        ? enFila.sort((a, b) => b.c - a.c)[0]
        : enFila.sort((a, b) => Math.abs(a.c - col) - Math.abs(b.c - col) || a.c - b.c)[0];
    }
  }
  if (destino) {
    e.preventDefault();
    enfocar(destino.el);
  }
};

const datosSalida = (salida: Salida): [string, string][] => [
  ['Cliente', salida.customer?.name || 'NO REGISTRADO'],
  ...(salida.usuario ? [['Empleado responsable', salida.usuario] as [string, string]] : []),
  ...(salida.customer?.dni || salida.customer?.ruc ? [['Documento', String(salida.customer.dni || salida.customer.ruc)] as [string, string]] : []),
  ['Fecha', fechaTexto(salida.fecha)],
  ['Tipo', salida.tipo],
  ...(salida.bien ? [['Lo que se atiende', `${salida.bien.nombre}${salida.bien.tipo ? ` (${salida.bien.tipo})` : ''}`] as [string, string]] : []),
  ...(salida.direccion ? [['Dirección', salida.direccion] as [string, string]] : []),
  ...(salida.ubicacion ? [['Ubicación', salida.ubicacion] as [string, string]] : []),
  ...(salida.salida_raiz_codigo ? [['Continuación de', salida.salida_raiz_codigo] as [string, string]] : []),
];

const personal = (salida: Salida) => (salida.trabajadores || []).map((t) =>
  `${t.trabajador?.nombre || 'Técnico'}${t.rol ? ` (${t.rol})` : ''}`);
const materiales = (salida: Salida) => (salida.items || []).map((it) => ({
  cantidad: Number(it.cantidad || 0),
  unidad: it.unidad || '',
  descripcion: it.descripcion || '',
  devuelto: Number(it.cantidad_devuelta || 0),
}));

const hojaHtml = (salida: Salida, empresa: EmpresaComprobante) => {
  const datos = datosSalida(salida).map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  const pers = personal(salida).map((n) => `<li>${esc(n)}</li>`).join('');
  const filas = materiales(salida).map((it) => `<tr><td class="n b">${esc(it.cantidad)}</td><td>${esc(it.unidad)}</td>`
    + `<td>${esc(it.descripcion)}${it.devuelto ? ` <small>(Devuelto: ${esc(it.devuelto)})</small>` : ''}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Vale ${esc(salida.codigo)}</title><style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #111; font: 13px/1.4 Arial, Helvetica, sans-serif; }
body { padding: 28px 32px; }
@media print { body { padding: 0; } }
.cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #1e293b; padding-bottom: 10px; }
.cab .marca { display: flex; align-items: center; gap: 14px; }
.cab .marca img { max-height: 64px; max-width: 160px; object-fit: contain; }
.cab h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
.cab .doc { text-align: right; }
.cab .doc b { display: block; font-size: 15px; }
.cab .doc span { font-size: 22px; font-weight: 900; }
.datos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 14px 0; }
.datos div { display: flex; gap: 8px; }
.datos span { color: #555; min-width: 110px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; margin: 14px 0 4px; }
ul { margin: 0; padding-left: 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th { background: #1e293b; color: #fff; text-align: left; padding: 7px 8px; font-size: 11px; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
td { padding: 7px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
.n { text-align: right; white-space: nowrap; }
tr { page-break-inside: avoid; }
.nota { margin-top: 14px; padding: 8px 10px; border: 1px solid #ccc; }
.pie { margin-top: 22px; color: #888; font-size: 10px; text-align: center; }
</style></head><body>
<div class="cab"><div class="marca"><img src="${esc(new URL(empresa.logo, location.href).href)}" alt="Logo"><h1>${esc(empresa.nombre)}</h1></div>
<div class="doc"><b>VALE DE SALIDA A ${esc(salida.tipo)}</b><span>${esc(salida.codigo)}</span></div></div>
<div class="datos">${datos}</div>
${pers ? `<h2>Personal asignado</h2><ul>${pers}</ul>` : ''}
<h2>Materiales / repuestos</h2><table><thead><tr><th class="n">Cant.</th><th>Unidad</th><th>Descripción</th></tr></thead><tbody>${filas || '<tr><td colspan="3">Sin materiales</td></tr>'}</tbody></table>
${salida.observaciones ? `<div class="nota"><b>Observaciones:</b> ${esc(salida.observaciones)}</div>` : ''}
<div class="pie">Generado el ${esc(new Date().toLocaleString('es-PE'))} · SiuMax Nego</div>
</body></html>`;
};

const logoTicketCache = new Map<string, string>();
const logoParaTicket = async (src: string): Promise<string> => {
  const key = src || 'logo-siumax';
  const cached = logoTicketCache.get(key);
  if (cached) return cached;
  const cargar = (url: string) => new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const max = 240;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * escala));
      c.height = Math.max(1, Math.round(img.height * escala));
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL('image/png')); } catch { resolve(url); }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
  let data = await cargar(src);
  if (!data.startsWith('data:') && src !== logoSiumax) data = await cargar(logoSiumax);
  if (!data.startsWith('data:')) data = logoSiumax;
  logoTicketCache.set(key, data);
  return data;
};

const ticketHtml = async (salida: Salida, empresa: EmpresaComprobante) => {
  const datos = datosSalida(salida).map(([k, v]) => `<div>${esc(k)}: <b>${esc(v)}</b></div>`).join('');
  const pers = personal(salida).map((n) => `<div>- ${esc(n)}</div>`).join('');
  const items = materiales(salida).map((it) => `<div class="item"><div class="nom">${esc(it.descripcion)}</div>`
    + `<div class="fila"><span>${esc(it.cantidad)} ${esc(it.unidad)}</span>${it.devuelto ? `<span>DEV: ${esc(it.devuelto)}</span>` : ''}</div></div>`).join('');
  const logo = await logoParaTicket(String(empresa.logo || '') || logoSiumax);
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Vale ${esc(salida.codigo)}</title><style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; overflow-wrap: break-word; word-break: break-word; }
html, body { margin: 0; background: #fff; color: #000; font: 700 14px/1.4 'Courier New', Courier, monospace; }
body { width: 72mm; max-width: 100%; margin: 0 auto; padding: 3mm 3mm 4mm; }
.cab { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
.cab img { display: block; margin: 0 auto 4px; max-height: 22mm; max-width: 50mm; object-fit: contain; }
.cab h1 { margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: .08em; }
.cab .tipo { margin-top: 6px; font-weight: 900; text-transform: uppercase; font-size: 13px; }
.cab .num { font-size: 18px; font-weight: 900; letter-spacing: .12em; }
.datos { text-transform: uppercase; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 4px; }
h2 { font-size: 13px; text-transform: uppercase; margin: 8px 0 2px; }
.item { padding: 4px 0; border-bottom: 1px dotted #999; }
.item .nom { font-weight: 900; text-transform: uppercase; }
.fila { display: flex; justify-content: space-between; gap: 6px; font-size: 12px; }
.nota { margin-top: 8px; border: 1px solid #000; padding: 4px; font-size: 12px; }
.pie { margin-top: 10px; text-align: center; font-size: 12px; }
</style></head><body>
<div class="cab">${logo ? `<img src="${logo}" alt="">` : ''}<h1>${esc(empresa.nombre)}</h1>
<div class="tipo">Vale de salida a ${esc(salida.tipo)}</div><div class="num">${esc(salida.codigo)}</div></div>
<div class="datos">${datos}</div>
${pers ? `<h2>Personal asignado</h2>${pers}` : ''}
<h2>Materiales / repuestos</h2>${items || '<div>Sin materiales</div>'}
${salida.observaciones ? `<div class="nota">OBS: ${esc(salida.observaciones)}</div>` : ''}
<div class="pie">${esc(new Date().toLocaleString('es-PE'))}<br>SiuMax Nego</div>
</body></html>`;
};

// Logo achicado para el PDF (igual que en Compras), para que el archivo no pese de más.
const logoParaPdf = (src: string) => new Promise<{ data: string; ancho: number; alto: number } | null>((resolve) => {
  const img = new Image();
  img.onload = () => {
    const escala = Math.min(1, 240 / Math.max(img.width, img.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(img.width * escala));
    lienzo.height = Math.max(1, Math.round(img.height * escala));
    lienzo.getContext('2d')?.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    try { resolve({ data: lienzo.toDataURL('image/png'), ancho: lienzo.width, alto: lienzo.height }); } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = src;
});

const pdfDeSalida = async (salida: Salida, empresa: EmpresaComprobante): Promise<File> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const imagen = await logoParaPdf(empresa.logo);
  let x = 14;
  let y = 18;
  if (imagen) {
    const alto = 16;
    const ancho = Math.min(40, (imagen.ancho / imagen.alto) * alto);
    doc.addImage(imagen.data, 'PNG', 14, 10, ancho, (imagen.alto / imagen.ancho) * ancho);
    x = 14 + ancho + 4;
    y = 20;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(empresa.nombre, x, y);
  doc.setFontSize(12);
  doc.text(`VALE DE SALIDA A ${salida.tipo}`, 196, y, { align: 'right' });
  y += imagen ? 12 : 9;
  doc.setFontSize(16);
  doc.text(salida.codigo, 14, y);
  y += 9;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  for (const [k, v] of datosSalida(salida)) {
    if (y > 270) { doc.addPage(); y = 18; }
    doc.text(`${k}: ${v}`, 14, y);
    y += 6;
  }
  const pers = personal(salida);
  if (pers.length) {
    y += 3; doc.setFont('helvetica', 'bold'); doc.text('PERSONAL ASIGNADO', 14, y);
    doc.setFont('helvetica', 'normal'); y += 6;
    for (const p of pers) { if (y > 270) { doc.addPage(); y = 18; } doc.text(`- ${p}`, 16, y); y += 5; }
  }
  y += 4; doc.setFont('helvetica', 'bold'); doc.text('MATERIALES / REPUESTOS', 14, y); y += 7;
  doc.setFontSize(9);
  doc.setFillColor(30, 41, 59); doc.rect(14, y - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCION', 16, y); doc.text('CANT.', 165, y, { align: 'right' }); doc.text('UND.', 194, y, { align: 'right' });
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); y += 8;
  for (const it of materiales(salida)) {
    const lineas = doc.splitTextToSize(`${it.descripcion}${it.devuelto ? ` (Devuelto: ${it.devuelto})` : ''}`, 138);
    if (y + lineas.length * 5 > 265) { doc.addPage(); y = 18; }
    doc.text(lineas, 16, y);
    doc.text(String(it.cantidad), 165, y, { align: 'right' });
    doc.text(it.unidad, 194, y, { align: 'right' });
    y += lineas.length * 5 + 2;
  }
  doc.setFontSize(10);
  if (salida.observaciones) {
    y += 5; doc.setFont('helvetica', 'bold'); doc.text('OBSERVACIONES', 14, y);
    doc.setFont('helvetica', 'normal'); y += 6;
    for (const linea of doc.splitTextToSize(salida.observaciones, 180)) {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.text(linea, 14, y); y += 5;
    }
  }
  if (y > 245) { doc.addPage(); y = 18; }
  y += 16;
  doc.text('________________________', 34, y, { align: 'center' });
  doc.text('________________________', 162, y, { align: 'center' });
  doc.setFontSize(8);
  doc.text('RESPONSABLE TECNICO', 34, y + 5, { align: 'center' });
  doc.text('RECIBIDO / CONFORME', 162, y + 5, { align: 'center' });
  doc.text(`Generado el ${new Date().toLocaleString('es-PE')} - SiuMax Nego`, 105, 292, { align: 'center' });
  const nombre = `Vale-${String(salida.codigo || salida.id || 'salida').replace(/[^\w-]/g, '_')}.pdf`;
  return new File([doc.output('blob')], nombre, { type: 'application/pdf' });
};

const guardarArchivo = (archivo: File) => {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url; a.download = archivo.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

interface Props {
  salida: Salida;
  empresa: EmpresaComprobante;
  onCerrar: () => void;
}

export const VistaPreviaSalida: React.FC<Props> = ({ salida, empresa, onCerrar }) => {
  const cuerpo = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLIFrameElement>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  // El dueño quiere el ticket por predeterminado (hoja A4 sigue disponible si la elige).
  const [formato, setFormato] = useState<Formato>(() => {
    try { return localStorage.getItem(CLAVE_FORMATO) === 'HOJA' ? 'HOJA' : 'TICKET'; } catch { return 'TICKET'; }
  });

  const elegirFormato = (f: Formato) => {
    setFormato(f);
    try { localStorage.setItem(CLAVE_FORMATO, f); } catch { /* solo por esta vez */ }
  };

  const [ticket, setTicket] = useState('');
  useEffect(() => {
    let vivo = true;
    void ticketHtml(salida, empresa).then((h) => { if (vivo) setTicket(h); }).catch(() => { if (vivo) setTicket(''); });
    return () => { vivo = false; };
  }, [salida, empresa]);
  const hoja = hojaHtml(salida, empresa);
  const html = formato === 'TICKET' ? ticket : hoja;
  const vista = html.replace('</head>', '<style>@media screen { html, body { overflow: hidden !important; } }</style></head>');

  const ajustarAlto = () => {
    const d = marco.current?.contentDocument;
    if (marco.current && d) marco.current.style.height = `${Math.max(d.documentElement.scrollHeight, d.body?.scrollHeight || 0) + 2}px`;
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo-sistema]')) return;
      e.preventDefault(); e.stopPropagation(); onCerrar();
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onCerrar]);

  // Al volver de WhatsApp o de la ventana de impresión, el selector regresa al último botón usado.
  const ultimo = useRef('btn-previa-salida-imprimir');
  useEffect(() => {
    const recuperar = () => setTimeout(() => {
      const a = document.activeElement;
      if ((!a || a === document.body || a.tagName === 'IFRAME') && !document.querySelector('[data-dialogo-sistema]')) {
        enfocar(document.getElementById(ultimo.current));
      }
    }, 100);
    window.addEventListener('focus', recuperar);
    return () => window.removeEventListener('focus', recuperar);
  }, []);
  // El aviso de "salida registrada" roba el foco al cerrarse; por eso se enfoca un poco después.
  useEffect(() => {
    const t = setTimeout(() => enfocar(document.getElementById('btn-previa-salida-imprimir')), 400);
    return () => clearTimeout(t);
  }, []);

  const hacer = async (id: string, accion: () => void | Promise<void>) => {
    if (ocupado) return;
    ultimo.current = id;
    setOcupado(id);
    try { await accion(); } finally {
      setOcupado(null);
      setTimeout(() => enfocar(document.getElementById(id)), 60);
    }
  };

  const imprimir = async () => {
    if (formato === 'TICKET') {
      let htmlTicket = ticket;
      if (!htmlTicket) htmlTicket = await ticketHtml(salida, empresa);
      const r = await imprimirTicket80mm(htmlTicket, `Vale-${salida.codigo}`);
      if (!r.ok) await avisar(`No se pudo imprimir el ticket: ${r.motivo}\n\nRevisa que la ticketera esté encendida y elegida en el menú de la app.`);
      return;
    }
    marco.current?.contentWindow?.print();
  };

  const textoWhatsapp = () => [
    `*VALE DE SALIDA ${salida.codigo}*${empresa.nombre ? ` - ${empresa.nombre}` : ''}`,
    ...datosSalida(salida).map(([k, v]) => `${k}: ${v}`),
    ...(personal(salida).length ? ['', `Personal: ${personal(salida).join(', ')}`] : []),
    '', 'MATERIALES:',
    ...materiales(salida).map((it) => `- ${it.cantidad} ${it.unidad} ${it.descripcion}`),
    ...(salida.observaciones ? ['', `Observaciones: ${salida.observaciones}`] : []),
  ].join('\n');

  // Prioriza el WhatsApp descargable (ya conectado al número). Si no abre, cae al WhatsApp Web del navegador.
  // Sin phone= para que sea el propio WhatsApp donde se elige al contacto.
  const abrirWhatsapp = (texto: string) => {
    const mensaje = encodeURIComponent(texto);
    const inicio = Date.now();
    try {
      const enlace = document.createElement('a');
      enlace.href = `whatsapp://send?text=${mensaje}`;
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch { /* el navegador no acepta el protocolo: se abre la web */ }
    setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - inicio < 3000) {
        window.open(`https://wa.me/?text=${mensaje}`, '_blank', 'noopener,noreferrer');
      }
    }, 1200);
  };

  const descargar = async () => {
    const archivo = await pdfDeSalida(salida, empresa);
    guardarArchivo(archivo);
    await avisar(`📄 PDF descargado: "${archivo.name}". Lo encuentras en Descargas.`);
  };

  const pdfPorWhatsapp = async () => {
    const archivo = await pdfDeSalida(salida, empresa);
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: archivo.name, text: `Vale de salida ${salida.codigo}` });
        return;
      } catch (e: any) { if (e?.name === 'AbortError') return; /* sin compartir: se guarda */ }
    }
    guardarArchivo(archivo);
    await avisar(`📄 Se guardó "${archivo.name}". Se abrirá WhatsApp: adjúntalo con el clip 📎 → Documento.`);
    abrirWhatsapp(`Te envío el vale de salida ${salida.codigo} en PDF.`);
  };

  const botones: { grupo: string; id: string; contenido: React.ReactNode; clase: string; accion: () => void | Promise<void> }[] = [
    { grupo: 'Enviar', id: 'btn-previa-salida-whatsapp', contenido: <><Send size={16} /> WhatsApp</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', accion: () => abrirWhatsapp(textoWhatsapp()) },
    { grupo: 'Enviar', id: 'btn-previa-salida-whatsapp-web', contenido: <><Send size={16} /> Web</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', accion: () => window.open(`https://wa.me/?text=${encodeURIComponent(textoWhatsapp())}`, '_blank', 'noopener,noreferrer') },
    { grupo: 'Enviar', id: 'btn-previa-salida-whatsapp-pdf', contenido: <><FileText size={16} /> PDF WhatsApp</>, clase: 'bg-white text-[var(--color-success)] border-[var(--color-success)]', accion: pdfPorWhatsapp },
    { grupo: 'Guardar', id: 'btn-previa-salida-descargar', contenido: <><Download size={16} /> Descargar PDF</>, clase: 'bg-white text-[var(--color-ink)]', accion: descargar },
    { grupo: 'Imprimir', id: 'btn-previa-salida-imprimir', contenido: <><Printer size={16} /> Imprimir</>, clase: 'bg-[var(--color-ink)] text-[var(--color-accent)]', accion: imprimir },
  ];
  const grupos = [...new Set(botones.map((b) => b.grupo))];

  return (
    <div role="dialog" aria-modal="true" aria-label={`Vista previa del comprobante ${salida.codigo}`} data-vista-previa-salida
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div ref={cuerpo} className="ventana-sobria bg-white border-2 border-[var(--color-ink)] w-full max-w-4xl max-h-[calc(var(--alto-pantalla,100vh)*0.94)] flex flex-col"
        onKeyDown={(e) => moverEnGrilla(e, cuerpo.current)}>
        <div className="ventana-cabecera">
          <h3 className="ventana-cabecera__titulo"><Receipt size={18} /> Vista previa · Vale {salida.codigo}</h3>
          <button type="button" data-nav="-1,0" onClick={onCerrar} aria-label="Cerrar (Esc)" title="Cerrar (Esc)" className="ventana-cerrar"><X size={18} /></button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Imprimir en:</span>
              {([['HOJA', 'Hoja A4', FileText], ['TICKET', 'Ticket', Receipt]] as const).map(([f, nombre, Icono], i) => (
                <button key={f} id={`btn-formato-salida-${f}`} type="button" data-nav={`0,${i}`} aria-pressed={formato === f}
                  onClick={() => elegirFormato(f)}
                  className={`${claseBoton} ${formato === f ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'bg-white text-[var(--color-ink)]'}`}>
                  <Icono size={14} /> {nombre}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">
              {formato === 'TICKET' ? 'Ticket de 80 mm · para el trabajador' : 'Hoja A4 · para entregar o archivar'}
            </p>
          </div>
          <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-2 sm:p-4">
            {formato === 'TICKET' && !ticket ? (
              <div className="box-content w-[80mm] mx-auto border-2 border-dashed border-gray-400 min-h-[300px] bg-white shadow-[4px_4px_0_0_var(--color-border)] flex items-center justify-center text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">Cargando vista previa...</div>
            ) : (
              <iframe ref={marco} title="Vista previa del comprobante" srcDoc={vista} tabIndex={-1} onLoad={ajustarAlto} scrolling="no"
                className={`${formato === 'TICKET' ? 'box-content w-[80mm] mx-auto border-2 border-dashed border-gray-400' : 'w-full border border-[var(--color-border)]'} min-h-[300px] bg-white shadow-[4px_4px_0_0_var(--color-border)] pointer-events-none block overflow-hidden`} />
            )}
          </div>
        </div>
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex flex-wrap items-end justify-end gap-x-5 gap-y-2 shrink-0">
          <button id="btn-previa-salida-volver" type="button" data-nav={`${FILA_PIE},-1`} onClick={onCerrar}
            title="Cerrar (Esc)" className={`${claseBoton} bg-white text-[var(--color-ink)] mr-auto self-end`}>
            <ArrowLeft size={16} /> Volver
          </button>
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
        </div>
      </div>
    </div>
  );
};
