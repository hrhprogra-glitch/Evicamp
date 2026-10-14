import React, { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, Package, Edit, Trash2 } from 'lucide-react';
import { formatearCantidad } from '../../../utils/formato';
import type { Merma } from '../types';
import type { Product } from '../../Inventario/types';
import { clicConTeclado } from '../../../utils/clicConTeclado';

interface Props {
  mermas: Merma[];
  products: Product[];
  onEdit?: (merma: Merma) => void;
  onDelete?: (merma: Merma) => void;
}

export const TablaMermas: React.FC<Props> = ({ mermas, products, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const totalPages = Math.ceil(mermas.length / ITEMS_PER_PAGE);
  const paginatedData = mermas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPagination = (position: 'top' | 'bottom') => {
    if (totalPages <= 0) return null;
    const prevId = position === 'top' ? 'btn-pag-prev-mermas' : 'btn-pag-bottom-prev-mermas';
    const nextId = position === 'top' ? 'btn-pag-next-mermas' : 'btn-pag-bottom-next-mermas';

    return (
      <div className={`${position === 'top' ? 'border-b' : 'border-t'} border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center justify-between shrink-0 rounded-none`}>
        <span className="text-xs font-black text-[var(--color-muted)] uppercase tracking-widest">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button 
            id={prevId}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                const btnNext = document.getElementById(nextId);
                if (btnNext && !btnNext.hasAttribute('disabled')) btnNext.focus();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                const btnLimpiar = document.getElementById('btn-limpiar-filtros-mermas');
                if (btnLimpiar) btnLimpiar.focus();
                else document.getElementById('filtro-fecha-mermas')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const btnLimpiar = document.getElementById('btn-limpiar-filtros-mermas');
                  if (btnLimpiar) btnLimpiar.focus();
                  else document.getElementById('filtro-fecha-mermas')?.focus();
                } else {
                  const rows = Array.from(document.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[];
                  if (rows.length > 0) rows[rows.length - 1].focus();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = Array.from(document.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[];
                  if (rows.length > 0) rows[0].focus();
                }
              }
            }}
            className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)]"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            id={nextId}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                const btnPrev = document.getElementById(prevId);
                if (btnPrev && !btnPrev.hasAttribute('disabled')) {
                  btnPrev.focus();
                } else {
                  const btnLimpiar = document.getElementById('btn-limpiar-filtros-mermas');
                  if (btnLimpiar) btnLimpiar.focus();
                  else document.getElementById('filtro-fecha-mermas')?.focus();
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const btnLimpiar = document.getElementById('btn-limpiar-filtros-mermas');
                  if (btnLimpiar) btnLimpiar.focus();
                  else document.getElementById('filtro-fecha-mermas')?.focus();
                } else {
                  const rows = Array.from(document.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[];
                  if (rows.length > 0) rows[rows.length - 1].focus();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = Array.from(document.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[];
                  if (rows.length > 0) rows[0].focus();
                }
              }
            }}
            className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-[var(--color-border)] flex-1 flex flex-col bg-[var(--color-surface)] relative w-full rounded-none">
      
      {renderPagination('top')}

      {/* En pantallas angostas la tabla conserva su ancho mínimo y se desliza horizontalmente */}
      <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
      <div className="flex-1 flex flex-col min-w-[900px]">
      {/* CABECERA */}
      <div className="grid grid-cols-12 gap-3 bg-[var(--color-ink)] text-[var(--color-surface)] p-4 text-xs md:text-sm font-black uppercase tracking-[0.1em] shrink-0 rounded-none">
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
      <div className="w-full flex-1 bg-[var(--color-surface)]">
        {paginatedData.length === 0 ? (
          <div className="p-6 sm:p-12 text-center text-[var(--color-muted)] font-bold uppercase text-[12px] tracking-widest flex flex-col items-center justify-center h-full gap-2 bg-[var(--color-surface)]">
            <Layers size={32} className="text-[var(--color-border)] mb-2" />
            <p>No hay registros de mermas con estos filtros.</p>
          </div>
        ) : (
          paginatedData.map((merma, index) => (
            <div
              key={merma.id || `merma-${index}`}
              data-row="true"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onEdit?.(merma);
                }
              }}
              onClick={() => onEdit?.(merma)}
              className="grid grid-cols-12 gap-3 items-center p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors text-sm rounded-none cursor-pointer"
              title="Click o Enter para editar"
            >
              
              {/* FECHA Y USUARIO */}
              <div className="col-span-2 min-w-0 flex flex-col gap-1">
                <span className="text-[var(--color-ink)] text-base font-black truncate">{merma.created_at.split(',')[0]}</span>
                <span className="text-xs font-black text-[var(--color-muted)] uppercase flex items-center gap-1 truncate">
                  {merma.created_at.split(',')[1]}
                </span>
                <span className="text-xs font-black text-[var(--color-accent)] uppercase flex items-center gap-1 truncate">
                  Por: {merma.user_name || 'SISTEMA'}
                </span>
              </div>

              {/* PRODUCTO */}
              <div className="col-span-2 min-w-0 flex flex-col gap-1 overflow-hidden">
                <p className="font-black text-sm uppercase text-[var(--color-ink)] truncate flex items-center gap-2" title={merma.product_name}>
                  <Package size={16} className="text-[var(--color-muted)] shrink-0" />
                  <span className="truncate">{merma.product_name || 'DESCONOCIDO'}</span>
                </p>
              </div>

              {/* DETALLE */}
              <div className="col-span-2 min-w-0 pr-2">
                {merma.notes ? (
                  <p className="text-xs font-black text-[var(--color-muted)] line-clamp-2" title={merma.notes}>
                    {merma.notes}
                  </p>
                ) : (
                  <span className="text-xs font-black text-[var(--color-line-light)] italic truncate block">SIN DETALLE</span>
                )}
              </div>

              {/* MOTIVO */}
              <div className="col-span-2 min-w-0 pr-2">
                <span className="text-xs font-black uppercase px-2 py-1 border-2 inline-block bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] truncate max-w-full rounded-none">
                  {merma.reason}
                </span>
              </div>

              {/* UNIDADES */}
              <div className="col-span-1 min-w-0 flex justify-center">
                <div className="inline-flex items-center justify-center px-2 py-1 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] font-black text-[var(--color-ink)] text-xs w-full max-w-[50px] truncate rounded-none">
                  {formatearCantidad(merma.quantity, products.find(p => p.id === merma.product_id)?.unit)}
                </div>
              </div>

              {/* COSTO */}
              <div className="col-span-1 min-w-0 text-right">
                <p className="font-black text-[var(--color-muted)] text-xs truncate" title={`S/ ${merma.cost_unit.toFixed(2)}`}>
                  S/{merma.cost_unit.toFixed(2)}
                </p>
              </div>

              {/* TOTAL */}
              <div className="col-span-1 min-w-0 text-right">
                <p className="font-black text-[var(--color-ink)] text-sm truncate" title={`S/ ${merma.total_loss.toFixed(2)}`}>
                  S/{merma.total_loss.toFixed(2)}
                </p>
              </div>

              {/* ACCIONES */}
              <div className="col-span-1 min-w-0 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(merma); }}
                  className="p-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-surface)] hover:bg-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] transition-colors rounded-none bg-[var(--color-surface)] cursor-pointer"
                  title="Editar Merma"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(merma); }}
                  className="p-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-surface)] hover:bg-[var(--color-danger)] hover:border-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:bg-[var(--color-danger)] focus:text-white transition-colors rounded-none bg-[var(--color-surface)] cursor-pointer"
                  title="Eliminar Merma"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ))
        )}
      </div>
      </div>
      </div>

      {renderPagination('bottom')}
    </div>
  );
};