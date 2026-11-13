import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Wrench } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Vehiculo } from './types';

interface ModalMantenimientoProps {
  isOpen: boolean;
  onClose: () => void;
  vehiculoPreseleccionado?: Vehiculo | null;
  vehiculos: Vehiculo[];
  onSaved: () => void;
}

export const ModalMantenimiento: React.FC<ModalMantenimientoProps> = ({
  isOpen,
  onClose,
  vehiculoPreseleccionado,
  vehiculos,
  onSaved,
}) => {
  const [vehiculoId, setVehiculoId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<'PREVENTIVO' | 'CORRECTIVO'>('PREVENTIVO');
  const [kilometraje, setKilometraje] = useState<number | ''>('');
  const [costo, setCosto] = useState<number | ''>('');
  const [tallerProveedor, setTallerProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const selectVehRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (vehiculoPreseleccionado) {
        setVehiculoId(vehiculoPreseleccionado.id);
        setKilometraje(vehiculoPreseleccionado.kilometraje || '');
      } else if (vehiculos.length > 0) {
        setVehiculoId(vehiculos[0].id);
        setKilometraje(vehiculos[0].kilometraje || '');
      }
      setFecha(new Date().toISOString().slice(0, 10));
      setTipo('PREVENTIVO');
      setCosto('');
      setTallerProveedor('');
      setDescripcion('');
      setObservaciones('');
      setTimeout(() => selectVehRef.current?.focus(), 80);
    }
  }, [isOpen, vehiculoPreseleccionado, vehiculos]);

  useCerrarConEscape(isOpen, onClose);

  if (!isOpen) return null;

  // Regla de SiuMax Nego: Enter nunca pasa al siguiente campo (el selector se queda; se mueve con flechas).
  // En una lista o una fecha, Enter la abre.
  const handleKeyDownEnter = (e: React.KeyboardEvent, _siguiente?: string) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === 'date')) {
      try { (el as HTMLInputElement).showPicker(); } catch { /* sin lista */ }
    }
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vehiculoId) {
      avisar('⚠️ Selecciona un vehículo.');
      return;
    }
    if (!descripcion.trim()) {
      avisar('⚠️ La descripción del trabajo es obligatoria.');
      document.getElementById('input-mant-desc')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        vehiculo_id: Number(vehiculoId),
        fecha,
        tipo,
        kilometraje: kilometraje ? Number(kilometraje) : null,
        costo: costo ? Number(costo) : 0,
        taller_proveedor: tallerProveedor.trim() || null,
        descripcion: descripcion.trim(),
        observaciones: observaciones.trim() || null,
      };

      const { error } = await supabase.from('vehiculos_mantenimientos').insert(payload);
      if (error) throw error;

      // Actualizar kilometraje del vehículo si es mayor al actual
      if (kilometraje) {
        const vActual = vehiculos.find((v) => v.id === Number(vehiculoId));
        if (vActual && Number(kilometraje) > vActual.kilometraje) {
          await supabase
            .from('vehiculos')
            .update({ kilometraje: Number(kilometraje), updated_at: new Date().toISOString() })
            .eq('id', Number(vehiculoId));
        }
      }

      avisar('✅ Mantenimiento registrado correctamente.');
      await onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error al registrar mantenimiento:', err);
      avisar(`⚠️ No se pudo registrar mantenimiento: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-lg flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera */}
        <div style={{ '--icono': '#d97706' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Registrar Mantenimiento de Vehículo
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Historial de servicios preventivos y correctivos de la flota
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-mant"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleGuardar} className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
          <div>
            <label className="block font-bold uppercase mb-1">Vehículo *</label>
            <select
              ref={selectVehRef}
              id="select-mant-vehiculo"
              value={vehiculoId}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : '';
                setVehiculoId(id);
                const v = vehiculos.find((item) => item.id === id);
                if (v && v.kilometraje) setKilometraje(v.kilometraje);
              }}
              onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-fecha')}
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            >
              <option value="">-- Seleccionar Vehículo --</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} - {v.marca || ''} {v.modelo || ''} ({v.kilometraje} km)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Fecha *</label>
              <input
                id="input-mant-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'select-mant-tipo')}
                required
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Tipo de Mantenimiento</label>
              <select
                id="select-mant-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-km')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              >
                <option value="PREVENTIVO">PREVENTIVO (Cambio aceite, filtros, etc.)</option>
                <option value="CORRECTIVO">CORRECTIVO (Reparación mecánica/eléctrica)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Kilometraje al momento</label>
              <input
                id="input-mant-km"
                type="number"
                min="0"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value ? parseInt(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-costo')}
                placeholder="Ej: 45000"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Costo Total (S/)</label>
              <input
                id="input-mant-costo"
                type="number"
                step="0.01"
                min="0"
                value={costo}
                onChange={(e) => setCosto(e.target.value ? parseFloat(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-taller')}
                placeholder="Ej: 350.00"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Taller / Proveedor del Servicio</label>
            <input
              id="input-mant-taller"
              type="text"
              value={tallerProveedor}
              onChange={(e) => setTallerProveedor(e.target.value)}
              onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-desc')}
              placeholder="Ej: Lubricentro San Jorge / Taller Central"
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Descripción del Trabajo Realizado *</label>
            <input
              id="input-mant-desc"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onKeyDown={(e) => handleKeyDownEnter(e, 'input-mant-obs')}
              placeholder="Ej: Cambio de aceite 10W-40, filtro de aire y pastillas de freno"
              required
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Observaciones / Garantía</label>
            <input
              id="input-mant-obs"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              onKeyDown={(e) => handleKeyDownEnter(e, 'btn-guardar-mantenimiento')}
              placeholder="Notas adicionales..."
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>

          {/* Botones */}
          <div className="pt-4 border-t-2 border-[var(--color-ink)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[var(--color-ink)] font-bold uppercase hover:bg-neutral-200 cursor-pointer"
            >
              Cancelar (Esc)
            </button>
            <button
              id="btn-guardar-mantenimiento"
              type="submit"
              disabled={guardando}
              className="px-6 py-2 bg-amber-600 text-white font-black uppercase tracking-wider border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar Mantenimiento (Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
