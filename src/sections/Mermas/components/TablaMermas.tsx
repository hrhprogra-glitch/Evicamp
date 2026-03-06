import React, { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight,  Package, Edit, Trash2 } from 'lucide-react';
import type { Merma } from '../types';

interface Props {
  mermas: Merma[];
  onEdit?: (merma: Merma) => void;
  onDelete?: (merma: Merma) => void;
}

export const TablaMermas: React.FC<Props> = ({ mermas, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const totalPages = Math.ceil(mermas.length / ITEMS_PER_PAGE);
  const paginatedData = mermas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPagination = (position: 'top' | 'bottom') => {
    if (totalPages <= 0) return null;
    return (
      <div className={`${position === 'top' ? 'border-b' : 'border-t'} border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center justify-between shrink-0`}>
        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-[#1E293B] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-[#1E293B] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-[#E2E8F0] flex-1 flex flex-col bg-white relative w-full">
      
      {renderPagination('top')}

      {/* CABECERA - Redistribuimos a 12 columnas exactas */}
      <div className="grid grid-cols-12 gap-3 bg-[#1E293B] text-white p-4 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] shrink-0">
        <div className="col-span-2 min-w-0 truncate">Fecha / Usu.</div>
        <div className="col-span-2 min-w-0 truncate">Producto</div>
        <div className="col-span-2 min-w-0 truncate">Detalle</div>
        <div className="col-span-2 min-w-0 truncate">Motivo</div>
        <div className="col-span-1 min-w-0 text-center truncate">Unid.</div>
        <div className="col-span-1 min-w-0 text-right truncate">Costo</div>
        <div className="col-span-1 min-w-0 text-right truncate">Total</div>
        <div className="col-span-1 min-w-0 text-center truncate">Acción</div>
      </div>

      {/* CUERPO */}
      <div className="w-full flex-1">
        {paginatedData.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest flex flex-col items-center justify-center h-full gap-2">
            <Layers size={32} className="text-[#E2E8F0] mb-2" />
            <p>No hay registros de mermas con estos filtros.</p>
          </div>
        ) : (
          paginatedData.map((merma, index) => (
            <div key={merma.id || `merma-fantasma-${index}`} className="grid grid-cols-12 gap-3 items-center p-4 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors group text-sm">
              
              {/* FECHA Y USUARIO */}
              <div className="col-span-2 min-w-0 flex flex-col gap-1">
                <span className="text-[#1E293B] font-black truncate">{merma.created_at.split(',')[0]}</span>
                <span className="text-[9px] font-bold text-[#64748B] uppercase flex items-center gap-1 truncate">
                  {merma.created_at.split(',')[1]}
                </span>
                <span className="text-[9px] font-bold text-[#10B981] uppercase flex items-center gap-1 truncate">
                  Por: {merma.user_name}
                </span>
              </div>

              {/* PRODUCTO */}
              <div className="col-span-2 min-w-0 flex flex-col gap-1 overflow-hidden">
                <p className="font-black uppercase text-[#1E293B] truncate flex items-center gap-2" title={merma.product_name}>
                  <Package size={14} className="text-[#94A3B8] shrink-0" />
                  <span className="truncate">{merma.product_name || 'DESCONOCIDO'}</span>
                </p>
              </div>

              {/* DETALLE */}
              <div className="col-span-2 min-w-0 pr-2">
                {merma.notes ? (
                  <p className="text-[10px] font-bold text-[#64748B] line-clamp-2" title={merma.notes}>
                    {merma.notes}
                  </p>
                ) : (
                  <span className="text-[10px] font-bold text-[#CBD5E1] italic truncate block">SIN DETALLE</span>
                )}
              </div>

              {/* MOTIVO */}
              <div className="col-span-2 min-w-0 pr-2">
                {merma.reason.toUpperCase().includes('USO INTERNO') ? (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 border inline-block bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6] truncate max-w-full">
                    {merma.reason}
                  </span>
                ) : merma.reason.toUpperCase().includes('CORRECCI') ? (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 border inline-block bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B] truncate max-w-full">
                    {merma.reason}
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 border inline-block bg-[#FEF2F2] text-[#EF4444] border-[#EF4444] truncate max-w-full">
                    {merma.reason}
                  </span>
                )}
              </div>

              {/* UNIDADES */}
              <div className="col-span-1 min-w-0 flex justify-center">
                <div className="inline-flex items-center justify-center px-1 py-1 border-2 border-[#1E293B] bg-white font-black text-[#1E293B] text-[10px] w-full max-w-[40px] truncate">
                  {merma.quantity}
                </div>
              </div>

              {/* COSTO */}
              <div className="col-span-1 min-w-0 text-right">
                <p className="font-bold text-[#64748B] text-[10px] truncate" title={`S/ ${merma.cost_unit.toFixed(2)}`}>
                  S/{merma.cost_unit.toFixed(2)}
                </p>
              </div>

              {/* TOTAL */}
              <div className="col-span-1 min-w-0 text-right">
                <p className="font-black text-[#EF4444] text-[11px] truncate" title={`S/ ${merma.total_loss.toFixed(2)}`}>
                  S/{merma.total_loss.toFixed(2)}
                </p>
              </div>

              {/* ACCIONES */}
              <div className="col-span-1 min-w-0 flex items-center justify-center gap-2">
                <button 
                  onClick={() => onEdit && onEdit(merma)}
                  className="text-[#94A3B8] hover:text-[#3B82F6] transition-colors cursor-pointer"
                  title="Editar Merma"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => onDelete && onDelete(merma)}
                  className="text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer"
                  title="Eliminar Registro"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {renderPagination('bottom')}
    </div>
  );
};