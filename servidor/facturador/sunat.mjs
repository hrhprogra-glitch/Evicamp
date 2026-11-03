// SiuMax · Envío DIRECTO a SUNAT (fase 11.8), sin proveedor.
// Arma el XML UBL 2.1 (factura, boleta o nota de crédito), lo firma con el certificado digital del
// negocio (XMLDSig, firma envuelta), lo comprime en ZIP y lo manda al servicio "billService" de SUNAT
// (sendBill). La respuesta es la constancia (CDR): código 0 = aceptado, 4000+ = aceptado con
// observaciones, 2000-3999 = rechazado.
// Modo PRUEBA: ambiente beta de SUNAT con su usuario de prueba (MODDATOS) y un certificado de prueba.
import { SignedXml } from 'xml-crypto';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
export const URL_SUNAT = {
  PRUEBA: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  REAL: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
};

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const m2 = (n) => Number(n || 0).toFixed(2);
const mx = (n) => Number(Number(n || 0).toFixed(10)).toString(); // hasta 10 decimales, sin ceros de más
const CODIGO_DOC = { RUC: '6', DNI: '1', CE: '4', SIN: '0' };
const TIPO_SUNAT = (tipo) => (tipo === 1 ? '01' : tipo === 7 ? '07' : '03');

// ---------------------------------------------------------------- monto en letras (leyenda 1000)
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS',
  'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
const hasta999 = (n) => {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100), r = n % 100;
  const resto = r < 30 ? UNIDADES[r] : DECENAS[Math.floor(r / 10)] + (r % 10 ? ` Y ${UNIDADES[r % 10]}` : '');
  return [CENTENAS[c], resto].filter(Boolean).join(' ');
};
export const montoEnLetras = (monto) => {
  const entero = Math.floor(Math.round(monto * 100) / 100);
  const cent = Math.round((monto - entero) * 100);
  const millones = Math.floor(entero / 1e6), miles = Math.floor((entero % 1e6) / 1000), unidades = entero % 1000;
  const partes = [
    millones ? (millones === 1 ? 'UN MILLÓN' : `${hasta999(millones)} MILLONES`) : '',
    miles ? (miles === 1 ? 'MIL' : `${hasta999(miles)} MIL`) : '',
    hasta999(unidades),
  ].filter(Boolean).join(' ') || 'CERO';
  return `SON ${partes.replace(/UNO MIL/g, 'UN MIL')} CON ${String(cent).padStart(2, '0')}/100 SOLES`;
};

// ---------------------------------------------------------------- XML UBL 2.1
const montoXml = (etiqueta, n) => `<cbc:${etiqueta} currencyID="PEN">${m2(n)}</cbc:${etiqueta}>`;
const CATEGORIA = {
  GRAVADO: { razon: '10', id: '1000', nombre: 'IGV', codigo: 'VAT' },
  EXONERADO: { razon: '20', id: '9997', nombre: 'EXO', codigo: 'VAT' },
  INAFECTO: { razon: '30', id: '9998', nombre: 'INA', codigo: 'FRE' },
};
const subtotalIgv = (base, igv, cat, pct, conCategoriaCompleta) => `<cac:TaxSubtotal>${montoXml('TaxableAmount', base)}${montoXml('TaxAmount', igv)}`
  + `<cac:TaxCategory>${conCategoriaCompleta ? `<cbc:Percent>${pct}</cbc:Percent><cbc:TaxExemptionReasonCode>${cat.razon}</cbc:TaxExemptionReasonCode>` : ''}`
  + `<cac:TaxScheme><cbc:ID>${cat.id}</cbc:ID><cbc:Name>${cat.nombre}</cbc:Name><cbc:TaxTypeCode>${cat.codigo}</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;
const subtotalIcbper = (monto, cantidad, porUnidad, enLinea) => `<cac:TaxSubtotal>${montoXml('TaxAmount', monto)}`
  + (enLinea ? `<cbc:BaseUnitMeasure unitCode="NIU">${mx(cantidad)}</cbc:BaseUnitMeasure>` : '')
  + `<cac:TaxCategory>${enLinea ? montoXml('PerUnitAmount', porUnidad) : ''}<cac:TaxScheme><cbc:ID>7152</cbc:ID><cbc:Name>ICBPER</cbc:Name><cbc:TaxTypeCode>OTH</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;

