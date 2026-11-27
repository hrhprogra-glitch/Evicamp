import qrcode from 'qrcode-generator';
import logoSiumax from '../../assets/logo.png';
import { formatearMonto } from '../../utils/formato';
import { nombreComprobante, numeroComprobante, textoQRComprobante } from '../../utils/comprobante';
import type { CartItem, ComprobanteTicket } from './components/TicketImprimible';

interface DatosEmpresa {
  nombre_empresa?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  logo_url?: string;
  razon_social?: string | null;
}

export interface TicketVentaHtmlInput {
  cart: CartItem[];
  total: number;
  pagos: { efectivo: number; yape: number; tarjeta: number };
  vuelto: number;
  nroBoleta: string;
  fiadoData?: {
    montoDeuda: number;
    fechaVencimiento: string;
    clienteNombre: string;
    clienteDni?: string;
    clienteTelefono?: string;
  };
  cliente?: {
    nombre: string;
    dni?: string;
    ruc?: string;
    telefono?: string;
    direccion?: string;
  } | null;
  vendedor?: string | null;
  comprobante?: ComprobanteTicket | null;
  empresa?: DatosEmpresa | null;
}

const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));

const logoCache = new Map<string, string>();
const logoParaTicket = async (src: string): Promise<string> => {
  const key = src || 'logo-siumax';
  const cached = logoCache.get(key);
  if (cached) return cached;
  const cargar = (url: string) =>
    new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const max = 240;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * escala));
        c.height = Math.max(1, Math.round(img.height * escala));
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        try {
          resolve(c.toDataURL('image/png'));
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  let data = await cargar(src);
  if (!data.startsWith('data:') && src !== logoSiumax) data = await cargar(logoSiumax);
  if (!data.startsWith('data:')) data = logoSiumax;
  logoCache.set(key, data);
  return data;
};

const qrDataUrl = (texto: string): string => {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    return qr.createDataURL(4, 0);
  } catch {
    return '';
  }
};

const linea = (label: string, value: string, fuerte = false) =>
  `<div class="fila"><span>${esc(label)}</span><span class="${fuerte ? 'b' : ''}">${esc(value)}</span></div>`;

