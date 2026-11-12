// src/sections/Clientes/components/PestanaTrabajadores.tsx
// PESTAÑA "TRABAJADORES" (SiuMax Servic, fase 1; viene de "Empleados" de Eco-Sistema): técnicos y ayudantes, usen o no
// el sistema. Mismo estilo y teclado que la pestaña Clientes: buscador, filtro activos/inactivos; Enter en una fila la
// edita; ← → desde la fila llegan a Editar y Desactivar. "Nuevo trabajador" está en la cabecera de la sección.
import React, { useEffect, useMemo, useState } from 'react';
import { Edit, UserX, UserCheck, FilterX, Search, X } from 'lucide-react';
import { filaEnMedio } from '../../../utils/flechasEspaciales';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda } from '../../../utils/busqueda';
import { avisar, confirmar } from '../../../utils/dialogos';
import { usePermiso, avisarSinPermiso } from '../../../utils/permisos';
import type { Trabajador } from '../types';
import { ModalTrabajador, type DatosTrabajador, type UsuarioSistema } from './ModalTrabajador';

interface Props {
  idPestana: string;   // el botón de la pestaña (↑ desde la barra vuelve ahí)
  pedirNuevo: number;  // cambia cuando se toca "Nuevo trabajador" en la cabecera
}

const aTrabajador = (t: any): Trabajador => ({
  id: String(t.id), nombre: t.nombre ?? '', dni: t.dni ?? '', cargo: t.cargo ?? '', telefono: t.telefono ?? '',
  fechaIngreso: t.fecha_ingreso ?? '', estado: t.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
  empleadoId: t.empleado_id ?? '', notas: t.notas ?? '',
});
const fecha = (f?: string) => (f ? f.slice(0, 10).split('-').reverse().join('/') : '—');

