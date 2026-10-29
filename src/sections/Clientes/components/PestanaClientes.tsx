// src/sections/Clientes/components/PestanaClientes.tsx
// PESTAÑA "CLIENTES" (fase 4.1): el directorio de clientes como pantalla principal (antes era la ventana
// "Directorio Clientes"). Lista en tabla con buscador (nombre, documento, teléfono o referencia), filtro de deuda y
// orden; "Nuevo cliente"; en cada fila Editar y Eliminar (← → desde la fila). Enter en una fila abre su ficha.
// Teclado propio (onKeyDown en cada control), sin oyentes globales: así no choca con la pestaña Créditos.
import React, { useMemo, useState } from 'react';
import { Edit, Plus, Trash2, ChevronLeft, ChevronRight, FilterX, MapPin } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes } from '../types';
import { coincideBusqueda } from '../../../utils/busqueda';

interface Props {
  clientes: Cliente[];
  fiados: Fiado[];
  grupos?: GrupoClientes[];                // para mostrar (y buscar) el grupo de cada cliente
  onNuevo: () => void;
  onAbrir: (cliente: Cliente) => void;     // Enter en la fila
  onEditar: (cliente: Cliente) => void;
  onEliminar: (cliente: Cliente) => void;
  idPestana: string;                       // el botón de la pestaña (↑ desde la barra vuelve ahí)
}

const POR_PAGINA = 50;
const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');

/** Deuda y último crédito de un cliente (sus fiados por id o, los antiguos sin id, por nombre). */
export const resumenDeCliente = (cliente: Cliente, fiados: Fiado[]) => {
  const cId = String(cliente.id || '').trim();
  const cNombre = (cliente.nombre || '').trim().toUpperCase();
  const suyos = fiados.filter((f) => {
    const fId = String(f.clienteId || '').trim();
    const fNombre = (f.clienteNombre || '').trim().toUpperCase();
    if (fId && cId && fId === cId) return true;
    if (fNombre && cNombre && fNombre === cNombre) return true;
    return false;
  });
  const deuda = suyos.reduce((t, f) => t + (Number(f.saldoPendiente) || 0), 0);
  const ultimo = suyos.reduce<string | undefined>((u, f) => (!u || (f.fechaEmision && f.fechaEmision > u) ? f.fechaEmision : u), undefined);
  const hoyStr = new Date().toLocaleDateString('en-CA');
  const tieneVencido = suyos.some((f) => (Number(f.saldoPendiente) || 0) > 0.05 && f.fechaVencimiento && f.fechaVencimiento.slice(0, 10) < hoyStr);
  return { deuda, ultimo, creditos: suyos.length, tieneVencido };
};

