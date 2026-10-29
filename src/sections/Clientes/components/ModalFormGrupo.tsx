// src/sections/Clientes/components/ModalFormGrupo.tsx
// CREAR O EDITAR UN GRUPO DE CLIENTES (fase 4.1): nombre (obligatorio), tipo Familia o Empresa (← →) y RUC opcional
// (revisado en src/utils/documento.ts). Teclado: Enter o ↓ al siguiente campo, ↑ al anterior; Esc cierra.
import React, { useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import type { GrupoClientes } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { errorRuc } from '../../../utils/documento';
import { claseBotonPrincipal } from '../../../components/ListaVentana';

export interface DatosGrupo { nombre: string; tipo: 'FAMILIA' | 'EMPRESA'; ruc: string; descuento_porcentaje: string }

interface Props {
  abierta: boolean;
  grupo: GrupoClientes | null;          // null = nuevo
  grupos: GrupoClientes[];              // para no repetir el nombre
  onGuardar: (datos: DatosGrupo) => Promise<boolean>;
  onClose: () => void;
}

const TIPOS: { tipo: 'FAMILIA' | 'EMPRESA'; nombre: string }[] = [{ tipo: 'FAMILIA', nombre: 'Familia' }, { tipo: 'EMPRESA', nombre: 'Empresa' }];
const enfocar = (id: string) => setTimeout(() => { const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); el?.select?.(); }, 30);

export const ModalFormGrupo: React.FC<Props> = ({ abierta, grupo, grupos, onGuardar, onClose }) => {
  const [datos, setDatos] = useState<DatosGrupo>({ nombre: '', tipo: 'FAMILIA', ruc: '', descuento_porcentaje: '' });
  const [guardando, setGuardando] = useState(false);
  useCerrarConEscape(abierta, onClose);

  useEffect(() => {
    if (!abierta) return;
    setDatos(grupo
      ? {
          nombre: grupo.nombre,
          tipo: grupo.tipo,
          ruc: grupo.ruc || '',
          descuento_porcentaje: grupo.descuentoPorcentaje != null && grupo.descuentoPorcentaje > 0 ? String(grupo.descuentoPorcentaje) : ''
        }
      : { nombre: '', tipo: 'FAMILIA', ruc: '', descuento_porcentaje: '' });
    enfocar('grupo-nombre');
  }, [abierta, grupo]);

  if (!abierta) return null;
  const campos = ['grupo-nombre', `grupo-tipo-${datos.tipo}`, 'grupo-ruc', 'grupo-descuento', 'btn-guardar-grupo'];
  const mover = (desde: string, paso: 1 | -1) => {
    const destino = campos[campos.indexOf(desde) + paso];
    if (destino) enfocar(destino); else if (paso === -1) document.getElementById('btn-cerrar-form-grupo')?.focus();
  };

  const guardar = async () => {
    if (guardando) return;
    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2) { await avisar('Escribe el nombre del grupo (ej. Familia Pérez o Constructora San Juan).'); enfocar('grupo-nombre'); return; }
    const problema = errorRuc(datos.ruc);
    if (problema) { await avisar(problema); enfocar('grupo-ruc'); return; }
    const repetido = grupos.find((g) => g.id !== grupo?.id && g.nombre.trim().toUpperCase() === nombre.toUpperCase());
    if (repetido) { await avisar(`Ya hay un grupo llamado "${repetido.nombre}".`); enfocar('grupo-nombre'); return; }
    setGuardando(true);
    try {
      if (await onGuardar({ nombre, tipo: datos.tipo, ruc: datos.ruc.trim(), descuento_porcentaje: datos.descuento_porcentaje.trim() })) onClose();
      else enfocar('btn-guardar-grupo');
    } finally { setGuardando(false); }
  };

  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
  const etiqueta = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-1 block';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label={grupo ? 'Editar grupo' : 'Nuevo grupo'} className="bg-[var(--color-surface)] w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col">
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={22} className="text-[var(--color-info)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">{grupo ? 'Editar grupo' : 'Nuevo grupo'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Familia o empresa: junta las deudas de sus clientes</p>
            </div>
          </div>
          <button id="btn-cerrar-form-grupo" onClick={onClose} title="Cerrar (Escape)"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); enfocar('grupo-nombre'); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 p-1.5 cursor-pointer"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="grupo-nombre" className={etiqueta}>Nombre del grupo *</label>
            <input id="grupo-nombre" autoComplete="off" spellCheck={false} data-lpignore="true" value={datos.nombre}
              onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover('grupo-nombre', 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mover('grupo-nombre', -1); } }}
              placeholder="EJ.: FAMILIA PÉREZ O CONSTRUCTORA SAN JUAN SAC" className={`${claseCampo} uppercase`} />
          </div>
          <div>
            <p className={etiqueta}>Tipo (← →)</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de grupo">
              {TIPOS.map((t, i) => {
                const elegido = datos.tipo === t.tipo; const id = `grupo-tipo-${t.tipo}`;
                return (
                  <button key={t.tipo} id={id} type="button" role="radio" aria-checked={elegido} tabIndex={elegido ? 0 : -1}
                    onClick={() => { setDatos((d) => ({ ...d, tipo: t.tipo })); enfocar('grupo-ruc'); }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const otro = TIPOS[(i + 1) % 2];
                        setDatos((d) => ({ ...d, tipo: otro.tipo })); enfocar(`grupo-tipo-${otro.tipo}`);
                      } else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover(id, 1); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); mover(id, -1); }
                    }}
                    className={`p-2 border-2 text-xs font-black uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-ink)] ${elegido ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-ink)]'}`}>
                    {elegido ? '● ' : '○ '}{t.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="grupo-ruc" className={etiqueta}>RUC (opcional)</label>
            <input id="grupo-ruc" inputMode="numeric" autoComplete="off" data-lpignore="true" value={datos.ruc}
              onChange={(e) => setDatos((d) => ({ ...d, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover('grupo-ruc', 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mover('grupo-ruc', -1); } }}
              placeholder="11 NÚMEROS" className={`${claseCampo} tracking-widest`} />
          </div>
          {/* FASE 4.4: Descuento fijo para la empresa o grupo */}
          <div className="border-2 border-[var(--color-border)] p-3 bg-white">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <label htmlFor="grupo-descuento" className={etiqueta}>Descuento para todos los miembros (%)</label>
                <p className="text-[11px] text-[var(--color-muted)] font-bold">Aplica a cualquier cliente que pertenezca a esta empresa o familia</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  id="grupo-descuento"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={datos.descuento_porcentaje}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9.]/g, '');
                    if (Number(clean) <= 100) setDatos((d) => ({ ...d, descuento_porcentaje: clean }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); mover('grupo-descuento', 1); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); mover('grupo-descuento', -1); }
                  }}
                  placeholder="0"
                  className="w-20 text-center bg-white border-2 border-[var(--color-border)] p-2 text-sm font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]"
                />
                <span className="text-sm font-black text-[var(--color-ink)]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-[var(--color-muted)] mr-1 uppercase">Rápidos:</span>
              {['0', '5', '10', '15', '20'].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setDatos((d) => ({ ...d, descuento_porcentaje: pct === '0' ? '' : pct }))}
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
        </div>
        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end">
          <button id="btn-guardar-grupo" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); mover('btn-guardar-grupo', -1); } }}
            className={claseBotonPrincipal}>{guardando ? 'Guardando...' : grupo ? 'Guardar cambios' : 'Crear grupo'}</button>
        </div>
      </div>
    </div>
  );
};
