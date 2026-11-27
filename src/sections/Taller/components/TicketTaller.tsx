// src/sections/Taller/components/TicketTaller.tsx
// Generador de tickets de recepción y entrega para taller (formato térmico 80mm y A4)

import type { TallerOrden } from '../types';

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));

const fechaFormat = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const fechaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

export const generarHtmlTicketTaller = (
  orden: TallerOrden,
  empresa: { nombre: string; ruc?: string; direccion?: string; telefono?: string; logo?: string },
  tipoTicket: 'RECEPCION' | 'ENTREGA' = 'RECEPCION'
): string => {
  const esEntrega = tipoTicket === 'ENTREGA';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${orden.codigo} - ${empresa.nombre || 'Taller'}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 3mm 3mm 4mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
    .border-t { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
    .titulo { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .codigo { font-size: 18px; font-weight: 900; letter-spacing: 1px; margin: 4px 0; }
    .fila { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .bloque { margin-bottom: 6px; }
    .condiciones { font-size: 10px; line-height: 1.25; text-align: justify; margin-top: 6px; }
    .firmas { margin-top: 25px; display: flex; justify-content: space-between; gap: 8px; font-size: 10px; text-align: center; }
    .linea-firma { border-top: 1px solid #000; padding-top: 2px; width: 48%; }
  </style>
</head>
<body>
  <div class="text-center border-b">
    <div class="titulo">${esc(empresa.nombre || 'SERVICIO TÉCNICO')}</div>
    ${empresa.ruc ? `<div>RUC: ${esc(empresa.ruc)}</div>` : ''}
    ${empresa.direccion ? `<div>${esc(empresa.direccion)}</div>` : ''}
    ${empresa.telefono ? `<div>Tel / Cel: ${esc(empresa.telefono)}</div>` : ''}
    <div class="codigo">${esEntrega ? 'CONSTANCIA DE ENTREGA' : 'TICKET DE RECEPCIÓN'}<br>${esc(orden.codigo)}</div>
    <div>Fecha: ${fechaFormat(orden.fecha_ingreso)}</div>
  </div>

  <div class="bloque border-b">
    <div class="font-bold">DATOS DEL CLIENTE:</div>
    <div><b>Cliente:</b> ${esc(orden.customer?.name || 'Cliente')}</div>
    ${orden.customer?.telefono ? `<div><b>Teléfono:</b> ${esc(orden.customer.telefono)}</div>` : ''}
    ${orden.customer?.dni ? `<div><b>DNI/RUC:</b> ${esc(orden.customer.dni)}</div>` : ''}
  </div>

  <div class="bloque border-b">
    <div class="font-bold">DATOS DEL EQUIPO:</div>
    <div><b>Equipo:</b> ${esc(orden.tipo_equipo)}</div>
    <div><b>Marca / Modelo:</b> ${esc(orden.marca || '-')} ${esc(orden.modelo || '')}</div>
    ${orden.serie ? `<div><b>N° Serie:</b> ${esc(orden.serie)}</div>` : ''}
    ${orden.color ? `<div><b>Color:</b> ${esc(orden.color)}</div>` : ''}
    ${orden.accesorios ? `<div><b>Accesorios:</b> ${esc(orden.accesorios)}</div>` : ''}
  </div>

  <div class="bloque border-b">
    <div class="font-bold">PROBLEMA / FALLA REPORTADA:</div>
    <div>${esc(orden.falla_reportada)}</div>
    ${orden.diagnostico ? `<div style="margin-top:4px;"><b>Diagnóstico:</b> ${esc(orden.diagnostico)}</div>` : ''}
    ${esEntrega && orden.solucion_aplicada ? `<div style="margin-top:4px;"><b>Trabajo realizado:</b> ${esc(orden.solucion_aplicada)}</div>` : ''}
    ${orden.tecnico ? `<div style="margin-top:4px;"><b>Técnico asignado:</b> ${esc(orden.tecnico.nombre)}</div>` : ''}
    ${orden.fecha_prometida ? `<div><b>Fecha prometida:</b> ${fechaCorta(orden.fecha_prometida)}</div>` : ''}
  </div>

  <div class="bloque border-b">
    <div class="font-bold">IMPORTES Y PAGOS:</div>
    <div class="fila"><span>Mano de obra:</span><span>S/ ${Number(orden.costo_mano_obra || 0).toFixed(2)}</span></div>
    <div class="fila"><span>Repuestos:</span><span>S/ ${Number(orden.costo_repuestos || 0).toFixed(2)}</span></div>
    <div class="fila font-bold" style="font-size:12px;"><span>TOTAL ESTIMADO:</span><span>S/ ${Number(orden.total || 0).toFixed(2)}</span></div>
    <div class="fila"><span>Adelanto pagado:</span><span>S/ ${Number(orden.adelanto || 0).toFixed(2)}</span></div>
    <div class="fila font-bold" style="font-size:13px;"><span>SALDO PENDIENTE:</span><span>S/ ${Number(orden.saldo || 0).toFixed(2)}</span></div>
  </div>

  ${esEntrega && orden.meses_garantia > 0 ? `
  <div class="bloque border-b text-center font-bold" style="background:#f0f0f0; padding:4px;">
    GARANTÍA: ${orden.meses_garantia} MES(ES)<br>
    VENCE EL: ${fechaCorta(orden.garantia_vence)}
  </div>
  ` : ''}

  <div class="condiciones">
    <b>CONDICIONES DEL SERVICIO:</b><br>
    1. Presentar este ticket para consultar o retirar su equipo.<br>
    2. Todo equipo tiene un plazo máximo de 30 días para ser retirado tras aviso de estar listo, devengando almacenaje posterior.<br>
    3. La garantía cubre únicamente el trabajo realizado y repuestos suministrados; no cubre caídas, humedad ni alteraciones externas.<br>
    4. La empresa no se responsabiliza por pérdida de información o datos no respaldados previamente.
  </div>

  <div class="firmas">
    <div class="linea-firma">Firma Cliente</div>
    <div class="linea-firma">Servicio Técnico</div>
  </div>

  <div class="text-center" style="margin-top: 15px; font-size: 9px;">
    ¡Gracias por su preferencia!<br>SiuMax Servic · Software de Gestión
  </div>
</body>
</html>`;
};
