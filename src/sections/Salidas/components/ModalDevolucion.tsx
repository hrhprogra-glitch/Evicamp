import React, { useState, useEffect } from 'react';
import { RotateCcw, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import type { Salida, SalidaItem } from '../types';

interface ModalDevolucionProps {
  salida: Salida;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalDevolucion: React.FC<ModalDevolucionProps> = ({
  salida,
  isOpen,
  onClose,
  onSuccess,
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [itemId, setItemId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Sobrante de trabajo no utilizado');
  const [guardando, setGuardando] = useState(false);

  const itemsDisponibles = (salida.items || []).filter(
    (it) => it.cantidad - it.cantidad_devuelta > 0
  );

  useEffect(() => {
    if (isOpen && itemsDisponibles.length > 0) {
      setItemId(itemsDisponibles[0].id);
      setCantidad(String(itemsDisponibles[0].cantidad - itemsDisponibles[0].cantidad_devuelta));
      setTimeout(() => {
        document.getElementById('input-cantidad-devolver')?.focus();
      }, 50);
    }
  }, [isOpen, salida]);

  if (!isOpen) return null;

  const itemSeleccionado = itemsDisponibles.find((it) => it.id === Number(itemId));
  const maxDisponible = itemSeleccionado ? itemSeleccionado.cantidad - itemSeleccionado.cantidad_devuelta : 0;

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setItemId(id);
    const sel = itemsDisponibles.find((it) => it.id === id);
    if (sel) {
      setCantidad(String(sel.cantidad - sel.cantidad_devuelta));
    }
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemId) {
      avisar('Selecciona el material a devolver');
      return;
    }
    const cantNum = parseFloat(cantidad);
    if (isNaN(cantNum) || cantNum <= 0) {
      avisar('Ingresa una cantidad válida a devolver');
      return;
    }
    if (cantNum > maxDisponible) {
      avisar(`No puedes devolver más de lo disponible (${maxDisponible})`);
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_registrar_devolucion', {
        p_salida_id: salida.id,
        p_item_id: itemId,
        p_cantidad: cantNum,
        p_motivo: motivo.trim() || 'Sobrante no utilizado',
        p_usuario: 'Usuario',
      });

      if (error) throw error;
      avisar('Devolución registrada con éxito. El stock volvió al almacén.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error registrando devolución:', err);
      avisar(err.message || 'Error al registrar la devolución');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        id="modal-devolucion-container"
        className="ventana-sobria bg-[var(--color-surface)] w-full max-w-md border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <RotateCcw size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Devolver Material
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Salida {salida.codigo} · Retorno a stock
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-devolucion"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Escape)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4">
          {itemsDisponibles.length === 0 ? (
            <div className="p-4 border border-[var(--color-border)] text-center text-[var(--color-muted)]">
              <AlertCircle size={24} className="mx-auto mb-2 text-[var(--color-warning)]" />
              <p className="font-bold">No hay materiales pendientes de devolución en esta salida.</p>
            </div>
          ) : (
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                  Material a Devolver *
                </label>
                <select
                  id="select-material-devolucion"
                  value={itemId}
                  onChange={handleItemChange}
                  className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)]"
                  required
                >
                  {itemsDisponibles.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.descripcion} (Disponible: {it.cantidad - it.cantidad_devuelta} {it.unidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                  Cantidad a Devolver ({itemSeleccionado?.unidad || 'UNID'}) * (Máx: {maxDisponible})
                </label>
                <input
                  id="input-cantidad-devolver"
                  type="number"
                  step="any"
                  min="0.001"
                  max={maxDisponible}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                  Motivo de Devolución
                </label>
                <input
                  id="input-motivo-devolucion"
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Sobró material, trabajo cancelado..."
                  className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border-2 border-[var(--color-border)] font-black uppercase hover:bg-black/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-devolucion"
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-[var(--color-ink)] text-white font-black uppercase tracking-wider hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Confirmar Devolución'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