export const nombreArchivo = (doc) => `${doc.emisor.ruc}-${TIPO_SUNAT(doc.tipo)}-${doc.serie}-${doc.numero}`;

export const armarXML = (doc) => {
  const esNota = doc.tipo === 7;
  const raiz = esNota ? 'CreditNote' : 'Invoice';
  const pct = doc.igv_porcentaje ?? 18;
  const t = doc.totales;
  const id = `${doc.serie}-${doc.numero}`;
  const cliente = doc.cliente;
  const sinDoc = cliente.tipo === 'SIN' || !cliente.numero;

  const lineas = doc.items.map((it, i) => {
    const cat = CATEGORIA[it.tipo] || CATEGORIA.GRAVADO;
    const porUnidadBolsa = it.icbper && it.cantidad ? it.icbper / it.cantidad : 0;
    return `<cac:${raiz}Line><cbc:ID>${i + 1}</cbc:ID>`
      + `<cbc:${esNota ? 'CreditedQuantity' : 'InvoicedQuantity'} unitCode="${esc(it.unidad || 'NIU')}">${mx(it.cantidad)}</cbc:${esNota ? 'CreditedQuantity' : 'InvoicedQuantity'}>`
      + montoXml('LineExtensionAmount', it.subtotal)
      + `<cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">${mx(it.precio_unitario)}</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference>`
      + `<cac:TaxTotal>${montoXml('TaxAmount', it.igv + (it.icbper || 0))}${subtotalIgv(it.subtotal, it.igv, cat, pct, true)}`
      + (it.icbper ? subtotalIcbper(it.icbper, it.cantidad, porUnidadBolsa, true) : '') + '</cac:TaxTotal>'
      + `<cac:Item><cbc:Description>${esc(it.descripcion)}</cbc:Description>${it.codigo ? `<cac:SellersItemIdentification><cbc:ID>${esc(it.codigo)}</cbc:ID></cac:SellersItemIdentification>` : ''}</cac:Item>`
      + `<cac:Price><cbc:PriceAmount currencyID="PEN">${mx(it.valor_unitario)}</cbc:PriceAmount></cac:Price></cac:${raiz}Line>`;
  }).join('');

  const totalImpuestos = [
    t.gravada > 0 || (!t.exonerada && !t.inafecta) ? subtotalIgv(t.gravada, t.igv, CATEGORIA.GRAVADO, pct, false) : '',
    t.exonerada > 0 ? subtotalIgv(t.exonerada, 0, CATEGORIA.EXONERADO, pct, false) : '',
    t.inafecta > 0 ? subtotalIgv(t.inafecta, 0, CATEGORIA.INAFECTO, pct, false) : '',
    t.icbper > 0 ? subtotalIcbper(t.icbper, 0, 0, false) : '',
  ].join('');
  const valorVenta = t.gravada + t.exonerada + t.inafecta;

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<${raiz} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${raiz}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">`
    + '<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>'
    + '<cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>2.0</cbc:CustomizationID>'
    + `<cbc:ID>${id}</cbc:ID><cbc:IssueDate>${doc.fecha}</cbc:IssueDate><cbc:IssueTime>${doc.hora || '00:00:00'}</cbc:IssueTime>`
    + (esNota ? '' : `<cbc:InvoiceTypeCode listID="0101">${TIPO_SUNAT(doc.tipo)}</cbc:InvoiceTypeCode>`)
    + `<cbc:Note languageLocaleID="1000">${esc(montoEnLetras(t.total))}</cbc:Note>`
    + '<cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>'
    + (esNota
      ? `<cac:DiscrepancyResponse><cbc:ReferenceID>${esc(`${doc.referencia.serie}-${doc.referencia.numero}`)}</cbc:ReferenceID><cbc:ResponseCode>${esc(doc.referencia.motivo)}</cbc:ResponseCode><cbc:Description>${esc(doc.referencia.descripcion || 'NOTA DE CRÉDITO')}</cbc:Description></cac:DiscrepancyResponse>`
        + `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${esc(`${doc.referencia.serie}-${doc.referencia.numero}`)}</cbc:ID><cbc:DocumentTypeCode>${TIPO_SUNAT(doc.referencia.tipo)}</cbc:DocumentTypeCode></cac:InvoiceDocumentReference></cac:BillingReference>`
      : '')
    + `<cac:Signature><cbc:ID>${esc(doc.emisor.ruc)}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${esc(doc.emisor.ruc)}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>${esc(doc.emisor.razon_social)}</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>`
    + `<cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${esc(doc.emisor.ruc)}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${esc(doc.emisor.razon_social)}</cbc:RegistrationName><cac:RegistrationAddress><cbc:AddressTypeCode>0000</cbc:AddressTypeCode></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>`
    + `<cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="${sinDoc ? '0' : CODIGO_DOC[cliente.tipo] || '0'}">${esc(sinDoc ? '-' : cliente.numero)}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${esc(sinDoc ? 'CLIENTES VARIOS' : cliente.nombre)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>`
    + (doc.tipo === 1 ? '<cac:PaymentTerms><cbc:ID>FormaPago</cbc:ID><cbc:PaymentMeansID>Contado</cbc:PaymentMeansID></cac:PaymentTerms>' : '')
    + `<cac:TaxTotal>${montoXml('TaxAmount', t.igv + t.icbper)}${totalImpuestos}</cac:TaxTotal>`
    + `<cac:LegalMonetaryTotal>${montoXml('LineExtensionAmount', valorVenta)}${montoXml('TaxInclusiveAmount', t.total)}${montoXml('PayableAmount', t.total)}</cac:LegalMonetaryTotal>`
    + lineas
    + `</${raiz}>`;
};

