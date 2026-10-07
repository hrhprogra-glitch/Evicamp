import React, { useState, useEffect } from 'react';
import { Eye, Edit, Banknote, RotateCcw, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Fiado } from '../types';
import { clicConTeclado } from '../../../utils/clicConTeclado';

import { usePermiso } from '../../../utils/permisos';

interface Props {
  fiados: Fiado[];
  onView: (fiado: Fiado) => void;
  onEdit: (fiado: Fiado) => void;
  onPay: (fiado: Fiado) => void;
  onRevertir: (fiado: Fiado) => void;
}

export const TablaFiados: React.FC<Props> = ({ fiados, onView, onEdit, onPay, onRevertir }) => {
  // Editar deudas requiere vender; abonar y anular pagos requiere cobrar deudas
  const puedeEditarDeuda = usePermiso('caja_realizar_ventas');
  const puedeCobrar = usePermiso('caja_cobrar_deudas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'ACTIVOS' | 'TODOS' | 'PENDIENTE' | 'PAGADO'>('ACTIVOS');
  const [ordenPor, setOrdenPor] = useState<'RECIENTES' | 'ANTIGUOS' | 'MAYOR_DEUDA' | 'MENOR_DEUDA' | 'PROXIMO_VENCER'>('RECIENTES');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  // 🔥 AUTO-FOCUS MAGNET PARA EL BUSCADOR DE FIADOS
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;

      // 🛡️ Ignorar si hay modales abiertos
      if (document.querySelector('[role="dialog"]')) return;

      // NAVEGACIÓN CON FLECHAS
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        const active = document.activeElement as HTMLElement;
        const searchInput = document.getElementById('buscador-global-fiados');
        
        if (active === searchInput) {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-directorio-clientes')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-directorio-clientes')?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            const cursorStart = (searchInput as HTMLInputElement).selectionStart;
            const valLen = (searchInput as HTMLInputElement).value.length;
            if (cursorStart === valLen) {
              e.preventDefault();
              document.getElementById('filtro-estado-fiados')?.focus();
              return;
            }
          }
        } else if (active?.id === 'filtro-estado-fiados') {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            document.getElementById('orden-por-fiados')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            searchInput?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-directorio-clientes')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
        } else if (active?.id === 'orden-por-fiados') {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            document.getElementById('btn-limpiar-filtros-fiados')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('filtro-estado-fiados')?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-directorio-clientes')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
        } else if (active?.id === 'btn-limpiar-filtros-fiados') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('orden-por-fiados')?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-directorio-clientes')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
        } else if (active?.id === 'btn-directorio-clientes') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            searchInput?.focus();
            return;
          }
        }

        if (active?.closest('tr[role="button"]')) {
          e.preventDefault();
          const currentRow = active.closest('tr[role="button"]') as HTMLElement;
          const rows = Array.from(document.querySelectorAll('tr[role="button"]')) as HTMLElement[];
          const rowIndex = rows.indexOf(currentRow);
          
          if (e.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) nextRow.focus();
          } else if (e.key === 'ArrowUp') {
            const prevRow = rows[rowIndex - 1];
            if (prevRow) {
              prevRow.focus();
            } else {
              searchInput?.focus();
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll('button:not([disabled])'))] as HTMLElement[];
            const focusIndex = focusables.indexOf(active);
            if (e.key === 'ArrowRight') {
              const next = focusables[focusIndex + 1];
              if (next) next.focus();
            } else if (e.key === 'ArrowLeft') {
              const prev = focusables[focusIndex - 1];
              if (prev) prev.focus();
            }
          }
          return;
        }
      }

      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'TR' || activeTag === 'TD' || activeTag === 'SELECT';

      // No robar si está en otro input/botón
      if (isInput) return;

      // Ignorar teclas de sistema
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;

      const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    };

    const enforceFocus = () => {
      if (document.querySelector('[role="dialog"]')) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'TR' || activeTag === 'TD' || activeTag === 'SELECT') return;

      const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleWindowFocus = () => setTimeout(enforceFocus, 50);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    enforceFocus();

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);
  const ITEMS_PER_PAGE = 50;

  // Resetear la página si los filtros cambian
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado, ordenPor, fiados.length]);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('ACTIVOS');
    setOrdenPor('RECIENTES');
    setCurrentPage(1);
  };

  // 1. Filtrado
  let fiadosProcesados = fiados.filter(f => {
    // PROTECCIÓN: Si el nombre del cliente viene nulo o vacío por un error, no crashea
    const nombreCliente = f.clienteNombre || '';
    const matchBusqueda = nombreCliente.toLowerCase().includes(searchTerm.toLowerCase());

    // Lógica de estado técnica simplificada
    let matchEstado = false;
    if (filtroEstado === 'TODOS') matchEstado = true;
    else if (filtroEstado === 'ACTIVOS') matchEstado = (f.estado === 'PENDIENTE');
    else matchEstado = (f.estado === filtroEstado);

    return matchBusqueda && matchEstado;
  });

  // 2. Ordenamiento
  fiadosProcesados.sort((a, b) => {
    if (ordenPor === 'RECIENTES') return new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime();
    if (ordenPor === 'ANTIGUOS') return new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime();
    if (ordenPor === 'MAYOR_DEUDA') return b.saldoPendiente - a.saldoPendiente;
    if (ordenPor === 'MENOR_DEUDA') return a.saldoPendiente - b.saldoPendiente;
    if (ordenPor === 'PROXIMO_VENCER') return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
    return 0;
  });

  // 3. Paginación
  const totalPages = Math.max(1, Math.ceil(fiadosProcesados.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentFiados = fiadosProcesados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const hayFiltrosActivos = searchTerm !== '' || filtroEstado !== 'TODOS' || ordenPor !== 'RECIENTES';

  const PaginacionControles = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="p-3 border-y-2 border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center shrink-0">
        <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, fiadosProcesados.length)} de {fiadosProcesados.length}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronLeft size={16} /></button>
          <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-white text-xs font-black text-[var(--color-ink)] rounded-none">Pág {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronRight size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-[var(--color-border)] shadow-[8px_8px_0_0_var(--color-border)] flex flex-col font-mono rounded-none">

      {/* BARRA DE FILTROS AUMENTADA */}
      <div className="p-6 border-b-2 border-[var(--color-border)] flex flex-wrap lg:flex-nowrap gap-4 shrink-0 bg-[var(--color-bg)]">
        <input autoComplete="off" type="text"
          id="buscador-global-fiados"
          placeholder="BUSCAR CLIENTE..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none"
        />

        <select id="filtro-estado-fiados" value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="w-full lg:w-48 border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] bg-white cursor-pointer rounded-none"
        >
          <option value="ACTIVOS">SOLO ACTIVOS</option>
          <option value="TODOS">HISTORIAL COMPLETO</option>
          <option value="PENDIENTE">PENDIENTES</option>
          <option value="PAGADO">PAGADOS</option>
        </select>

        <select id="orden-por-fiados" value={ordenPor}
          onChange={(e) => setOrdenPor(e.target.value as any)}
          className="w-full lg:w-64 border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] bg-white cursor-pointer rounded-none"
        >
          <option value="RECIENTES">MÁS RECIENTES</option>
          <option value="ANTIGUOS">MÁS ANTIGUOS</option>
          <option value="MAYOR_DEUDA">MAYOR DEUDA</option>
          <option value="MENOR_DEUDA">MENOR DEUDA</option>
          <option value="PROXIMO_VENCER">PRÓXIMOS A VENCER</option>
        </select>

        {hayFiltrosActivos && (
          <button
            id="btn-limpiar-filtros-fiados"
              onClick={limpiarFiltros}
              className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:bg-[var(--color-danger)] focus:text-white transition-colors cursor-pointer rounded-none"
              title="Limpiar Filtros"
          >
            <FilterX size={16} />
          </button>
        )}
      </div>

      <PaginacionControles />

      {/* TABLA SIN SCROLL VERTICAL INTERNO */}
      <div className="w-full overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-[var(--color-ink)] text-white sticky top-0 z-10">
            <tr>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Cliente</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Emisión</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Vence</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Estado</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase text-right border-b-2 border-[var(--color-ink)]">Deuda</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase text-right border-b-2 border-[var(--color-ink)]">Saldo</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase text-center border-b-2 border-[var(--color-ink)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentFiados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3 lg:p-4 text-center text-[var(--color-subtle)] font-bold text-xs uppercase bg-white">
                  No se encontraron deudas
                </td>
              </tr>
            ) : (
              currentFiados.map(fiado => (
                <tr
                  key={fiado.id}
                  {...clicConTeclado(() => onView(fiado))}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                  title="Click para ver detalle"
                >
                  <td className="p-4">
                    <p className="text-base font-black text-[var(--color-ink)] uppercase">{fiado.clienteNombre}</p>
                    {fiado.clienteTelefono && <p className="text-xs text-[var(--color-muted)] font-bold">Cel: {fiado.clienteTelefono}</p>}
                  </td>
                  <td className="p-4 text-sm font-bold text-[var(--color-muted)]">
                    {new Date(fiado.fechaEmision).toLocaleDateString('es-PE')}
                  </td>
                  <td className="p-4 text-sm font-bold text-[var(--color-ink)]">
                    {/* Inyección Técnica: Agregamos T12:00:00 para anular el desfase de zona horaria de UTC-5 */}
                    {new Date(fiado.fechaVencimiento.includes('T') ? fiado.fechaVencimiento : `${fiado.fechaVencimiento}T12:00:00`).toLocaleDateString('es-PE')}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 text-xs font-black tracking-widest border-2 rounded-none ${fiado.estado === 'PAGADO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]' :
                        'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]'
                      }`}>
                      {fiado.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right text-base font-black text-[var(--color-muted)]">S/ {fiado.montoOriginal.toFixed(2)}</td>
                  <td className="p-4 text-right text-lg font-black text-[var(--color-danger)]">S/ {fiado.saldoPendiente.toFixed(2)}</td>

                  {/* ACCIONES */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onView(fiado); }} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-info)] hover:text-[var(--color-info)] focus:outline-none focus:border-[var(--color-info)] focus:text-[var(--color-info)] focus:bg-[var(--color-info)]/10 transition-colors cursor-pointer rounded-none" title="Ver Detalles">
                        <Eye size={16} />
                      </button>

                      {fiado.estado !== 'PAGADO' && (
                        <>
                          {puedeEditarDeuda && (
                            <button onClick={(e) => { e.stopPropagation(); onEdit(fiado); }} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] focus:outline-none focus:border-[var(--color-warning)] focus:text-[var(--color-warning)] focus:bg-[var(--color-warning)]/10 transition-colors cursor-pointer rounded-none" title="Editar Deuda">
                              <Edit size={16} />
                            </button>
                          )}
                          {puedeCobrar && (
                            <button onClick={(e) => { e.stopPropagation(); onPay(fiado); }} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)] focus:text-[var(--color-accent)] focus:bg-[var(--color-accent)]/10 transition-colors cursor-pointer rounded-none" title="Registrar Abono">
                              <Banknote size={16} />
                            </button>
                          )}
                        </>
                      )}

                      {fiado.pagos && fiado.pagos.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRevertir(fiado); }}
                          className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] focus:outline-none focus:border-[var(--color-warning)] focus:text-[var(--color-warning)] focus:bg-[var(--color-warning)]/10 transition-colors cursor-pointer rounded-none"
                          title="Ver Historial de Pagos / Anular Pago"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginacionControles />
    </div>
  );
};















