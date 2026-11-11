// src/sections/Clientes/components/PestanaClientes.tsx
// PESTAÑA "CLIENTES" (fase 4.1): el directorio de clientes como pantalla principal (antes era la ventana
// "Directorio Clientes"). Lista en tabla con buscador (nombre, documento, teléfono o referencia), filtro de deuda y
// orden; "Nuevo cliente"; en cada fila Editar y Eliminar (← → desde la fila). Enter en una fila abre su ficha.
// Teclado propio (onKeyDown en cada control), sin oyentes globales: así no choca con la pestaña Créditos.
import { filaEnMedio } from '../../../utils/flechasEspaciales';
import React, { useMemo, useState } from 'react';
import { Edit, Plus, Trash2, ChevronLeft, ChevronRight, FilterX, MapPin, Search, X } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes } from '../types';
import { coincideBusqueda } from '../../../utils/busqueda';
import { formatearMonto } from '../../../utils/formato';

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
  const [orden, setOrden] = useState<'RECIENTES' | 'A-Z' | 'DEUDA'>('RECIENTES');
  const [pagina, setPagina] = useState(1);

  const filas = useMemo(() => {
    const nombreGrupo = new Map(grupos.map((g) => [g.id, g.nombre]));
    const conResumen = clientes.map((c) => ({ c, grupo: c.grupoId ? nombreGrupo.get(c.grupoId) || '' : '', ...resumenDeCliente(c, fiados) }));
    const texto = busqueda.trim();
    let lista = texto ? conResumen.filter(({ c, grupo }) => coincideBusqueda([c.nombre, c.dni, c.ruc, c.telefono, c.referencia, c.direccion, grupo], texto)) : conResumen;
    if (filtro === 'CON_DEUDA') lista = lista.filter((x) => x.deuda > 0.05);
    if (filtro === 'SIN_DEUDA') lista = lista.filter((x) => x.deuda <= 0.05);
    return [...lista].sort((a, b) => {
      if (orden === 'RECIENTES') return (Number(b.c.id) || 0) - (Number(a.c.id) || 0);
      if (orden === 'DEUDA') {
        const diff = b.deuda - a.deuda;
        if (Math.abs(diff) > 0.001) return diff;
        return (Number(b.c.id) || 0) - (Number(a.c.id) || 0);
      }
      return a.c.nombre.localeCompare(b.c.nombre, 'es');
    });
  }, [clientes, fiados, grupos, busqueda, filtro, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaReal = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA);
  const hayFiltros = !!busqueda || filtro !== 'TODOS' || orden !== 'DEUDA';

  const claseBotonPag = 'paginacion-sobria__boton'; // como la paginación de Inventario

  const renderPaginacion = (posicion: 'arriba' | 'abajo') => {
    if (!filas.length) return null; // como Inventario: sin filas no hay paginación
    const prevId = posicion === 'arriba' ? 'btn-pagina-ant-clientes-arriba' : 'btn-pagina-ant-clientes';
    const sigId = posicion === 'arriba' ? 'btn-pagina-sig-clientes-arriba' : 'btn-pagina-sig-clientes';
    const bordeClase = posicion === 'arriba' ? 'border-b' : 'border-t';

    return (
      <div className={`paginacion-sobria ${bordeClase} shrink-0`}>
        <span className="paginacion-sobria__texto">Página {paginaReal} de {totalPaginas}</span>
        <div className="flex gap-2">
          <button
            id={prevId}
            type="button"
            tabIndex={0}
            onClick={() => {
              if (paginaReal > 1) {
                setPagina(paginaReal - 1);
                setTimeout(() => irA(prevId), 30);
              }
            }}
            aria-disabled={paginaReal === 1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                irA(sigId);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (posicion === 'arriba') irA('buscador-clientes');
                // En abajo se mantiene como tope
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  const f0 = filasDom()[0];
                  if (f0) { f0.focus(); f0.scrollIntoView({ block: 'nearest' }); }
                }
                // En la paginación de abajo se mantiene como TOPE (no sube a ningún lado)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  irA('buscador-clientes');
                } else {
                  const list = filasDom();
                  const ult = list[list.length - 1];
                  if (ult) { ult.focus(); ult.scrollIntoView({ block: 'nearest' }); }
                }
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (paginaReal > 1) {
                  setPagina(paginaReal - 1);
                  setTimeout(() => irA(prevId), 30);
                }
              }
            }}
            className={claseBotonPag}
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            id={sigId}
            type="button"
            tabIndex={0}
            onClick={() => {
              if (paginaReal < totalPaginas) {
                setPagina(paginaReal + 1);
                setTimeout(() => irA(sigId), 30);
              }
            }}
            aria-disabled={paginaReal === totalPaginas}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                irA(prevId);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                // En abajo se mantiene como TOPE (no sube al buscador)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  const f0 = filasDom()[0];
                  if (f0) { f0.focus(); f0.scrollIntoView({ block: 'nearest' }); }
                }
                // En la paginación de abajo se mantiene como TOPE (no sube a ningún lado)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (posicion === 'arriba') {
                  irA('buscador-clientes');
                } else {
                  const list = filasDom();
                  const ult = list[list.length - 1];
                  if (ult) { ult.focus(); ult.scrollIntoView({ block: 'nearest' }); }
                }
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (paginaReal < totalPaginas) {
                  setPagina(paginaReal + 1);
                  setTimeout(() => irA(sigId), 30);
                }
              }
            }}
            className={claseBotonPag}
            title="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const filasDom = () => Array.from(document.querySelectorAll('[data-fila-cliente="true"]')) as HTMLElement[];
  const irA = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
    }
  };
  // Barra: buscador → (borrar si hay texto) → filtro → orden → limpiar (← →); ↓ baja a la lista; ↑ sube a la pestaña
  // "Nuevo cliente" está en la cabecera de la sección (como "Nuevo producto" en Inventario)
  const barra = busqueda
    ? ['buscador-clientes', 'btn-borrar-buscador-clientes', 'filtro-deuda-clientes', 'orden-clientes', 'btn-limpiar-clientes']
    : ['buscador-clientes', 'filtro-deuda-clientes', 'orden-clientes', 'btn-limpiar-clientes'];
  const teclasBarra = (id: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    const i = barra.indexOf(id);
    const esTexto = e.currentTarget instanceof HTMLInputElement;
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Si está en la derecha (nuevo cliente o limpiar), bajar a página siguiente arriba
      if (id === 'btn-nuevo-cliente' || id === 'btn-limpiar-clientes') {
        const sigTop = document.getElementById('btn-pagina-sig-clientes-arriba');
        if (sigTop) {
          sigTop.focus();
          sigTop.scrollIntoView({ block: 'nearest' });
          return;
        }
      }
      // Si está en la izquierda, bajar a página anterior arriba
      const antTop = document.getElementById('btn-pagina-ant-clientes-arriba');
      const sigTop = document.getElementById('btn-pagina-sig-clientes-arriba');
      if (antTop) {
        antTop.focus();
        antTop.scrollIntoView({ block: 'nearest' });
      } else if (sigTop) {
        sigTop.focus();
        sigTop.scrollIntoView({ block: 'nearest' });
      } else {
        const f0 = filasDom()[0];
        if (f0) { f0.focus(); f0.scrollIntoView({ block: 'nearest' }); }
      }
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const medio = filaEnMedio(e.currentTarget, document.getElementById(idPestana), ['btn-nuevo-cliente', 'btn-ver-grupos']);
      if (medio) medio.focus(); else irA(idPestana);
    }
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
      if (lista[i + 1]) {
        lista[i + 1].focus();
        lista[i + 1].scrollIntoView({ block: 'nearest' });
      } else {
        // Al final de la tabla: pasar a la paginación de abajo
        // Si hay siguiente página, va a "Página Siguiente", si no a "Página Anterior"
        const sigAbajo = document.getElementById('btn-pagina-sig-clientes');
        const antAbajo = document.getElementById('btn-pagina-ant-clientes');
        const destino = (paginaReal < totalPaginas ? sigAbajo : antAbajo) || sigAbajo || antAbajo;
        if (destino) {
          destino.focus();
          destino.scrollIntoView({ block: 'nearest' });
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (lista[i - 1]) {
        lista[i - 1].focus();
        lista[i - 1].scrollIntoView({ block: 'nearest' });
      } else {
        // En la primera fila (i === 0), subir a la paginación superior
        const sigArriba = document.getElementById('btn-pagina-sig-clientes-arriba');
        const antArriba = document.getElementById('btn-pagina-ant-clientes-arriba');
        const destino = (k > 0 ? sigArriba : antArriba) || antArriba || sigArriba;
        if (destino) {
          destino.focus();
          destino.scrollIntoView({ block: 'nearest' });
        } else {
          irA('buscador-clientes');
        }
      }
    } else if (e.key === 'ArrowRight') { e.preventDefault(); partes[Math.min(k + 1, partes.length - 1)]?.focus(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); partes[Math.max(k - 1, 0)]?.focus(); }
    // Enter en la fila abre; en un botón de la fila, el botón hace lo suyo (Editar / Eliminar)
    else if (e.key === 'Enter' && e.target === fila) { e.preventDefault(); onAbrir(cliente); }
  };

  const claseSelect = 'filtro-sobrio w-full sm:w-auto'; // como los filtros de Inventario

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* BUSCADOR Y FILTROS (fuera del marco de la tabla, como Inventario) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input id="buscador-clientes" autoComplete="off" spellCheck={false} data-lpignore="true"
            placeholder="BUSCAR NOMBRE, GRUPO, DNI/RUC, TELÉFONO O REFERENCIA..." value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            onKeyDown={(e) => { if (e.key === 'Escape' && busqueda) { e.preventDefault(); e.stopPropagation(); setBusqueda(''); setPagina(1); return; } teclasBarra('buscador-clientes')(e); }}
            style={{ paddingRight: busqueda ? '8rem' : undefined }} />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{filas.length} MATCH</span>
              <button 
                id="btn-borrar-buscador-clientes"
                type="button" 
                title="Borrar búsqueda" 
                className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); setPagina(1); irA('buscador-clientes'); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setBusqueda('');
                    setPagina(1);
                    irA('buscador-clientes');
                  } else {
                    teclasBarra('btn-borrar-buscador-clientes')(e);
                  }
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
        <select id="filtro-deuda-clientes" value={filtro} onChange={(e) => { setFiltro(e.target.value as typeof filtro); setPagina(1); }} onKeyDown={teclasBarra('filtro-deuda-clientes')} className={claseSelect}>
          <option value="TODOS">TODOS</option>
          <option value="CON_DEUDA">CON DEUDA</option>
          <option value="SIN_DEUDA">SIN DEUDA</option>
        </select>
        <select id="orden-clientes" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} onKeyDown={teclasBarra('orden-clientes')} className={claseSelect}>
          <option value="RECIENTES">MÁS RECIENTES</option>
          <option value="DEUDA">MAYOR DEUDA</option>
          <option value="A-Z">A - Z</option>
        </select>
          <button id="btn-limpiar-clientes" type="button" title="Limpiar todos los filtros" onKeyDown={teclasBarra('btn-limpiar-clientes')}
            onClick={() => { setBusqueda(''); setFiltro('TODOS'); setOrden('DEUDA'); setPagina(1); setTimeout(() => irA('buscador-clientes'), 30); }}
            className="limpiar-sobrio">
            <FilterX size={16} />
          </button>
        </div>
      </div>

      {/* TABLA (con su paginación arriba y abajo), como Inventario */}
      <div className="tabla-marco flex flex-col">
      {/* PAGINACIÓN SUPERIOR */}
      {renderPaginacion('arriba')}

      {/* TABLA: SIN SCROLL VERTICAL INTERNO (el scroll lo maneja la ventana general) */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="tabla-cabecera sticky top-0 z-10">
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
                className="tabla-fila cursor-pointer">
                <td className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-[var(--color-ink)] uppercase text-base">{c.nombre}</span>
                    {c.esMayorista && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[var(--color-accent)] text-[var(--color-ink)] border border-[var(--color-ink)] shadow-[1px_1px_0_0_var(--color-ink)] tracking-wider">
                        ⭐ MAYORISTA
                      </span>
                    )}
                    {c.descuentoPorcentaje != null && c.descuentoPorcentaje > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[var(--color-success)] text-white border border-[var(--color-ink)] shadow-[1px_1px_0_0_var(--color-ink)] tracking-wider">
                        🏷️ {c.descuentoPorcentaje}% DCTO
                      </span>
                    )}
                  </div>
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
                  <span className={`font-black ${deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-subtle)]'}`}>S/ {formatearMonto(deuda)}</span>
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
                <td colSpan={9}>
                  <div className="vacio-sobrio"><Search size={32} />{clientes.length ? 'No se encontraron clientes con esos parámetros.' : 'Todavía no hay clientes registrados.'}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN INFERIOR */}
      {renderPaginacion('abajo')}
      </div>
    </div>
  );
};
