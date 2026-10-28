// src/sections/Clientes/components/ModalFichaCliente.tsx
// FICHA DEL CLIENTE (fase 4.1): crear o editar. Solo el NOMBRE es obligatorio (la vecina que fía sigue igual de
// rápida). Todo lo demás se ve y se llena directo, sin elegir nada antes (pedido del dueño 28/10/2026): DNI y RUC
// (los dos opcionales, revisados en src/utils/documento.ts), teléfono, dirección, link de ubicación (Google Maps) y
// referencia. Antes de guardar avisa si ya hay un cliente con nombre parecido ("¿Es esta Rosa?") y no deja repetir un
// DNI o RUC. Teclado: Enter o ↓ pasan al siguiente campo, ↑ al anterior.
import React, { useEffect, useState } from 'react';
import { UserCircle, X } from 'lucide-react';
import type { Cliente } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { errorDni, errorRuc, errorUbicacion, normalizarNombre } from '../../../utils/documento';
import { claseBotonPrincipal } from '../../../components/ListaVentana';

export interface DatosCliente { nombre: string; dni: string; ruc: string; telefono: string; direccion: string; ubicacion: string; referencia: string }

interface Props {
  abierta: boolean;
  cliente: Cliente | null;            // null = nuevo
  clientes: Cliente[];                // para avisar de parecidos y documentos repetidos
  onGuardar: (datos: DatosCliente) => Promise<boolean>;
  onClose: () => void;
}

const vacio: DatosCliente = { nombre: '', dni: '', ruc: '', telefono: '', direccion: '', ubicacion: '', referencia: '' };
const enfocar = (id: string) => setTimeout(() => { const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); el?.select?.(); }, 30);

// "ROSA" y "ROSA PEREZ" son parecidos; "ROSA" y "ROSARIO" no
const parecidos = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a];
  return corto.length >= 3 && (` ${largo} `).includes(` ${corto} `);
};

