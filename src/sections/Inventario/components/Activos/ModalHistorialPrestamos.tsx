import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Herramienta, PrestamoHerramienta } from './types';

interface ModalHistorialPrestamosProps {
  isOpen: boolean;
  onClose: () => void;
  herramienta?: Herramienta | null;
  onDevolucionExitosa: () => void;
}

export const ModalHistorialPrestamos: React.FC<ModalHistorialPrestamosProps> = ({
  isOpen,
  onClose,
  herramienta,
  onDevolucionExitosa,
}) => {
  const [prestamos, setPrestamos] = useState<PrestamoHerramienta[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarPrestamos();
    }
  }, [isOpen, herramienta]);

  useCerrarConEscape(isOpen, onClose);

  const cargarPrestamos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('herramientas_prestamos')
        .select('*, herramienta:herramientas(id, nombre, codigo)')
        .order('fecha_prestamo', { ascending: false });

      if (herramienta) {
        query = query.eq('herramienta_id', herramienta.id);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setPrestamos(data || []);
    } catch (err: any) {
      console.error('Error al cargar historial de préstamos:', err);
      avisar('⚠️ No se pudo cargar el historial de préstamos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevolver = async (prestamo: PrestamoHerramienta) => {
    if (prestamo.estado === 'DEVUELTO') return;
    setProcesandoId(prestamo.id);
    try {
      const { error } = await supabase.rpc('fn_devolver_herramienta', {
        p_prestamo_id: prestamo.id,
        p_cantidad_devuelta: prestamo.cantidad,
        p_notas: 'Devuelto a almacén',
      });

      if (error) throw error;

      avisar('✅ Herramienta devuelta al stock disponible.');
      onDevolucionExitosa();
      cargarPrestamos();
    } catch (err: any) {
      console.error('Error al devolver herramienta:', err);
      avisar(`⚠️ Falló la devolución: ${err.message || 'Error desconocido'}`);
    } finally {
      setProcesandoId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-3xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <History size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Historial de Préstamos y Devoluciones
              </h2>
              <p className="ventana-cabecera__subtitulo">
                {herramienta ? `Herramienta: ${herramienta.codigo ? `[${herramienta.codigo}] ` : ''}${herramienta.nombre}` : 'Control de préstamos a trabajadores'}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-historial-prestamos"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabla */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
          {loading ? (
            <div className="py-12 text-center text-neutral-500 font-bold">Cargando préstamos...</div>
          ) : prestamos.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-bold">
              No hay préstamos registrados para esta herramienta.
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[var(--color-ink)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--color-surface)] border-b-2 border-[var(--color-ink)] font-black uppercase text-[11px]">
                  <tr>
                    {!herramienta && <th className="p-2 border-r border-[var(--color-ink)]">Herramienta</th>}
                    <th className="p-2 border-r border-[var(--color-ink)]">Fecha Préstamo</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Trabajador</th>
                    <th className="p-2 border-r border-[var(--color-ink)] text-center">Cant.</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Estado</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Devolución</th>
                    <th className="p-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-ink)]">
                  {prestamos.map((p) => {
                    const esPrestado = p.estado === 'PRESTADO';
                    return (
                      <tr key={p.id} className="hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors">
                        {!herramienta && (
                          <td className="p-2 border-r border-[var(--color-ink)] font-bold">
                            {p.herramienta?.codigo ? `[${p.herramienta.codigo}] ` : ''}
                            {p.herramienta?.nombre || 'Herramienta'}
                          </td>
                        )}
                        <td className="p-2 border-r border-[var(--color-ink)]">
                          {new Date(p.fecha_prestamo).toLocaleDateString()}
                        </td>
                        <td className="p-2 border-r border-[var(--color-ink)] font-bold">
                          {p.trabajador_nombre}
                        </td>
                        <td className="p-2 border-r border-[var(--color-ink)] text-center font-black">
                          {p.cantidad}
                        </td>
                        <td className="p-2 border-r border-[var(--color-ink)]">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase border ${
                              esPrestado
                                ? 'bg-amber-100 text-amber-900 border-amber-600'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-600'
                            }`}
                          >
                            {esPrestado ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                            {p.estado}
                          </span>
                        </td>
                        <td className="p-2 border-r border-[var(--color-ink)] text-[11px]">
                          {p.fecha_devolucion
                            ? new Date(p.fecha_devolucion).toLocaleDateString()
                            : p.fecha_esperada_devolucion
                            ? `Esperada: ${p.fecha_esperada_devolucion}`
                            : '—'}
                        </td>
                        <td className="p-2 text-right">
                          {esPrestado ? (
                            <button
                              id={`btn-devolver-prestamo-${p.id}`}
                              onClick={() => handleDevolver(p)}
                              disabled={procesandoId === p.id}
                              className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] uppercase border border-[var(--color-ink)] hover:bg-emerald-700 flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw size={12} />
                              {procesandoId === p.id ? '...' : 'Devolver'}
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-[10px] font-bold">Devuelto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-[var(--color-ink)] font-bold uppercase hover:bg-neutral-200 cursor-pointer text-xs"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
