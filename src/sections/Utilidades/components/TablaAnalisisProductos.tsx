// src/sections/Utilidades/components/TablaAnalisisProductos.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AnalisisProducto, StatsFiltro } from '../types';
import { ModalDetalleProducto } from './ModalDetalleProducto';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { formatearMonto } from '../../../utils/formato';

interface Props {
  datos: AnalisisProducto[];
  fechaInicio: string;
  fechaFin: string;
  setFechaInicio: (val: string) => void;
  setFechaFin: (val: string) => void;
  limpiarFechas: () => void;
  onStatsFiltradasChange: (stats: StatsFiltro) => void;
}

export const TablaAnalisisProductos: React.FC<Props> = ({ datos, fechaInicio, fechaFin, setFechaInicio, setFechaFin, limpiarFechas, onStatsFiltradasChange }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [localInicio, setLocalInicio] = useState(fechaInicio);
  const [localFin, setLocalFin] = useState(fechaFin);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastDateChangeRef = useRef<number>(0);
  const ultimoProductoIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalInicio(fechaInicio);
    setLocalFin(fechaFin);
  }, [fechaInicio, fechaFin]);

  const handleBuscarFecha = () => {
    setFechaInicio(localInicio);
    setFechaFin(localFin);
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState<AnalisisProducto | null>(null);
  const categoriasUnicas = Array.from(new Set(datos.map(d => d.categoria))).sort();

  // ⚙️ MOTOR DE BÚSQUEDA OMNIDIRECCIONAL (EVICAMP V3)
  const normalizarTexto = (texto: string) => {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const datosFiltrados = useMemo(() => datos.filter(prod => {
    const indiceOmni = normalizarTexto(`${prod.nombre || ''} ${prod.categoria || ''} ${prod.estado || ''} ${prod.tipoControl || ''}`);
    const busquedaNormalizada = normalizarTexto(busqueda || '');

    const terminosBusqueda = busquedaNormalizada.split(/\s+/).filter(Boolean);

    const coincideBusqueda = terminosBusqueda.length === 0 || terminosBusqueda.every(termino =>
      indiceOmni.includes(termino)
    );

    const coincideCat = filtroCat === 'TODAS' || prod.categoria === filtroCat;
    const coincideEstado = filtroEstado === 'TODOS' || prod.estado === filtroEstado;

    return coincideBusqueda && coincideCat && coincideEstado;
  }), [datos, busqueda, filtroCat, filtroEstado]);

  const hayFiltrosActivos = busqueda.trim() !== '' || filtroCat !== 'TODAS' || filtroEstado !== 'TODOS';

  const statsFiltradas = useMemo((): StatsFiltro => ({
    ingresos: datosFiltrados.reduce((acc, p) => acc + p.ingresosTotales, 0),
    costos: datosFiltrados.reduce((acc, p) => acc + p.costoTotalVentas, 0),
    mermas: datosFiltrados.reduce((acc, p) => acc + p.perdidaMerma, 0),
    hayFiltros: hayFiltrosActivos,
  }), [datosFiltrados, hayFiltrosActivos]);

  useEffect(() => {
    onStatsFiltradasChange(statsFiltradas);
  }, [statsFiltradas, onStatsFiltradasChange]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCat, filtroEstado]);

  const itemsPorPagina = 50;
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina) || 1;
  const startIndex = (paginaActual - 1) * itemsPorPagina;
  const datosPaginados = datosFiltrados.slice(startIndex, startIndex + itemsPorPagina);

  const focusPrimerRegistro = () => {
    const rows = Array.from(document.querySelectorAll('#tabla-analisis-productos tr[data-row="true"]')) as HTMLElement[];
    if (rows[0]) {
      rows[0].focus();
      rows[0].scrollIntoView({ block: 'nearest' });
    }
  };

  const abrirModalProducto = (prod: AnalisisProducto) => {
    ultimoProductoIdRef.current = prod.id;
    setProductoSeleccionado(prod);
  };

  const cerrarModalProducto = () => {
    setProductoSeleccionado(null);
    setTimeout(() => {
      if (ultimoProductoIdRef.current) {
        const row = document.querySelector(`#tabla-analisis-productos tr[data-prod-id="${ultimoProductoIdRef.current}"]`) as HTMLElement;
        if (row) {
          row.focus();
          row.scrollIntoView({ block: 'nearest' });
        }
      }
    }, 50);
  };

  const limpiarFiltrosTabla = () => {
    setBusqueda('');
    setFiltroCat('TODAS');
    setFiltroEstado('TODOS');
    limpiarFechas();
  };

  // 🧲 Auto-Focus Magnet para Utilidades (Foco inicial en buscador)
  useEffect(() => {
    const enforceFocus = () => {
      if (
        productoSeleccionado ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) return;

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#evicamp-sidebar')) {
        const tag = active.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
        if (active.closest('tr[data-row="true"]')) return;
        if (active.getAttribute('role') === 'button') return;
      }

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    const handleWindowFocus = () => setTimeout(enforceFocus, 50);
    const handleGlobalClick = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    const timer = setTimeout(enforceFocus, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [productoSeleccionado]);

  // ⌨️ Navegación de Grilla con Teclado (Patrón Selector Evicamp)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        productoSeleccionado ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) {
        return;
      }

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;

      // Si el foco está en un input/select nativo, ellos manejan sus flechas
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      // Si el foco está en un botón superior o de paginación, cada botón maneja sus flechas
      if (active && active.tagName === 'BUTTON' && !active.closest('tr[data-row="true"]')) return;

      const rowSelector = '#tabla-analisis-productos tr[data-row="true"]';
      const currentRow = active?.closest(rowSelector) as HTMLElement | null;

      const getRows = () => {
        return Array.from(document.querySelectorAll(rowSelector)) as HTMLElement[];
      };

      if (currentRow) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          const rows = getRows();
          const rowIndex = rows.indexOf(currentRow);

          if (e.key === 'ArrowDown') {
            if (rowIndex < rows.length - 1) {
              const nextRow = rows[rowIndex + 1];
              if (nextRow) {
                nextRow.focus();
                nextRow.scrollIntoView({ block: 'nearest' });
              }
            } else {
              const btnBottom = document.getElementById('btn-pag-bottom-prev-utilidades');
              if (btnBottom && !btnBottom.hasAttribute('disabled')) {
                btnBottom.focus();
              } else {
                document.getElementById('btn-pag-bottom-next-utilidades')?.focus();
              }
            }
          } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) {
              const prevRow = rows[rowIndex - 1];
              if (prevRow) {
                prevRow.focus();
                prevRow.scrollIntoView({ block: 'nearest' });
              }
            } else {
              // Fila 0: Subir a paginación superior antes de ir al buscador o filtros
              const btnPrev = document.getElementById('btn-pag-prev-utilidades');
              const btnNext = document.getElementById('btn-pag-next-utilidades');
              if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
                btnPrev.focus();
              } else if (btnNext) {
                btnNext.focus();
              } else if (btnPrev) {
                btnPrev.focus();
              } else {
                const searchInput = searchInputRef.current;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          const searchInput = searchInputRef.current;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      } else {
        // Rescate de foco si el usuario está en un contenedor vacío
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusPrimerRegistro();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [productoSeleccionado, datosPaginados]);

  const focusPaginacionUtilidades = () => {
    if (datosFiltrados.length === 0) return;
    const btnPrev = document.getElementById('btn-pag-prev-utilidades');
    const btnNext = document.getElementById('btn-pag-next-utilidades');
    if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
      btnPrev.focus();
    } else if (btnNext && btnNext.getAttribute('aria-disabled') !== 'true') {
      btnNext.focus();
    } else if (btnPrev) {
      btnPrev.focus();
    } else {
      focusPrimerRegistro();
    }
  };

  const paginacion = (pos: 'top' | 'bottom') => {
    const isTop = pos === 'top';
    const idPrev = isTop ? 'btn-pag-prev-utilidades' : 'btn-pag-bottom-prev-utilidades';
    const idNext = isTop ? 'btn-pag-next-utilidades' : 'btn-pag-bottom-next-utilidades';

    const teclas = (soy: 'ant' | 'sig') => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const acc: Record<string, () => void> = {
        ArrowLeft: () => {
          if (soy === 'sig') document.getElementById(idPrev)?.focus();
          else if (isTop) document.getElementById('btn-limpiar-filtros-utilidades')?.focus();
        },
        ArrowRight: () => {
          if (soy === 'ant') document.getElementById(idNext)?.focus();
        },
        ArrowUp: () => {
          if (isTop) {
            searchInputRef.current?.focus();
          } else {
            const rows = Array.from(document.querySelectorAll('#tabla-analisis-productos tr[data-row="true"]')) as HTMLElement[];
            if (rows.length > 0) rows[rows.length - 1].focus();
          }
        },
        ArrowDown: () => {
          if (isTop) {
            focusPrimerRegistro();
          }
        },
        Enter: () => {
          if (soy === 'ant' && paginaActual > 1) setPaginaActual(p => Math.max(1, p - 1));
          if (soy === 'sig' && paginaActual < totalPaginas) setPaginaActual(p => Math.min(totalPaginas, p + 1));
        },
      };
      acc[' '] = acc.Enter;
      if (acc[e.key]) { e.preventDefault(); e.stopPropagation(); acc[e.key](); }
    };

    return (
      <div className={`paginacion-sobria ${isTop ? 'border-b' : 'border-t'} shrink-0`}>
        <span className="paginacion-sobria__texto">Página {paginaActual} de {totalPaginas}</span>
        <div className="flex gap-2">
          <button
            id={idPrev}
            type="button"
            title="Página anterior"
            aria-disabled={paginaActual <= 1}
            className="paginacion-sobria__boton"
            onClick={() => { if (paginaActual > 1) setPaginaActual(p => Math.max(1, p - 1)); }}
            onKeyDown={teclas('ant')}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            id={idNext}
            type="button"
            title="Página siguiente"
            aria-disabled={paginaActual >= totalPaginas}
            className="paginacion-sobria__boton"
            onClick={() => { if (paginaActual < totalPaginas) setPaginaActual(p => Math.min(totalPaginas, p + 1)); }}
            onKeyDown={teclas('sig')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 font-mono">

      {/* BUSCADOR Y FILTROS FUERA DEL MARCO DE LA TABLA (COMO INVENTARIO, CONTEOS Y FINANZAS) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input 
            id="buscador-global-utilidades"
            ref={searchInputRef}
            autoComplete="off" 
            type="text" 
            placeholder="BUSCAR PRODUCTO POR NOMBRE, CATEGORÍA O ROTACIÓN..."
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setBusqueda('');
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
                return;
              }
              if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                e.preventDefault();
                e.stopPropagation();
                if (busqueda) {
                  document.getElementById('btn-borrar-buscador-utilidades')?.focus();
                } else {
                  document.getElementById('filtro-categoria-utilidades')?.focus();
                }
              }
            }}
            style={{ paddingRight: busqueda ? '8rem' : undefined }}
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{datosFiltrados.length} MATCH</span>
              <button 
                id="btn-borrar-buscador-utilidades"
                type="button" 
                title="Borrar búsqueda" 
                className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); searchInputRef.current?.focus(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setBusqueda('');
                    searchInputRef.current?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    const inp = searchInputRef.current;
                    if (inp) {
                      inp.focus();
                      inp.setSelectionRange(inp.value.length, inp.value.length);
                    }
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('filtro-categoria-utilidades')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusPaginacionUtilidades();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-tops-utilidades')?.focus();
                  }
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
          <select
            id="filtro-categoria-utilidades"
            value={filtroCat} 
            onChange={(e) => setFiltroCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (busqueda) {
                  document.getElementById('btn-borrar-buscador-utilidades')?.focus();
                } else {
                  searchInputRef.current?.focus();
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-rotacion-utilidades')?.focus();
              }
            }}
            className="filtro-sobrio w-full sm:w-auto"
          >
            <option value="TODAS">CATEGORÍA: TODAS</option>
            {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            id="filtro-rotacion-utilidades"
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-categoria-utilidades')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-fecha-desde-utilidades')?.focus();
              }
            }}
            className="filtro-sobrio w-full sm:w-auto"
          >
            <option value="TODOS">ROTACIÓN: TODAS</option>
            <option value="BUENO">VENTA: BUENO</option>
            <option value="REGULAR">VENTA: REGULAR</option>
            <option value="BAJO">VENTA: BAJO</option>
            <option value="SIN VENTAS">SIN VENTAS</option>
          </select>

          <input 
            id="filtro-fecha-desde-utilidades"
            autoComplete="off" 
            type="date" 
            title="Fecha desde"
            value={localInicio} 
            onChange={(e) => {
              lastDateChangeRef.current = Date.now();
              setLocalInicio(e.target.value);
              setFechaInicio(e.target.value);
              setTimeout(() => (document.getElementById('filtro-fecha-desde-utilidades') as HTMLInputElement | null)?.focus(), 50);
            }}
            onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {} }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (Date.now() - lastDateChangeRef.current < 500) { e.currentTarget.focus(); return; }
                try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-rotacion-utilidades')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-fecha-hasta-utilidades')?.focus();
              }
            }}
            className="filtro-sobrio w-full sm:w-auto"
          />

          <input 
            id="filtro-fecha-hasta-utilidades"
            autoComplete="off" 
            type="date" 
            title="Fecha hasta"
            value={localFin} 
            onChange={(e) => {
              lastDateChangeRef.current = Date.now();
              setLocalFin(e.target.value);
              setFechaFin(e.target.value);
              setTimeout(() => (document.getElementById('filtro-fecha-hasta-utilidades') as HTMLInputElement | null)?.focus(), 50);
            }}
            onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {} }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (Date.now() - lastDateChangeRef.current < 500) { e.currentTarget.focus(); return; }
                try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-fecha-desde-utilidades')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-limpiar-filtros-utilidades')?.focus();
              }
            }}
            className="filtro-sobrio w-full sm:w-auto"
          />

          {/* Botón oculto para compatibilidad con llamadas existentes a btn-buscar-fechas-utilidades */}
          <button 
            id="btn-buscar-fechas-utilidades"
            type="button"
            onClick={handleBuscarFecha} 
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

          <button
            id="btn-limpiar-filtros-utilidades"
            type="button"
            onClick={limpiarFiltrosTabla}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tops-utilidades')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-fecha-hasta-utilidades')?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                focusPaginacionUtilidades();
              }
            }}
            className="limpiar-sobrio"
            title={hayFiltrosActivos ? "Limpiar todos los filtros" : "Sin filtros"}
          >
            <FilterX size={16} />
          </button>
        </div>
      </div>

      {/* MARCO DE LA TABLA */}
      <div className="tabla-marco flex flex-col">
        {/* PAGINACIÓN SUPERIOR: sólo se muestra si hay registros */}
        {datosFiltrados.length > 0 && paginacion('top')}

        {/* TABLA PRINCIPAL O ESTADO VACÍO */}
        {datosFiltrados.length === 0 ? (
          <div className="vacio-sobrio">
            <Search size={32} />
            No se encontraron productos con esos parámetros.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table id="tabla-analisis-productos" className="w-full text-left border-collapse md:min-w-[1000px]">
              <thead className="tabla-cabecera sticky top-0 z-10">
                <tr>
                  <th className="p-3 md:p-4">Producto / Ref</th>
                  <th className="hidden md:table-cell p-4 text-center">Stock Actual</th>
                  <th className="p-2 md:p-4 text-center">U. Vendidas</th>
                  <th className="hidden md:table-cell p-4 text-right">Ingreso Cobrado</th>
                  <th className="hidden md:table-cell p-4 text-right">Costo Ventas</th>
                  <th className="hidden md:table-cell p-4 text-right">Mermas</th>
                  <th className="p-2 md:p-4 text-right">Utilidad</th>
                  <th className="p-2 md:p-4 text-center md:w-24">Margen</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {datosPaginados.map((prod) => (
                  <tr
                    key={prod.id}
                    data-row="true"
                    data-prod-id={prod.id}
                    {...clicConTeclado(() => abrirModalProducto(prod))}
                    className="tabla-fila cursor-pointer group"
                    title="Ver ventas de este producto (Enter o Clic)"
                  >
                    <td className="p-2 md:p-3">
                      <p className="text-xs font-black text-[var(--color-ink)] uppercase mb-1">{prod.nombre}</p>
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        <span className="text-[12px] font-black text-[var(--color-muted)] border border-[var(--color-border)] bg-[var(--color-bg-2)] px-2 py-0.5 rounded-none uppercase tracking-widest">{prod.categoria}</span>
                        <span className={`text-[12px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest border ${
                          prod.estado === 'BUENO' ? 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' :
                          prod.estado === 'REGULAR' ? 'border-[var(--color-border)] text-[var(--color-ink)]' :
                          prod.estado === 'BAJO' ? 'border-[var(--color-subtle)] text-[var(--color-subtle)]' :
                          'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-bg-2)]'
                        }`}>
                          {prod.estado}
                        </span>
                      </div>
                    </td>

                    <td className="hidden md:table-cell p-3 text-center">
                      <span className="font-mono text-xs font-black text-[var(--color-ink)]">
                        {prod.stockActual} {prod.tipoControl}
                      </span>
                    </td>

                    <td className="p-2 md:p-3 text-center">
                      <span className="font-mono text-xs font-black text-[var(--color-ink)]">
                        {prod.unidadesVendidas} {prod.tipoControl}
                      </span>
                    </td>

                    <td className="hidden md:table-cell p-3 text-right">
                      <span className="font-mono text-xs font-black text-[var(--color-ink)]">
                        S/ {formatearMonto(prod.ingresosTotales)}
                      </span>
                    </td>

                    <td className="hidden md:table-cell p-3 text-right">
                      <span className="font-mono text-xs font-black text-[var(--color-ink)]">
                        S/ {formatearMonto(prod.costoTotalVentas)}
                      </span>
                    </td>

                    <td className="hidden md:table-cell p-3 text-right">
                      <span className="font-mono text-xs font-black text-[var(--color-danger)]">
                        S/ {formatearMonto(prod.perdidaMerma)}
                      </span>
                    </td>

                    <td className="p-2 md:p-3 text-right">
                      <span className={`font-mono text-xs font-black ${prod.utilidadReal >= 0 ? 'text-[var(--color-accent-shadow)]' : 'text-[var(--color-danger)]'}`}>
                        S/ {formatearMonto(prod.utilidadReal)}
                      </span>
                    </td>

                    <td className="p-2 md:p-3 text-center">
                      <span className={`inline-block font-mono text-xs font-black px-2 py-0.5 border rounded-none ${
                        prod.margen >= 30 ? 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' :
                        prod.margen > 0 ? 'border-[var(--color-border)] text-[var(--color-ink)]' :
                        'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)]'
                      }`}>
                        {prod.margen}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN INFERIOR: sólo se muestra si hay registros */}
        {datosFiltrados.length > 0 && paginacion('bottom')}
      </div>

      {productoSeleccionado && (
        <ModalDetalleProducto
          producto={productoSeleccionado}
          onClose={cerrarModalProducto}
        />
      )}
    </div>
  );
};
