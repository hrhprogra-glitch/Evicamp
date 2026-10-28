// src/sections/Clientes/components/ModalFichaCliente.tsx
// FICHA DEL CLIENTE (fase 4.1): crear o editar. Solo el NOMBRE es obligatorio (la vecina que fía sigue igual de
// rápida); documento (sin documento / DNI / RUC, revisado en src/utils/documento.ts), teléfono, dirección y referencia
// son opcionales. Antes de guardar avisa si ya hay un cliente con nombre parecido ("¿Es esta Rosa?") y no deja repetir
// un DNI o RUC. Teclado: Enter o ↓ pasan al siguiente campo, ↑ al anterior; en el documento ← → cambian el tipo.
import React, { useEffect, useState } from 'react';
import { UserCircle, X } from 'lucide-react';
import type { Cliente } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { TIPOS_DOC, errorDocumento, normalizarNombre, type TipoDoc } from '../../../utils/documento';
import { claseBotonPrincipal } from '../../../components/ListaVentana';

export interface DatosCliente { nombre: string; dni: string; tipoDoc: TipoDoc; telefono: string; direccion: string; referencia: string }

interface Props {
  abierta: boolean;
  cliente: Cliente | null;            // null = nuevo
  clientes: Cliente[];                // para avisar de parecidos y documentos repetidos
  onGuardar: (datos: DatosCliente) => Promise<boolean>;
  onClose: () => void;
}

