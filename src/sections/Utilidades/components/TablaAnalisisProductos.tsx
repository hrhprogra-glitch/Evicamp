// src/sections/Utilidades/components/TablaAnalisisProductos.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, TrendingDown, TrendingUp, RotateCcw, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { AnalisisProducto, StatsFiltro } from '../types';
import { ModalDetalleProducto } from './ModalDetalleProducto';
import { clicConTeclado } from '../../../utils/clicConTeclado';

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
    // 1. Construimos un índice global concatenando todos los datos útiles del producto
    const indiceOmni = normalizarTexto(`${prod.nombre || ''} ${prod.categoria || ''} ${prod.estado || ''} ${prod.tipoControl || ''}`);
    const busquedaNormalizada = normalizarTexto(busqueda || '');

    // 2. Fragmentamos la búsqueda
    const terminosBusqueda = busquedaNormalizada.split(/\s+/).filter(Boolean);

    // 3. Verificamos que CADA palabra tipeada exista en el índice global
    const coincideBusqueda = terminosBusqueda.length === 0 || terminosBusqueda.every(termino =>
      indiceOmni.includes(termino)
    );

    const coincideCat = filtroCat === 'TODAS' || prod.categoria === filtroCat;
    const coincideEstado = filtroEstado === 'TODOS' || prod.estado === filtroEstado;

    return coincideBusqueda && coincideCat && coincideEstado;
  }), [datos, busqueda, filtroCat, filtroEstado]);

  const hayFiltrosActivos = busqueda.trim() !== '' || filtroCat !== 'TODAS' || filtroEstado !== 'TODOS';

  // 🟢 TOTALES DEL SUBCONJUNTO VISIBLE: para que las tarjetas de resumen reflejen
  // exactamente lo que la tabla está mostrando cuando hay un filtro de categoría/rotación/búsqueda activo.
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

  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina) || 1;
  const startIndex = (paginaActual - 1) * itemsPorPagina;
  const datosPaginados = datosFiltrados.slice(startIndex, startIndex + itemsPorPagina);

  const limpiarFiltrosTabla = () => {
    setBusqueda('');
    setFiltroCat('TODAS');
    setFiltroEstado('TODOS');
    limpiarFechas();
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-ink)] rounded-none shadow-[4px_4px_0px_0px_rgba(var(--color-ink-rgb),0.05)] flex flex-col font-sans mt-4">

      {/* HEADER Y FILTROS */}
      <div className="p-4 bg-[var(--color-surface)] border-b border-[var(--color-ink)] flex flex-wrap gap-4 items-center justify-between shrink-0">
        <h2 className="text-[var(--color-ink)] font-black uppercase tracking-widest flex items-center gap-3 text-sm">
          <Filter size={18} className="text-[var(--color-accent-shadow)]" strokeWidth={2.5} />
          RENTABILIDAD DETALLADA DE PRODUCTOS
        </h2>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-ink)] rounded-none focus-within:border-[var(--color-accent-shadow)] flex-1 lg:w-64 transition-all">
            <div className="p-2 flex items-center justify-center text-[var(--color-ink)] bg-[var(--color-bg)] border-r border-[var(--color-ink)]">
              <Search size={16} strokeWidth={2}/>
            </div>
            <input
              type="text" placeholder="BUSCAR PRODUCTO..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-full text-xs font-bold text-[var(--color-ink)] outline-none p-2 bg-transparent uppercase placeholder:text-[var(--color-subtle)]"
            />
          </div>
          <select
            value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}
            className="bg-[var(--color-surface)] text-xs font-bold text-[var(--color-ink)] outline-none p-2 border border-[var(--color-ink)] rounded-none focus:border-[var(--color-accent-shadow)] cursor-pointer transition-all uppercase"
          >
            <option value="TODAS">CATEGORÍA: TODAS</option>
            {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[var(--color-surface)] text-xs font-bold text-[var(--color-ink)] outline-none p-2 border border-[var(--color-ink)] rounded-none focus:border-[var(--color-accent-shadow)] cursor-pointer transition-all uppercase"
          >
            <option value="TODOS">ROTACIÓN: TODAS</option>
            <option value="BUENO">VENTA: BUENO</option>
            <option value="REGULAR">VENTA: REGULAR</option>
            <option value="BAJO">VENTA: BAJO</option>
            <option value="SIN VENTAS">SIN VENTAS</option>
          </select>

          <div className="flex flex-wrap items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-ink)] p-1.5 rounded-none w-full sm:w-auto min-w-0">
            <div className="flex flex-col px-1.5">
              <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Desde</label>
              <div className="flex items-center gap-1.5">
                <CalendarDays size={12} className="text-[var(--color-ink)]" />
                <input type="date" value={localInicio} onChange={(e) => setLocalInicio(e.target.value)} className="text-[13px] font-bold text-[var(--color-ink)] outline-none bg-transparent cursor-pointer font-mono" />
              </div>
            </div>
            <div className="w-[1px] h-7 bg-[var(--color-border)]"></div>
            <div className="flex flex-col px-1.5">
              <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Hasta</label>
              <div className="flex items-center gap-1.5">
                <CalendarDays size={12} className="text-[var(--color-ink)]" />
                <input type="date" value={localFin} onChange={(e) => setLocalFin(e.target.value)} className="text-[13px] font-bold text-[var(--color-ink)] outline-none bg-transparent cursor-pointer font-mono" />
              </div>
            </div>
            <button onClick={handleBuscarFecha} className="bg-[var(--color-ink)] hover:bg-[var(--color-accent-shadow)] text-[var(--color-surface)] p-1.5 rounded-none transition-colors cursor-pointer flex items-center justify-center border border-[var(--color-ink)] hover:border-[var(--color-accent-shadow)]" title="Buscar por Fecha">
              <Search size={14} strokeWidth={2} />
            </button>
          </div>

          <button
            onClick={limpiarFiltrosTabla}
            className="bg-[var(--color-ink)] hover:bg-[var(--color-accent-shadow)] text-[var(--color-surface)] px-3 py-2 rounded-none transition-colors cursor-pointer border border-[var(--color-ink)] hover:border-[var(--color-accent-shadow)] flex items-center justify-center"
            title="Limpiar Todos los Filtros"
          >
            <RotateCcw size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* CONTROLES PAGINACIÓN SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[var(--color-bg)] border-b border-[var(--color-border)] gap-4">
        <span className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest">
          MOSTRANDO {datosFiltrados.length === 0 ? 0 : startIndex + 1} A {Math.min(startIndex + itemsPorPagina, datosFiltrados.length)} DE {datosFiltrados.length} REGISTROS
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-3 py-1.5 border border-[var(--color-ink)] rounded-none text-[12px] font-bold text-[var(--color-ink)] bg-white hover:bg-[var(--color-accent-shadow)] hover:text-white hover:border-[var(--color-accent-shadow)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all uppercase">
            <ChevronLeft size={14} strokeWidth={2}/> ANT
          </button>
          <span className="px-3 py-1.5 text-[12px] font-black text-[var(--color-surface)] bg-[var(--color-ink)] rounded-none uppercase tracking-widest">
            {paginaActual} / {totalPaginas}
          </span>
          <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-3 py-1.5 border border-[var(--color-ink)] rounded-none text-[12px] font-bold text-[var(--color-ink)] bg-white hover:bg-[var(--color-accent-shadow)] hover:text-white hover:border-[var(--color-accent-shadow)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all uppercase">
            SIG <ChevronRight size={14} strokeWidth={2}/>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL - DISEÑO TÉCNICO ESMERALDA LIGERO */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-[var(--color-ink)] text-[var(--color-surface)] sticky top-0 z-10">
            <tr>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase border-b-2 border-[var(--color-accent-shadow)]">Producto / Ref</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-center border-b-2 border-[var(--color-accent-shadow)]">Stock Actual</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-center border-b-2 border-[var(--color-accent-shadow)]">U. Vendidas</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-right border-b-2 border-[var(--color-accent-shadow)]">Ingreso Cobrado</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-right border-b-2 border-[var(--color-accent-shadow)]">Costo Ventas</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-right border-b-2 border-[var(--color-accent-shadow)]">Mermas</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-right bg-[var(--color-accent-shadow)] text-[var(--color-surface)] border-b-2 border-[var(--color-accent-dark-2)]">Utilidad Neta</th>
              <th className="p-3 text-[12px] font-black tracking-widest uppercase text-center border-b-2 border-[var(--color-accent-shadow)] w-24">Margen</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {datosPaginados.length === 0 ? (
              <tr><td colSpan={8} className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-bold text-xs uppercase border-b border-[var(--color-border)]">NO SE ENCONTRARON REGISTROS.</td></tr>
            ) : (
              datosPaginados.map((prod) => (
                <tr
                  key={prod.id}
                  {...clicConTeclado(() => setProductoSeleccionado(prod))}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                  title="Ver ventas de este producto"
                >
                  <td className="p-3">
                    <p className="text-xs font-black text-[var(--color-ink)] uppercase mb-1">{prod.nombre}</p>
                    <div className="flex gap-2">
                      <span className="text-[12px] font-bold text-[var(--color-muted)] border border-[var(--color-line-light)] bg-[var(--color-bg-2)] px-2 py-0.5 rounded-none uppercase tracking-widest">{prod.categoria}</span>

                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-none uppercase tracking-widest border ${
                        prod.estado === 'BUENO' ? 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' :
                        prod.estado === 'REGULAR' ? 'border-[var(--color-ink)] text-[var(--color-ink)]' :
                        prod.estado === 'BAJO' ? 'border-[var(--color-subtle)] text-[var(--color-subtle)]' :
                        'border-[var(--color-line-light)] text-[var(--color-muted)] bg-[var(--color-bg-2)]'
                      }`}>
                        {prod.estado}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    {prod.tipoControl === 'CONSUMO' ? (
                      <span className="text-[12px] font-black px-2 py-1 rounded-none border border-[var(--color-ink)] text-[var(--color-ink)] uppercase tracking-widest">
                        INTERNO
                      </span>
                    ) : (
                      <span className={`text-[12px] font-black px-2 py-1 rounded-none border uppercase tracking-widest ${
                        (prod.stockActual || 0) <= 5 ? 'border-[var(--color-danger)] text-[var(--color-surface)] bg-[var(--color-danger)]' :
                        (prod.stockActual || 0) <= 15 ? 'border-[var(--color-warning)] text-[var(--color-surface)] bg-[var(--color-warning)]' :
                        'border-[var(--color-border)] text-[var(--color-ink)] bg-[var(--color-bg)]'
                      }`}>
                        {(prod.stockActual || 0) <= 5 ? `CRÍTICO (${Number(prod.stockActual).toFixed(2)})` :
                         (prod.stockActual || 0) <= 15 ? `BAJO (${Number(prod.stockActual).toFixed(2)})` :
                         `OK (${Number(prod.stockActual).toFixed(2)})`}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center text-sm font-black text-[var(--color-ink)] font-mono">
                    {Number(prod.unidadesVendidas).toFixed(2)} <span className="text-[12px] font-bold text-[var(--color-muted)]">{prod.unidadMedida}</span>
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-[var(--color-muted)] font-mono">S/ {prod.ingresosTotales.toFixed(2)}</td>
                  <td className="p-3 text-right text-xs font-bold text-[var(--color-muted)] font-mono">S/ {prod.costoTotalVentas.toFixed(2)}</td>
                  <td className="p-3 text-right text-xs font-bold text-[var(--color-danger)] font-mono">
                    {prod.perdidaMerma > 0 ? `- S/ ${prod.perdidaMerma.toFixed(2)}` : 'S/ 0.00'}
                  </td>
                  <td className="p-3 text-right text-sm font-black border-x border-[var(--color-accent-shadow)]/20 bg-[var(--color-accent-bg)]">
                    <span className={`font-mono ${prod.utilidadReal >= 0 ? 'text-[var(--color-accent-shadow)]' : 'text-[var(--color-danger)]'}`}>
                      S/ {prod.utilidadReal.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`flex items-center justify-center gap-1 text-[12px] font-black px-1.5 py-1 rounded-none border tracking-widest ${
                      prod.margen >= 30 ? 'border-[var(--color-accent-shadow)] text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)]' :
                      prod.margen > 0 ? 'border-[var(--color-ink)] text-[var(--color-ink)]' :
                      'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-bg)]'
                    }`}>
                      {prod.margen >= 0 ? <TrendingUp size={12} strokeWidth={3}/> : <TrendingDown size={12} strokeWidth={3}/>}
                      {prod.margen.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {productoSeleccionado && (
        <ModalDetalleProducto
          producto={productoSeleccionado}
          onClose={() => setProductoSeleccionado(null)}
        />
      )}
    </div>
  );
};