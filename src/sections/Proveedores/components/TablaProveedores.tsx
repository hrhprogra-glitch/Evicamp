import React, { useState } from 'react';
import { Edit, Trash2, Truck, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Proveedor } from '../types';

interface Props {
  proveedores: Proveedor[];
  onEdit: (proveedor: Proveedor) => void;
  onDelete: (proveedor: Proveedor) => void;
}

export const TablaProveedores: React.FC<Props> = ({ proveedores, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const totalPages = Math.ceil(proveedores.length / ITEMS_PER_PAGE);
  const paginatedData = proveedores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPagination = (position: 'top' | 'bottom') => {
    if (totalPages <= 0) return null;
    return (
      <div className={`p-3 border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center shrink-0 ${position === 'top' ? 'border-b-2' : 'border-t-2'}`}>
        <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, proveedores.length)} de {proveedores.length}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronLeft size={16} /></button>
          <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-black text-[var(--color-ink)] rounded-none">Pág {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronRight size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-[var(--color-border)] flex-1 flex flex-col bg-white relative w-full">
      
      {renderPagination('top')}

      {/* En pantallas angostas la tabla conserva su ancho mínimo y se desliza horizontalmente */}
      <div className="flex-1 min-h-0 flex flex-col overflow-x-auto custom-scrollbar">
      <div className="flex-1 min-h-0 flex flex-col min-w-[760px]">
      {/* CABECERA */}
      <div className="grid grid-cols-12 gap-3 bg-[var(--color-ink)] text-white p-4 text-[12px] md:text-xs font-black uppercase tracking-[0.1em] shrink-0">
        <div className="col-span-2 min-w-0 truncate">RUC</div>
        <div className="col-span-4 min-w-0 truncate">Razón Social / Comercial</div>
        <div className="col-span-3 min-w-0 truncate">Contacto</div>
        <div className="col-span-2 min-w-0 text-center truncate">Estado</div>
        <div className="col-span-1 min-w-0 text-center truncate">Acción</div>
      </div>

      {/* CUERPO */}
      <div className="w-full flex-1 overflow-y-auto custom-scrollbar">
        {paginatedData.length === 0 ? (
          <div className="p-6 sm:p-12 text-center text-[var(--color-subtle)] font-bold uppercase text-[12px] tracking-widest flex flex-col items-center justify-center h-full gap-2">
            <Truck size={32} className="text-[var(--color-border)] mb-2" />
            <p>No se encontraron proveedores.</p>
          </div>
        ) : (
          paginatedData.map((prov) => (
            <div 
              key={prov.id} 
              data-row-prov="true"
              role="button"
              tabIndex={0}
              onClick={() => onEdit(prov)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                  const idx = rows.indexOf(e.currentTarget);
                  if (idx !== -1 && idx < rows.length - 1) {
                    rows[idx + 1].focus();
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                  const idx = rows.indexOf(e.currentTarget);
                  if (idx > 0) {
                    rows[idx - 1].focus();
                  } else {
                    document.getElementById('btn-nuevo-proveedor')?.focus();
                  }
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  (e.currentTarget.querySelector('.btn-editar-prov') as HTMLElement)?.focus();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  onEdit(prov);
                }
              }}
              className="grid grid-cols-12 gap-3 items-center p-4 border-b border-[var(--color-bg-2)] hover:bg-[var(--color-bg)] focus:bg-[#E2E8F0] focus:ring-2 focus:ring-[var(--color-ink)] transition-colors group text-sm cursor-pointer outline-none"
            >
              
              {/* RUC */}
              <div className="col-span-2 min-w-0">
                <span className="text-[var(--color-ink)] font-black truncate bg-[var(--color-bg-2)] px-2 py-1 border border-[var(--color-border)]">{prov.ruc}</span>
              </div>

              {/* EMPRESA */}
              <div className="col-span-4 min-w-0 flex flex-col gap-1 pr-2">
                <p className="font-black uppercase text-[var(--color-ink)] truncate" title={prov.razon_social}>
                  {prov.razon_social}
                </p>
                {prov.nombre_comercial && (
                  <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase truncate" title={prov.nombre_comercial}>
                    Comercial: {prov.nombre_comercial}
                  </p>
                )}
                {prov.direccion && (
                  <p className="text-[12px] font-bold text-[var(--color-subtle)] uppercase truncate flex items-center gap-1 mt-1" title={prov.direccion}>
                    <MapPin size={10} /> {prov.direccion}
                  </p>
                )}
              </div>

              {/* CONTACTO */}
              <div className="col-span-3 min-w-0 flex flex-col gap-1 pr-2">
                {prov.telefono ? (
                  <span className="text-[12px] font-bold text-[var(--color-info)] flex items-center gap-1 truncate">
                    <Phone size={12} /> {prov.telefono}
                  </span>
                ) : <span className="text-[12px] text-[var(--color-line-light)] italic">Sin teléfono</span>}
                
                {prov.email ? (
                  <span className="text-[12px] font-bold text-[var(--color-muted)] flex items-center gap-1 truncate">
                    <Mail size={12} /> {prov.email}
                  </span>
                ) : null}
              </div>

              {/* ESTADO */}
              <div className="col-span-2 min-w-0 flex justify-center">
                {prov.estado === 'ACTIVO' ? (
                  <span className="text-[12px] font-black uppercase px-2 py-0.5 border inline-block bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]">
                    ACTIVO
                  </span>
                ) : (
                  <span className="text-[12px] font-black uppercase px-2 py-0.5 border inline-block bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]">
                    INACTIVO
                  </span>
                )}
              </div>

              {/* ACCIONES */}
              <div className="col-span-1 min-w-0 flex items-center justify-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(prov);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      (e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      (e.currentTarget.parentElement?.querySelector('.btn-eliminar-prov') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                      const currentRow = e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement;
                      const idx = rows.indexOf(currentRow);
                      if (idx !== -1 && idx < rows.length - 1) {
                        rows[idx + 1].focus();
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                      const currentRow = e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement;
                      const idx = rows.indexOf(currentRow);
                      if (idx > 0) {
                        rows[idx - 1].focus();
                      } else {
                        document.getElementById('btn-nuevo-proveedor')?.focus();
                      }
                    } else if (e.key === 'Enter') {
                      e.stopPropagation();
                      onEdit(prov);
                    }
                  }}
                  className="btn-editar-prov text-[var(--color-subtle)] hover:text-[var(--color-info)] focus:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:bg-white p-1 transition-colors cursor-pointer rounded-none"
                  title="Editar Proveedor"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(prov);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      (e.currentTarget.parentElement?.querySelector('.btn-editar-prov') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                      const currentRow = e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement;
                      const idx = rows.indexOf(currentRow);
                      if (idx !== -1 && idx < rows.length - 1) {
                        rows[idx + 1].focus();
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                      const currentRow = e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement;
                      const idx = rows.indexOf(currentRow);
                      if (idx > 0) {
                        rows[idx - 1].focus();
                      } else {
                        document.getElementById('btn-nuevo-proveedor')?.focus();
                      }
                    } else if (e.key === 'Enter') {
                      e.stopPropagation();
                      onDelete(prov);
                    }
                  }}
                  className="btn-eliminar-prov text-[var(--color-subtle)] hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:bg-white p-1 transition-colors cursor-pointer rounded-none"
                  title="Eliminar Proveedor"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))
        )}
      </div>
      </div>
      </div>

      {/* PAGINACIÓN */}
      {renderPagination('bottom')}
    </div>
  );
};

