import React, { useState } from 'react';
import { Edit, Trash2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Proveedor } from '../types';
import { CajaLista, FilaLista, LineaDato, Etiqueta, claseBotonIcono } from '../../../components/ListaVentana';

interface Props {
  proveedores: Proveedor[];
  onEdit: (proveedor: Proveedor) => void;
  onDelete: (proveedor: Proveedor) => void;
}

// Flechas ↑ ↓ desde Editar/Eliminar: el mismo botón en la otra fila (grilla), no la fila entera
const enfocarMismoBoton = (fila: HTMLElement, boton: HTMLElement) => {
  const clase = boton.classList.contains('btn-eliminar-prov') ? '.btn-eliminar-prov' : '.btn-editar-prov';
  ((fila.querySelector(clase) as HTMLElement | null) || fila).focus();
};

// Lista con el estilo del Directorio de clientes (src/components/ListaVentana.tsx)
export const TablaProveedores: React.FC<Props> = ({ proveedores, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const totalPages = Math.ceil(proveedores.length / ITEMS_PER_PAGE);
  const paginatedData = proveedores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ↑ ↓ desde Editar/Eliminar: el mismo botón en la fila de arriba o de abajo
  const moverBoton = (e: React.KeyboardEvent<HTMLButtonElement>, haciaAbajo: boolean) => {
    e.preventDefault();
    const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
    const idx = rows.indexOf(e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement);
    if (haciaAbajo) {
      if (idx !== -1 && idx < rows.length - 1) enfocarMismoBoton(rows[idx + 1], e.currentTarget);
    } else if (idx > 0) {
      enfocarMismoBoton(rows[idx - 1], e.currentTarget);
    } else {
      document.getElementById('btn-nuevo-proveedor')?.focus();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 w-full">
      <CajaLista
        vacia={paginatedData.length === 0}
        mensaje={<span className="flex flex-col items-center gap-2"><Truck size={32} className="text-[var(--color-border)]" />No se encontraron proveedores</span>}
      >
        {paginatedData.map((prov) => {
          const linea1 = `RUC: ${prov.ruc || '---'}${prov.nombre_comercial ? ` | Comercial: ${prov.nombre_comercial}` : ''}`;
          const linea2 = `Cel: ${prov.telefono || '---'}${prov.email ? ` | ${prov.email}` : ''}`;
          return (
            <FilaLista
              key={prov.id}
              data-row-prov="true"
              data-prov-id={String(prov.id)}
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => onEdit(prov)}
              onKeyDown={(e) => {
                // Solo cuando la FILA está seleccionada: las teclas de Editar/Eliminar suben hasta aquí y antes
                // la fila devolvía el foco a Editar (→ nunca llegaba a Eliminar) y Enter en Eliminar abría Editar
                if (e.target !== e.currentTarget) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                  const idx = rows.indexOf(e.currentTarget);
                  if (idx !== -1 && idx < rows.length - 1) rows[idx + 1].focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const rows = Array.from(document.querySelectorAll('[data-row-prov="true"]')) as HTMLElement[];
                  const idx = rows.indexOf(e.currentTarget);
                  if (idx > 0) rows[idx - 1].focus();
                  else document.getElementById('btn-nuevo-proveedor')?.focus();
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  (e.currentTarget.querySelector('.btn-editar-prov') as HTMLElement)?.focus();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  onEdit(prov);
                }
              }}
              icono={<Truck size={32} />}
              titulo={<span title={prov.razon_social}>{prov.razon_social}</span>}
              subtitulo={<>
                <LineaDato titulo={linea1}>{linea1}</LineaDato>
                <LineaDato titulo={linea2}>{linea2}</LineaDato>
                {prov.direccion && <LineaDato titulo={prov.direccion}>Dir: {prov.direccion}</LineaDato>}
              </>}
              centro={prov.estado === 'ACTIVO' ? <Etiqueta tono="verde">Activo</Etiqueta> : <Etiqueta tono="rojo">Inactivo</Etiqueta>}
              derecha={<>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(prov); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      (e.currentTarget.closest('[data-row-prov="true"]') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      (e.currentTarget.parentElement?.querySelector('.btn-eliminar-prov') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      moverBoton(e, e.key === 'ArrowDown');
                    } else if (e.key === 'Enter') {
                      e.preventDefault(); // sin esto también se dispara el clic: la acción corría 2 veces
                      e.stopPropagation();
                      onEdit(prov);
                    }
                  }}
                  className={`btn-editar-prov ${claseBotonIcono('editar')}`}
                  title="Editar Proveedor"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(prov); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      (e.currentTarget.parentElement?.querySelector('.btn-editar-prov') as HTMLElement)?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      moverBoton(e, e.key === 'ArrowDown');
                    } else if (e.key === 'Enter') {
                      e.preventDefault(); // sin esto también se dispara el clic: la acción corría 2 veces
                      e.stopPropagation();
                      onDelete(prov);
                    }
                  }}
                  className={`btn-eliminar-prov ${claseBotonIcono('eliminar')}`}
                  title="Eliminar Proveedor"
                >
                  <Trash2 size={16} />
                </button>
              </>}
            />
          );
        })}
      </CajaLista>

      {/* PAGINACIÓN (solo si hay más de una página), como en el Directorio de clientes */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center py-2 shrink-0 border-y border-[var(--color-border)]">
          <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, proveedores.length)} de {proveedores.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronLeft size={16} /></button>
            <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-white text-xs font-black text-[var(--color-ink)] rounded-none">Pág {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
};
