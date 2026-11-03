import { forwardRef, useEffect, useState } from 'react';
import { supabase } from '../../../db/supabase';
import qrcode from 'qrcode-generator';
import { nombreComprobante, numeroComprobante, textoQRComprobante, type TotalesCPE } from '../../../utils/comprobante';

// Datos del negocio para la cabecera del ticket (Ajustes > Empresa). Cada cliente tiene los suyos.
interface DatosEmpresa {
  nombre_empresa?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  logo_url?: string;
  razon_social?: string | null;
}

// Boleta o factura electrónica de la venta (fase 11.3). Sin esto, el ticket es la Nota de venta de siempre.
export interface ComprobanteTicket {
  docType: number | null;          // 1 factura, 3 boleta
  serie: string | null;
  numero: string | null;
  modo?: string | null;            // SIMULADO / PRUEBA / REAL
  clienteTipoDoc?: string;
  clienteNumDoc?: string;
  clienteNombre?: string;
  clienteDireccion?: string;
  fecha?: string;
  totales: TotalesCPE;
  hash?: string | null;
  // Nota de crédito (fase 11.5): comprobante que corrige y motivo
  referencia?: { docType: number; serie: string | null; numero: string | null } | null;
  motivo?: string | null;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  cartQuantity: number;
  subtotal: number;
  unit?: string;
  [key: string]: any; 
}

interface Props {
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
  vendedor?: string | null; // quién hizo la venta
  comprobante?: ComprobanteTicket | null;
}

/** QR del comprobante como imagen (se imprime nítido en la ticketera). */
const ImagenQR: React.FC<{ texto: string }> = ({ texto }) => {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return <img src={qr.createDataURL(4, 0)} alt="Código QR del comprobante" className="mx-auto w-[30mm] h-[30mm]" style={{ imageRendering: 'pixelated' }} />;
};