export const ModalFichaCliente: React.FC<Props> = ({ abierta, cliente, clientes, onGuardar, onClose }) => {
  const [datos, setDatos] = useState<DatosCliente>(vacio);
  const [guardando, setGuardando] = useState(false);
  useCerrarConEscape(abierta, onClose);

  useEffect(() => {
    if (!abierta) return;
    setDatos(cliente
      ? { nombre: cliente.nombre, dni: cliente.dni || '', ruc: cliente.ruc || '', telefono: cliente.telefono || '', direccion: cliente.direccion || '', ubicacion: cliente.ubicacion || '', referencia: cliente.referencia || '' }
      : vacio);
    enfocar('ficha-nombre');
  }, [abierta, cliente]);

  if (!abierta) return null;

  const poner = (campo: keyof DatosCliente, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));

  const teclasCampo = (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const orden = ['ficha-nombre', 'ficha-dni', 'ficha-ruc', 'ficha-telefono', 'ficha-direccion', 'ficha-ubicacion', 'ficha-referencia', 'btn-guardar-ficha'];
      const sig = orden[orden.indexOf(id) + 1];
      if (sig === 'btn-guardar-ficha') document.getElementById('btn-guardar-ficha')?.focus();
      else if (sig) enfocar(sig);
      return;
    }

    if (id === 'ficha-nombre') {
      if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-dni'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-ficha')?.focus(); }
    } else if (id === 'ficha-dni') {
      if (e.key === 'ArrowRight') { e.preventDefault(); enfocar('ficha-ruc'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-telefono'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-nombre'); }
    } else if (id === 'ficha-ruc') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar('ficha-dni'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-direccion'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-nombre'); }
    } else if (id === 'ficha-telefono') {
      if (e.key === 'ArrowRight') { e.preventDefault(); enfocar('ficha-direccion'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-ubicacion'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-dni'); }
    } else if (id === 'ficha-direccion') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar('ficha-telefono'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-ubicacion'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-ruc'); }
    } else if (id === 'ficha-ubicacion') {
      if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-referencia'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-telefono'); }
    } else if (id === 'ficha-referencia') {
      if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('btn-guardar-ficha')?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-ubicacion'); }
    }
  };

  const guardar = async () => {
    if (guardando) return;
    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2) { await avisar('Escribe el nombre del cliente.'); enfocar('ficha-nombre'); return; }
    const dni = datos.dni.trim(); const ruc = datos.ruc.trim();
    for (const [problema, campo] of [[errorDni(dni), 'ficha-dni'], [errorRuc(ruc), 'ficha-ruc'], [errorUbicacion(datos.ubicacion), 'ficha-ubicacion']] as const) {
      if (problema) { await avisar(problema); enfocar(campo); return; }
    }
    const otros = clientes.filter((c) => c.id !== cliente?.id);
    const mismoDni = dni ? otros.find((c) => String(c.dni || '').trim() === dni) : undefined;
    if (mismoDni) { await avisar(`Ese DNI ya es de "${mismoDni.nombre}". Revisa el número o edita a ese cliente.`); enfocar('ficha-dni'); return; }
    const mismoRuc = ruc ? otros.find((c) => String(c.ruc || '').trim() === ruc) : undefined;
    if (mismoRuc) { await avisar(`Ese RUC ya es de "${mismoRuc.nombre}". Revisa el número o edita a ese cliente.`); enfocar('ficha-ruc'); return; }
    // ¿Es esta Rosa? (solo al crear o al cambiar el nombre)
    if (!cliente || normalizarNombre(cliente.nombre) !== normalizarNombre(nombre)) {
      const n = normalizarNombre(nombre);
      const parecido = otros.find((c) => parecidos(normalizarNombre(c.nombre), n));
      if (parecido) {
        const ref = parecido.referencia ? ` (${parecido.referencia})` : parecido.dni ? ` (DNI ${parecido.dni})` : '';
        const seguir = await confirmar(`Ya hay un cliente parecido: "${parecido.nombre}"${ref}.\n\n¿Es OTRA persona? Aceptar = guardar igual. Cancelar = no guardar (usa el que ya existe).`);
        if (!seguir) { enfocar('ficha-nombre'); return; }
      }
    }
    setGuardando(true);
    try {
      const ok = await onGuardar({ nombre, dni, ruc, telefono: datos.telefono.trim(), direccion: datos.direccion.trim(), ubicacion: datos.ubicacion.trim(), referencia: datos.referencia.trim() });
      if (ok) onClose();
      else enfocar('btn-guardar-ficha');
    } finally {
      setGuardando(false);
    }
  };

  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
  const etiqueta = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-1 block';
  const campo = (id: string, titulo: string, valor: string, cambiar: (v: string) => void, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <div>
      <label htmlFor={id} className={etiqueta}>{titulo}</label>
      <input id={id} autoComplete="off" spellCheck={false} data-lpignore="true" value={valor}
        onChange={(e) => cambiar(e.target.value)} onKeyDown={teclasCampo(id)} className={claseCampo} {...extra} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label={cliente ? 'Editar cliente' : 'Nuevo cliente'} className="bg-[var(--color-surface)] w-full max-w-lg border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <UserCircle size={24} className="text-[var(--color-info)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Solo el nombre es obligatorio</p>
            </div>
          </div>
          <button id="btn-cerrar-ficha" onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-nombre'); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 cursor-pointer" title="Cerrar (Escape)">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
          {campo('ficha-nombre', 'Nombre o razón social *', datos.nombre, (v) => poner('nombre', v), { placeholder: 'EJ.: ROSA PÉREZ O FERRETERÍA SAN JUAN SAC', className: `${claseCampo} uppercase` })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campo('ficha-dni', 'DNI', datos.dni, (v) => poner('dni', v.replace(/\D/g, '').slice(0, 8)), { inputMode: 'numeric', placeholder: 'OPCIONAL · 8 NÚMEROS', className: `${claseCampo} tracking-widest` })}
            {campo('ficha-ruc', 'RUC', datos.ruc, (v) => poner('ruc', v.replace(/\D/g, '').slice(0, 11)), { inputMode: 'numeric', placeholder: 'OPCIONAL · 11 NÚMEROS', className: `${claseCampo} tracking-widest` })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campo('ficha-telefono', 'Teléfono', datos.telefono, (v) => poner('telefono', v), { inputMode: 'tel', placeholder: 'OPCIONAL' })}
            {campo('ficha-direccion', 'Dirección', datos.direccion, (v) => poner('direccion', v), { placeholder: 'OPCIONAL' })}
          </div>
          {campo('ficha-ubicacion', 'Link de ubicación (Google Maps)', datos.ubicacion, (v) => poner('ubicacion', v), { placeholder: 'OPCIONAL · PEGA EL LINK DE GOOGLE MAPS (COMPARTIR)', inputMode: 'url' })}
          {campo('ficha-referencia', 'Referencia (para distinguirlo)', datos.referencia, (v) => poner('referencia', v), { placeholder: 'EJ.: VECINA DEL 2DO PISO · MAESTRO DE OBRA' })}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end shrink-0">
          <button id="btn-guardar-ficha" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-referencia'); } }}
            className={claseBotonPrincipal}>
            {guardando ? 'Guardando...' : cliente ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};
