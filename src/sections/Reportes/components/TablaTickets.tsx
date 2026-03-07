// src/sections/Reportes/components/TablaTickets.tsx
import React, { useState, useEffect } from 'react';
import { RotateCcw, Trash2, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TicketVenta } from '../types';

interface Props {
  tickets: TicketVenta[];
  onAnular: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TablaTickets: React.FC<Props> = ({ tickets, onAnular, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Si los tickets cambian (ej. cambias de mes), regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [tickets.length]);

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(tickets.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTickets = tickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Componente de Controles (Lo usaremos arriba y abajo)
  const PaginacionControles = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="p-3 border-y-2 border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
        <p className="text-[10px] font-black text-[#64748B] uppercase">
          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, tickets.length)} de {tickets.length}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[#E2E8F0] bg-white text-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8FAFC] cursor-pointer rounded-none">
            <ChevronLeft size={16} />
          </button>
          <span className="flex items-center justify-center px-4 border-2 border-[#E2E8F0] bg-white text-xs font-black text-[#1E293B] rounded-none">
            Pág {currentPage} / {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[#E2E8F0] bg-white text-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8FAFC] cursor-pointer rounded-none">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-[#E2E8F0] shadow-[8px_8px_0_0_#E2E8F0] flex flex-col font-mono rounded-none">
      
      <PaginacionControles /> {/* <-- Paginación Arriba */}

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-[#1E293B] text-white">
            <tr>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Fecha y Hora</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Nro. Ticket</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Pago</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B]">Estado</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B] text-right">Total</th>
              <th className="p-4 text-[10px] font-black tracking-widest uppercase border-b-2 border-[#1E293B] text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#94A3B8] font-bold text-xs uppercase bg-white">
                  No hay tickets registrados en este mes.
                </td>
              </tr>
            ) : (
              currentTickets.map((t) => (
                <tr key={t.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="p-4 text-xs font-bold text-[#64748B]">
                    {new Date(t.created_at).toLocaleString('es-PE')}
                  </td>
                  <td className="p-4 text-sm font-black text-[#1E293B] uppercase">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-[#94A3B8]" />
                      #{t.id.slice(-6)}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold text-[#64748B] uppercase">{t.metodo_pago}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] font-black tracking-wider border rounded-none ${
                      t.estado === 'ANULADO' ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]' : 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]'
                    }`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm font-black text-[#1E293B]">
                    S/ {Number(t.total).toFixed(2)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {t.estado !== 'ANULADO' && (
                        <button 
                          onClick={() => onAnular(t.id)} 
                          className="p-2 bg-white text-[#94A3B8] border-2 border-[#E2E8F0] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors cursor-pointer rounded-none" 
                          title="Anular / Devolver"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => onDelete(t.id)} 
                        className="p-2 bg-white text-[#94A3B8] border-2 border-[#E2E8F0] hover:border-[#EF4444] hover:text-[#EF4444] transition-colors cursor-pointer rounded-none" 
                        title="Eliminar Permanente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <PaginacionControles /> {/* <-- Paginación Abajo */}

    </div>
  );
};