// ---------------------------------------------------------------- firma digital (XMLDSig envuelta)
export const firmarXML = (xml, llavePem, certPem) => {
  const firma = new SignedXml({
    privateKey: llavePem,
    publicCert: certPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });
  firma.addReference({
    xpath: '/*',
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    isEmptyUri: true,
  });
  firma.computeSignature(xml, {
    prefix: 'ds',
    attrs: { Id: 'SignatureSP' },
    location: { reference: "//*[local-name(.)='ExtensionContent']", action: 'append' },
  });
  const firmado = firma.getSignedXml();
  const hash = (firmado.match(/<ds:DigestValue>([^<]+)<\/ds:DigestValue>/) || [])[1] || null;
  return { xml: firmado, hash };
};

// ---------------------------------------------------------------- certificado
/** Llave y certificado en PEM: el del negocio (.pfx guardado) o, en PRUEBA sin certificado, uno de prueba. */
export const cargarCertificado = async (carpeta, cred, modo) => {
  if (cred?.cert_pfx) {
    const archivo = path.join(carpeta, `cert-${process.pid}-${Date.now()}.pfx`);
    await fs.writeFile(archivo, Buffer.from(cred.cert_pfx, 'base64'), { mode: 0o600 });
    try {
      const pase = ['-passin', `pass:${cred.cert_clave || ''}`];
      const [{ stdout: llave }, { stdout: cert }] = await Promise.all([
        ejecutar('openssl', ['pkcs12', '-in', archivo, '-nocerts', '-nodes', ...pase]),
        ejecutar('openssl', ['pkcs12', '-in', archivo, '-clcerts', '-nokeys', ...pase]),
      ]).catch(() => Promise.all([ // certificados viejos (algoritmos antiguos)
        ejecutar('openssl', ['pkcs12', '-legacy', '-in', archivo, '-nocerts', '-nodes', ...pase]),
        ejecutar('openssl', ['pkcs12', '-legacy', '-in', archivo, '-clcerts', '-nokeys', ...pase]),
      ]));
      const llavePem = (llave.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/) || [])[0];
      const certPem = (cert.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/) || [])[0];
      if (!llavePem || !certPem) throw new Error('el archivo .pfx no tiene llave y certificado');
      return { llavePem, certPem };
    } catch (e) {
      throw new Error(`No se pudo abrir el certificado (.pfx): revisa el archivo y su contraseña (${e.message.split('\n')[0]})`);
    } finally {
      await fs.rm(archivo, { force: true });
    }
  }
  if (modo !== 'PRUEBA') throw new Error('Falta el certificado digital (.pfx) del negocio (Ajustes > Facturación).');
  // Certificado de PRUEBA (el ambiente beta de SUNAT no revisa quién lo emitió); se crea una sola vez
  const llave = path.join(carpeta, 'prueba-sunat.key'), cert = path.join(carpeta, 'prueba-sunat.crt');
  try { await fs.access(cert); } catch {
    await ejecutar('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', llave, '-out', cert, '-days', '3650', '-subj', '/CN=SIUMAX PRUEBA SUNAT/O=SIUMAX']);
  }
  return { llavePem: await fs.readFile(llave, 'utf8'), certPem: await fs.readFile(cert, 'utf8') };
};

