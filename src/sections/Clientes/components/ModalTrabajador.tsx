// src/sections/Clientes/components/ModalTrabajador.tsx
// CREAR O EDITAR UN TRABAJADOR (SiuMax Servic, fase 1). Solo el nombre es obligatorio; el DNI no se puede repetir.
// "Usuario del sistema": si el trabajador también entra a SiuMax, se une a su usuario de Ajustes > Usuarios.
// Mismo estilo que la ficha del cliente. Teclado: ↓ ↑ entre campos en orden de lectura; las flechas nunca cambian una
// opción de las listas (Enter las abre); Enter en un campo pasa al siguiente.
import React, { useEffect, useState } from 'react';
import { HardHat, X } from 'lucide-react';
import type { Trabajador } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { errorDni } from '../../../utils/documento';
import { claseBotonPrincipal } from '../../../components/ListaVentana';

export interface DatosTrabajador {
  nombre: string; dni: string; cargo: string; telefono: string; fecha_ingreso: string; empleado_id: string;
  estado: Trabajador['estado']; notas: string;
}
export interface UsuarioSistema { id: string; nombre: string; email: string }

interface Props {
  abierta: boolean;
  trabajador: Trabajador | null;   // null = nuevo
  trabajadores: Trabajador[];      // para no repetir DNI
  usuarios: UsuarioSistema[];
  onGuardar: (d: DatosTrabajador) => Promise<boolean>;
  onClose: () => void;
}

const vacio: DatosTrabajador = { nombre: '', dni: '', cargo: '', telefono: '', fecha_ingreso: '', empleado_id: '', estado: 'ACTIVO', notas: '' };
const ORDEN = ['btn-cerrar-trabajador', 'trab-nombre', 'trab-dni', 'trab-cargo', 'trab-telefono', 'trab-ingreso', 'trab-usuario', 'trab-estado', 'trab-notas', 'btn-guardar-trabajador'];
const enfocar = (id: string) => setTimeout(() => { const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); if (el instanceof HTMLInputElement && el.type === 'text') el.select(); }, 30);

