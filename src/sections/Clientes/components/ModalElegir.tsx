// src/sections/Clientes/components/ModalElegir.tsx
// ELEGIR DE UNA LISTA (fase 4.1, grupos de clientes): buscador + lista (estilo del Directorio). Se usa para elegir el
// grupo de un cliente (con "+ Crear grupo nuevo" arriba) y para agregar clientes a un grupo.
// Teclado: escribe para buscar, ↓ baja a la lista, ↑ ↓ recorren, Enter elige, Esc cierra.
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { coincideBusqueda } from '../../../utils/busqueda';
import { CuerpoVentana, CajaLista, FilaLista, LineaDato, claseBuscadorBarra } from '../../../components/ListaVentana';

export interface OpcionElegir { id: string; titulo: string; subtitulo?: string; buscar?: (string | undefined)[] }

interface Props {
  abierta: boolean;
  titulo: string;
  ayuda: string;
  opciones: OpcionElegir[];
  vacia: string;                                         // mensaje si no hay opciones
  extra?: { titulo: string; alElegir: () => void };      // opción fija arriba (ej. "+ Crear grupo nuevo")
  onElegir: (id: string) => void;
  onClose: () => void;
}

export const ModalElegir: React.FC<Props> = ({ abierta, titulo, ayuda, opciones, vacia, extra, onElegir, onClose }) => {
  const [busqueda, setBusqueda] = useState('');
  useCerrarConEscape(abierta, onClose);
  useEffect(() => {
    if (!abierta) return;
    setBusqueda('');
    const t = setTimeout(() => document.getElementById('buscar-elegir')?.focus(), 50);
    return () => clearTimeout(t);
  }, [abierta]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim();
    return (texto ? opciones.filter((o) => coincideBusqueda([o.titulo, o.subtitulo, ...(o.buscar || [])], texto)) : opciones).slice(0, 150);
  }, [opciones, busqueda]);

  if (!abierta) return null;
  const filas = () => Array.from(document.querySelectorAll('[data-elegir-fila="true"]')) as HTMLElement[];
  const teclasFila = (alElegir: () => void) => (e: React.KeyboardEvent<HTMLElement>) => {
    const lista = filas(); const i = lista.indexOf(e.currentTarget);
    if (e.key === 'ArrowDown') { e.preventDefault(); lista[i + 1]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? lista[i - 1] : document.getElementById('buscar-elegir'))?.focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); alElegir(); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label={titulo} className="bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.8)]">
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id="titulo-elegir" className="text-sm font-black uppercase tracking-widest truncate">{titulo}</h2>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{ayuda}</p>
          </div>
          <button id="btn-cerrar-elegir" onClick={onClose} title="Cerrar (Escape)"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('buscar-elegir')?.focus(); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer"><X size={20} /></button>
        </div>
        <CuerpoVentana>
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
            <input id="buscar-elegir" autoComplete="off" spellCheck={false} data-lpignore="true" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} placeholder="BUSCAR..."
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); filas()[0]?.focus(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-elegir')?.focus(); }
              }}
              className={`${claseBuscadorBarra} w-full pl-8`} />
          </div>
          <CajaLista vacia={!extra && !visibles.length} mensaje={vacia}>
            {extra && (
              <FilaLista id="elegir-extra" tabIndex={0} data-elegir-fila="true" data-row="true"
                onClick={extra.alElegir} onKeyDown={teclasFila(extra.alElegir)}
                icono={<Plus size={24} />} titulo={extra.titulo} />
            )}
            {visibles.map((o) => (
              <FilaLista key={o.id} id={`elegir-${o.id}`} tabIndex={0} data-elegir-fila="true" data-row="true"
                onClick={() => onElegir(o.id)} onKeyDown={teclasFila(() => onElegir(o.id))}
                titulo={o.titulo} subtitulo={o.subtitulo ? <LineaDato>{o.subtitulo}</LineaDato> : undefined} />
            ))}
            {extra && !visibles.length && <p className="p-4 text-center text-[11px] font-bold text-[var(--color-muted)] uppercase">{vacia}</p>}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
