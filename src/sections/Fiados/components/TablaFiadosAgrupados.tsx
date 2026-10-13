import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect } from 'react';
import { Eye, ChevronLeft, ChevronRight, FilterX } from 'lucide-react';
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
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-\\[999999\\]')) return;

      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key)) {
        const active = document.activeElement as HTMLElement;
        const searchInput = document.getElementById('buscador-global-fiados') as HTMLInputElement;
        
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
            const btn = currentRow.querySelector('button') as HTMLElement;
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
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0')) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'SELECT' || activeTag === 'A' || document.activeElement?.closest('tr[role="button"]')) return;
      document.getElementById('buscador-global-fiados')?.focus();
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

  return (
    <div className="bg-white border-2 border-[var(--color-border)] shadow-[8px_8px_0_0_var(--color-border)] flex flex-col font-mono rounded-none h-full min-h-0">
      
      <div className="p-6 border-b-2 border-[var(--color-border)] flex flex-wrap lg:flex-nowrap gap-4 shrink-0 bg-[var(--color-bg)]">
        <input autoComplete="off" type="text"
          id="buscador-global-fiados"
          placeholder="BUSCAR CLIENTE..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none"
        />

        <select 
          id="filtro-estado-fiados"
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-directorio-clientes')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              (document.querySelector('tr[role="button"]') as HTMLElement)?.focus();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('buscador-global-fiados')?.focus();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-orden-fiados')?.focus();
            }
          }}
          className="w-full lg:w-48 border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] bg-white cursor-pointer rounded-none"
        >
          <option value="ACTIVOS">DEUDORES</option>
          <option value="TODOS">TODOS</option>
          <option value="PAGADO">SIN DEUDA</option>
        </select>

        <select 
          id="filtro-orden-fiados"
          value={ordenPor} 
          onChange={(e) => setOrdenPor(e.target.value as any)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-directorio-clientes')?.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              (document.querySelector('tr[role="button"]') as HTMLElement)?.focus();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('filtro-estado-fiados')?.focus();
            } else if (e.key === 'ArrowRight') {
              const btn = document.getElementById('btn-limpiar-filtros-fiados');
              if (btn) {
                e.preventDefault();
                e.stopPropagation();
                btn.focus();
              }
            }
          }}
          className="w-full lg:w-48 border-2 border-[var(--color-border)] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] bg-white cursor-pointer rounded-none"
        >
          <option value="MAYOR_DEUDA">MAYOR DEUDA</option>
          <option value="ALFABETICO">ALFABÉTICO</option>
        </select>

        {hayFiltrosActivos && (
          <button 
            id="btn-limpiar-filtros-fiados"
            onClick={limpiarFiltros} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('filtro-orden-fiados')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                (document.querySelector('tr[role="button"]') as HTMLElement)?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('btn-directorio-clientes')?.focus();
              }
            }}
            className="p-3 bg-[var(--color-danger)] text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all flex items-center justify-center cursor-pointer border-2 border-[var(--color-danger)] rounded-none shrink-0" 
            title="Limpiar Filtros"
          >
            <FilterX size={20} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar relative min-h-0">
        <table className="w-full text-left relative border-collapse">
          <thead className="sticky top-0 bg-[var(--color-ink)] text-white border-b-2 border-[var(--color-ink)] z-10">
            <tr className="uppercase text-[11px] font-black tracking-widest">
              <th className="py-4 px-4 pl-6 border-r border-white/20 w-[45%]">Cliente / Empresa</th>
              <th className="py-4 px-4 border-r border-white/20 text-right">Monto Prestado</th>
              <th className="py-4 px-4 border-r border-white/20 text-right">Deuda Pendiente</th>
              <th className="py-4 px-4 pr-6 text-center">Detalle</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold divide-y-2 divide-[var(--color-border)]">
            {currentItems.length > 0 ? (
              currentItems.map((cli, i) => (
                <tr key={i}
                  {...clicConTeclado(() => onView(cli))}
                  onClick={() => onView(cli)}
                  className="hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus:bg-[var(--color-accent-bg)] cursor-pointer"
                >
                  <td className="py-4 px-4 pl-6">
                    <span className="font-black text-[var(--color-ink)] uppercase text-base">{cli.clienteNombre}</span>
                    {cli.clienteDni && <span className="block text-xs text-[var(--color-muted)] mt-1 tracking-widest">DOC: {cli.clienteDni}</span>}
                  </td>
                  <td className="py-4 px-4 text-right font-black text-[var(--color-muted)]">
                    S/ {cli.totalOriginal.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-black text-lg ${cli.totalPendiente > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                      S/ {cli.totalPendiente.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4 pr-6 text-center">
                    <button data-btn-detalle tabIndex={-1} onClick={(e) => { e.stopPropagation(); onView(cli); }} className="p-2 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] hover:bg-[var(--color-ink)] hover:text-white transition-all cursor-pointer inline-flex shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                      <Eye size={20} strokeWidth={3} />
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

      <div className="p-3 border-t-2 border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center shrink-0">
        <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, clientesProcesados.length)} de {clientesProcesados.length}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronLeft size={16} /></button>
          <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-white text-xs font-black text-[var(--color-ink)] rounded-none">Pág {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer rounded-none"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};
