import React from 'react';
import { Eye, Truck, User } from 'lucide-react';
import type { Salida } from '../types';

interface TablaSalidasProps {
  salidas: Salida[];
  onVerDetalle: (salida: Salida) => void;
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pag: number) => void;
}

export const TablaSalidas: React.FC<TablaSalidasProps> = ({
  salidas,
  onVerDetalle,
  paginaActual,
  totalPaginas,
  onCambiarPagina,
}) => {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'FINALIZADO':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[9px] font-black uppercase">Finalizado</span>;
      case 'CANCELADO':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 text-[9px] font-black uppercase">Cancelado</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase">En Proceso</span>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'OBRA' ? (
      <span className="bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.5 text-[9px] font-black uppercase">Obra</span>
    ) : (
      <span className="bg-slate-100 text-slate-800 border border-slate-300 px-1.5 py-0.5 text-[9px] font-black uppercase">Servicio</span>
    );
  };

  return (
    <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] font-mono text-xs flex flex-col">
      {/* Barra de Paginación Superior */}
      <div className="flex items-center justify-between p-2 border-b-2 border-[var(--color-border)] bg-[var(--color-bg)] text-[11px] font-black uppercase">
        <span className="text-[var(--color-muted)]">
          Página {paginaActual} de {Math.max(1, totalPaginas)}
        </span>
        <div className="flex gap-1">
          <button
            id="btn-pagina-ant-salidas-arriba"
            disabled={paginaActual <= 1}
            onClick={() => onCambiarPagina(paginaActual - 1)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const f0 = document.querySelector('[data-fila-salida="true"]') as HTMLElement | null;
                f0?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('buscador-salidas')?.focus();
              }
            }}
            className="px-2 py-1 border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-40 cursor-pointer hover:bg-black/5"
          >
            ← Anterior
          </button>
          <button
            id="btn-pagina-sig-salidas-arriba"
            disabled={paginaActual >= totalPaginas}
            onClick={() => onCambiarPagina(paginaActual + 1)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const f0 = document.querySelector('[data-fila-salida="true"]') as HTMLElement | null;
                f0?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('buscador-salidas')?.focus();
              }
            }}
            className="px-2 py-1 border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-40 cursor-pointer hover:bg-black/5"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table id="tabla-salidas-lista" className="w-full text-left border-collapse">
          <thead className="bg-[var(--color-ink)] text-white text-[10px] font-black uppercase tracking-wider">
            <tr>
              <th className="p-2.5">Código / Tipo</th>
              <th className="p-2.5">Fecha</th>
              <th className="p-2.5">Cliente / Destino</th>
              <th className="p-2.5">Lo que se atiende</th>
              <th className="p-2.5">Personal Asignado</th>
              <th className="p-2.5 text-center">Items</th>
              <th className="p-2.5 text-center">Estado</th>
              <th className="p-2.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {salidas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--color-muted)] font-bold">
                  No se encontraron salidas registradas
                </td>
              </tr>
            ) : (
              salidas.map((s, idx) => (
                <tr
                  key={s.id}
                  data-fila-salida="true"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onVerDetalle(s);
                    } else if (e.key === 'ArrowDown') {
                      const sig = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sig && sig.getAttribute('data-fila-salida') === 'true') {
                        e.preventDefault();
                        sig.focus();
                      }
                    } else if (e.key === 'ArrowUp') {
                      const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
                      if (ant && ant.getAttribute('data-fila-salida') === 'true') {
                        e.preventDefault();
                        ant.focus();
                      } else {
                        e.preventDefault();
                        const pAnt = document.getElementById('btn-pagina-ant-salidas-arriba');
                        if (pAnt && !pAnt.hasAttribute('disabled')) pAnt.focus();
                        else document.getElementById('buscador-salidas')?.focus();
                      }
                    }
                  }}
                  className="hover:bg-black/5 cursor-pointer focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-[var(--color-ink)]">{s.codigo}</span>
                      {getTipoBadge(s.tipo)}
                    </div>
                    {s.salida_raiz_codigo && (
                      <span className="text-[9px] text-blue-700 font-bold block mt-0.5">
                        Cont. de {s.salida_raiz_codigo}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-[11px] whitespace-nowrap">{s.fecha}</td>
                  <td className="p-2.5">
                    <span className="font-bold uppercase text-[var(--color-ink)] block">
                      {s.customer?.name || 'Cliente sin nombre'}
                    </span>
                    {s.direccion && (
                      <span className="text-[10px] text-[var(--color-muted)] block truncate max-w-xs">
                        {s.direccion}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">
                    {s.bien ? (
                      <span className="font-bold text-[var(--color-accent-dark)] uppercase">
                        {s.bien.nombre} ({s.bien.tipo})
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted)] italic text-[10px]">General</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {s.trabajadores && s.trabajadores.length > 0 ? (
                        s.trabajadores.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] px-1 py-0.5 text-[9px] font-bold uppercase"
                          >
                            {t.trabajador?.nombre?.split(' ')[0] || 'Técnico'}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--color-muted)] text-[10px]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="font-black">
                      {s.items?.length || 0}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    {getEstadoBadge(s.estado)}
                  </td>
                  <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`btn-ver-salida-${s.id}`}
                      onClick={() => onVerDetalle(s)}
                      className="px-2.5 py-1 border border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-bold uppercase text-[10px] flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <Eye size={12} /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