export const ModalTrabajador: React.FC<Props> = ({ abierta, trabajador, trabajadores, usuarios, onGuardar, onClose }) => {
  const [datos, setDatos] = useState<DatosTrabajador>(vacio);
  const [guardando, setGuardando] = useState(false);
  useCerrarConEscape(abierta, onClose);

  useEffect(() => {
    if (!abierta) return;
    setDatos(trabajador
      ? {
          nombre: trabajador.nombre, dni: trabajador.dni || '', cargo: trabajador.cargo || '', telefono: trabajador.telefono || '',
          fecha_ingreso: (trabajador.fechaIngreso || '').slice(0, 10), empleado_id: trabajador.empleadoId || '',
          estado: trabajador.estado, notas: trabajador.notas || '',
        }
      : vacio);
    enfocar('trab-nombre');
  }, [abierta, trabajador]);

  if (!abierta) return null;
  const poner = (campo: keyof DatosTrabajador, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));
  const mover = (id: string, paso: 1 | -1) => { const sig = ORDEN[ORDEN.indexOf(id) + paso]; if (sig) enfocar(sig); };

  const teclas = (id: string) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const el = e.currentTarget;
    const esLista = el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === 'date');
    if (esLista) {
      // Las flechas nunca cambian la opción ni la fecha: mueven el selector. Enter abre la lista o el calendario.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mover(id, e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (el instanceof HTMLSelectElement) e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); try { (el as HTMLInputElement).showPicker(); } catch { /* sin lista */ } }
      return;
    }
    if (e.key === 'Enter' && !(el instanceof HTMLTextAreaElement)) { e.preventDefault(); mover(id, 1); return; }
    if (el instanceof HTMLTextAreaElement) {
      if (e.key === 'ArrowUp' && el.value.slice(0, el.selectionStart).includes('\n')) return;
      if (e.key === 'ArrowDown' && el.value.slice(el.selectionEnd).includes('\n')) return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mover(id, e.key === 'ArrowDown' ? 1 : -1); }
  };

  const guardar = async () => {
    if (guardando) return;
    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2) { await avisar('Escribe el nombre del trabajador.'); enfocar('trab-nombre'); return; }
    const dni = datos.dni.trim();
    const problema = errorDni(dni);
    if (problema) { await avisar(problema); enfocar('trab-dni'); return; }
    const mismo = dni ? trabajadores.find((t) => t.id !== trabajador?.id && (t.dni || '').trim() === dni) : undefined;
    if (mismo) { await avisar(`Ese DNI ya es de "${mismo.nombre}".`); enfocar('trab-dni'); return; }
    setGuardando(true);
    try {
      const ok = await onGuardar({ ...datos, nombre, dni, cargo: datos.cargo.trim(), telefono: datos.telefono.trim(), notas: datos.notas.trim() });
      if (ok) onClose();
      else document.getElementById('btn-guardar-trabajador')?.focus();
    } finally {
      setGuardando(false);
    }
  };

  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
  const etiqueta = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-1 block';
  const campo = (id: string, titulo: string, clave: keyof DatosTrabajador, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}, limpiar?: (v: string) => string) => (
    <div>
      <label htmlFor={id} className={etiqueta}>{titulo}</label>
      <input id={id} type="text" autoComplete="off" spellCheck={false} data-lpignore="true" value={datos[clave]}
        onChange={(e) => poner(clave, limpiar ? limpiar(e.target.value) : e.target.value)} onKeyDown={teclas(id)} className={claseCampo} {...extra} />
    </div>
  );

  return (
    <div id="modal-trabajador" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label={trabajador ? 'Editar trabajador' : 'Nuevo trabajador'} className="ventana-sobria bg-[var(--color-surface)] w-full max-w-lg border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <HardHat size={24} className="text-[var(--color-info)]" />
            <div>
              <h2 className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest">{trabajador ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Solo el nombre es obligatorio</p>
            </div>
          </div>
          <button id="btn-cerrar-trabajador" onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('trab-nombre'); }
              else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); }
            }}
            className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 cursor-pointer" title="Cerrar (Escape)">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {campo('trab-nombre', 'Nombre *', 'nombre', { placeholder: 'EJ.: JUAN PÉREZ', className: `${claseCampo} uppercase` })}
          {campo('trab-dni', 'DNI', 'dni', { inputMode: 'numeric', placeholder: 'OPCIONAL · 8 NÚMEROS', className: `${claseCampo} tracking-widest` }, (v) => v.replace(/\D/g, '').slice(0, 8))}
          {campo('trab-cargo', 'Cargo', 'cargo', { placeholder: 'OPCIONAL · EJ.: TÉCNICO, AYUDANTE, CHOFER' })}
          {campo('trab-telefono', 'Teléfono', 'telefono', { inputMode: 'tel', placeholder: 'OPCIONAL' })}
          <div>
            <label htmlFor="trab-ingreso" className={etiqueta}>Fecha de ingreso</label>
            <input id="trab-ingreso" type="date" value={datos.fecha_ingreso} onChange={(e) => poner('fecha_ingreso', e.target.value)}
              onKeyDown={teclas('trab-ingreso')} className={`${claseCampo} cursor-pointer`} />
          </div>
          <div>
            <label htmlFor="trab-usuario" className={etiqueta}>Usuario del sistema</label>
            <select id="trab-usuario" value={datos.empleado_id} onChange={(e) => poner('empleado_id', e.target.value)} onKeyDown={teclas('trab-usuario')} className={`${claseCampo} cursor-pointer`}>
              <option value="">NO USA EL SISTEMA</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.email ? ` (${u.email})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="trab-estado" className={etiqueta}>Estado</label>
            <select id="trab-estado" value={datos.estado} onChange={(e) => poner('estado', e.target.value)} onKeyDown={teclas('trab-estado')} className={`${claseCampo} uppercase cursor-pointer`}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Desactivado</option>
            </select>
          </div>
          <div>
            <label htmlFor="trab-notas" className={etiqueta}>Notas</label>
            <textarea id="trab-notas" rows={2} spellCheck={false} value={datos.notas}
              onChange={(e) => poner('notas', e.target.value)} onKeyDown={teclas('trab-notas')}
              placeholder="OPCIONAL" className={`${claseCampo} resize-none`} />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end shrink-0">
          <button id="btn-guardar-trabajador" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('trab-notas'); } }}
            className={claseBotonPrincipal}>
            {guardando ? 'Guardando...' : trabajador ? 'Guardar cambios' : 'Guardar trabajador'}
          </button>
        </div>
      </div>
    </div>
  );
};
