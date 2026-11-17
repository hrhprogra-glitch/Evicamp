import React, { useState } from 'react';
import { Eye, Edit3, Search } from 'lucide-react';
import { PaginacionSobrio } from '../../../components/PaginacionSobrio';
import type { Contrato } from '../types';

interface TablaContratosProps {
  contratos: Contrato[];
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  onVerDetalle: (contrato: Contrato) => void;
  onEditar: (contrato: Contrato) => void;
}

export const TablaContratos: React.FC<TablaContratosProps> = ({
  contratos,
  pagina,
  totalPaginas,
  onCambiarPagina,
  onVerDetalle,
  onEditar,
}) => {
  const [filaSeleccionada, setFilaSeleccionada] = useState<number>(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number, contrato: Contrato) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index === contratos.length - 1) {
        document.getElementById('btn-pag-bottom-contratos-ant')?.focus();
        return;
      }
      const next = Math.min(contratos.length - 1, index + 1);
      setFilaSeleccionada(next);
      document.getElementById(`fila-contrato-${next}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        document.getElementById('btn-pag-contratos-sig')?.focus();
        return;
      }
      const prev = Math.max(0, index - 1);
      setFilaSeleccionada(prev);
      document.getElementById(`fila-contrato-${prev}`)?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onVerDetalle(contrato);
    }
  };

  return (
    <div className="tabla-marco flex flex-col">
      <PaginacionSobrio
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="contratos"
        posicion="top"
        selectorFilas="#tabla-contratos [data-row='true']"
        idBuscador="buscador-contratos"
      />

      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[980px]" id="tabla-contratos">
          {contratos.length === 0 ? (
            <div className="vacio-sobrio">
              <Search size={32} />
              No hay contratos registrados con esos parámetros.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="tabla-cabecera sticky top-0 z-10">
                <tr>
                  <th className="p-4">Código</th>
                  <th className="p-4">Título / Bien Atendido</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Frecuencia / Cobro</th>
                  <th className="p-4 text-right">Precio Período</th>
                  <th className="p-4">Técnico</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)]">
                {contratos.map((c, idx) => (
                  <tr
                    key={c.id}
                    id={`fila-contrato-${idx}`}
                    data-row="true"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, idx, c)}
                    onClick={() => onVerDetalle(c)}
                    className="tabla-fila h-[79px] cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-[var(--color-ink)] whitespace-nowrap">
                      <span className="px-1.5 py-0.5 bg-[var(--color-bg-2)] border border-[var(--color-border)] font-black text-[11px]">
                        {c.codigo}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[var(--color-ink)]">{c.titulo}</div>
                      {c.bien && (
                        <div className="text-[10px] text-[var(--color-muted)]">
                          {c.bien.nombre} ({c.bien.tipo})
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[var(--color-ink)]">{c.customer?.name || 'Cliente'}</div>
                      {c.customer?.telefono && (
                        <div className="text-[10px] text-[var(--color-muted)]">{c.customer.telefono}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[var(--color-ink)]">{c.frecuencia}</div>
                      <div className="text-[10px] text-[var(--color-muted)]">Cobro día {c.dia_cobro}</div>
                    </td>
                    <td className="p-4 text-right font-black text-sm text-[var(--color-ink)] whitespace-nowrap">
                      S/ {Number(c.precio_periodo).toFixed(2)}
                    </td>
                    <td className="p-4 text-[var(--color-ink)] whitespace-nowrap">
                      {c.tecnico?.nombre || <span className="text-[var(--color-muted)]">Sin asignar</span>}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                          c.estado === 'ACTIVO'
                            ? 'bg-green-100 text-green-900 border-green-400'
                            : 'bg-yellow-100 text-yellow-900 border-yellow-400'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-ver-contrato-${c.id}`}
                          onClick={() => onVerDetalle(c)}
                          title="Ver detalles, visitas y cobros"
                          className="p-1 border border-[var(--color-border)] hover:border-[var(--color-ink)] text-[var(--color-ink)] transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          id={`btn-editar-contrato-${c.id}`}
                          onClick={() => onEditar(c)}
                          title="Editar contrato"
                          className="p-1 border border-[var(--color-border)] hover:border-[var(--color-ink)] text-[var(--color-ink)] transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
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
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={onCambiarPagina}
        prefijo="contratos"
        posicion="bottom"
        selectorFilas="#tabla-contratos [data-row='true']"
        idBuscador="buscador-contratos"
      />
    </div>
  );
};