export const generarTicketVentaHtml = async (input: TicketVentaHtmlInput): Promise<string> => {
  const { cart, total, pagos, vuelto, nroBoleta, fiadoData, cliente, vendedor, comprobante } = input;
  const empresa = input.empresa || {};
  const fecha = (comprobante?.fecha ? new Date(comprobante.fecha) : new Date()).toLocaleString('es-PE');
  const esCpe = Boolean(comprobante?.docType);
  const logoSrc = String(empresa.logo_url || '').trim() || logoSiumax;
  const logo = await logoParaTicket(logoSrc);

  const productos = cart
    .map((item) => {
      const cant = Number(item.cartQuantity) || 0;
      const precio = Number(item.price) || 0;
      const sub = Number(item.subtotal) || 0;
      const detalles: string[] = [];
      if (cant !== 1) detalles.push(`S/ ${formatearMonto(precio)} c/u`);
      if (item.numeroSerie) detalles.push(`SERIE/IMEI: ${item.numeroSerie}`);
      if (item.garantiaHasta) detalles.push(`GARANTÍA HASTA: ${item.garantiaHasta}`);
      else if (item.mesesGarantia && Number(item.mesesGarantia) > 0) detalles.push(`GARANTÍA: ${item.mesesGarantia} ${Number(item.mesesGarantia) === 1 ? 'MES' : 'MESES'}`);
      const detHtml = detalles.length ? `<div class="det">${detalles.map((d) => esc(d)).join('<br>')}</div>` : '';
      return `<tr><td class="c">${esc(cant)}</td><td><div class="nom">${esc(item.name)}</div>${detHtml}</td><td class="r">${esc(formatearMonto(sub))}</td></tr>`;
    })
    .join('');

  const qr = esCpe && empresa.ruc && comprobante?.serie && comprobante?.numero
    ? qrDataUrl(textoQRComprobante({
        ruc: empresa.ruc,
        docType: comprobante.docType!,
        serie: comprobante.serie,
        numero: comprobante.numero,
        totales: comprobante.totales,
        fecha: comprobante.fecha ? new Date(comprobante.fecha) : new Date(),
        clienteTipoDoc: comprobante.clienteTipoDoc,
        clienteNumDoc: comprobante.clienteNumDoc,
        hash: comprobante.hash,
      }))
    : '';

  const refNc = comprobante?.referencia;
  const docTitulo = esCpe ? nombreComprobante(comprobante!.docType) : fiadoData ? 'TICKET DE FIADO' : 'Nota de Venta';

  const totalesCpe = esCpe ? `
    <div class="tot-sub">
      ${comprobante!.totales.gravada > 0 ? linea('Op. gravada:', `S/ ${formatearMonto(comprobante!.totales.gravada)}`) : ''}
      ${comprobante!.totales.exonerada > 0 ? linea('Op. exonerada:', `S/ ${formatearMonto(comprobante!.totales.exonerada)}`) : ''}
      ${comprobante!.totales.inafecta > 0 ? linea('Op. inafecta:', `S/ ${formatearMonto(comprobante!.totales.inafecta)}`) : ''}
      ${linea('IGV (18%):', `S/ ${formatearMonto(comprobante!.totales.igv)}`)}
      ${comprobante!.totales.icbper > 0 ? linea('ICBPER (bolsas):', `S/ ${formatearMonto(comprobante!.totales.icbper)}`) : ''}
    </div>` : '';

  const mostrarPagos = !(esCpe && comprobante!.docType === 7);
  const pagosHtml = mostrarPagos ? `
    <div class="sep"></div>
    <div class="sec">${fiadoData ? 'PAGOS PARCIALES:' : 'MÉTODOS DE PAGO:'}</div>
    ${pagos.efectivo > 0 ? linea('Efectivo:', `S/ ${formatearMonto(pagos.efectivo)}`) : ''}
    ${pagos.yape > 0 ? linea('Yape:', `S/ ${formatearMonto(pagos.yape)}`) : ''}
    ${pagos.tarjeta > 0 ? linea('Tarjeta:', `S/ ${formatearMonto(pagos.tarjeta)}`) : ''}
    ${(fiadoData || vuelto > 0) ? `<div class="fila total"><span>${fiadoData ? 'POR PAGAR:' : 'VUELTO:'}</span><span>S/ ${formatearMonto(fiadoData ? fiadoData.montoDeuda : vuelto)}</span></div>` : ''}
  ` : '';

  const clienteCpe = esCpe ? `
    <div class="box">
      ${comprobante!.clienteTipoDoc && comprobante!.clienteTipoDoc !== 'SIN' && comprobante!.clienteNumDoc ? `<div>${esc(comprobante!.clienteTipoDoc)}: <b>${esc(comprobante!.clienteNumDoc)}</b></div>` : ''}
      <div>${comprobante!.docType === 1 ? 'Razón social' : 'Cliente'}: <b>${esc(comprobante!.clienteNombre || 'CLIENTES VARIOS')}</b></div>
      ${comprobante!.clienteDireccion ? `<div>Dir: ${esc(comprobante!.clienteDireccion)}</div>` : ''}
    </div>` : '';

  const clienteNota = !esCpe && !fiadoData && cliente ? `
    <div class="box">
      <div>Cliente: <b>${esc(cliente.nombre)}</b></div>
      ${cliente.dni ? `<div>DNI: <b>${esc(cliente.dni)}</b></div>` : ''}
      ${cliente.ruc ? `<div>RUC: <b>${esc(cliente.ruc)}</b></div>` : ''}
      ${cliente.telefono ? `<div>Cel: <b>${esc(cliente.telefono)}</b></div>` : ''}
      ${cliente.direccion ? `<div>Dir: ${esc(cliente.direccion)}</div>` : ''}
    </div>` : '';

  const fiadoHtml = fiadoData ? `
    <div class="box">
      <div class="sec" style="border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:2px">Datos del Crédito</div>
      <div>Cliente: <b>${esc(fiadoData.clienteNombre)}</b></div>
      ${fiadoData.clienteDni ? `<div>DNI: <b>${esc(fiadoData.clienteDni)}</b></div>` : ''}
      ${fiadoData.clienteTelefono ? `<div>Cel: <b>${esc(fiadoData.clienteTelefono)}</b></div>` : ''}
      <div><b>Límite Pago: ${esc(fiadoData.fechaVencimiento)}</b></div>
    </div>` : '';

  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${esc(nroBoleta)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; overflow-wrap: break-word; word-break: break-word; }
  html, body { margin: 0; background: #fff; color: #000; }
  body { width: 72mm; max-width: 100%; margin: 0 auto; padding: 3mm 3mm 4mm; font: 700 14px/1.4 'Courier New', Courier, monospace; }
  .cab { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
  .logo { max-width: 50mm; max-height: 22mm; object-fit: contain; display: block; margin: 0 auto 4px; }
  .emp { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
  .mut { font-size: 12px; font-weight: 700; }
  .doc { font-size: 15px; font-weight: 900; text-transform: uppercase; margin-top: 4px; }
  .num { font-size: 17px; font-weight: 900; letter-spacing: .08em; }
  .box { border: 1px solid #000; padding: 4px; margin-top: 4px; text-align: left; font-size: 12px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; table-layout: fixed; font-size: 11px; }
  th { border-bottom: 2px solid #000; padding: 2px 1px; text-align: left; font-size: 11px; }
  td { padding: 3px 1px; vertical-align: top; }
  .c { width: 12%; }
  .r { width: 29%; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; padding-right: 1mm; }
  .nom { font-weight: 900; text-transform: uppercase; line-height: 1.2; }
  .det { font-size: 12px; font-weight: 700; color: #111; }
  .tot { border-top: 2px solid #000; padding-top: 4px; font-size: 13px; text-transform: uppercase; }
  .tot-sub { font-size: 12px; margin-bottom: 2px; }
  .fila { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 4px; align-items: baseline; }
  .fila > span:first-child { min-width: 0; }
  .fila > span:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .total { font-size: 15px; font-weight: 900; margin: 2px 0; }
  .sep { border-top: 1px solid #000; margin: 3px 0; }
  .sec { font-size: 13px; font-weight: 900; margin: 2px 0; }
  .pie { text-align: center; margin-top: 8px; border-top: 2px dashed #666; padding-top: 6px; font-size: 12px; text-transform: uppercase; }
  .qr { width: 30mm; height: 30mm; display: block; margin: 4px auto; image-rendering: pixelated; }
  .aviso { border: 2px solid #000; padding: 3px; font-size: 12px; margin-top: 4px; font-weight: 900; text-transform: uppercase; }
</style></head><body>
  <div class="cab">
    ${logo ? `<img class="logo" src="${logo}" alt="">` : ''}
    <div class="emp">${esc(empresa.nombre_empresa || 'Mi Negocio')}</div>
    ${esCpe && empresa.razon_social && empresa.razon_social.trim().toUpperCase() !== String(empresa.nombre_empresa || '').trim().toUpperCase() ? `<div class="mut">${esc(empresa.razon_social)}</div>` : ''}
    ${empresa.ruc ? `<div class="mut">RUC: ${esc(empresa.ruc)}</div>` : ''}
    ${empresa.direccion ? `<div class="mut">${esc(empresa.direccion)}</div>` : ''}
    ${empresa.telefono ? `<div class="mut">Tel: ${esc(empresa.telefono)}</div>` : ''}
    <div class="doc">${esc(docTitulo)}</div>
    ${esCpe && fiadoData ? `<div class="mut">VENTA AL CRÉDITO</div>` : ''}
    ${refNc ? `<div class="mut">CORRIGE: ${esc(nombreComprobante(refNc.docType))} ${esc(numeroComprobante(refNc.serie, refNc.numero))}</div>${comprobante!.motivo ? `<div class="mut">MOTIVO: ${esc(comprobante!.motivo)}</div>` : ''}` : ''}
    <div class="num">${esc(nroBoleta)}</div>
    <div class="mut">Fecha: ${esc(fecha)}</div>
    ${vendedor ? `<div class="mut">Atendido por: ${esc(vendedor)}</div>` : ''}
    ${fiadoHtml}${clienteCpe}${clienteNota}
  </div>
  <table><thead><tr><th class="c">CANT</th><th>DESC</th><th class="r">TOTAL</th></tr></thead><tbody>${productos}</tbody></table>
  <div class="tot">
    ${totalesCpe}
    <div class="fila total"><span>TOTAL:</span><span>S/ ${esc(formatearMonto(total))}</span></div>
    ${pagosHtml}
  </div>
  ${esCpe ? `<div class="pie">${qr ? `<img class="qr" src="${qr}" alt="QR">` : `<div class="aviso">Comprobante por numerar: se emite al conectarse a internet</div>`}<div>Representación impresa de la ${esc(nombreComprobante(comprobante!.docType).toLowerCase())}</div>${comprobante!.hash ? `<div style="font-size:9px;word-break:break-all">Resumen: ${esc(comprobante!.hash)}</div>` : ''}${comprobante!.modo && comprobante!.modo !== 'REAL' ? `<div class="aviso">*** Modo ${comprobante!.modo === 'SIMULADO' ? 'simulado' : 'prueba'}: sin valor tributario ***</div>` : ''}</div>` : ''}
  <div class="pie" style="${esCpe ? 'border-top:0;padding-top:2px' : ''}"><div>¡Gracias por su compra!</div><div style="margin-top:4px">*** SIUMAX NEGO ***</div></div>
</body></html>`;
};