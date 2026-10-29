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

export interface DatosCliente { nombre: string; dni: string; ruc: string; telefono: string; direccion: string; ubicacion: string; referencia: string; dias_plazo: string; es_mayorista: boolean; descuento_porcentaje: string }

interface Props {
  abierta: boolean;
  cliente: Cliente | null;            // null = nuevo
  clientes: Cliente[];                // para avisar de parecidos y documentos repetidos
  onGuardar: (datos: DatosCliente) => Promise<boolean>;
  onClose: () => void;
}

const vacio: DatosCliente = { nombre: '', dni: '', ruc: '', telefono: '', direccion: '', ubicacion: '', referencia: '', dias_plazo: '', es_mayorista: false, descuento_porcentaje: '' };
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.stopPropagation();
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled])')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el =>
          el.closest('#modal-ficha-cliente') &&
          el.tabIndex !== -1 &&
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        if (modalFocusables.length > 0) {
          const first = modalFocusables[0];
          const last = modalFocusables[modalFocusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    setDatos(cliente
      ? {
          nombre: cliente.nombre,
          dni: cliente.dni || '',
          ruc: cliente.ruc || '',
          telefono: cliente.telefono || '',
          direccion: cliente.direccion || '',
          ubicacion: cliente.ubicacion || '',
          referencia: cliente.referencia || '',
          dias_plazo: cliente.diasPlazo != null ? String(cliente.diasPlazo) : '',
          es_mayorista: !!cliente.esMayorista,
          descuento_porcentaje: cliente.descuentoPorcentaje != null && cliente.descuentoPorcentaje > 0 ? String(cliente.descuentoPorcentaje) : ''
        }
      : vacio);
    enfocar('ficha-nombre');
  }, [abierta, cliente]);

  if (!abierta) return null;

  const poner = (campo: keyof DatosCliente, valor: string | boolean) => setDatos((d) => ({ ...d, [campo]: valor }));

  const teclasCampo = (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const orden = ['ficha-nombre', 'ficha-dni', 'ficha-ruc', 'ficha-telefono', 'ficha-direccion', 'ficha-ubicacion', 'ficha-referencia', 'ficha-dias-plazo', 'ficha-descuento', 'ficha-es-mayorista', 'btn-guardar-ficha'];
      const sig = orden[orden.indexOf(id) + 1];
      if (sig === 'btn-guardar-ficha') document.getElementById('btn-guardar-ficha')?.focus();
      else if (sig === 'ficha-es-mayorista') document.getElementById('ficha-es-mayorista')?.focus();
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-dias-plazo'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-ubicacion'); }
    } else if (id === 'ficha-dias-plazo') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar('ficha-referencia'); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); enfocar('ficha-descuento'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-ubicacion'); }
    } else if (id === 'ficha-descuento') {
      if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('ficha-es-mayorista')?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('ficha-dias-plazo'); }
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
      const ok = await onGuardar({ nombre, dni, ruc, telefono: datos.telefono.trim(), direccion: datos.direccion.trim(), ubicacion: datos.ubicacion.trim(), referencia: datos.referencia.trim(), dias_plazo: datos.dias_plazo.trim(), es_mayorista: datos.es_mayorista, descuento_porcentaje: datos.descuento_porcentaje.trim() });
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
    <div id="modal-ficha-cliente" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
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
            onKeyDown={(e) => { 
              if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('ficha-nombre'); }
              else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); }
            }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 cursor-pointer" title="Cerrar (Escape)">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campo('ficha-referencia', 'Referencia (para distinguirlo)', datos.referencia, (v) => poner('referencia', v), { placeholder: 'EJ.: VECINA DEL 2DO PISO · MAESTRO DE OBRA' })}
            {campo('ficha-dias-plazo', 'Días de plazo para pagar', datos.dias_plazo, (v) => poner('dias_plazo', v.replace(/\D/g, '').slice(0, 3)), { inputMode: 'numeric', placeholder: 'OPCIONAL · EJ.: 7, 15, 30 DÍAS' })}
          </div>
          {/* FASE 4.4: Descuento % fijo / especial */}
          <div className="border-2 border-[var(--color-border)] p-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <label htmlFor="ficha-descuento" className={etiqueta}>Descuento especial en ventas (%)</label>
                <p className="text-[11px] text-[var(--color-muted)] font-bold">Descuento automático en todos los productos (0% a 100%)</p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  id="ficha-descuento"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={datos.descuento_porcentaje}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9.]/g, '');
                    if (Number(clean) <= 100) poner('descuento_porcentaje', clean);
                  }}
                  onKeyDown={teclasCampo('ficha-descuento')}
                  placeholder="0"
                  className="w-20 text-center bg-white border-2 border-[var(--color-border)] p-2 text-sm font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]"
                />
                <span className="text-sm font-black text-[var(--color-ink)]">%</span>
              </div>
            </div>
            {/* Botones rápidos de porcentaje */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-[var(--color-muted)] mr-1 uppercase">Rápidos:</span>
              {['0', '5', '10', '15', '20'].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  tabIndex={-1}
                  onClick={() => poner('descuento_porcentaje', pct === '0' ? '' : pct)}
                  className={`px-2 py-0.5 text-[11px] font-black border uppercase transition-colors cursor-pointer ${
                    (datos.descuento_porcentaje === pct || (pct === '0' && !datos.descuento_porcentaje))
                      ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white shadow-[1px_1px_0_0_var(--color-ink)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:bg-slate-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          {/* FASE 4.4: Interruptor Cliente Mayorista */}
          <div className="border-2 border-[var(--color-border)] p-3 bg-white flex items-center justify-between gap-3">
            <div>
              <span className={etiqueta}>¿Es cliente mayorista?</span>
              <p className="text-[11px] text-[var(--color-muted)] font-bold">Aplica automáticamente el precio por mayor en caja</p>
            </div>
            <button
              id="ficha-es-mayorista"
              type="button"
              role="switch"
              aria-checked={datos.es_mayorista}
              onClick={() => poner('es_mayorista', !datos.es_mayorista)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  poner('es_mayorista', !datos.es_mayorista);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  enfocar('ficha-descuento');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  document.getElementById('btn-guardar-ficha')?.focus();
                }
              }}
              className={`px-3 py-1.5 border-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] ${
                datos.es_mayorista
                  ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white shadow-[2px_2px_0_0_var(--color-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:bg-slate-200'
              }`}
            >
              {datos.es_mayorista ? 'SÍ (MAYORISTA)' : 'NO (REGULAR)'}
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end shrink-0">
          <button id="btn-guardar-ficha" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('ficha-es-mayorista')?.focus(); } }}
            className={claseBotonPrincipal}>
            {guardando ? 'Guardando...' : cliente ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};
