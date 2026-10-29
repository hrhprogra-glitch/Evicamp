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

export const TablaConteos: React.FC<Props> = ({ mermas, products, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const totalPages = Math.ceil(mermas.length / ITEMS_PER_PAGE);
  const paginatedData = mermas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const obtenerFilas = () => {
    const container = document.getElementById('tabla-conteos-container');
    const root = container || document;
    return (Array.from(root.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[])
      .filter((el) => !el.closest('.hidden') && el.offsetParent !== null);
  };

  const renderPagination = (position: 'top' | 'bottom') => {
    if (totalPages <= 0) return null;
    const prevId = position === 'top' ? 'btn-pag-prev-conteos' : 'btn-pag-bottom-prev-conteos';
    const nextId = position === 'top' ? 'btn-pag-next-conteos' : 'btn-pag-bottom-next-conteos';

    const isPrevDisabled = currentPage <= 1;
    const isNextDisabled = currentPage >= totalPages;

    return (
      <div className={`${position === 'top' ? 'border-b' : 'border-t'} border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center justify-between shrink-0 rounded-none`}>
        <span className="text-xs font-black text-[var(--color-muted)] uppercase tracking-widest">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button 
            id={prevId}
            aria-disabled={isPrevDisabled}
            tabIndex={0}
            onClick={() => {
              if (isPrevDisabled) return;
              setCurrentPage(prev => Math.max(prev - 1, 1));
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById(nextId)?.focus();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const btnLimpiar = document.getElementById('btn-limpiar-filtros-conteos');
                  if (btnLimpiar) btnLimpiar.focus();
                  else document.getElementById('filtro-fecha-conteos')?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const search = document.getElementById('buscador-global-conteos');
                  if (search) search.focus();
                  else {
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-conteos');
                    if (btnLimpiar) btnLimpiar.focus();
                    else document.getElementById('filtro-fecha-conteos')?.focus();
                  }
                } else {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[rows.length - 1];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  } else {
                    document.getElementById('buscador-global-conteos')?.focus();
                  }
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[0];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  }
                }
              }
            }}
            className={`w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] ${
              isPrevDisabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            id={nextId}
            aria-disabled={isNextDisabled}
            tabIndex={0}
            onClick={() => {
              if (isNextDisabled) return;
              setCurrentPage(prev => Math.min(prev + 1, totalPages));
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById(prevId)?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const search = document.getElementById('buscador-global-conteos');
                  if (search) search.focus();
                  else {
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-conteos');
                    if (btnLimpiar) btnLimpiar.focus();
                    else document.getElementById('filtro-fecha-conteos')?.focus();
                  }
                } else {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[rows.length - 1];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  } else {
                    document.getElementById('buscador-global-conteos')?.focus();
                  }
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[0];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  }
                }
              }
            }}
            className={`w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] ${
              isNextDisabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="tabla-conteos-container" className="border border-[var(--color-border)] flex-1 flex flex-col bg-[var(--color-surface)] relative w-full rounded-none">
      
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
            <p>No hay registros con estos filtros.</p>
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
              className="grid grid-cols-12 gap-3 items-center p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] transition-colors text-sm rounded-none cursor-pointer"
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
                {merma.turno && (
                  <span className="text-[11px] font-bold text-[var(--color-muted)] truncate" title={merma.turno}>{merma.turno}</span>
                )}
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
                {merma.origen === 'CONTEO' && (
                  <p className="text-xs font-black text-[var(--color-ink)] truncate">
                    Contó {merma.conteo_contado ?? '—'} · sistema {merma.conteo_sistema ?? '—'}
                  </p>
                )}
                {merma.conteo_editado_por && (
                  <p className="text-[11px] font-black text-[var(--color-warning-text)] truncate" title={`Antes: ${merma.conteo_motivo_original} — ${merma.conteo_justificacion_original || ''}`}>
                    Corregido por {merma.conteo_editado_por}
                  </p>
                )}
                {merma.notes ? (
                  <p className="text-xs font-black text-[var(--color-muted)] line-clamp-2" title={merma.notes}>
                    {merma.notes}
                  </p>
                ) : (
                  <span className="text-xs font-black text-[var(--color-line-light)] italic truncate block">SIN DETALLE</span>
                )}
              </div>

              {/* MOTIVO */}
              <div className="col-span-2 min-w-0 pr-2 flex flex-col items-start gap-1">
                {/* Qué fue: un conteo (faltante o sobrante), una salida (dañado, vencido...) o un gasto de consumo */}
                <span className={`text-[11px] font-black uppercase px-2 py-0.5 border ${merma.sobrante ? 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]'}`}>
                  {merma.origen === 'CONTEO' ? `Conteo · ${merma.sobrante ? 'Sobrante' : 'Faltante'}` : Number(merma.quantity) === 0 ? 'Gasto' : 'Merma'}
                </span>
                <span className="text-xs font-black uppercase px-2 py-1 border-2 inline-block bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] truncate max-w-full rounded-none">
                  {merma.reason}
                </span>
              </div>

              {/* UNIDADES */}
              <div className="col-span-1 min-w-0 flex justify-center">
                <div className="inline-flex items-center justify-center px-2 py-1 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] font-black text-[var(--color-ink)] text-xs w-full max-w-[50px] truncate rounded-none">
                  {merma.sobrante ? '+' : ''}{formatearCantidad(merma.quantity, products.find(p => p.id === merma.product_id)?.unit)}
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
                {/* Un sobrante resta de lo perdido (en la base su total va en negativo) */}
                <p className={`font-black text-sm truncate ${merma.sobrante ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]'}`} title={`S/ ${merma.total_loss.toFixed(2)}`}>
                  {merma.sobrante ? `+S/${Math.abs(merma.total_loss).toFixed(2)}` : `S/${merma.total_loss.toFixed(2)}`}
                </p>
              </div>

              {/* ACCIONES */}
              <div className="col-span-1 min-w-0 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(merma); }}
                  className="p-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-surface)] hover:bg-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-surface)] transition-colors rounded-none bg-[var(--color-surface)] cursor-pointer"
                  title="Editar"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(merma); }}
                  className="p-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-surface)] hover:bg-[var(--color-danger)] hover:border-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:bg-[var(--color-danger)] focus:text-white transition-colors rounded-none bg-[var(--color-surface)] cursor-pointer"
                  title="Eliminar"
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