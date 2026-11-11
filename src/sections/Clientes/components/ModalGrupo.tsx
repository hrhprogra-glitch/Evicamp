// src/sections/Clientes/components/ModalGrupo.tsx
// VENTANA DEL GRUPO (fase 4.1): familia o empresa. Lista a sus miembros con la deuda de cada uno y el total del grupo.
// Botones: Cobrar al grupo (estado de cuenta con los créditos de TODOS), Agregar cliente, Editar grupo y Eliminar grupo
// (los miembros quedan sin grupo; sus cuentas y créditos no se tocan). En cada miembro: "Sacar del grupo" (→ desde
// la fila). Enter en un miembro abre su detalle. Teclado: ← → entre botones y dentro de la fila, ↑ ↓ entre filas.
import React, { useEffect, useMemo } from 'react';
import { Users, X, Wallet, UserPlus, Edit, Trash2, UserMinus, UserCircle } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ventanaSuperior } from '../../../utils/ventanas';
import { resumenDeCliente } from './PestanaClientes';
import { CuerpoVentana, BarraFiltros, TextoBarra, CajaLista, FilaLista, LineaDato, DatoFila, claseBotonBarra } from '../../../components/ListaVentana';
import { formatearMonto } from '../../../utils/formato';

interface Props {
  grupo: GrupoClientes | null;     // null = cerrada
  miembros: Cliente[];
  fiados: Fiado[];
  onClose: () => void;
  onCobrar: (g: GrupoClientes) => void;
  onAgregar: (g: GrupoClientes) => void;
  onEditar: (g: GrupoClientes) => void;
  onEliminar: (g: GrupoClientes) => void;
  onSacar: (c: Cliente) => void;
  onVerCliente: (c: Cliente) => void;
}

const soles = (n: number) => `S/ ${formatearMonto(n)}`;
const BOTONES = ['btn-grupo-cobrar', 'btn-grupo-agregar', 'btn-grupo-editar', 'btn-grupo-eliminar'];

