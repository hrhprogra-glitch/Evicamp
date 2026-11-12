import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Vehiculo, MantenimientoVehiculo } from './types';

interface ModalHistorialMantenimientosProps {
  isOpen: boolean;
  onClose: () => void;
  vehiculo: Vehiculo | null;
}

export const ModalHistorialMantenimientos: React.FC<ModalHistorialMantenimientosProps> = ({
  isOpen,
  onClose,
  vehiculo,
}) => {
  const [mantenimientos, setMantenimientos] = useState<MantenimientoVehiculo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vehiculo) {
      cargarMantenimientos();
    }
  }, [isOpen, vehiculo]);

  useCerrarConEscape(isOpen, onClose);

  const cargarMantenimientos = async () => {
    if (!vehiculo) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehiculos_mantenimientos')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setMantenimientos(data || []);
    } catch (err: any) {
      console.error('Error al cargar mantenimientos:', err);
      avisar('⚠️ No se pudo cargar el historial de mantenimientos.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !vehiculo) return null;

  const totalGasto = mantenimientos.reduce((acc, m) => acc + Number(m.costo || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-3xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera */}
        <div style={{ '--icono': '#d97706' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Historial de Mantenimientos - {vehiculo.placa}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                {vehiculo.marca || ''} {vehiculo.modelo || ''} {vehiculo.anio ? `(${vehiculo.anio})` : ''} - Total invertido: S/ {totalGasto.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-historial-mant"
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
            <div className="py-12 text-center text-neutral-500 font-bold">Cargando mantenimientos...</div>
          ) : mantenimientos.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-bold">
              No hay mantenimientos registrados para este vehículo.
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[var(--color-ink)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--color-surface)] border-b-2 border-[var(--color-ink)] font-black uppercase text-[11px]">
                  <tr>
                    <th className="p-2 border-r border-[var(--color-ink)]">Fecha</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Tipo</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Km</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Costo (S/)</th>
                    <th className="p-2 border-r border-[var(--color-ink)]">Taller</th>
                    <th className="p-2">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-ink)]">
                  {mantenimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors">
                      <td className="p-2 border-r border-[var(--color-ink)] font-bold whitespace-nowrap">
                        {m.fecha}
                      </td>
                      <td className="p-2 border-r border-[var(--color-ink)]">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-black uppercase border ${
                            m.tipo === 'PREVENTIVO'
                              ? 'bg-blue-100 text-blue-900 border-blue-600'
                              : 'bg-red-100 text-red-900 border-red-600'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="p-2 border-r border-[var(--color-ink)] font-bold">
                        {m.kilometraje ? `${m.kilometraje.toLocaleString()} km` : '—'}
                      </td>
                      <td className="p-2 border-r border-[var(--color-ink)] font-black text-right whitespace-nowrap">
                        S/ {Number(m.costo || 0).toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-[var(--color-ink)] font-medium">
                        {m.taller_proveedor || '—'}
                      </td>
                      <td className="p-2">
                        <p className="font-bold">{m.descripcion}</p>
                        {m.observaciones && <p className="text-[10px] text-neutral-500">{m.observaciones}</p>}
                      </td>
                    </tr>
                  ))}
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
