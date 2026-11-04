// src/sections/Finanzas/components/TablaHistorial.tsx
import React, { useState, useMemo } from 'react';
import { Eye, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { ModalDetalleCaja } from './ModalDetalleCaja';
import type { CashSession } from '../types';

interface Props {
  historialCajas: CashSession[];
  paginaActual: number;
  totalPaginas: number;
  onPageChange: (page: number) => void;
  onAnular?: (id: string, isTicket?: boolean) => Promise<void>;
  onDelete?: (id: string, isTicket?: boolean) => Promise<void>;
  onCambiarProducto?: (ticketId: string, modo?: 'CAMBIO' | 'DEVOLVER') => void;
  /** Filtros que van al lado del buscador (las fechas); recibe cómo borrar la búsqueda */
  filtros?: (limpiarBusqueda: () => void) => React.ReactNode;
}

export const TablaHistorial: React.FC<Props> = ({ historialCajas, paginaActual, totalPaginas, onPageChange, onAnular, onDelete, onCambiarProducto, filtros }) => {
  const [selectedCaja, setSelectedCaja] = useState<CashSession | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cajasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return historialCajas;
    const q = busqueda.toLowerCase().trim();
    return historialCajas.filter((caja) => {
      const fechaApertura = caja.opened_at ? new Date(caja.opened_at).toLocaleString('es-PE').toLowerCase() : '';
      const fechaCierre = caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE').toLowerCase() : '';
      const autorApertura = (caja.abierta_por || '').toLowerCase();
      const autorCierre = (caja.cerrada_por || '').toLowerCase();
      const fondo = String(caja.opening_balance || '');
      const realEf = String(caja.closing_balance || '');
      const idStr = String(caja.id).toLowerCase();
      const notas = (caja.justification || '').toLowerCase();
      return (
        fechaApertura.includes(q) ||
        fechaCierre.includes(q) ||
        autorApertura.includes(q) ||
        autorCierre.includes(q) ||
        fondo.includes(q) ||
        realEf.includes(q) ||
        idStr.includes(q) ||
        notas.includes(q)
      );
    });
  }, [historialCajas, busqueda]);

  const filas = () => Array.from(document.querySelectorAll('tr[data-row="true"][role="button"]')) as HTMLElement[];
  const bajarDesdeArriba = () => {
    const pag = document.getElementById('btn-historial-anterior');
    if (pag) { pag.focus(); return; }
    filas()[0]?.focus();
  };

  // Paginación como Inventario (arriba y abajo, mismos ids de antes)
  const paginacion = (posicion: 'top' | 'bottom') => {
    if (!cajasFiltradas.length) return null; // como Inventario: sin filas no hay paginación
    const isTop = posicion === 'top';
    const idAnterior = isTop ? 'btn-historial-anterior' : 'btn-historial-anterior-bottom';
    const idSiguiente = isTop ? 'btn-historial-siguiente' : 'btn-historial-siguiente-bottom';
    const total = totalPaginas || 1;
    const teclas = (soy: 'ant' | 'sig') => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const acc: Record<string, () => void> = {
        ArrowLeft: () => { if (soy === 'sig') document.getElementById(idAnterior)?.focus(); },
        ArrowRight: () => { if (soy === 'ant') document.getElementById(idSiguiente)?.focus(); },
        ArrowUp: () => {
          if (isTop) (document.getElementById('buscador-historial-cajas') as HTMLInputElement | null)?.focus();
          else { const l = filas(); l[l.length - 1]?.focus(); }
        },
        ArrowDown: () => { if (isTop) { const p = filas()[0]; p?.focus(); p?.scrollIntoView({ block: 'nearest' }); } },
        Enter: () => {
          if (soy === 'ant' && paginaActual > 1) onPageChange(paginaActual - 1);
          if (soy === 'sig' && paginaActual < totalPaginas) onPageChange(paginaActual + 1);
        },
      };
      acc[' '] = acc.Enter;
      if (acc[e.key]) { e.preventDefault(); e.stopPropagation(); acc[e.key](); }
    };
    return (
      <div className={`paginacion-sobria ${isTop ? 'border-b' : 'border-t'} shrink-0`}>
        <span className="paginacion-sobria__texto">Página {paginaActual} de {total}</span>
        <div className="flex gap-2">
          <button id={idAnterior} type="button" title="Página anterior" aria-disabled={paginaActual <= 1} className="paginacion-sobria__boton"
            onClick={() => { if (paginaActual > 1) onPageChange(paginaActual - 1); }} onKeyDown={teclas('ant')}><ChevronLeft size={16} /></button>
          <button id={idSiguiente} type="button" title="Página siguiente" aria-disabled={paginaActual >= totalPaginas} className="paginacion-sobria__boton"
            onClick={() => { if (paginaActual < totalPaginas) onPageChange(paginaActual + 1); }} onKeyDown={teclas('sig')}><ChevronRight size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in mb-8">
      {/* BUSCADOR Y FILTROS (fuera del marco de la tabla, como Inventario) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            id="buscador-historial-cajas"
            type="text"
            autoComplete="off"
            placeholder="BUSCAR CAJA POR FECHA, CAJERO, MONTOS O NOTAS..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); setBusqueda(''); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); bajarDesdeArriba(); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); ['btn-cpe-problemas', 'btn-reporte-contador', 'btn-ver-historial'].map((id) => document.getElementById(id)).find((b) => b && b.getClientRects().length)?.focus(); }
              else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                e.preventDefault(); e.stopPropagation(); document.getElementById('filtro-fecha-desde-finanzas')?.focus();
              }
            }}
            style={{ paddingRight: busqueda ? '8rem' : undefined }}
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{cajasFiltradas.length} MATCH</span>
              <button type="button" tabIndex={-1} title="Borrar búsqueda" className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); document.getElementById('buscador-historial-cajas')?.focus(); }}><X size={14} /></button>
            </div>
          )}
        </div>
        {filtros?.(() => setBusqueda(''))}
      </div>

      <div className="tabla-marco flex flex-col">
      {/* PAGINACIÓN SUPERIOR */}
      {paginacion('top')}
      
      {/* TABLA SIN SCROLL INTERNO (Se eliminó overflow-auto custom-scrollbar) */}
      <div className="w-full bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="tabla-cabecera">
            <tr>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase bg-[var(--color-surface)] whitespace-nowrap">Apertura</th>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase bg-[var(--color-surface)] whitespace-nowrap hidden md:table-cell">Cierre</th>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase text-center bg-[var(--color-surface)] whitespace-nowrap hidden md:table-cell">Fondo Inicial</th>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase text-center bg-[var(--color-surface)] md:whitespace-nowrap">Efectivo / Yape / Tarjeta</th>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase text-center bg-[var(--color-surface)] whitespace-nowrap">Diferencia Total</th>
              <th className="p-2 sm:p-4 text-[11px] sm:text-[12px] font-black tracking-wider sm:tracking-widest uppercase text-center bg-[var(--color-surface)] whitespace-nowrap hidden md:table-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cajasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="vacio-sobrio"><Search size={32} />{busqueda ? 'No se registran cajas con esos parámetros.' : 'No se registran cajas cerradas en esas fechas.'}</div>
                </td>
              </tr>
            ) : (
              cajasFiltradas.map((caja) => {
                const esperadoEfectivo = Number(caja.expected_balance || 0);
                const realEfectivo = Number(caja.closing_balance || 0);
                const esperadoYape = Number(caja.expected_yape || 0);
                const realYape = Number(caja.closing_yape || 0);
                const esperadoTarjeta = Number(caja.expected_card || 0);
                const realTarjeta = Number(caja.closing_card || 0);
                // Redondeado a centavos: sumar varios decimales en JS casi nunca da un
                // número binario exacto, y sin esto una caja cuadrada mostraba "+S/ 0.00"
                // en vez de "CUADRE EXACTO".
                const diferencia = Math.round(((realEfectivo - esperadoEfectivo) + (realYape - esperadoYape) + (realTarjeta - esperadoTarjeta)) * 100) / 100;

                return (
                  <tr
                    key={caja.id}
                    data-row="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedCaja(caja);
                      }
                    }}
                    onClick={() => setSelectedCaja(caja)}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] transition-colors cursor-pointer group"
                    title="Click o Enter para ver el detalle de esta caja"
                  >
                    <td className="p-2 sm:p-4 text-xs font-bold text-[var(--color-muted)] md:whitespace-nowrap">
                      {new Date(caja.opened_at).toLocaleString('es-PE')}
                      {/* Quién abrió / cerró: lo guarda el servidor con la sesión (cajas antiguas no lo tienen) */}
                      {caja.abierta_por && <p className="text-[11px] font-black text-[var(--color-ink)] uppercase">Abrió: {caja.abierta_por}</p>}
                    </td>
                    <td className="p-2 sm:p-4 text-xs font-bold text-[var(--color-muted)] whitespace-nowrap hidden md:table-cell">
                      {caja.closed_at ? new Date(caja.closed_at).toLocaleString('es-PE') : '---'}
                      {caja.cerrada_por && <p className="text-[11px] font-black text-[var(--color-ink)] uppercase">Cerró: {caja.cerrada_por}</p>}
                    </td>
                    <td className="p-2 sm:p-4 text-sm font-black text-[var(--color-ink)] text-center whitespace-nowrap hidden md:table-cell">
                      S/ {Number(caja.opening_balance).toFixed(2)}
                    </td>
                    <td className="p-2 sm:p-4 text-xs font-black text-[var(--color-accent)] text-center space-y-0.5 whitespace-nowrap">
                      <p>S/ {realEfectivo.toFixed(2)}</p>
                      <p className="text-[var(--color-info)]">S/ {realYape.toFixed(2)}</p>
                      <p className="text-[var(--color-purple)]">S/ {realTarjeta.toFixed(2)}</p>
                    </td>
                    <td className={`p-2 sm:p-4 text-sm font-black text-center whitespace-nowrap ${diferencia < 0 ? 'text-[var(--color-danger)]' : (diferencia > 0 ? 'text-[var(--color-info)]' : 'text-[var(--color-muted)]')}`}>
                      {diferencia !== 0 ? (diferencia > 0 ? `+ S/ ${diferencia.toFixed(2)}` : `- S/ ${Math.abs(diferencia).toFixed(2)}`) : 'CUADRE EXACTO'}
                    </td>
                    <td className="p-2 sm:p-4 text-center hidden md:flex items-center justify-center gap-2 whitespace-nowrap">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCaja(caja);
                        }}
                        
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-surface)] focus:outline-none transition-colors cursor-pointer rounded-none"
                        title="Ver Detalles de la Caja"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN INFERIOR */}
      {paginacion('bottom')}
      </div>

      <ModalDetalleCaja 
        isOpen={!!selectedCaja}
        onClose={() => setSelectedCaja(null)}
        caja={selectedCaja}
        onAnular={onAnular}
        onDelete={onDelete}
        onCambiarProducto={onCambiarProducto}
      />
    </div>
  );
};