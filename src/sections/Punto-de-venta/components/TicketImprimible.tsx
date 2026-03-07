import { forwardRef } from 'react';
import type { CartItem } from '../types';

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
}

export const TicketImprimible = forwardRef<HTMLDivElement, Props>(
  ({ cart, total, pagos, vuelto, nroBoleta, fiadoData }, ref) => {
    const fecha = new Date().toLocaleString('es-PE');

    return (
      <div style={{ display: 'none' }}>
        {/* CONTENEDOR MAESTRO: Punto Medio (76mm) y Altura Infinita */}
        <div 
          ref={ref} 
          className="bg-white text-black font-mono border-2 border-dashed border-black" 
          style={{ 
            width: '100%',          
            maxWidth: '76mm',       /* <-- Punto medio exacto para tiquetera de 80mm */
            margin: '0 auto',       /* <-- Vuelve a centrarlo perfectamente */
            padding: '4mm 2mm',     /* <-- Un respiro justo a los lados */
            boxSizing: 'border-box',
            height: 'auto',         
            minHeight: '100%',
            overflow: 'visible'     
          }}
        >
          {/* REGLA DE IMPRESIÓN EXCLUSIVA */}
          <style type="text/css" media="print">
            {`
              @page { 
                margin: 0; 
                size: 80mm auto; 
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                height: auto !important;     
                overflow: visible !important; 
                width: 100% !important; /* Fuerza al navegador a no achicar el body */
              }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                display: block !important; 
              }
            `}
          </style>

          {/* CABECERA */}
          <div className="text-center mb-4 mt-2 px-1">
            <h1 className="font-black text-3xl uppercase tracking-widest mb-1">EVICAMP POS</h1>
            <p className="text-sm font-bold">RUC: 20123456789</p>
            <p className="text-sm">Av. Arquitectura Técnica 123</p>
            <p className="text-sm">Lima - Perú</p>
            <div className="border-t-2 border-dashed border-black my-2 w-full"></div>
            
            {/* TÍTULO CONDICIONAL */}
            <h2 className="font-black text-xl uppercase mt-1">
              {fiadoData ? 'TICKET DE FIADO' : 'Boleta Electrónica'}
            </h2>
            <p className="font-black tracking-widest text-2xl mt-1">{nroBoleta}</p>
            <p className="text-sm mt-1 font-bold">Fecha: {fecha}</p>

            {/* CAJA DE DATOS DEL CLIENTE (SOLO SI ES FIADO) */}
            {fiadoData && (
              <div className="mt-4 mb-2 text-left border-2 border-black p-2 bg-gray-100">
                <p className="text-sm font-black uppercase border-b-2 border-black pb-1 mb-1">DATOS DEL CRÉDITO</p>
                <p className="text-xs font-bold uppercase mt-1">CLIENTE: <span className="font-black">{fiadoData.clienteNombre}</span></p>
                {fiadoData.clienteDni && <p className="text-xs font-bold uppercase">DNI: <span className="font-black">{fiadoData.clienteDni}</span></p>}
                {fiadoData.clienteTelefono && <p className="text-xs font-bold uppercase">CEL: <span className="font-black">{fiadoData.clienteTelefono}</span></p>}
                <p className="text-sm font-black uppercase mt-2">LÍMITE PAGO: {fiadoData.fechaVencimiento}</p>
              </div>
            )}

            <div className="border-t-2 border-dashed border-black my-2 w-full"></div>
          </div>

          {/* CABECERA DE PRODUCTOS */}
          <div className="flex font-black text-sm mb-2 uppercase border-b-2 border-solid border-black pb-1 px-1">
            <div className="w-[15%] text-left">CANT</div>
            <div className="w-[60%] text-left">DESCRIPCIÓN</div>
            <div className="w-[25%] text-right">TOTAL</div>
          </div>

          {/* LISTA DE PRODUCTOS */}
          <div className="flex flex-col gap-3 mb-3 mt-2 px-1">
            {cart.map((item, index) => (
              <div key={index} className="flex items-start text-base">
                <div className="w-[15%] text-left font-black">{item.cartQuantity}</div>
                <div className="w-[60%] text-left pr-1">
                  <span className="uppercase font-black break-words block leading-tight">
                    {item.name}
                  </span>
                  <span className="text-sm block mt-1 font-bold">S/ {item.price.toFixed(2)} c/u</span>
                </div>
                <div className="w-[25%] text-right font-black">
                  {item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* TOTALES */}
          <div className="border-t-2 border-dashed border-black my-4 w-full"></div>
          <div className="flex justify-between font-black text-3xl uppercase tracking-wider mb-4 mt-2 px-1">
            <span>TOTAL:</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>

          {/* DESGLOSE DE PAGO Y DEUDA PENDIENTE */}
          <div className="border-t-2 border-solid border-black my-4 w-full"></div>
          <div className="font-black text-base mb-2 uppercase mt-2 px-1">
            {fiadoData ? 'PAGOS PARCIALES (ADELANTO):' : 'MÉTODOS DE PAGO:'}
          </div>
          <div className="flex flex-col gap-1 text-base font-bold px-1">
            {pagos.efectivo > 0 && (
              <div className="flex justify-between">
                <span>EFECTIVO:</span>
                <span>S/ {pagos.efectivo.toFixed(2)}</span>
              </div>
            )}
            {pagos.yape > 0 && (
              <div className="flex justify-between">
                <span>YAPE:</span>
                <span>S/ {pagos.yape.toFixed(2)}</span>
              </div>
            )}
            {pagos.tarjeta > 0 && (
              <div className="flex justify-between">
                <span>TARJETA:</span>
                <span>S/ {pagos.tarjeta.toFixed(2)}</span>
              </div>
            )}
            
            {/* LÓGICA CONDICIONAL: SI HAY FIADO, MUESTRA DEUDA. SI NO, MUESTRA VUELTO */}
            {fiadoData ? (
              <div className="flex justify-between mt-2 font-black text-xl border-2 border-black p-2 bg-white">
                <span>POR PAGAR:</span>
                <span>S/ {fiadoData.montoDeuda.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between mt-2 font-black text-xl bg-black text-white p-2">
                <span>VUELTO:</span>
                <span>S/ {vuelto.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* PIE DE PÁGINA */}
          <div className="border-t-2 border-dashed border-black my-4 mt-6 w-full"></div>
          <div className="text-center mt-4 px-1">
            <p className="font-black text-xl uppercase tracking-widest">¡Gracias por su compra!</p>
            <p className="text-sm mt-2 leading-tight font-bold">Consulte su documento en www.sunat.gob.pe</p>
          </div>
          <div className="text-center mt-4 font-mono text-sm font-black px-1">
            *** SISTEMA EVICAMP POS ***
          </div>
          
          <div className="h-16"></div>
        </div>
      </div>
    );
  }
);