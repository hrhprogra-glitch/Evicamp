import React, { useRef } from 'react';
import { X, Printer, ArrowRight } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface ModalValeTraspasoProps {
  traspaso: {
    codigo: string;
    fecha?: string;
    origen_nombre: string;
    destino_nombre: string;
    creado_por?: string;
    notas?: string;
    items: Array<{
      product_name: string;
      variant_name?: string | null;
      cantidad: number;
    }>;
  };
  onClose: () => void;
}

export const ModalValeTraspaso: React.FC<ModalValeTraspasoProps> = ({ traspaso, onClose }) => {
  useCerrarConEscape(true, () => onClose());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const totalUnidades = traspaso.items.reduce((acc, it) => acc + Number(it.cantidad || 0), 0);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        role="dialog"
        aria-modal="true"
        className="ventana-sobria w-full max-w-xl bg-white text-black border-2 border-black shadow-[8px_8px_0_0_#000] flex flex-col max-h-[90vh] overflow-hidden font-mono"
      >
        {/* Cabecera modal */}
        <div className="ventana-cabecera flex items-center justify-between px-4 py-2.5 bg-black text-white no-print">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            Vale de Traspaso de Mercadería
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1 bg-amber-400 text-black text-xs font-bold uppercase hover:bg-white cursor-pointer"
            >
              <Printer size={14} /> Imprimir [P]
            </button>
            <button
              onClick={onClose}
              className="ventana-cerrar p-1 hover:bg-white/20 text-white cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Documento Imprimible */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-4 print:p-0">
          <div className="text-center border-b-2 border-black pb-3">
            <h1 className="text-base font-black uppercase tracking-wider">
              VALE DE TRASLADO INTERNO
            </h1>
            <p className="text-xs font-bold text-gray-700">
              N° {traspaso.codigo}
            </p>
            <p className="text-[11px] text-gray-500">
              Fecha: {traspaso.fecha || new Date().toLocaleString()}
            </p>
          </div>

          {/* Ruta del Traspaso */}
          <div className="flex items-center justify-between p-3 border border-dashed border-black bg-gray-50 text-xs">
            <div className="text-left">
              <span className="text-[10px] text-gray-500 uppercase block font-bold">Origen (Salida)</span>
              <span className="font-black text-sm uppercase">{traspaso.origen_nombre}</span>
            </div>
            <ArrowRight size={20} className="text-gray-400" />
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase block font-bold">Destino (Entrada)</span>
              <span className="font-black text-sm uppercase text-emerald-700">{traspaso.destino_nombre}</span>
            </div>
          </div>

          {/* Tabla de Productos */}
          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-[11px]">
                <th className="p-2 border-r border-black font-bold">#</th>
                <th className="p-2 border-r border-black font-bold">Producto / Descripción</th>
                <th className="p-2 border-r border-black font-bold">Variante</th>
                <th className="p-2 text-right font-bold">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {traspaso.items.map((it, idx) => (
                <tr key={idx} className="text-xs">
                  <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                  <td className="p-2 border-r border-black font-bold uppercase">{it.product_name}</td>
                  <td className="p-2 border-r border-black text-[11px] uppercase text-gray-600">
                    {it.variant_name || '—'}
                  </td>
                  <td className="p-2 text-right font-black font-mono">{it.cantidad}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black bg-gray-100 font-bold">
                <td colSpan={3} className="p-2 text-right uppercase">Total Unidades:</td>
                <td className="p-2 text-right font-mono text-sm">{totalUnidades}</td>
              </tr>
            </tfoot>
          </table>

          {traspaso.notas && (
            <div className="text-xs border p-2 bg-gray-50">
              <span className="font-bold">Observaciones / Motivo:</span> {traspaso.notas}
            </div>
          )}

          {/* Firmas de Control */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <div className="border-t border-black pt-1 font-bold">
                Despachado por: {traspaso.creado_por || 'Almacenero'}
              </div>
              <span className="text-[10px] text-gray-500">Firma / Sello</span>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold">
                Recibido conforme en destino
              </div>
              <span className="text-[10px] text-gray-500">Firma / Sello</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 border-t-2 border-black flex justify-between items-center no-print">
          <span className="text-xs text-gray-500">Presiona Esc para volver</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-gray-800 cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