export const PestanaTrabajadores: React.FC<Props> = ({ idPestana, pedirNuevo }) => {
  const puedeEditar = usePermiso('trabajadores_editar');
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'ACTIVOS' | 'INACTIVOS' | 'TODOS'>('ACTIVOS');
  const [ficha, setFicha] = useState<{ trabajador: Trabajador | null } | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: t, error }, { data: u }] = await Promise.all([
        traerTodo(() => supabase.from('trabajadores').select('*').order('nombre')),
        supabase.from('empleados_publico').select('id, nombre, email').order('nombre'),
      ]);
      if (error) { await avisar(`No se pudieron cargar los trabajadores: ${error.message}`); return; }
      setTrabajadores((t || []).map(aTrabajador));
      setUsuarios((u || []).map((x: any) => ({ id: String(x.id), nombre: x.nombre || x.email, email: x.email || '' })));
    })();
  }, []);

  const abrir = (t: Trabajador | null) => {
    if (!puedeEditar) { avisarSinPermiso('cambiar trabajadores'); return; }
    setFicha({ trabajador: t });
  };
  // "Nuevo trabajador" de la cabecera (no al montar la pestaña)
  useEffect(() => { if (pedirNuevo > 0) abrir(null); }, [pedirNuevo]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombreUsuario = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nombre])), [usuarios]);
  const filas = useMemo(() => {
    let lista = trabajadores;
    if (busqueda.trim()) lista = lista.filter((t) => coincideBusqueda([t.nombre, t.dni, t.cargo, t.telefono], busqueda.trim()));
    if (filtro === 'ACTIVOS') lista = lista.filter((t) => t.estado === 'ACTIVO');
    if (filtro === 'INACTIVOS') lista = lista.filter((t) => t.estado === 'INACTIVO');
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [trabajadores, busqueda, filtro]);

  const guardar = async (d: DatosTrabajador): Promise<boolean> => {
    const t = ficha?.trabajador;
    const fila = {
      nombre: d.nombre, dni: d.dni || null, cargo: d.cargo || null, telefono: d.telefono || null,
      fecha_ingreso: d.fecha_ingreso || null, empleado_id: d.empleado_id || null, estado: d.estado, notas: d.notas || null,
    };
    const { data, error } = t
      ? await supabase.from('trabajadores').update(fila).eq('id', t.id).select().single()
      : await supabase.from('trabajadores').insert([fila]).select().single();
    if (error) {
      // El DNI no se repite (también lo revisa el servidor)
      await avisar(/uq_trabajadores_dni|duplicate/i.test(error.message) ? 'Ese DNI ya es de otro trabajador.' : `No se pudo guardar: ${error.message}`);
      return false;
    }
    const nuevo = aTrabajador(data);
    setTrabajadores((l) => (t ? l.map((x) => (x.id === t.id ? nuevo : x)) : [...l, nuevo]));
    return true;
  };

  const cambiarEstado = async (t: Trabajador) => {
    if (!puedeEditar) { avisarSinPermiso('cambiar trabajadores'); return; }
    const activar = t.estado === 'INACTIVO';
    if (!activar && !(await confirmar(`¿Desactivar a "${t.nombre}"?\n\nNo se borra: deja de salir entre los activos y se puede volver a activar.`))) return;
    const antes = filasDom().findIndex((el) => el.getAttribute('data-trabajador-id') === t.id);
    const { error } = await supabase.from('trabajadores').update({ estado: activar ? 'ACTIVO' : 'INACTIVO' }).eq('id', t.id);
    if (error) { await avisar(`No se pudo cambiar: ${error.message}`); return; }
    setTrabajadores((l) => l.map((x) => (x.id === t.id ? { ...x, estado: activar ? 'ACTIVO' : 'INACTIVO' } : x)));
    setTimeout(() => {
      const lista = filasDom();
      const destino = lista.length ? lista[Math.min(Math.max(antes, 0), lista.length - 1)] : document.getElementById('buscador-trabajadores');
      destino?.focus();
    }, 120);
  };

  const filasDom = () => Array.from(document.querySelectorAll('[data-fila-trabajador="true"]')) as HTMLElement[];
  const irA = (id: string) => { const el = document.getElementById(id); el?.focus(); el?.scrollIntoView({ block: 'nearest' }); };
  const barra = busqueda
    ? ['buscador-trabajadores', 'btn-borrar-buscador-trabajadores', 'filtro-trabajadores', 'btn-limpiar-trabajadores']
    : ['buscador-trabajadores', 'filtro-trabajadores', 'btn-limpiar-trabajadores'];
  const teclasBarra = (id: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    const i = barra.indexOf(id);
    const input = e.currentTarget as HTMLInputElement;
    const esTexto = e.currentTarget instanceof HTMLInputElement;
    if (e.key === 'ArrowDown') { e.preventDefault(); const f0 = filasDom()[0]; if (f0) { f0.focus(); f0.scrollIntoView({ block: 'nearest' }); } }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const medio = filaEnMedio(e.currentTarget, document.getElementById(idPestana), ['btn-nuevo-trabajador']);
      if (medio) medio.focus(); else irA(idPestana);
    }
    else if (e.key === 'ArrowRight' && (!esTexto || input.selectionEnd === input.value.length)) { e.preventDefault(); irA(barra[Math.min(i + 1, barra.length - 1)]); }
    else if (e.key === 'ArrowLeft' && (!esTexto || input.selectionStart === 0)) { e.preventDefault(); irA(barra[Math.max(i - 1, 0)]); }
    else if (e.key === 'Enter' && e.currentTarget instanceof HTMLSelectElement) { e.preventDefault(); try { e.currentTarget.showPicker(); } catch { /* sin lista */ } }
  };
  const teclasFila = (t: Trabajador) => (e: React.KeyboardEvent<HTMLElement>) => {
    const fila = e.currentTarget as HTMLElement;
    const lista = filasDom();
    const i = lista.indexOf(fila);
    const partes = [fila, ...Array.from(fila.querySelectorAll('[data-accion-trabajador]'))] as HTMLElement[];
    const k = partes.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (lista[i - 1]) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); } else irA('buscador-trabajadores'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); partes[Math.min(k + 1, partes.length - 1)]?.focus(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); partes[Math.max(k - 1, 0)]?.focus(); }
    else if (e.key === 'Enter' && e.target === fila) { e.preventDefault(); abrir(t); }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* BUSCADOR Y FILTROS (como la pestaña Clientes) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input id="buscador-trabajadores" autoComplete="off" spellCheck={false} data-lpignore="true"
            placeholder="BUSCAR NOMBRE, DNI, CARGO O TELÉFONO..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && busqueda) { e.preventDefault(); e.stopPropagation(); setBusqueda(''); return; } teclasBarra('buscador-trabajadores')(e); }}
            style={{ paddingRight: busqueda ? '8rem' : undefined }} />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{filas.length} MATCH</span>
              <button id="btn-borrar-buscador-trabajadores" type="button" title="Borrar búsqueda" className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); irA('buscador-trabajadores'); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setBusqueda(''); irA('buscador-trabajadores'); }
                  else teclasBarra('btn-borrar-buscador-trabajadores')(e);
                }}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
          <select id="filtro-trabajadores" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} onKeyDown={teclasBarra('filtro-trabajadores')} className="filtro-sobrio w-full sm:w-auto">
            <option value="ACTIVOS">ACTIVOS</option>
            <option value="INACTIVOS">DESACTIVADOS</option>
            <option value="TODOS">TODOS</option>
          </select>
          <button id="btn-limpiar-trabajadores" type="button" title="Limpiar filtros" onKeyDown={teclasBarra('btn-limpiar-trabajadores')}
            onClick={() => { setBusqueda(''); setFiltro('ACTIVOS'); setTimeout(() => irA('buscador-trabajadores'), 30); }}
            className="limpiar-sobrio">
            <FilterX size={16} />
          </button>
        </div>
      </div>

      {/* TABLA, como la de Clientes */}
      <div className="tabla-marco flex flex-col">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="tabla-cabecera sticky top-0 z-10">
              <tr className="uppercase text-[11px] font-black tracking-widest">
                <th className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6 border-r border-white/20">Trabajador</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">DNI</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">Teléfono</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20 text-center">Ingreso</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 border-r border-white/20">Usuario del sistema</th>
                <th className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold divide-y-2 divide-[var(--color-border)] border-b-2 border-[var(--color-border)]">
              {filas.length ? filas.map((t) => (
                <tr key={t.id} role="button" tabIndex={0} data-row="true" data-fila-trabajador="true" data-trabajador-id={t.id}
                  onClick={() => abrir(t)} onKeyDown={teclasFila(t)} className="tabla-fila cursor-pointer">
                  <td className="py-3 sm:py-4 px-3 sm:px-4 sm:pl-6">
                    <span className={`font-black uppercase text-base ${t.estado === 'INACTIVO' ? 'text-[var(--color-muted)] line-through' : 'text-[var(--color-ink)]'}`}>{t.nombre}</span>
                    {t.cargo && <span className="block text-xs text-[var(--color-muted)] mt-0.5 normal-case">{t.cargo}</span>}
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">{t.dni || <span className="text-[var(--color-subtle)]">—</span>}</td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">{t.telefono || <span className="text-[var(--color-subtle)]">—</span>}</td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-center text-[var(--color-muted)] whitespace-nowrap">{fecha(t.fechaIngreso)}</td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-[var(--color-ink)] whitespace-nowrap">
                    {t.empleadoId ? nombreUsuario.get(t.empleadoId) || '—' : <span className="text-[var(--color-subtle)]">No usa el sistema</span>}
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 sm:pr-6">
                    <div className="flex items-center justify-center gap-2">
                      <button data-accion-trabajador="editar" tabIndex={-1} title="Editar trabajador"
                        onClick={(e) => { e.stopPropagation(); abrir(t); }}
                        className="p-2 border-2 border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-success)] hover:text-[var(--color-success)] focus:outline-none focus:bg-[var(--color-success)] focus:text-white focus:border-[var(--color-success)] cursor-pointer">
                        <Edit size={18} />
                      </button>
                      <button data-accion-trabajador={t.estado === 'INACTIVO' ? 'activar' : 'desactivar'} tabIndex={-1}
                        title={t.estado === 'INACTIVO' ? 'Volver a activar' : 'Desactivar trabajador'}
                        onClick={(e) => { e.stopPropagation(); void cambiarEstado(t); }}
                        className={`p-2 border-2 border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer focus:outline-none focus:text-white ${t.estado === 'INACTIVO'
                          ? 'hover:border-[var(--color-success)] hover:text-[var(--color-success)] focus:bg-[var(--color-success)] focus:border-[var(--color-success)]'
                          : 'hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus:bg-[var(--color-danger)] focus:border-[var(--color-danger)]'}`}>
                        {t.estado === 'INACTIVO' ? <UserCheck size={18} /> : <UserX size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>
                    <div className="vacio-sobrio"><Search size={32} />{trabajadores.length ? 'No se encontraron trabajadores con esos parámetros.' : 'Todavía no hay trabajadores registrados.'}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalTrabajador
        abierta={!!ficha}
        trabajador={ficha?.trabajador || null}
        trabajadores={trabajadores}
        usuarios={usuarios}
        onGuardar={guardar}
        onClose={() => setFicha(null)}
      />
    </div>
  );
};
