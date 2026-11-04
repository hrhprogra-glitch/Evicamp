import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect } from 'react';
import { Eye, ChevronLeft, ChevronRight, FilterX, Search, X } from 'lucide-react';
import type { ClienteFiadoAgrupado } from '../types';
import { clicConTeclado } from '../../../utils/clicConTeclado';

interface Props {
  clientes: ClienteFiadoAgrupado[];
  onView: (cliente: ClienteFiadoAgrupado) => void;
}

export const TablaFiadosAgrupados: React.FC<Props> = ({ clientes, onView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'ACTIVOS' | 'TODOS' | 'PAGADO'>('ACTIVOS');
  const [ordenPor, setOrdenPor] = useState<'MAYOR_DEUDA' | 'ALFABETICO'>('MAYOR_DEUDA');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // AUTO-FOCUS PARA EL BUSCADOR DE FIADOS (Adaptado del original)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (document.querySelector('[role="dialog"]')) return;

      // 🛡️ PRIORIDAD DEL SIDEBAR: Si el sidebar está abierto o el foco está en el menú lateral, no interferir
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.id === 'evicamp-sidebar' || activeEl.closest('#evicamp-sidebar') || sidebar?.contains(activeEl))) return;

      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key)) {
        const active = document.activeElement as HTMLElement;
        const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement;
        
        // Si no hay nada enfocado o está en el body, rescatar el foco
        if (!active || active === document.body) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            searchInput?.focus();
            return;
          }
        }

        if (active?.id === 'tab-clientes-creditos') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            searchInput?.focus();
            return;
          }
        }

        if (active === searchInput) {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('tab-clientes-creditos')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            const cursorStart = searchInput.selectionStart;
            const valLen = searchInput.value.length;
            if (cursorStart === valLen) {
              e.preventDefault();
              document.getElementById('filtro-estado-fiados')?.focus();
              return;
            }
          }
        }

        if (active?.closest('tr[role="button"]')) {
          e.preventDefault();
          const currentRow = active.closest('tr[role="button"]') as HTMLElement;
          const rows = Array.from(document.querySelectorAll('tr[role="button"]')) as HTMLElement[];
          const rowIndex = rows.indexOf(currentRow);
          
          if (e.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) {
              nextRow.focus();
              nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          } else if (e.key === 'ArrowUp') {
            const prevRow = rows[rowIndex - 1];
            if (prevRow) {
              prevRow.focus();
              prevRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              searchInput?.focus();
            }
          } else if (e.key === 'ArrowRight') {
            const btn = currentRow.querySelector('button[data-btn-detalle]') as HTMLElement;
            if (btn) btn.focus();
          } else if (e.key === 'ArrowLeft') {
            currentRow.focus();
          } else if (e.key === 'Enter' || e.key === ' ') {
            currentRow.click();
          } else if (e.key === 'PageDown') {
            setCurrentPage(p => p + 1);
          } else if (e.key === 'PageUp') {
            setCurrentPage(p => Math.max(1, p - 1));
          }
          return;
        }

        // Navegación en el botón de ver detalle dentro de la fila
        if (active?.hasAttribute('data-btn-detalle')) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentRow = active.closest('tr[role="button"]') as HTMLElement;
            if (currentRow) currentRow.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const rows = Array.from(document.querySelectorAll('tr[role="button"]')) as HTMLElement[];
            const currentRow = active.closest('tr[role="button"]') as HTMLElement;
            const nextRow = rows[rows.indexOf(currentRow) + 1];
            if (nextRow) {
              const btn = nextRow.querySelector('button[data-btn-detalle]') as HTMLElement;
              if (btn) btn.focus(); else nextRow.focus();
              nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const rows = Array.from(document.querySelectorAll('tr[role="button"]')) as HTMLElement[];
            const currentRow = active.closest('tr[role="button"]') as HTMLElement;
            const prevRow = rows[rows.indexOf(currentRow) - 1];
            if (prevRow) {
              const btn = prevRow.querySelector('button[data-btn-detalle]') as HTMLElement;
              if (btn) btn.focus(); else prevRow.focus();
              prevRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              searchInput?.focus();
            }
            return;
          }
        }
      }
      
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    const enforceFocus = () => {
      if (document.querySelector('[role="dialog"]')) return;
      // 🛡️ NO SECUESTRAR FOCO SI EL SIDEBAR ESTÁ ABIERTO
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;
      const active = document.activeElement;
      const activeTag = active?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'SELECT' || activeTag === 'A' || active?.closest('tr[role="button"]')) return;
      const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleWindowFocus = () => setTimeout(enforceFocus, 50);

    setTimeout(enforceFocus, 100);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('ACTIVOS');
    setOrdenPor('MAYOR_DEUDA');
    setCurrentPage(1);
    document.getElementById('buscador-global-fiados')?.focus();
  };

  const procesarFiados = () => {
    let filtrados = clientes.filter(c => {
      const matchSearch = coincideBusqueda([c.clienteNombre, c.clienteDni], searchTerm);

      let matchEstado = true;
      if (filtroEstado === 'ACTIVOS') matchEstado = c.totalPendiente > 0.05;
      else if (filtroEstado === 'PAGADO') matchEstado = c.totalPendiente <= 0.05;

      return matchSearch && matchEstado;
    });

    if (ordenPor === 'MAYOR_DEUDA') filtrados.sort((a, b) => b.totalPendiente - a.totalPendiente);
    else if (ordenPor === 'ALFABETICO') filtrados.sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre));

    return filtrados;
  };

  const clientesProcesados = procesarFiados();
  const totalPages = Math.max(1, Math.ceil(clientesProcesados.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = clientesProcesados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const hayFiltrosActivos = searchTerm.trim() !== '' || filtroEstado !== 'ACTIVOS' || ordenPor !== 'MAYOR_DEUDA';

  // Teclado (como Inventario): ↑ a la pestaña, ↓ a la paginación de arriba, ← → entre buscador y filtros
  const ir = (id: string) => { const el = document.getElementById(id); el?.focus(); el?.scrollIntoView({ block: 'nearest' }); };
  const filas = () => Array.from(document.querySelectorAll<HTMLElement>('#tabla-fiados-agrupados tbody tr[role="button"]'));
  const primeraFila = () => { const f0 = filas()[0]; if (f0) { f0.focus(); f0.scrollIntoView({ block: 'nearest' }); } };
  const ultimaFila = () => { const l = filas(); const u = l[l.length - 1]; if (u) { u.focus(); u.scrollIntoView({ block: 'nearest' }); } };
  const teclasFiltro = (izq: string | null, der: string | null) => (e: React.KeyboardEvent<HTMLElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget instanceof HTMLSelectElement) {
      e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } return;
    }
    const k = { ArrowUp: () => ir('tab-clientes-creditos'), ArrowDown: () => ir('btn-pag-ant-fiados-arriba'),
      ArrowLeft: () => izq && ir(izq), ArrowRight: () => der && ir(der) }[e.key as 'ArrowUp'];
    if (k) { e.preventDefault(); e.stopPropagation(); k(); }
  };
  const paginacion = (pos: 'arriba' | 'abajo') => {
    const ant = pos === 'arriba' ? 'btn-pag-ant-fiados-arriba' : 'btn-pag-ant-fiados';
    const sig = pos === 'arriba' ? 'btn-pag-sig-fiados-arriba' : 'btn-pag-sig-fiados';
    const mover = (n: number) => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p + n)));
    const teclas = (soy: 'ant' | 'sig') => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const acc: Record<string, () => void> = {
        ArrowLeft: () => (soy === 'sig' ? ir(ant) : pos === 'arriba' && ir('btn-limpiar-filtros-fiados')),
        ArrowRight: () => soy === 'ant' && ir(sig),
        ArrowUp: () => (pos === 'arriba' ? ir('buscador-global-fiados') : ultimaFila()),
        ArrowDown: () => pos === 'arriba' && primeraFila(),
      };
      if (acc[e.key]) { e.preventDefault(); e.stopPropagation(); acc[e.key](); }
    };
    return (
      <div className={`paginacion-sobria ${pos === 'arriba' ? 'border-b' : 'border-t'} shrink-0`}>
        <span className="paginacion-sobria__texto">Página {currentPage} de {totalPages}</span>
        <div className="flex gap-2">
          <button id={ant} type="button" title="Página anterior" aria-disabled={currentPage <= 1} className="paginacion-sobria__boton"
            onClick={() => currentPage > 1 && mover(-1)} onKeyDown={teclas('ant')}><ChevronLeft size={16} /></button>
          <button id={sig} type="button" title="Página siguiente" aria-disabled={currentPage >= totalPages} className="paginacion-sobria__boton"
            onClick={() => currentPage < totalPages && mover(1)} onKeyDown={teclas('sig')}><ChevronRight size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 font-mono lg:h-full lg:min-h-0">
      {/* BUSCADOR Y FILTROS (fuera del marco de la tabla, como Inventario) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input autoComplete="off" type="text" id="buscador-global-fiados" placeholder="BUSCAR CLIENTE..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchTerm) { e.preventDefault(); e.stopPropagation(); setSearchTerm(''); return; }
              if (e.key === 'ArrowRight' && e.currentTarget.selectionEnd !== e.currentTarget.value.length) return;
              if (e.key === 'ArrowLeft') return;
              teclasFiltro(null, 'filtro-estado-fiados')(e);
            }}
            style={{ paddingRight: searchTerm ? '8rem' : undefined }} />
          {searchTerm && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{clientesProcesados.length} MATCH</span>
              <button type="button" tabIndex={-1} title="Borrar búsqueda" className="buscador-sobrio__borrar"
                onClick={() => { setSearchTerm(''); ir('buscador-global-fiados'); }}><X size={14} /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
          <select id="filtro-estado-fiados" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)}
            onKeyDown={teclasFiltro('buscador-global-fiados', 'filtro-orden-fiados')} className="filtro-sobrio w-full sm:w-auto">
            <option value="ACTIVOS">DEUDORES</option>
            <option value="TODOS">TODOS</option>
            <option value="PAGADO">SIN DEUDA</option>
          </select>
          <select id="filtro-orden-fiados" value={ordenPor} onChange={(e) => setOrdenPor(e.target.value as any)}
            onKeyDown={teclasFiltro('filtro-estado-fiados', 'btn-limpiar-filtros-fiados')} className="filtro-sobrio w-full sm:w-auto">
            <option value="MAYOR_DEUDA">MAYOR DEUDA</option>
            <option value="ALFABETICO">ALFABÉTICO</option>
          </select>
          <button id="btn-limpiar-filtros-fiados" type="button" onClick={limpiarFiltros} onKeyDown={teclasFiltro('filtro-orden-fiados', 'btn-pag-ant-fiados-arriba')}
            className="limpiar-sobrio" title={hayFiltrosActivos ? 'Limpiar todos los filtros' : 'Sin filtros'}>
            <FilterX size={16} />
          </button>
        </div>
      </div>

      {/* TABLA con su paginación arriba y abajo (como Inventario) */}
      <div id="tabla-fiados-agrupados" className="tabla-marco flex flex-col lg:flex-1 lg:min-h-0">
      {paginacion('arriba')}
      <div className="lg:flex-1 overflow-auto custom-scrollbar relative lg:min-h-0">
        <table className="w-full text-left relative border-collapse">
          <thead className="tabla-cabecera sticky top-0 z-10">
            <tr className="uppercase text-[11px] font-black tracking-widest">
              <th className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6 border-r border-white/20 sm:w-[45%]">Cliente / Empresa</th>
              <th className="hidden sm:table-cell py-4 px-4 border-r border-white/20 text-right">Monto Prestado</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20 text-right">Deuda</th>
              <th className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6 text-center"><span className="hidden sm:inline">Detalle</span></th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold divide-y-2 divide-[var(--color-border)]">
            {currentItems.length > 0 ? (
              currentItems.map((cli, i) => (
                <tr key={i}
                  {...clicConTeclado(() => onView(cli))}
                  onClick={() => onView(cli)}
                  className="tabla-fila cursor-pointer"
                >
                  <td className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6">
                    <span className="font-black text-[var(--color-ink)] uppercase text-base">{cli.clienteNombre}</span>
                    {(cli.clienteDni || cli.clienteTelefono || cli.grupoNombre) && <span className="block text-xs text-[var(--color-muted)] mt-1 tracking-widest">{[cli.clienteDni && `DNI/RUC: ${cli.clienteDni}`, cli.clienteTelefono && `TEL.: ${cli.clienteTelefono}`, cli.grupoNombre && `GRUPO: ${cli.grupoNombre}`].filter(Boolean).join(" · ")}</span>}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-4 text-right font-black text-[var(--color-muted)]">
                    S/ {cli.totalOriginal.toFixed(2)}
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-right whitespace-nowrap">
                    <span className={`font-black text-base sm:text-lg ${cli.totalPendiente > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                      S/ {cli.totalPendiente.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6 text-center">
                    <button data-btn-detalle tabIndex={-1} onClick={(e) => { e.stopPropagation(); onView(cli); }} className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer inline-flex">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[var(--color-muted)] font-black uppercase tracking-widest text-sm bg-[var(--color-bg)]">
                  <span className="inline-block border-2 border-[var(--color-muted)] p-4 border-dashed">No se encontraron deudores</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginacion('abajo')}
      </div>
    </div>
  );
};