export const PestanaClientes: React.FC<Props> = ({ clientes, fiados, grupos = [], onNuevo, onAbrir, onEditar, onEliminar, idPestana }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'TODOS' | 'CON_DEUDA' | 'SIN_DEUDA'>('TODOS');
  const [orden, setOrden] = useState<'A-Z' | 'DEUDA'>('DEUDA');
  const [pagina, setPagina] = useState(1);

  const filas = useMemo(() => {
    const nombreGrupo = new Map(grupos.map((g) => [g.id, g.nombre]));
    const conResumen = clientes.map((c) => ({ c, grupo: c.grupoId ? nombreGrupo.get(c.grupoId) || '' : '', ...resumenDeCliente(c, fiados) }));
    const texto = busqueda.trim();
    let lista = texto ? conResumen.filter(({ c, grupo }) => coincideBusqueda([c.nombre, c.dni, c.ruc, c.telefono, c.referencia, c.direccion, grupo], texto)) : conResumen;
    if (filtro === 'CON_DEUDA') lista = lista.filter((x) => x.deuda > 0.05);
    if (filtro === 'SIN_DEUDA') lista = lista.filter((x) => x.deuda <= 0.05);
    return [...lista].sort((a, b) => (orden === 'DEUDA' ? b.deuda - a.deuda : a.c.nombre.localeCompare(b.c.nombre, 'es')));
  }, [clientes, fiados, grupos, busqueda, filtro, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaReal = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA);
  const hayFiltros = !!busqueda || filtro !== 'TODOS' || orden !== 'DEUDA';

  const renderPaginacion = (posicion: 'arriba' | 'abajo') => {
    const prevId = posicion === 'arriba' ? 'btn-pagina-ant-clientes-arriba' : 'btn-pagina-ant-clientes';
    const sigId = posicion === 'arriba' ? 'btn-pagina-sig-clientes-arriba' : 'btn-pagina-sig-clientes';
    const bordeClase = posicion === 'arriba' ? 'border-b-2' : 'border-t-2';

    return (
      <div className={`p-3 ${bordeClase} border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center gap-2 shrink-0`}>
        <p className="text-[11px] sm:text-[12px] font-black text-[var(--color-muted)] uppercase">
          {filas.length ? `Mostrando ${(paginaReal - 1) * POR_PAGINA + 1} - ${Math.min(paginaReal * POR_PAGINA, filas.length)} de ${filas.length} clientes` : '0 clientes'}
        </p>
        <div className="flex gap-2">
          <button
            id={prevId}
            type="button"
            onClick={() => setPagina(Math.max(1, paginaReal - 1))}
            aria-disabled={paginaReal === 1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                irA(sigId);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  filasDom()[0]?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  irA('buscador-clientes');
                } else {
                  const list = filasDom();
                  list[list.length - 1]?.focus();
                }
              }
            }}
            className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] aria-disabled:opacity-40 aria-disabled:cursor-not-allowed hover:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex items-center px-2 sm:px-4 whitespace-nowrap border-2 border-[var(--color-border)] bg-white text-xs font-black text-[var(--color-ink)]">
            Pág {paginaReal} / {totalPaginas}
          </span>
          <button
            id={sigId}
            type="button"
            onClick={() => setPagina(Math.min(totalPaginas, paginaReal + 1))}
            aria-disabled={paginaReal === totalPaginas}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                irA(prevId);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  filasDom()[0]?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  irA('buscador-clientes');
                } else {
                  const list = filasDom();
                  list[list.length - 1]?.focus();
                }
              }
            }}
            className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] aria-disabled:opacity-40 aria-disabled:cursor-not-allowed hover:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
            title="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const filasDom = () => Array.from(document.querySelectorAll('[data-fila-cliente="true"]')) as HTMLElement[];
  const irA = (id: string) => document.getElementById(id)?.focus();
  // Barra: buscador → filtro → orden → limpiar → nuevo (← →); ↓ baja a la lista; ↑ sube a la pestaña
  const barra = ['buscador-clientes', 'filtro-deuda-clientes', 'orden-clientes', ...(hayFiltros ? ['btn-limpiar-clientes'] : []), 'btn-nuevo-cliente'];
  const teclasBarra = (id: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    const i = barra.indexOf(id);
    const esTexto = e.currentTarget instanceof HTMLInputElement;
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const topPag = document.getElementById('btn-pagina-ant-clientes-arriba');
      if (topPag && totalPaginas > 1) {
        topPag.focus();
      } else {
        filasDom()[0]?.focus();
      }
    }
    else if (e.key === 'ArrowUp') { e.preventDefault(); irA(idPestana); }
    else if (e.key === 'ArrowRight' && (!esTexto || input.selectionEnd === input.value.length)) { e.preventDefault(); irA(barra[Math.min(i + 1, barra.length - 1)]); }
    else if (e.key === 'ArrowLeft' && (!esTexto || input.selectionStart === 0)) { e.preventDefault(); irA(barra[Math.max(i - 1, 0)]); }
    else if (e.key === 'Enter' && e.currentTarget instanceof HTMLSelectElement) { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } }
  };
  const teclasFila = (cliente: Cliente) => (e: React.KeyboardEvent<HTMLElement>) => {
    // Un solo oyente en la fila (las teclas de sus botones suben hasta aquí): cada tecla se atiende una vez
    const fila = e.currentTarget as HTMLElement;
    const lista = filasDom();
    const i = lista.indexOf(fila);
    const partes = [fila, ...Array.from(fila.querySelectorAll('[data-accion-cliente]'))] as HTMLElement[];
    const k = partes.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
      else irA(paginaReal < totalPaginas ? 'btn-pagina-sig-clientes' : 'btn-pagina-ant-clientes');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (lista[i - 1]) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else {
        const topPag = document.getElementById('btn-pagina-ant-clientes-arriba');
        if (topPag && totalPaginas > 1) topPag.focus();
        else irA('buscador-clientes');
      }
    } else if (e.key === 'ArrowRight') { e.preventDefault(); partes[Math.min(k + 1, partes.length - 1)]?.focus(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); partes[Math.max(k - 1, 0)]?.focus(); }
    // Enter en la fila abre; en un botón de la fila, el botón hace lo suyo (Editar / Eliminar)
    else if (e.key === 'Enter' && e.target === fila) { e.preventDefault(); onAbrir(cliente); }
  };

  const claseSelect = 'w-full min-w-0 lg:w-48 border-2 border-[var(--color-border)] px-2 sm:px-4 py-3 text-xs sm:text-sm font-black uppercase outline-none focus:border-[var(--color-info)] bg-white cursor-pointer rounded-none';

  return (
    <div className="flex flex-col border-2 border-[var(--color-ink)] bg-white">
      {/* BARRA */}
      <div className="p-3 border-b-2 border-[var(--color-border)] grid grid-cols-3 lg:flex gap-2 sm:gap-3 shrink-0">
        <input id="buscador-clientes" autoComplete="off" spellCheck={false} data-lpignore="true"
          placeholder="BUSCAR NOMBRE, GRUPO, DNI/RUC, TELÉFONO O REFERENCIA..." value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} onKeyDown={teclasBarra('buscador-clientes')}
          className="col-span-3 lg:flex-1 min-w-0 lg:min-w-[200px] border-2 border-[var(--color-border)] px-3 sm:px-4 py-3 text-sm font-black uppercase outline-none focus:border-[var(--color-info)] rounded-none" />
        <select id="filtro-deuda-clientes" value={filtro} onChange={(e) => { setFiltro(e.target.value as typeof filtro); setPagina(1); }} onKeyDown={teclasBarra('filtro-deuda-clientes')} className={claseSelect}>
          <option value="TODOS">TODOS</option>
          <option value="CON_DEUDA">CON DEUDA</option>
          <option value="SIN_DEUDA">SIN DEUDA</option>
        </select>
        <select id="orden-clientes" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} onKeyDown={teclasBarra('orden-clientes')} className={claseSelect}>
          <option value="DEUDA">MAYOR DEUDA</option>
          <option value="A-Z">A - Z</option>
        </select>
        {hayFiltros && (
          <button id="btn-limpiar-clientes" type="button" title="Limpiar filtros" onKeyDown={teclasBarra('btn-limpiar-clientes')}
            onClick={() => { setBusqueda(''); setFiltro('TODOS'); setOrden('DEUDA'); setPagina(1); setTimeout(() => irA('buscador-clientes'), 30); }}
            className="p-3 border-2 bg-[var(--color-danger)] text-white border-[var(--color-danger)] hover:brightness-110 cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-ink)]">
            <FilterX size={20} strokeWidth={3} />
          </button>
        )}
        <button id="btn-nuevo-cliente" type="button" onClick={onNuevo} onKeyDown={teclasBarra('btn-nuevo-cliente')}
          className="col-span-3 lg:col-span-1 h-12 bg-[var(--color-accent)] text-[var(--color-ink)] px-4 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] cursor-pointer whitespace-nowrap">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* PAGINACIÓN SUPERIOR */}
      {renderPaginacion('arriba')}

      {/* TABLA: SIN SCROLL VERTICAL INTERNO (el scroll lo maneja la ventana general) */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[var(--color-ink)] text-white z-10">
            <tr className="uppercase text-[11px] font-black tracking-widest">
              {/* DNI/RUC, teléfono, plazo y dirección se ven SIEMPRE */}
              <th className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6 border-r border-white/20">Cliente / Empresa</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">Grupo</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">DNI / RUC</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">Teléfono</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20 text-center">Plazo</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">Dirección</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20 text-right">Deuda</th>
              <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20 text-center">Último crédito</th>
              <th className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold divide-y-2 divide-[var(--color-border)] border-b-2 border-[var(--color-border)]">
            {visibles.length ? visibles.map(({ c, grupo, deuda, ultimo, tieneVencido }) => (
              <tr key={c.id} role="button" tabIndex={0} data-row="true" data-fila-cliente="true" data-cliente-id={c.id}
                onClick={() => onAbrir(c)} onKeyDown={teclasFila(c)}
                className="hover:bg-[var(--color-surface)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] cursor-pointer">
                <td className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6">
                  <span className="font-black text-[var(--color-ink)] uppercase text-base">{c.nombre}</span>
                  {c.referencia && <span className="block text-xs text-[var(--color-muted)] mt-0.5 normal-case">{c.referencia}</span>}
                </td>
                <td data-col="grupo" className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">
                  {grupo ? (
                    <span data-grupo-cliente="true" className="inline-block px-2 py-0.5 text-[11px] font-black uppercase border border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg)]">
                      {grupo}
                    </span>
                  ) : (
                    <span className="text-[var(--color-subtle)]">—</span>
                  )}
                </td>
                <td data-col="documento" className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">
                  {c.dni || c.ruc ? (<>
                    {c.dni && <span className="block"><span className="text-[11px] text-[var(--color-muted)]">DNI</span> {c.dni}</span>}
                    {c.ruc && <span className="block"><span className="text-[11px] text-[var(--color-muted)]">RUC</span> {c.ruc}</span>}
                  </>) : <span className="text-[var(--color-subtle)]">—</span>}
                </td>
                <td data-col="telefono" className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">{c.telefono || <span className="text-[var(--color-subtle)]">—</span>}</td>
                <td data-col="plazo" className="py-3 sm:py-4 px-3 sm:px-4 text-center whitespace-nowrap">
                  {c.diasPlazo != null ? (
                    <span className="inline-block px-2.5 py-1 text-xs font-black uppercase border border-[var(--color-info)] text-[var(--color-info)] bg-[var(--color-info-bg)]">
                      {c.diasPlazo} días
                    </span>
                  ) : (
                    <span className="text-[var(--color-subtle)] font-bold">—</span>
                  )}
                </td>
                <td data-col="direccion" className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] max-w-[240px]">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate" title={c.direccion || ''}>{c.direccion || <span className="text-[var(--color-subtle)]">—</span>}</span>
                    {c.ubicacion && (
                      // Link de ubicación (Google Maps): se abre aparte; no le quita el selector a la fila
                      <a href={c.ubicacion} target="_blank" rel="noopener noreferrer" tabIndex={-1} data-ubicacion-cliente="true"
                        onClick={(e) => e.stopPropagation()} title="Ver ubicación"
                        className="shrink-0 text-[var(--color-info)] hover:text-[var(--color-ink)]"><MapPin size={16} /></a>
                    )}
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-3 sm:px-4 text-right whitespace-nowrap">
                  <span className={`font-black ${deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-subtle)]'}`}>S/ {deuda.toFixed(2)}</span>
                  {tieneVencido && (
                    <span className="block text-[10px] font-black text-[var(--color-danger)] uppercase tracking-wider">
                      Vencido
                    </span>
                  )}
                </td>
                <td className="py-3 sm:py-4 px-3 sm:px-4 text-center text-[var(--color-muted)] whitespace-nowrap">{fecha(ultimo)}</td>
                <td className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6">
                  <div className="flex items-center justify-center gap-2">
                    <button data-accion-cliente="editar" tabIndex={-1} title="Editar cliente"
                      onClick={(e) => { e.stopPropagation(); onEditar(c); }}
                      className="p-2 border-2 border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-success)] hover:text-[var(--color-success)] focus:outline-none focus:bg-[var(--color-success)] focus:text-white focus:border-[var(--color-success)] cursor-pointer">
                      <Edit size={18} />
                    </button>
                    <button data-accion-cliente="eliminar" tabIndex={-1} title="Eliminar cliente"
                      onClick={(e) => { e.stopPropagation(); onEliminar(c); }}
                      className="p-2 border-2 border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus:outline-none focus:bg-[var(--color-danger)] focus:text-white focus:border-[var(--color-danger)] cursor-pointer">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[var(--color-muted)] font-black uppercase tracking-widest text-sm bg-[var(--color-bg)]">
                  <span className="inline-block border-2 border-[var(--color-muted)] p-4 border-dashed">{clientes.length ? 'No se encontraron clientes' : 'Todavía no hay clientes'}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN INFERIOR */}
      {renderPaginacion('abajo')}
    </div>
  );
};