const vacio: DatosCliente = { nombre: '', dni: '', tipoDoc: '', telefono: '', direccion: '', referencia: '' };
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
      ? { nombre: cliente.nombre, dni: cliente.dni || '', tipoDoc: cliente.tipoDoc || '', telefono: cliente.telefono || '', direccion: cliente.direccion || '', referencia: cliente.referencia || '' }
      : vacio);
    enfocar('ficha-nombre');
  }, [abierta, cliente]);

  if (!abierta) return null;

  const poner = (campo: keyof DatosCliente, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));
  // Orden de los campos para el teclado (el número se salta si es "sin documento")
  const campos = ['ficha-nombre', `ficha-tipo-${datos.tipoDoc || 'NINGUNO'}`, ...(datos.tipoDoc ? ['ficha-numero'] : []), 'ficha-telefono', 'ficha-direccion', 'ficha-referencia', 'btn-guardar-ficha'];
  const mover = (desde: string, paso: 1 | -1) => {
    const i = campos.indexOf(desde);
    const destino = campos[i + paso];
    if (destino) enfocar(destino);
    else if (paso === -1) document.getElementById('btn-cerrar-ficha')?.focus();
  };
  const teclasCampo = (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover(id, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mover(id, -1); }
  };

  const guardar = async () => {
    if (guardando) return;
    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2) { await avisar('Escribe el nombre del cliente.'); enfocar('ficha-nombre'); return; }
    const problema = errorDocumento(datos.tipoDoc, datos.dni);
    if (problema) { await avisar(problema); enfocar('ficha-numero'); return; }
    const otros = clientes.filter((c) => c.id !== cliente?.id);
    const numero = datos.tipoDoc ? datos.dni.trim() : '';
    const mismoDoc = numero ? otros.find((c) => String(c.dni || '').trim() === numero) : undefined;
    if (mismoDoc) { await avisar(`Ese ${datos.tipoDoc} ya es de "${mismoDoc.nombre}". Revisa el número o edita a ese cliente.`); enfocar('ficha-numero'); return; }
    // ¿Es esta Rosa? (solo al crear o al cambiar el nombre)
    if (!cliente || normalizarNombre(cliente.nombre) !== normalizarNombre(nombre)) {
      const n = normalizarNombre(nombre);
      const parecido = otros.find((c) => parecidos(normalizarNombre(c.nombre), n));
      if (parecido) {
        const ref = parecido.referencia ? ` (${parecido.referencia})` : parecido.dni ? ` (${parecido.dni})` : '';
        const seguir = await confirmar(`Ya hay un cliente parecido: "${parecido.nombre}"${ref}.\n\n¿Es OTRA persona? Aceptar = guardar igual. Cancelar = no guardar (usa el que ya existe).`);
        if (!seguir) { enfocar('ficha-nombre'); return; }
      }
    }
    setGuardando(true);
    try {
      const ok = await onGuardar({ ...datos, nombre, dni: numero, telefono: datos.telefono.trim(), direccion: datos.direccion.trim(), referencia: datos.referencia.trim() });
      if (ok) onClose();
      else enfocar('btn-guardar-ficha');
    } finally {
      setGuardando(false);
    }
  };

  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] read-only:bg-[var(--color-bg)]';
  const etiqueta = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-1 block';

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
          <div>
            <label htmlFor="ficha-nombre" className={etiqueta}>Nombre o razón social *</label>
            <input id="ficha-nombre" autoComplete="off" spellCheck={false} data-lpignore="true" value={datos.nombre}
              onChange={(e) => poner('nombre', e.target.value)} onKeyDown={teclasCampo('ficha-nombre')}
              placeholder="EJ.: ROSA PÉREZ O FERRETERÍA SAN JUAN SAC" className={`${claseCampo} uppercase`} />
          </div>

          <div>
            <p className={etiqueta}>Documento (← →)</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de documento">
              {TIPOS_DOC.map((t, i) => {
                const elegido = datos.tipoDoc === t.tipo;
                const id = `ficha-tipo-${t.tipo || 'NINGUNO'}`;
                return (
                  <button key={id} id={id} type="button" role="radio" aria-checked={elegido} tabIndex={elegido ? 0 : -1}
                    onClick={() => { poner('tipoDoc', t.tipo); enfocar(t.tipo ? 'ficha-numero' : 'ficha-telefono'); }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const otro = TIPOS_DOC[(i + (e.key === 'ArrowRight' ? 1 : -1) + TIPOS_DOC.length) % TIPOS_DOC.length];
                        poner('tipoDoc', otro.tipo);
                        enfocar(`ficha-tipo-${otro.tipo || 'NINGUNO'}`);
                      } else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover(id, 1); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); mover(id, -1); }
                    }}
                    className={`p-2 border-2 text-xs font-black uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-ink)] ${elegido ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)]'}`}>
                    {elegido ? '● ' : '○ '}{t.nombre}
                  </button>
                );
              })}
            </div>
            {datos.tipoDoc && (
              <input id="ficha-numero" inputMode="numeric" autoComplete="off" data-lpignore="true" value={datos.dni}
                onChange={(e) => poner('dni', e.target.value.replace(/\D/g, '').slice(0, datos.tipoDoc === 'DNI' ? 8 : 11))}
                onKeyDown={teclasCampo('ficha-numero')}
                placeholder={datos.tipoDoc === 'DNI' ? '8 NÚMEROS' : '11 NÚMEROS'} className={`${claseCampo} mt-2 tracking-widest`} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ficha-telefono" className={etiqueta}>Teléfono</label>
              <input id="ficha-telefono" inputMode="tel" autoComplete="off" data-lpignore="true" value={datos.telefono}
                onChange={(e) => poner('telefono', e.target.value)} onKeyDown={teclasCampo('ficha-telefono')} placeholder="OPCIONAL" className={claseCampo} />
            </div>
            <div>
              <label htmlFor="ficha-direccion" className={etiqueta}>Dirección</label>
              <input id="ficha-direccion" autoComplete="off" data-lpignore="true" value={datos.direccion}
                onChange={(e) => poner('direccion', e.target.value)} onKeyDown={teclasCampo('ficha-direccion')} placeholder="OPCIONAL" className={claseCampo} />
            </div>
          </div>

          <div>
            <label htmlFor="ficha-referencia" className={etiqueta}>Referencia (para distinguirlo)</label>
            <input id="ficha-referencia" autoComplete="off" data-lpignore="true" value={datos.referencia}
              onChange={(e) => poner('referencia', e.target.value)} onKeyDown={teclasCampo('ficha-referencia')}
              placeholder="EJ.: VECINA DEL 2DO PISO · MAESTRO DE OBRA" className={claseCampo} />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end shrink-0">
          <button id="btn-guardar-ficha" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); mover('btn-guardar-ficha', -1); } }}
            className={claseBotonPrincipal}>
            {guardando ? 'Guardando...' : cliente ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};
