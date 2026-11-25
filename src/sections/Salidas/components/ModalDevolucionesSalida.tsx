import React, { useEffect, useState } from 'react';
import { RotateCcw, X, Search } from 'lucide-react';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { coincideBusqueda } from '../../../utils/busqueda';
import { UnidadMaterial } from './UnidadMaterial';

export type MaterialDevolucion = {
  id?: number;
  product_id?: number | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  cantidad_devuelta: number;
  costo_unitario: number;
};

interface ModalDevolucionesSalidaProps {
  isOpen: boolean;
  codigo: string;
  materiales: MaterialDevolucion[];
  devolver: Record<number, string>;
  setDevolver: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  motivoDev: string;
  setMotivoDev: (valor: string) => void;
  // 228: fecha y trabajador que devolvió (se envían a la base con la devolución).
  fechaDev: string;
  setFechaDev: (valor: string) => void;
  trabajadorDev: string;
  setTrabajadorDev: (valor: string) => void;
  trabajadoresCatalogo: any[];
  procesando: boolean;
  onConfirmar: () => void;
  onClose: () => void;
}

/** Ventana flotante de devoluciones: todos los materiales en filas, cantidad al costado y monto. */
export const ModalDevolucionesSalida: React.FC<ModalDevolucionesSalidaProps> = ({
  isOpen,
  codigo,
  materiales,
  devolver,
  setDevolver,
  motivoDev,
  setMotivoDev,
  fechaDev,
  setFechaDev,
  trabajadorDev,
  setTrabajadorDev,
  trabajadoresCatalogo,
  procesando,
  onConfirmar,
  onClose,
}) => {
  useCerrarConEscape(isOpen, onClose);

  // Buscador: filtra solo los materiales de ESTA salida que ya vienen en la ventana (dueño 24/11/2026).
  const [buscarMaterial, setBuscarMaterial] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBuscarMaterial('');
    // Enfoca el primer campo de devolución que se pueda escribir (los de pendiente 0 están deshabilitados).
    const t = window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('#modal-devoluciones-flotante-container input[data-devolver]:not([disabled])')?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  const materialesFiltrados = materiales.filter((m) => coincideBusqueda([m.descripcion, m.unidad], buscarMaterial));

  const inputCls = 'w-full p-2 min-h-[40px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none disabled:opacity-50';
  const total = materiales.reduce((sum, m) => {
    const cant = Math.min(
      Math.max(0, Number(devolver[Number(m.id)] || 0)),
      Math.max(0, Number(m.cantidad || 0) - Number(m.cantidad_devuelta || 0))
    );
    return sum + cant * Number(m.costo_unitario || 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        id="modal-devoluciones-flotante-container"
        className="ventana-sobria bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><RotateCcw size={20} /></div>
            <div>
              <h2 className="ventana-cabecera__titulo">Devolver materiales</h2>
              <p className="ventana-cabecera__subtitulo">Salida {codigo} · todos los materiales en una fila</p>
            </div>
          </div>
          <button
            id="btn-cerrar-devoluciones-flotante"
            type="button"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Escape)"
          ><X size={18} /></button>
        </div>

        <form id="form-devoluciones-flotante" onSubmit={(e) => { e.preventDefault(); onConfirmar(); }} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs space-y-4">
          {/* 228: el dueño puede poner la fecha y decir qué trabajador devolvió. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1" htmlFor="input-fecha-devolucion-flotante">
                Fecha de la devolución
              </label>
              <input
                id="input-fecha-devolucion-flotante"
                type="date"
                value={fechaDev}
                onChange={(e) => setFechaDev(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1" htmlFor="select-trabajador-devolucion-flotante">
                Trabajador que devolvió
              </label>
              <select
                id="select-trabajador-devolucion-flotante"
                value={trabajadorDev}
                onChange={(e) => setTrabajadorDev(e.target.value)}
                className={inputCls}
              >
                <option value="">-- NO ESPECIFICAR --</option>
                {trabajadoresCatalogo.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.cargo ? ` (${t.cargo})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="buscador-sobrio">
            <div className="buscador-sobrio__icono"><Search size={16} /></div>
            <input
              id="buscador-materiales-devolucion"
              type="search"
              value={buscarMaterial}
              onChange={(e) => setBuscarMaterial(e.target.value)}
              placeholder="Buscar material de esta salida"
              aria-label="Buscar material de esta salida"
            />
            {buscarMaterial && (
              <div className="buscador-sobrio__match">
                <button
                  id="btn-limpiar-buscador-materiales-devolucion"
                  type="button"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setBuscarMaterial('')}
                  className="buscador-sobrio__borrar"
                ><X size={14} /></button>
              </div>
            )}
          </div>

          {/* data-tabla-campos: tabla para escribir, las flechas se mueven entre campos en vez de quedarse en la fila */}
          <div className="border-2 border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto custom-scrollbar">
            <table data-tabla-campos="true" className="w-full text-left text-[11px]">
              <thead className="bg-[var(--color-ink)] text-white font-black uppercase">
                <tr>
                  <th className="p-2">Material</th>
                  <th className="p-2 w-16 text-center">Unidad</th>
                  <th className="p-2 w-16 text-right">Salida</th>
                  <th className="p-2 w-16 text-right">Devuelto</th>
                  <th className="p-2 w-16 text-right">Pendiente</th>
                  <th className="p-2 w-24 text-right">A devolver</th>
                  <th className="p-2 w-28 text-right">Monto a devolver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {materialesFiltrados.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-[var(--color-muted)]">
                    {buscarMaterial ? 'No hay materiales que coincidan con la búsqueda' : 'No hay materiales para devolver'}
                  </td></tr>
                )}
                {materialesFiltrados.map((m, idx) => {
                  const pendiente = Math.max(0, Number(m.cantidad || 0) - Number(m.cantidad_devuelta || 0));
                  const cant = Number(devolver[Number(m.id)] || 0);
                  const valida = Math.min(cant, pendiente);
                  return (
                    <tr key={m.id || `dev-${idx}`} className="hover:bg-black/5">
                      <td className="p-2 font-bold uppercase">{m.descripcion}</td>
                      <td className="p-2 text-center"><UnidadMaterial unidad={m.unidad} /></td>
                      <td className="p-2 text-right font-bold">{Number(m.cantidad || 0)}</td>
                      <td className="p-2 text-right font-bold text-amber-700">{Number(m.cantidad_devuelta || 0)}</td>
                      <td className="p-2 text-right font-bold">{pendiente}</td>
                      <td className="p-1">
                        <input
                          id={`input-devolver-${idx}`}
                          data-devolver="true"
                          type="number"
                          step="any"
                          min="0"
                          max={pendiente}
                          value={devolver[Number(m.id)] ?? ''}
                          disabled={pendiente <= 0}
                          onChange={(e) => setDevolver((d) => ({ ...d, [Number(m.id)]: e.target.value }))}
                          className={`${inputCls} text-right`}
                          placeholder={pendiente > 0 ? `Máx ${pendiente}` : '—'}
                        />
                      </td>
                      <td className="p-2 text-right font-black text-emerald-800">
                        S/ {(valida * Number(m.costo_unitario || 0)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1" htmlFor="input-motivo-devolucion-flotante">
                Motivo de la devolución
              </label>
              <input
                id="input-motivo-devolucion-flotante"
                type="text"
                value={motivoDev}
                onChange={(e) => setMotivoDev(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-right">
              <p className="text-[10px] font-black uppercase text-[var(--color-muted)]">Total a devolver</p>
              <p className="font-black text-emerald-800 text-base">S/ {total.toFixed(2)}</p>
            </div>
          </div>
        </form>

        <div className="bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-bold text-[var(--color-muted)]">
            Elige fecha y trabajador (opcional), escribe la cantidad y confirma. El stock vuelve al almacén.
          </span>
          <button
            id="btn-confirmar-devolucion"
            type="submit"
            form="form-devoluciones-flotante"
            disabled={procesando}
            className="px-6 py-2 bg-[var(--color-ink)] text-white font-black uppercase tracking-wider hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 rounded-none disabled:opacity-50"
          >
            {procesando ? 'Registrando...' : 'Registrar devolución'}
          </button>
        </div>
      </div>
    </div>
  );
};