export const TicketImprimible = forwardRef<HTMLDivElement, Props>(
  ({ cart, total, pagos, vuelto, nroBoleta, fiadoData, cliente, vendedor, comprobante }, ref) => {
    const fecha = (comprobante?.fecha ? new Date(comprobante.fecha) : new Date()).toLocaleString('es-PE');
    const esCpe = Boolean(comprobante?.docType);
    const [empresa, setEmpresa] = useState<DatosEmpresa>({});

    useEffect(() => {
      supabase
        .from('empresa_config')
        .select('*')
        .limit(1)
        .single()
        .then(({ data }) => { if (data) setEmpresa(data); });
    }, []);

    return (
      <div 
        ref={ref} 
        // 🚀 AHORA ES VISIBLE: Le damos diseño de papel real con sombra
        className="bg-white p-4 text-[var(--color-ink)] w-[80mm] mx-auto border-2 border-dashed border-gray-400 font-mono shadow-2xl print:shadow-none print:border-0 print:p-0 print:m-0"
      >
        {/* REGLAS ESTRICTAS SOLO PARA LA IMPRESORA FÍSICA */}
        <style type="text/css" media="print">
          {`
            @page { margin: 0; }
            body { width: 80mm !important; margin: 0 !important; color: black !important; background: white !important; }
            * { box-sizing: border-box; }
          `}
        </style>

        {/* CABECERA */}
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          {empresa.logo_url && <img src={empresa.logo_url} alt="" className="mx-auto mb-2 max-h-[22mm] max-w-[50mm] object-contain grayscale" />}
          <h3 className="font-black text-lg uppercase tracking-widest">{empresa.nombre_empresa || 'Mi Negocio'}</h3>
          {esCpe && empresa.razon_social && <p className="text-[12px] font-bold uppercase">{empresa.razon_social}</p>}
          {empresa.ruc && <p className="text-[12px] font-bold mt-1">RUC: {empresa.ruc}</p>}
          {empresa.direccion && <p className="text-[12px]">{empresa.direccion}</p>}
          {empresa.telefono && <p className="text-[12px]">Tel: {empresa.telefono}</p>}
          
          <h3 className="font-black text-sm uppercase mt-2">
            {esCpe ? nombreComprobante(comprobante!.docType) : fiadoData ? 'TICKET DE FIADO' : 'Nota de Venta'}
          </h3>
          {esCpe && fiadoData && <p className="text-[11px] font-black uppercase">Venta al crédito</p>}
          {esCpe && comprobante!.referencia && (
            <div className="text-[11px] font-bold uppercase mt-1">
              <p>Corrige: {nombreComprobante(comprobante!.referencia.docType)} {numeroComprobante(comprobante!.referencia.serie, comprobante!.referencia.numero)}</p>
              {comprobante!.motivo && <p>Motivo: {comprobante!.motivo}</p>}
            </div>
          )}
          <p className="font-black tracking-widest text-base">{nroBoleta}</p>
          <p className="text-[12px] font-bold mt-1">Fecha: {fecha}</p>
          {vendedor && <p className="text-[12px] font-bold uppercase">Atendido por: {vendedor}</p>}

          {/* DATOS DEL FIADO */}
          {fiadoData && (
            <div className="mt-2 text-left border-2 border-black p-1.5 bg-gray-100">
              <p className="text-[12px] font-black uppercase border-b border-black pb-1 mb-1">Datos del Crédito</p>
              <p className="text-[12px] font-bold uppercase">Cliente: <span className="font-black">{fiadoData.clienteNombre}</span></p>
              {fiadoData.clienteDni && <p className="text-[12px] font-bold uppercase">DNI: <span className="font-black">{fiadoData.clienteDni}</span></p>}
              {fiadoData.clienteTelefono && <p className="text-[12px] font-bold uppercase">Cel: <span className="font-black">{fiadoData.clienteTelefono}</span></p>}
              <p className="text-[12px] font-black uppercase mt-1 text-red-600">Límite Pago: {fiadoData.fechaVencimiento}</p>
            </div>
          )}

          {/* CLIENTE DEL COMPROBANTE ELECTRÓNICO */}
          {esCpe && (
            <div className="mt-2 text-left border-2 border-black p-1.5 bg-gray-50">
              {comprobante!.clienteTipoDoc && comprobante!.clienteTipoDoc !== 'SIN' && comprobante!.clienteNumDoc ? (
                <p className="text-[12px] font-bold uppercase">{comprobante!.clienteTipoDoc}: <span className="font-black">{comprobante!.clienteNumDoc}</span></p>
              ) : null}
              <p className="text-[12px] font-bold uppercase">
                {comprobante!.docType === 1 ? 'Razón social' : 'Cliente'}: <span className="font-black">{comprobante!.clienteNombre || 'CLIENTES VARIOS'}</span>
              </p>
              {comprobante!.clienteDireccion && <p className="text-[12px] uppercase">Dir: <span>{comprobante!.clienteDireccion}</span></p>}
            </div>
          )}

          {/* DATOS DEL CLIENTE EN NOTA DE VENTA */}
          {!esCpe && !fiadoData && cliente && (
            <div className="mt-2 text-left border-2 border-black p-1.5 bg-gray-50">
              <p className="text-[12px] font-bold uppercase">Cliente: <span className="font-black">{cliente.nombre}</span></p>
              {cliente.dni && <p className="text-[12px] font-bold uppercase">DNI: <span className="font-black">{cliente.dni}</span></p>}
              {cliente.ruc && <p className="text-[12px] font-bold uppercase">RUC: <span className="font-black">{cliente.ruc}</span></p>}
              {cliente.telefono && <p className="text-[12px] font-bold uppercase">Cel: <span className="font-black">{cliente.telefono}</span></p>}
              {cliente.direccion && <p className="text-[12px] uppercase">Dir: <span>{cliente.direccion}</span></p>}
            </div>
          )}
        </div>

        {/* TABLA DE PRODUCTOS */}
        <table className="w-full text-[12px] mb-4">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="w-[15%] pb-1 font-black">CANT</th>
              <th className="w-[60%] pb-1 font-black">DESC</th>
              <th className="w-[25%] text-right pb-1 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, index) => (
              <tr key={index}>
                <td className="py-1.5 font-bold align-top">{item.cartQuantity}</td>
                <td className="py-1.5 pr-1 uppercase align-top">
                  <span className="font-bold leading-tight block">{item.name}</span>
                  <span className="text-[11px] text-gray-600 font-bold">S/ {item.price.toFixed(2)} c/u</span>
                  {item.numeroSerie && (
                    <span className="text-[10px] text-black font-mono font-bold block">SERIE/IMEI: {item.numeroSerie}</span>
                  )}
                  {item.garantiaHasta && (
                    <span className="text-[10px] text-gray-800 font-bold block">GARANTÍA HASTA: {item.garantiaHasta}</span>
                  )}
                  {Boolean(!item.garantiaHasta && item.mesesGarantia && item.mesesGarantia > 0) && (
                    <span className="text-[10px] text-gray-800 font-bold block">GARANTÍA: {item.mesesGarantia} {item.mesesGarantia === 1 ? 'MES' : 'MESES'}</span>
                  )}
                </td>
                <td className="py-1.5 text-right font-bold align-top">
                  {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES Y PAGOS */}
        <div className="border-t-2 border-black pt-2 space-y-1 font-black text-xs uppercase">
          {esCpe && (
            <div className="space-y-0.5 text-[12px] font-bold mb-1">
              {comprobante!.totales.gravada > 0 && <div className="flex justify-between"><span>Op. gravada:</span><span>S/ {comprobante!.totales.gravada.toFixed(2)}</span></div>}
              {comprobante!.totales.exonerada > 0 && <div className="flex justify-between"><span>Op. exonerada:</span><span>S/ {comprobante!.totales.exonerada.toFixed(2)}</span></div>}
              {comprobante!.totales.inafecta > 0 && <div className="flex justify-between"><span>Op. inafecta:</span><span>S/ {comprobante!.totales.inafecta.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>IGV (18%):</span><span>S/ {comprobante!.totales.igv.toFixed(2)}</span></div>
              {comprobante!.totales.icbper > 0 && <div className="flex justify-between"><span>ICBPER (bolsas):</span><span>S/ {comprobante!.totales.icbper.toFixed(2)}</span></div>}
            </div>
          )}
          <div className="flex justify-between text-lg mb-2">
            <span>Total:</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>
          
          {!(esCpe && comprobante!.docType === 7) && (<>
          <div className="border-t border-black pt-1 mb-1 text-[12px] text-gray-600">
            {fiadoData ? 'PAGOS PARCIALES:' : 'MÉTODOS DE PAGO:'}
          </div>

          {pagos.efectivo > 0 && <div className="flex justify-between"><span>Efectivo:</span><span>S/ {pagos.efectivo.toFixed(2)}</span></div>}
          {pagos.yape > 0 && <div className="flex justify-between"><span>Yape:</span><span>S/ {pagos.yape.toFixed(2)}</span></div>}
          {pagos.tarjeta > 0 && <div className="flex justify-between"><span>Tarjeta:</span><span>S/ {pagos.tarjeta.toFixed(2)}</span></div>}
          
          <div className="flex justify-between border-t-2 border-black pt-1 text-base mt-2">
            <span>{fiadoData ? 'POR PAGAR:' : 'VUELTO:'}</span>
            <span>S/ {fiadoData ? fiadoData.montoDeuda.toFixed(2) : vuelto.toFixed(2)}</span>
          </div>
          </>)}
        </div>

        {/* COMPROBANTE ELECTRÓNICO: QR y leyenda */}
        {esCpe && (
          <div className="text-center mt-4 border-t-2 border-dashed border-gray-400 pt-3 space-y-1">
            {empresa.ruc && comprobante!.serie && comprobante!.numero ? (
              <ImagenQR texto={textoQRComprobante({
                ruc: empresa.ruc, docType: comprobante!.docType!, serie: comprobante!.serie, numero: comprobante!.numero,
                totales: comprobante!.totales, fecha: comprobante!.fecha ? new Date(comprobante!.fecha) : new Date(),
                clienteTipoDoc: comprobante!.clienteTipoDoc, clienteNumDoc: comprobante!.clienteNumDoc, hash: comprobante!.hash,
              })} />
            ) : (
              <p className="text-[11px] font-black uppercase">Comprobante por numerar: se emite al conectarse a internet</p>
            )}
            <p className="text-[10px] font-bold uppercase leading-tight">Representación impresa de la {nombreComprobante(comprobante!.docType).toLowerCase()}</p>
            {comprobante!.hash && <p className="text-[9px] font-mono break-all">Resumen: {comprobante!.hash}</p>}
            {comprobante!.modo && comprobante!.modo !== 'REAL' && (
              <p className="text-[11px] font-black uppercase border-2 border-black p-1 mt-1">*** Modo {comprobante!.modo === 'SIMULADO' ? 'simulado' : 'prueba'}: sin valor tributario ***</p>
            )}
          </div>
        )}

        {/* PIE DE PÁGINA */}
        <div className="text-center mt-6 border-t-2 border-dashed border-gray-400 pt-3">
          <p className="font-black text-[12px] uppercase">¡Gracias por su compra!</p>
          <p className="mt-3 text-[11px] font-black">*** SIUMAX COMERC ***</p>
        </div>
        <div className="h-2"></div>
      </div>
    );
  }
);