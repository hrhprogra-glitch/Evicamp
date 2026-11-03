// Prueba directa contra el ambiente BETA de SUNAT (fase 11.8): arma, firma y envía una boleta, una factura
// y una nota de crédito con el usuario de prueba de SUNAT (MODDATOS). No toca ninguna base.
// Se corre EN EL VPS desde /opt/siuhub/facturador:  /opt/node22/bin/node prueba-sunat-beta.mjs [RUC]
import fs from 'node:fs/promises';
import { armarComprobante } from './facturador.mjs';
import { enviarASunat, armarXML } from './sunat.mjs';

const RUC = process.argv[2] || '20000000001';
const carpeta = '/tmp/prueba-sunat';
await fs.mkdir(carpeta, { recursive: true });
const cfg = { ruc: RUC, razon_social: 'EMPRESA DE PRUEBA SAC', igv_porcentaje: 18, icbper_monto: 0.5 };
const ahora = new Date().toISOString();
const enviar = async (nombre, venta, detalles, referencia) => {
  const doc = armarComprobante(cfg, { created_at: ahora, ...venta }, detalles);
  if (referencia) doc.referencia = referencia;
  if (process.env.VER_XML) console.log(armarXML(doc));
  const r = await enviarASunat({ doc, modo: 'PRUEBA', usuario: `${RUC}MODDATOS`, clave: 'moddatos', carpeta, cred: null });
  console.log(`${nombre} ${doc.serie}-${doc.numero}: ${r.estado} · ${r.mensaje} · hash ${r.hash}`);
  return r;
};
const numero = String(Date.now()).slice(-6);
await enviar('BOLETA', { doc_type: 3, doc_serial: 'B001', doc_number: numero, cpe_cliente_tipo_doc: 'SIN' },
  [{ product_name: 'INCA KOLA 1.5L', quantity: 2, subtotal: 14, unit: 'UND', code: 'P1' },
   { product_name: 'BOLSA PLASTICA', quantity: 2, subtotal: 1.2, unit: 'UND', code: 'P2', es_bolsa: true }]);
await enviar('FACTURA', { doc_type: 1, doc_serial: 'F001', doc_number: numero, cpe_cliente_tipo_doc: 'RUC', cpe_cliente_num_doc: '20512345671', cpe_cliente_nombre: 'COMERCIAL SAN MARTIN EIRL' },
  [{ product_name: 'CEMENTO SOL', quantity: 4, subtotal: 118, unit: 'UND', code: 'P3' },
   { product_name: 'PAPA AMARILLA', quantity: 2, subtotal: 5, unit: 'KG', sunat_unit_code: 'KGM', code: 'P4', tipo_igv: 'EXONERADO' }]);
await enviar('NOTA DE CRÉDITO', { doc_type: 7, doc_serial: 'FC01', doc_number: numero, cpe_cliente_tipo_doc: 'RUC', cpe_cliente_num_doc: '20512345671', cpe_cliente_nombre: 'COMERCIAL SAN MARTIN EIRL' },
  [{ product_name: 'CEMENTO SOL', quantity: 1, subtotal: 29.5, unit: 'UND', code: 'P3' }],
  { tipo: 1, serie: 'F001', numero, motivo: '07', descripcion: 'DEVOLUCION' });
