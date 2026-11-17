// src/sections/Graficos/components/TabRentabilidad.tsx
// Pestaña Rentabilidad por Obra y Contrato en estilo SiuMax Sobrio

import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { ItemRentabilidad } from './types';
import { verFechaLocal } from './types';

interface TabRentabilidadProps {
  items: ItemRentabilidad[];
  busqueda: string;
  filtroTipo: string;
}

// Filas: ↑ ↓ se mueven entre filas; ↑ desde la primera sube al buscador de la cabecera (Nego 3h)
const teclaFila = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
    if (ant) ant.focus(); else (document.querySelector('[id^="buscador-reporte-"]') as HTMLElement | null)?.focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
};

export const TabRentabilidad: React.FC<TabRentabilidadProps> = ({ items, busqueda, filtroTipo }) => {
  const itemsFiltrados = items.filter((it) => {
    if (filtroTipo !== 'TODOS' && it.tipo !== filtroTipo) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchCod = it.codigo.toLowerCase().includes(q);
      const matchNom = it.nombre.toLowerCase().includes(q);
      const matchCli = it.cliente.toLowerCase().includes(q);
      if (!matchCod && !matchNom && !matchCli) return false;
    }
    return true;
  });

  const totalIngreso = itemsFiltrados.reduce((s, it) => s + it.ingreso, 0);
  const totalCosto = itemsFiltrados.reduce((s, it) => s + it.costoMateriales, 0);
  const totalUtilidad = totalIngreso - totalCosto;
  const margenPromedio = totalIngreso > 0 ? (totalUtilidad / totalIngreso) * 100 : 0;

  // Top 5 servicios/obras con mayor utilidad
  const topTrabajos = [...itemsFiltrados]
    .sort((a, b) => b.utilidad - a.utilidad)
    .slice(0, 5);

  const maxUtilidad = topTrabajos.length > 0 ? Math.max(...topTrabajos.map((t) => t.utilidad), 1) : 1;

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Gráfico Visual: Top 5 de Mayor Utilidad */}
      {topTrabajos.length > 0 && (
        <div className="tarjeta-sobria p-4 bg-[var(--color-surface)] border-2 border-[var(--color-ink)]">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={16} className="text-[var(--color-success)]" />
              Top Servicios y Obras con Mayor Ganancia
            </span>
            <span className="text-[10px] text-[var(--color-muted)] font-black uppercase">
              Utilidad Bruta en Soles
            </span>
          </div>

          <div className="space-y-3">
            {topTrabajos.map((t) => {
              const ancho = Math.min(100, Math.max(8, (t.utilidad / maxUtilidad) * 100));
              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[var(--color-ink)] truncate max-w-md">
                      <span className="text-[var(--color-muted)] mr-2 font-mono font-black">{t.codigo}</span>
                      {t.nombre} - <span className="text-[var(--color-muted)] font-normal">{t.cliente}</span>
                    </span>
                    <span className="font-mono font-black text-[var(--color-success)] ml-2 whitespace-nowrap">
                      S/ {t.utilidad.toFixed(2)}{' '}
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        ({t.margen.toFixed(1)}%)
                      </span>
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

      {/* Tabla Detallada */}
      <div className="tabla-marco overflow-x-auto">
        {itemsFiltrados.length === 0 ? (
          <div className="vacio-sobrio">
            <TrendingUp size={32} />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-ink)]">
              No hay registros de rentabilidad en el período seleccionado
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead className="tabla-cabecera">
                <tr>
                  <th className="whitespace-nowrap p-4">Código</th>
                  <th className="whitespace-nowrap p-4">Tipo</th>
                  <th className="whitespace-nowrap p-4">Descripción / Trabajo</th>
                  <th className="whitespace-nowrap p-4">Cliente</th>
                  <th className="whitespace-nowrap p-4">Fecha</th>
                  <th className="whitespace-nowrap p-4 text-right">Ingreso Facturado</th>
                  <th className="whitespace-nowrap p-4 text-right">Costo Insumos</th>
                  <th className="whitespace-nowrap p-4 text-right">Utilidad Bruta</th>
                  <th className="whitespace-nowrap p-4 text-right">Margen</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {itemsFiltrados.map((it) => (
                  <tr key={`${it.tipo}-${it.id}`} data-fila-grafico="true" tabIndex={0} onKeyDown={teclaFila} className="tabla-fila h-[79px] cursor-pointer">
                    <td className="p-4 font-mono font-black whitespace-nowrap">
                      {it.codigo}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                          it.tipo === 'OBRA'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : it.tipo === 'CONTRATO'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : it.tipo === 'TALLER'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {it.tipo}
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      {it.nombre}
                    </td>
                    <td className="p-4 text-[var(--color-muted)] font-bold">
                      {it.cliente}
                    </td>
                    <td className="p-4 text-[var(--color-muted)] font-mono whitespace-nowrap text-[11px] font-bold">
                      {verFechaLocal(it.fecha)}
                    </td>
                    <td className="p-4 text-right font-mono font-black whitespace-nowrap">
                      S/ {it.ingreso.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-danger)] whitespace-nowrap">
                      S/ {it.costoMateriales.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-[var(--color-success)] whitespace-nowrap">
                      S/ {it.utilidad.toFixed(2)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap font-mono font-black text-[var(--color-ink)]">
                      {it.margen.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Fila de Totales */}
            <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs font-mono font-black">
              <div className="text-[var(--color-muted)] uppercase">
                Total ({itemsFiltrados.length} servicios)
              </div>
              <div className="flex items-center gap-6">
                <span>Ingresos: S/ {totalIngreso.toFixed(2)}</span>
                <span className="text-[var(--color-danger)]">Costos: S/ {totalCosto.toFixed(2)}</span>
                <span className="text-[var(--color-success)]">Utilidad: S/ {totalUtilidad.toFixed(2)} ({margenPromedio.toFixed(1)}%)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
