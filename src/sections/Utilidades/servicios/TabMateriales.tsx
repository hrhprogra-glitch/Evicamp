// src/sections/Graficos/components/TabMateriales.tsx
// Insumos y materiales más usados en estilo SiuMax Sobrio

import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { ModalDetalleFila } from '../../../components/ModalDetalleFila';
import { PaginacionSobrio } from '../../../components/PaginacionSobrio';
import type { ItemMaterialTop } from './types';

interface TabMaterialesProps {
  materiales: ItemMaterialTop[];
  busqueda: string;
}

// Paginación SiuMax Sobrio: 50 filas por página, igual que el resto de Nego (18/11/2026)
const POR_PAGINA = 50;

// Filas: ↑ ↓ se mueven entre filas; ↑ desde la primera sube al buscador de la cabecera (Nego 3h)
const teclaFila = (e: React.KeyboardEvent<HTMLTableRowElement>, abrir: () => void, idAbajo: string) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const sig = e.currentTarget.nextElementSibling as HTMLElement | null;
    if (sig) sig.focus(); else document.getElementById(idAbajo)?.focus();
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
    if (ant) ant.focus(); else (document.querySelector('[id^="buscador-reporte-"]') as HTMLElement | null)?.focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  else if (e.key === 'Enter') { e.preventDefault(); abrir(); }
};

export const TabMateriales: React.FC<TabMaterialesProps> = ({ materiales, busqueda }) => {
  const [detalle, setDetalle] = useState<ItemMaterialTop | null>(null);
  const [pagina, setPagina] = useState(1);
  const filtrados = materiales.filter((m) =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase().trim())
  );

  const top10 = [...filtrados].slice(0, 10);
  const maxCosto = top10.length > 0 ? Math.max(...top10.map((m) => m.costoTotal), 1) : 1;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const selectorFilas = "#tabla-materiales [data-fila-grafico='true']";

  const totalCosto = filtrados.reduce((s, m) => s + m.costoTotal, 0);

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Gráfico Ranking de Insumos por Costo Valorizado */}
      {top10.length > 0 && (
        <div className="tarjeta-sobria p-4 bg-[var(--color-surface)] border-2 border-[var(--color-ink)]">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
              <Package size={16} className="text-[var(--color-accent-shadow)]" />
              Top 10 Materiales e Insumos Más Consumidos (Valorizados en S/)
            </span>
            <span className="text-[10px] text-[var(--color-muted)] font-black uppercase">
              Costo total consumido
            </span>
          </div>

          <div className="space-y-3">
            {top10.map((m) => {
              const ancho = Math.min(100, Math.max(6, (m.costoTotal / maxCosto) * 100));

              return (
                <div key={m.productoId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[var(--color-ink)]">
                      {m.nombre}{' '}
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        ({m.cantidadConsumida.toFixed(2)} {m.unidad})
                      </span>
                    </span>
                    <span className="font-mono font-black text-[var(--color-accent-shadow)]">
                      S/ {m.costoTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-border)] h-2.5 overflow-hidden">
                    <div
                      className="bg-[var(--color-accent)] h-full transition-all duration-500"
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla de Insumos */}
      <div className="tabla-marco flex flex-col">
        <PaginacionSobrio
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={setPagina}
          prefijo="materiales"
          posicion="top"
          selectorFilas={selectorFilas}
          idBuscador="buscador-reporte-materiales"
        />
        <div className="overflow-x-auto">
        {filtrados.length === 0 ? (
          <div className="vacio-sobrio">
            <Package size={32} />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">
              No se han consumido insumos ni materiales en el período seleccionado
            </p>
          </div>
        ) : (
          <>
            <table id="tabla-materiales" className="w-full text-left border-collapse">
              <thead className="tabla-cabecera">
                <tr>
                  <th className="whitespace-nowrap p-4">Insumo / Material</th>
                  <th className="whitespace-nowrap p-4 text-center">Unidad</th>
                  <th className="whitespace-nowrap p-4 text-right">En salidas y taller</th>
                  <th className="whitespace-nowrap p-4 text-right">En contratos</th>
                  <th className="whitespace-nowrap p-4 text-right">Total Consumido</th>
                  <th className="whitespace-nowrap p-4 text-right">Costo Total Valorizado</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {paginados.map((m) => (
                  <tr
                    key={m.productoId}
                    data-fila-grafico="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => teclaFila(e, () => setDetalle(m), 'btn-pag-bottom-materiales-ant')}
                    onClick={() => setDetalle(m)}
                    title="Presione Enter o haga clic para ver el detalle"
                    className="tabla-fila h-[79px] cursor-pointer"
                  >
                    <td className="p-4 font-black">
                      {m.nombre}
                    </td>
                    <td className="p-4 text-center text-[var(--color-muted)] font-mono font-bold text-[11px]">
                      {m.unidad}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-[var(--color-muted)]">
                      {m.usadoEnObras > 0 ? m.usadoEnObras.toFixed(2) : '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-[var(--color-muted)]">
                      {m.usadoEnContratos > 0 ? m.usadoEnContratos.toFixed(2) : '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-ink)]">
                      {m.cantidadConsumida.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-accent-shadow)]">
                      S/ {m.costoTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs font-mono font-black">
              <span className="text-[var(--color-muted)] uppercase">
                Total Materiales Consumidos ({filtrados.length} productos)
              </span>
              <span className="text-[var(--color-accent-shadow)]">
                Costo Total: S/ {totalCosto.toFixed(2)}
              </span>
            </div>
          </>
        )}
        </div>
        <PaginacionSobrio
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={setPagina}
          prefijo="materiales"
          posicion="bottom"
          selectorFilas={selectorFilas}
          idBuscador="buscador-reporte-materiales"
        />
      </div>

      {detalle && (
        <ModalDetalleFila
          titulo="Detalle del insumo"
          subtitulo={`Unidad: ${detalle.unidad}`}
          onClose={() => setDetalle(null)}
          campos={[
            { etiqueta: 'Insumo / Material', valor: detalle.nombre },
            { etiqueta: 'Unidad', valor: detalle.unidad },
            { etiqueta: 'En salidas y taller', valor: detalle.usadoEnObras.toFixed(2) },
            { etiqueta: 'En contratos', valor: detalle.usadoEnContratos.toFixed(2) },
            { etiqueta: 'Total consumido', valor: detalle.cantidadConsumida.toFixed(2) },
            { etiqueta: 'Costo total valorizado', valor: `S/ ${detalle.costoTotal.toFixed(2)}` },
          ]}
        />
      )}
    </div>
  );
};
