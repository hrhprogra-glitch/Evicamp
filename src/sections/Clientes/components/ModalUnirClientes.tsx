// src/sections/Clientes/components/ModalUnirClientes.tsx
// UNIR CLIENTES REPETIDOS (fase 4.1b): desde el detalle de un cliente se elige el repetido; sus créditos y deudas pasan
// al cliente que queda (el del detalle) y el repetido se borra. Si al que queda le faltan datos (teléfono, DNI…), se
// completan con los del repetido. Pregunta antes. Teclado: escribe para buscar, ↓ a la lista, Enter elige, Esc cierra.
import React, { useEffect, useMemo, useState } from 'react';
import { GitMerge, UserCircle, X } from 'lucide-react';
import type { Cliente } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';
import { CuerpoVentana, CajaLista, FilaLista, LineaDato, claseBuscadorBarra } from '../../../components/ListaVentana';

interface Props {
  queda: Cliente | null;            // el cliente que se queda (null = cerrada)
  clientes: Cliente[];
  onUnir: (queda: Cliente, seVa: Cliente) => Promise<boolean>;
  onClose: () => void;
}

export const ModalUnirClientes: React.FC<Props> = ({ queda, clientes, onUnir, onClose }) => {
  const [busqueda, setBusqueda] = useState('');
  const [uniendo, setUniendo] = useState(false);
  useCerrarConEscape(!!queda, onClose);

  useEffect(() => {
    if (!queda) return;
    setBusqueda('');
    const t = setTimeout(() => document.getElementById('buscar-unir-cliente')?.focus(), 50);
    return () => clearTimeout(t);
  }, [queda]);

  const otros = useMemo(() => {
    if (!queda) return [];
    const resto = clientes.filter((c) => c.id !== queda.id);
    const texto = busqueda.trim();
    return (texto ? resto.filter((c) => coincideBusqueda([c.nombre, c.dni, c.telefono, c.referencia], texto)) : resto)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).slice(0, 100);
  }, [queda, clientes, busqueda]);

  if (!queda) return null;

  const elegir = async (seVa: Cliente) => {
    if (uniendo) return;
    const ok = await confirmar(`¿Unir "${seVa.nombre}" con "${queda.nombre}"?\n\nLos créditos y deudas de "${seVa.nombre}" pasan a "${queda.nombre}" y "${seVa.nombre}" se borra. Los datos que le falten a "${queda.nombre}" se completan con los de "${seVa.nombre}".`);
    if (!ok) { document.getElementById(`unir-${seVa.id}`)?.focus(); return; }
    setUniendo(true);
    try {
      if (await onUnir(queda, seVa)) onClose();
    } finally {
      setUniendo(false);
    }
  };

  const filas = () => Array.from(document.querySelectorAll('[data-unir-fila="true"]')) as HTMLElement[];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label="Unir clientes" className="bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.8)]">
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <GitMerge size={20} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-widest truncate">Unir con {queda.nombre}</h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Elige el cliente REPETIDO: sus créditos pasan aquí y se borra</p>
            </div>
          </div>
          <button id="btn-cerrar-unir" onClick={onClose} title="Cerrar (Escape)"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('buscar-unir-cliente')?.focus(); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <CuerpoVentana>
          <input id="buscar-unir-cliente" autoComplete="off" spellCheck={false} data-lpignore="true" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} placeholder="BUSCAR EL CLIENTE REPETIDO..."
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); filas()[0]?.focus(); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-unir')?.focus(); }
              else if (e.key === 'Enter') { e.preventDefault(); filas()[0]?.focus(); }
            }}
            className={`${claseBuscadorBarra} w-full shrink-0`} />
          <CajaLista vacia={!otros.length} mensaje="No hay otro cliente con ese nombre.">
            {otros.map((c) => (
              <FilaLista key={c.id} id={`unir-${c.id}`} tabIndex={0} data-unir-fila="true" data-row="true"
                onClick={() => void elegir(c)}
                onKeyDown={(e) => {
                  const lista = filas(); const i = lista.indexOf(e.currentTarget);
                  if (e.key === 'ArrowDown') { e.preventDefault(); lista[i + 1]?.focus(); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? lista[i - 1] : document.getElementById('buscar-unir-cliente'))?.focus(); }
                  else if (e.key === 'Enter') { e.preventDefault(); void elegir(c); }
                }}
                icono={<UserCircle size={26} />}
                titulo={c.nombre}
                subtitulo={<LineaDato>{[c.referencia, c.dni ? `${c.tipoDoc || 'DOC'} ${c.dni}` : '', c.telefono].filter(Boolean).join(' · ') || 'Sin datos'}</LineaDato>}
              />
            ))}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