export const ModalGrupo: React.FC<Props> = ({ grupo, miembros, fiados, onClose, onCobrar, onAgregar, onEditar, onEliminar, onSacar, onVerCliente }) => {
  useCerrarConEscape(!!grupo, onClose);
  const filasDatos = useMemo(() => miembros.map((c) => ({ c, ...resumenDeCliente(c, fiados) }))
    .sort((a, b) => b.deuda - a.deuda || a.c.nombre.localeCompare(b.c.nombre, 'es')), [miembros, fiados]);
  const deudaTotal = filasDatos.reduce((t, x) => t + x.deuda, 0);

  useEffect(() => {
    if (!grupo) return;
    const t = setTimeout(() => document.getElementById(BOTONES[0])?.focus(), 50);
    return () => clearTimeout(t);
  }, [grupo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!grupo) return null;
  const filas = () => Array.from(document.querySelectorAll('[data-miembro-grupo="true"]')) as HTMLElement[];

  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arriba = ventanaSuperior();
    if (arriba && !arriba.contains(document.getElementById('btn-cerrar-grupo'))) return;
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const enBoton = BOTONES.includes(a.id);
    const fila = (a.closest('[data-miembro-grupo="true"]') as HTMLElement | null);
    const lista = filas(); const i = fila ? lista.indexOf(fila) : -1;
    if (enBoton && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const k = BOTONES.indexOf(a.id);
      document.getElementById(BOTONES[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), BOTONES.length - 1)])?.focus();
    } else if (fila && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const partes = [fila, ...Array.from(fila.querySelectorAll('[data-accion-miembro]'))] as HTMLElement[];
      const k = partes.indexOf(a);
      partes[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), partes.length - 1)]?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a.id === 'btn-cerrar-grupo') document.getElementById(BOTONES[0])?.focus();
      else if (enBoton) lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) lista[i + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBoton) document.getElementById('btn-cerrar-grupo')?.focus();
      else if (i > 0) lista[i - 1].focus();
      else if (i === 0) document.getElementById(BOTONES[0])?.focus();
    } else if (e.key === 'Enter' && fila && a === fila) {
      e.preventDefault();
      onVerCliente(filasDatos[i].c);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={teclas}>
      <div role="dialog" aria-label={`Grupo ${grupo.nombre}`} className="ventana-sobria bg-[var(--color-surface)] w-full max-w-4xl border-2 border-[var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.85)]">
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Users size={22} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-grupo" className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest truncate">{grupo.nombre}</h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                {grupo.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'}{grupo.ruc ? ` · RUC ${grupo.ruc}` : ''}
                {grupo.descuentoPorcentaje != null && grupo.descuentoPorcentaje > 0 ? ` · 🏷️ ${grupo.descuentoPorcentaje}% DCTO` : ''} · {miembros.length} persona{miembros.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button id="btn-cerrar-grupo" onClick={onClose} title="Cerrar (Escape)"
            className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer"><X size={20} /></button>
        </div>
        <CuerpoVentana>
          {/* CIFRAS DEL GRUPO (ESTILO SIUMAX SOBRIO) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[var(--color-border)] border-2 border-[var(--color-ink)] shrink-0">
            <div className="bg-white p-3 sm:p-4 text-center flex flex-col justify-center items-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">Miembros</span>
              <span className="text-sm sm:text-base font-black font-mono text-[var(--color-ink)] mt-0.5">
                {miembros.length} PERSONA{miembros.length === 1 ? '' : 'S'}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mt-0.5">
                {grupo.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'}
              </span>
            </div>
            <div className="bg-white p-3 sm:p-4 text-center flex flex-col justify-center items-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">Descuento</span>
              <span className="text-sm sm:text-base font-black font-mono text-[var(--color-ink)] mt-0.5">
                {grupo.descuentoPorcentaje != null && grupo.descuentoPorcentaje > 0 ? `🏷️ ${grupo.descuentoPorcentaje}% DCTO` : 'SIN DCTO'}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mt-0.5">
                {grupo.descuentoPorcentaje != null && grupo.descuentoPorcentaje > 0 ? 'Aplicado en cada venta' : 'Tarifa estándar'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white p-3 sm:p-4 text-center flex flex-col justify-center items-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">Deuda del Grupo</span>
              <span id="deuda-grupo" className={`text-base sm:text-lg font-black font-mono mt-0.5 ${deudaTotal > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>
                {soles(deudaTotal)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                {deudaTotal > 0.05 ? (
                  <span className="text-[var(--color-danger)] font-black">Créditos pendientes</span>
                ) : (
                  <span className="text-[var(--color-muted)]">Al día · Sin deuda</span>
                )}
              </span>
            </div>
          </div>

          {/* BARRA DE ACCIONES (4 BOTONES ALINEADOS EN FILA SIMÉTRICA) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <button
              id={BOTONES[0]}
              type="button"
              onClick={() => onCobrar(grupo)}
              className="h-[44px] px-3 sm:px-4 border-2 border-[var(--color-border)] hover:border-[var(--color-ink)] bg-white text-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)]"
            >
              <Wallet size={15} className="shrink-0" />
              <span className="truncate">Cobrar al grupo</span>
            </button>
            <button
              id={BOTONES[1]}
              type="button"
              onClick={() => onAgregar(grupo)}
              className="h-[44px] px-3 sm:px-4 border-2 border-[var(--color-border)] hover:border-[var(--color-ink)] bg-white text-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)]"
            >
              <UserPlus size={15} className="shrink-0" />
              <span className="truncate">Agregar cliente</span>
            </button>
            <button
              id={BOTONES[2]}
              type="button"
              onClick={() => onEditar(grupo)}
              className="h-[44px] px-3 sm:px-4 border-2 border-[var(--color-border)] hover:border-[var(--color-ink)] bg-white text-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)]"
            >
              <Edit size={15} className="shrink-0" />
              <span className="truncate">Editar grupo</span>
            </button>
            <button
              id={BOTONES[3]}
              type="button"
              onClick={() => onEliminar(grupo)}
              className="h-[44px] px-3 sm:px-4 border-2 border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] bg-white text-[var(--color-muted)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-danger)]"
            >
              <Trash2 size={15} className="shrink-0" />
              <span className="truncate">Eliminar grupo</span>
            </button>
          </div>

          <CajaLista vacia={!filasDatos.length} mensaje="Este grupo todavía no tiene clientes: usa 'Agregar cliente'.">
            {filasDatos.map(({ c, deuda, creditos }) => (
              <FilaLista key={c.id} tabIndex={0} data-miembro-grupo="true" data-row="true" data-cliente-id={c.id}
                onClick={() => onVerCliente(c)}
                icono={<UserCircle size={26} />}
                titulo={c.nombre}
                subtitulo={<LineaDato>{[c.referencia, c.dni && `DNI ${c.dni}`, c.ruc && `RUC ${c.ruc}`, c.telefono].filter(Boolean).join(' · ') || `${creditos} crédito${creditos === 1 ? '' : 's'}`}</LineaDato>}
                derecha={<>
                  <DatoFila etiqueta="Debe" valor={soles(deuda)} tono={deuda > 0.05 ? 'rojo' : 'normal'} />
                  <button data-accion-miembro="sacar" type="button" tabIndex={-1} title="Sacar del grupo"
                    onClick={(e) => { e.stopPropagation(); onSacar(c); }}
                    className="ml-3 p-1.5 border-2 border-transparent text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] focus:outline-none focus:bg-[var(--color-danger)] focus:text-white cursor-pointer">
                    <UserMinus size={18} />
                  </button>
                </>}
              />
            ))}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
