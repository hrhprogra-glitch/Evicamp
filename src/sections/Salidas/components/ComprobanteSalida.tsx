import React, { forwardRef } from 'react';
import type { Salida } from '../types';

interface ComprobanteSalidaProps {
  salida: Salida;
  empresa?: {
    nombre_empresa?: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
}

export const ComprobanteSalida = forwardRef<HTMLDivElement, ComprobanteSalidaProps>(
  ({ salida, empresa }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[80mm] sm:w-[100mm] p-4 bg-white text-black font-mono text-xs mx-auto border border-black/20 print:border-none print:w-full print:p-2"
        style={{ color: '#000', backgroundColor: '#fff' }}
      >
        {/* Cabecera Empresa */}
        <div className="text-center border-b border-black pb-2 mb-2">
          <h2 className="font-black text-sm uppercase tracking-wider">{empresa?.nombre_empresa || 'SIUMAX SERVIC'}</h2>
          {empresa?.ruc && <p className="text-[10px]">RUC: {empresa.ruc}</p>}
          {empresa?.direccion && <p className="text-[10px]">{empresa.direccion}</p>}
          {empresa?.telefono && <p className="text-[10px]">TELF: {empresa.telefono}</p>}
        </div>

        {/* Datos del Comprobante */}
        <div className="border-b border-black pb-2 mb-2 text-center">
          <p className="font-black text-xs uppercase tracking-widest bg-black text-white py-0.5 px-1 inline-block">
            VALE DE SALIDA A {salida.tipo}
          </p>
          <p className="font-black text-sm mt-1">{salida.codigo}</p>
          <p className="text-[10px]">FECHA: {salida.fecha}</p>
          {salida.salida_raiz_codigo && (
            <p className="text-[10px] text-gray-700">CONTINUACIÓN DE: {salida.salida_raiz_codigo}</p>
          )}
        </div>

        {/* Cliente y Destino */}
        <div className="border-b border-black pb-2 mb-2 space-y-0.5 text-[11px]">
          <p><span className="font-black">CLIENTE:</span> {salida.customer?.name || 'NO REGISTRADO'}</p>
          {salida.usuario && (
            <p><span className="font-black">EMPLEADO:</span> {salida.usuario}</p>
          )}
          {(salida.customer?.dni || salida.customer?.ruc) && (
            <p><span className="font-black">DOC:</span> {salida.customer?.dni || salida.customer?.ruc}</p>
          )}
          {salida.bien && (
            <p><span className="font-black">LO QUE SE ATIENDE:</span> {salida.bien.nombre} ({salida.bien.tipo})</p>
          )}
          {salida.direccion && (
            <p><span className="font-black">DIRECCIÓN:</span> {salida.direccion}</p>
          )}
        </div>

        {/* Trabajadores */}
        {salida.trabajadores && salida.trabajadores.length > 0 && (
          <div className="border-b border-black pb-2 mb-2 text-[10px]">
            <p className="font-black uppercase mb-0.5">PERSONAL ASIGNADO:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {salida.trabajadores.map((t, idx) => (
                <li key={idx}>
                  {t.trabajador?.nombre || 'Técnico'} {t.rol ? `(${t.rol})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabla de Materiales */}
        <div className="border-b border-black pb-2 mb-2">
          <p className="font-black text-[11px] uppercase mb-1">MATERIALES / REPUESTOS:</p>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-black">
                <th className="py-0.5">CANT</th>
                <th className="py-0.5">UND</th>
                <th className="py-0.5">DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {salida.items && salida.items.map((it, idx) => (
                <tr key={idx} className="border-b border-dotted border-gray-300">
                  <td className="py-1 font-bold">{it.cantidad}</td>
                  <td className="py-1">{it.unidad}</td>
                  <td className="py-1 uppercase">
                    {it.descripcion}
                    {it.cantidad_devuelta > 0 && (
                      <span className="block text-[9px] text-gray-600">
                        (Devuelto: {it.cantidad_devuelta})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Observaciones */}
        {salida.observaciones && (
          <div className="border-b border-black pb-2 mb-2 text-[10px]">
            <p className="font-black">OBSERVACIONES:</p>
            <p className="italic">{salida.observaciones}</p>
          </div>
        )}

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[10px]">
          <div className="border-t border-black pt-1">
            <p className="font-bold">RESPONSABLE TÉCNICO</p>
          </div>
          <div className="border-t border-black pt-1">
            <p className="font-bold">RECIBIDO / CONFORME</p>
          </div>
        </div>

        <div className="text-center text-[9px] text-gray-500 mt-4">
          SIUMAX SERVIC · SISTEMA DE GESTIÓN OPERATIVA
        </div>
      </div>
    );
  }
);
