// src/sections/Mermas/components/ModalEditarConteo.tsx
// Corregir un registro de la TOMA DE INVENTARIO (pedido del usuario 23/10): SOLO el motivo y la justificación.
// La cantidad y el stock no se tocan (si hubo un error de cantidad: se borra y se vuelve a contar). Lo hace el
// servidor con fn_editar_conteo (servidor/sql/seguridad-sesion.sql), que anota quién lo corrigió, cuándo y lo
// que decía antes.
import React, { useEffect, useState } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { Merma } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { MOTIVOS_FALTA, MOTIVOS_SOBRA } from '../../Inventario/motivosConteo';
import { CuerpoVentana, claseBotonBarra, claseBotonPrincipal } from '../../../components/ListaVentana';

interface Props {
  merma: Merma | null;
  onClose: () => void;
  onGuardado: () => void;
}

const enfocar = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 30);
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '');

export const ModalEditarConteo: React.FC<Props> = ({ merma, onClose, onGuardado }) => {
  const [motivo, setMotivo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useCerrarConEscape(!!merma, onClose);

  const motivos = merma?.sobrante ? MOTIVOS_SOBRA : MOTIVOS_FALTA;
  // Al abrir: lo que tiene ahora, y el selector en su motivo
  useEffect(() => {
    if (!merma) return;
    setMotivo(String(merma.reason || '').toUpperCase());
    setJustificacion(merma.notes || '');
    const i = Math.max(0, motivos.indexOf(String(merma.reason || '').toUpperCase()));
    enfocar(`motivo-editar-conteo-${i}`);
  }, [merma]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!merma) return null;

  const guardar = async () => {
    if (guardando) return;
    if (!motivo) { await avisar('Elige el motivo.'); enfocar('motivo-editar-conteo-0'); return; }
    if (justificacion.trim().length < 3) { await avisar('Escribe la justificación: qué pasó con la diferencia.'); enfocar('input-justificacion-editar-conteo'); return; }
    setGuardando(true);
    try {
      const { error } = await supabase.rpc('fn_editar_conteo', { p_waste_id: merma.id, p_motivo: motivo, p_justificacion: justificacion.trim() });
      if (error) throw error;
      onGuardado();
    } catch (e) {
      await avisar(`No se pudo corregir: ${(e as Error).message}`);
      enfocar('btn-guardar-editar-conteo');
    } finally {
      setGuardando(false);
    }
  };

  const unidad = merma.quantity === 1 ? 'unidad' : 'unidades';
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label="Corregir conteo" className="bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={24} className="text-[var(--color-warning)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-warning)]">Corregir conteo</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Solo el motivo y la justificación · la cantidad no cambia</p>
            </div>
          </div>
          <button
            id="btn-cerrar-editar-conteo"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById(`motivo-editar-conteo-${Math.max(0, motivos.indexOf(motivo))}`)?.focus(); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* Lo que se contó (no se cambia) */}
          <div id="detalle-editar-conteo" className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 text-sm flex flex-col gap-1 shrink-0">
            <p className="font-black uppercase text-[var(--color-ink)]">{merma.product_name}</p>
            <p className={`font-black uppercase ${merma.sobrante ? 'text-[var(--color-info)]' : 'text-[var(--color-danger)]'}`}>
              {merma.sobrante ? 'Sobrante' : 'Faltante'}: {merma.quantity} {unidad} · contó {merma.conteo_contado ?? '—'}, el sistema decía {merma.conteo_sistema ?? '—'}
            </p>
            <p className="font-bold text-[var(--color-muted)]">Contó: {merma.user_name} · {merma.created_at}</p>
            {merma.turno && <p className="font-bold text-[var(--color-muted)]">{merma.turno}</p>}
            {merma.conteo_editado_por && (
              <p className="font-bold text-[var(--color-warning-text)]">
                Ya corregido por {merma.conteo_editado_por} el {fecha(merma.conteo_editado_at)} · antes decía: {merma.conteo_motivo_original} — {merma.conteo_justificacion_original || 'sin justificación'}
              </p>
            )}
          </div>

          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-4 shrink-0">
            <div>
              <p className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Motivo *</p>
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Motivo">
                {motivos.map((m, i) => (
                  <button
                    key={m}
                    id={`motivo-editar-conteo-${i}`}
                    type="button"
                    role="option"
                    aria-selected={motivo === m}
                    onClick={() => { setMotivo(m); enfocar('input-justificacion-editar-conteo'); }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(`motivo-editar-conteo-${(i + 1) % motivos.length}`)?.focus(); }
                      else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(`motivo-editar-conteo-${(i - 1 + motivos.length) % motivos.length}`)?.focus(); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-editar-conteo')?.focus(); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('input-justificacion-editar-conteo')?.focus(); }
                    }}
                    className={`${claseBotonBarra(motivo === m)} !h-[38px] !px-3`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="input-justificacion-editar-conteo" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 block">Justificación * (qué pasó)</label>
              <textarea
                id="input-justificacion-editar-conteo"
                rows={2}
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('btn-guardar-editar-conteo')?.focus(); }
                  else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
                    e.preventDefault(); document.getElementById(`motivo-editar-conteo-${Math.max(0, motivos.indexOf(motivo))}`)?.focus();
                  } else if (e.key === 'ArrowDown' && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
                    e.preventDefault(); document.getElementById('btn-guardar-editar-conteo')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                id="btn-guardar-editar-conteo"
                type="button"
                aria-disabled={guardando}
                onClick={() => void guardar()}
                onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-justificacion-editar-conteo')?.focus(); } }}
                className={claseBotonPrincipal}
              >
                {guardando ? 'Guardando...' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </CuerpoVentana>
      </div>
    </div>
  );
};
