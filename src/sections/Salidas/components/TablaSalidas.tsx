import React from 'react';
import { Eye, Layers, Search } from 'lucide-react';
import { PaginacionSobrio } from '../../../components/PaginacionSobrio';
import type { Salida, SalidaFusion } from '../types';

interface TablaSalidasProps {
  salidas: Salida[];
  onVerDetalle: (salida: Salida) => void;
  onVerGeneral: (fusion: SalidaFusion) => void;
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pag: number) => void;
}

export const TablaSalidas: React.FC<TablaSalidasProps> = ({
  salidas,
  onVerDetalle,
  onVerGeneral,
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

  const alTeclearFila = (e: React.KeyboardEvent, idx: number, s: Salida) => {
    // 230: si la tecla viene de un botón de la fila («Ver» / «General»), el botón hace su trabajo.
    // Si el <tr> hiciera preventDefault aquí, el navegador no generaría el clic del botón.
    if ((e.target as HTMLElement).closest('button')) return;
    // 24/11/2026: esta fila es la ÚNICA que mueve el selector entre filas. Antes un listener
    // global de la pantalla volvía a moverlo y bajaba/subía doble. stopPropagation evita que
    // cualquier teclado general vuelva a actuar sobre la misma tecla.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onVerDetalle(s);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const sig = e.currentTarget.nextElementSibling as HTMLElement | null;
      if (sig && sig.getAttribute('data-fila-salida') === 'true') {
        sig.focus();
      } else {
        document.getElementById('btn-pag-bottom-salidas-ant')?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const ant = e.currentTarget.previousElementSibling as HTMLElement | null;
      if (ant && ant.getAttribute('data-fila-salida') === 'true') {
        ant.focus();
      } else if (idx === 0) {
        document.getElementById('btn-pagina-sig-salidas-arriba')?.focus();
      }
    }
  };

  return (
    <div className="tabla-marco flex flex-col font-mono">
      {/* Misma franja que Inventario. Se conservan los id de arriba que ya usaban las pruebas. */}
      <PaginacionSobrio
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="salidas"
        posicion="top"
        idAnt="btn-pagina-ant-salidas-arriba"
        idSig="btn-pagina-sig-salidas-arriba"
        selectorFilas="#tabla-salidas-lista [data-fila-salida='true']"
        idBuscador="buscador-salidas"
      />

      <div className="w-full overflow-x-auto custom-scrollbar tabla-salidas-scroll">
        <div id="tabla-salidas-lista">
          {salidas.length === 0 ? (
            <div className="vacio-sobrio">
              <Search size={32} />
              No se encontraron salidas registradas con esos parámetros.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="tabla-cabecera sticky top-0 z-10">
                <tr>
                  <th className="whitespace-nowrap p-4">Código / Tipo</th>
                  <th className="whitespace-nowrap p-4">Fecha</th>
                  <th className="whitespace-nowrap p-4">Cliente / Destino</th>
                  <th className="whitespace-nowrap p-4">Lo que se atiende</th>
                  <th className="whitespace-nowrap p-4">Personal Asignado</th>
                  <th className="whitespace-nowrap p-4 text-center">Items</th>
                  <th className="whitespace-nowrap p-4 text-center">Devoluciones</th>
                  <th className="whitespace-nowrap p-4 text-center">Estado</th>
                  <th className="whitespace-nowrap p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {salidas.map((s, idx) => (
                  <tr
                    key={s.id}
                    data-fila-salida="true"
                    data-row="true"
                    tabIndex={0}
                    onKeyDown={(e) => alTeclearFila(e, idx, s)}
                    onClick={() => onVerDetalle(s)}
                    title="Presione Enter o haga clic para ver el detalle"
                    className="tabla-fila h-[79px] cursor-pointer"
                  >
                    <td className="p-4" data-etiqueta="Código / Tipo">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[var(--color-ink)]">{s.codigo}</span>
                        {getTipoBadge(s.tipo)}
                      </div>
                      {s.salida_raiz_codigo && (
                        <span className="text-[9px] text-blue-700 font-bold block mt-0.5">Cont. de {s.salida_raiz_codigo}</span>
                      )}
                      {s.fusion && (
                        <span
                          id={`badge-fusion-${s.id}`}
                          data-fusion-codigo={s.fusion.codigo}
                          title={`Guardada en el general ${s.fusion.codigo}`}
                          className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-1.5 py-0.5 text-[9px] font-black uppercase block mt-0.5 w-fit"
                        >Fusionada · {s.fusion.codigo}</span>
                      )}
                    </td>
                    <td className="p-4 text-[11px] whitespace-nowrap" data-etiqueta="Fecha">{s.fecha}</td>
                    <td className="p-4" data-etiqueta="Cliente / Destino">
                      <span className="font-bold uppercase text-[var(--color-ink)] block">{s.customer?.name || 'Cliente sin nombre'}</span>
                      {s.direccion && (
                        <span className="text-[10px] text-[var(--color-muted)] block truncate max-w-xs">{s.direccion}</span>
                      )}
                    </td>
                    <td className="p-4" data-etiqueta="Lo que se atiende">
                      {s.bien ? (
                        <span className="font-bold text-[var(--color-accent-dark)] uppercase">{s.bien.nombre} ({s.bien.tipo})</span>
                      ) : (
                        <span className="text-[var(--color-muted)] italic text-[10px]">General</span>
                      )}
                    </td>
                    <td className="p-4" data-etiqueta="Personal">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.trabajadores && s.trabajadores.length > 0 ? (
                          s.trabajadores.map((t, tidx) => (
                            <span key={tidx} className="bg-[var(--color-bg)] border border-[var(--color-border)] px-1 py-0.5 text-[9px] font-bold uppercase">
                              {t.trabajador?.nombre?.split(' ')[0] || 'Técnico'}
                            </span>
                          ))
                        ) : (
                          <span className="text-[var(--color-muted)] text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center" data-etiqueta="Ítems">
                      <span className="font-black">{s.items?.length || 0}</span>
                    </td>
                    <td className="p-4 text-center" data-etiqueta="Devoluciones">
                      {/* 24/11: las devoluciones van en su propia columna, no debajo de Ítems. */}
                      {(() => {
                        const cant = (s.devoluciones?.length || 0) || (s.items || []).filter((it) => Number(it.cantidad_devuelta) > 0).length;
                        return cant > 0 ? (
                          <span className="font-black text-amber-700 uppercase" title="Tiene devoluciones registradas">{cant} dev.</span>
                        ) : (
                          <span className="text-[var(--color-muted)]">-</span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-center" data-etiqueta="Estado">{getEstadoBadge(s.estado)}</td>
                    <td className="p-4 text-center" data-etiqueta="Acciones" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          id={`btn-ver-salida-${s.id}`}
                          onClick={() => onVerDetalle(s)}
                          className="px-2.5 py-1 border border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> Ver
                        </button>
                        {s.fusion && (
                          <button
                            id={`btn-ver-general-fusion-${s.id}`}
                            type="button"
                            onClick={() => onVerGeneral(s.fusion!)}
                            title={`Ver general ${s.fusion.codigo}`}
                            className="px-2.5 py-1 border-2 border-indigo-700 text-indigo-800 font-black uppercase text-[10px] flex items-center gap-1 cursor-pointer hover:bg-indigo-700 hover:text-white"
                          >
                            <Layers size={12} /> General
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <PaginacionSobrio
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="salidas"
        posicion="bottom"
        selectorFilas="#tabla-salidas-lista [data-fila-salida='true']"
        idBuscador="buscador-salidas"
      />
    </div>
  );
};
