// Cabecera de ENCARGOS (SiuMax Nego, 12/11/2026): título, pestañas COTIZACIONES | PEDIDOS y el botón de la derecha,
// en UNA fila (regla del dueño). Con una sola pestaña (negocio solo de servicios, sin pedidos) no se muestran.
import React from 'react';
import { ClipboardList, FileText, Package } from 'lucide-react';

export type PestanaEncargos = 'cotizaciones' | 'pedidos';

export const PESTANAS_ENCARGOS: { id: PestanaEncargos; nombre: string; Icono: typeof FileText; buscador: string }[] = [
  { id: 'cotizaciones', nombre: 'Cotizaciones', Icono: FileText, buscador: 'buscador-cotizaciones' },
  { id: 'pedidos', nombre: 'Pedidos', Icono: Package, buscador: 'buscador-pedidos' },
];

interface Props {
  pestanas: PestanaEncargos[];
  activa: PestanaEncargos;
  onCambiar: (p: PestanaEncargos) => void;
  derecha?: React.ReactNode;     // botón de acción (ej. "Nueva cotización")
  idDerecha?: string;            // su id, para → desde la última pestaña
}

export const CabeceraEncargos: React.FC<Props> = ({ pestanas, activa, onCambiar, derecha, idDerecha }) => {
  const tabs = PESTANAS_ENCARGOS.filter((p) => pestanas.includes(p.id));
  const ir = (id?: string) => { if (id) document.getElementById(id)?.focus(); };
  return (
    <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-wrap justify-between items-center gap-4 shrink-0 font-mono">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 min-w-0 max-w-full">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
            <ClipboardList size={20} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">Encargos</h1>
        </div>
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Encargos" className="pestanas-sobrias flex min-w-0 w-full md:w-auto">
            {tabs.map(({ id, nombre, Icono, buscador }, i) => (
              <button
                key={id}
                id={`tab-encargos-${id}`}
                role="tab"
                aria-selected={activa === id}
                data-activa={activa === id}
                type="button"
                onClick={() => onCambiar(id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); ir(i < tabs.length - 1 ? `tab-encargos-${tabs[i + 1].id}` : idDerecha); }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) ir(`tab-encargos-${tabs[i - 1].id}`); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); ir(activa === id ? buscador : undefined); }
                  else if (e.key === 'ArrowUp') e.preventDefault();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 2xl:px-4 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap rounded-none cursor-pointer"
              >
                <Icono size={14} /> {nombre}
              </button>
            ))}
          </div>
        )}
      </div>
      {derecha && <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">{derecha}</div>}
    </div>
  );
};