// ---------------------------------------------------------------- envío a SUNAT (SOAP sendBill)
const sobreSoap = (usuario, clave, cuerpo) => '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">'
  + `<soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${esc(usuario)}</wsse:Username><wsse:Password>${esc(clave)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header>`
  + `<soapenv:Body>${cuerpo}</soapenv:Body></soapenv:Envelope>`;

/** Lee la constancia (CDR) que devuelve SUNAT. */
const leerCDR = (base64) => {
  const zip = new AdmZip(Buffer.from(base64, 'base64'));
  const entrada = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith('.xml'));
  const xml = entrada ? entrada.getData().toString('utf8') : '';
  const codigo = Number((xml.match(/<(?:\w+:)?ResponseCode[^>]*>([^<]+)</) || [])[1] ?? NaN);
  const descripcion = (xml.match(/<(?:\w+:)?Description>([^<]+)</) || [])[1] || '';
  const notas = [...xml.matchAll(/<(?:\w+:)?Note>([^<]+)</g)].map((n) => n[1]);
  return { codigo, descripcion, notas, xml };
};

/** Clasifica la respuesta como el resto de proveedores: ACEPTADO / OBSERVADO / RECHAZADO / ERROR. */
export const enviarASunat = async ({ doc, modo, usuario, clave, carpeta, cred }) => {
  const { llavePem, certPem } = await cargarCertificado(carpeta, cred, modo);
  const { xml, hash } = firmarXML(armarXML(doc), llavePem, certPem);
  const nombre = nombreArchivo(doc);
  const zip = new AdmZip();
  zip.addFile(`${nombre}.xml`, Buffer.from(xml, 'utf8'));
  const contenido = zip.toBuffer().toString('base64');
  const res = await fetch(URL_SUNAT[modo === 'REAL' ? 'REAL' : 'PRUEBA'], {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: 'urn:sendBill' },
    body: sobreSoap(usuario, clave, `<ser:sendBill><fileName>${nombre}.zip</fileName><contentFile>${contenido}</contentFile></ser:sendBill>`),
    signal: AbortSignal.timeout(45000),
  });
  const respuesta = await res.text();
  const base = { hash, xmlFirmado: xml, nombre };
  const cdr64 = (respuesta.match(/<(?:\w+:)?applicationResponse>([\s\S]*?)<\/(?:\w+:)?applicationResponse>/) || [])[1];
  if (cdr64) {
    const cdr = leerCDR(cdr64.trim());
    const texto = [cdr.descripcion, ...cdr.notas].filter(Boolean).join(' · ');
    if (cdr.codigo === 0) return { ...base, estado: 'ACEPTADO', mensaje: texto || 'Aceptada por SUNAT', cdrZip: cdr64.trim() };
    if (cdr.codigo >= 4000) return { ...base, estado: 'OBSERVADO', mensaje: texto, cdrZip: cdr64.trim() };
    return { ...base, estado: 'RECHAZADO', mensaje: texto || `Rechazada por SUNAT (${cdr.codigo})`, cdrZip: cdr64.trim() };
  }
  const falla = (respuesta.match(/<faultcode>([\s\S]*?)<\/faultcode>/) || [])[1] || '';
  const detalle = (respuesta.match(/<faultstring>([\s\S]*?)<\/faultstring>/) || [])[1] || `HTTP ${res.status}`;
  const codigo = Number((falla.match(/(\d{4})/) || [])[1] ?? NaN);
  // 2000-3999: SUNAT rechaza el comprobante (no tiene valor). Lo demás (0100-1999, red...) se reintenta.
  if (codigo >= 2000 && codigo < 4000) return { ...base, estado: 'RECHAZADO', mensaje: `SUNAT ${codigo}: ${detalle}` };
  return { ...base, estado: 'ERROR', mensaje: `SUNAT ${Number.isFinite(codigo) ? codigo : ''}: ${detalle}`.trim() };
};
