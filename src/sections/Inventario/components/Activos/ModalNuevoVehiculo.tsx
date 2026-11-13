import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Car } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Vehiculo } from './types';

interface ModalNuevoVehiculoProps {
  isOpen: boolean;
  onClose: () => void;
  vehiculoEditar?: Vehiculo | null;
  onSaved: () => void;
}

export const ModalNuevoVehiculo: React.FC<ModalNuevoVehiculoProps> = ({
  isOpen,
  onClose,
  vehiculoEditar,
  onSaved,
}) => {
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number | ''>('');
  const [color, setColor] = useState('');
  const [kilometraje, setKilometraje] = useState<number | ''>(0);
  const [vencimientoSoat, setVencimientoSoat] = useState('');
  const [vencimientoRevisionTecnica, setVencimientoRevisionTecnica] = useState('');
  const [trabajadorAsignadoId, setTrabajadorAsignadoId] = useState<number | ''>('');
  const [estado, setEstado] = useState<'OPERATIVO' | 'EN_TALLER' | 'DE_BAJA'>('OPERATIVO');
  const [observaciones, setObservaciones] = useState('');
  const [trabajadores, setTrabajadores] = useState<{ id: number; nombre: string; cargo: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  const inputPlacaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      cargarTrabajadores();
      if (vehiculoEditar) {
        setPlaca(vehiculoEditar.placa);
        setMarca(vehiculoEditar.marca || '');
        setModelo(vehiculoEditar.modelo || '');
        setAnio(vehiculoEditar.anio || '');
        setColor(vehiculoEditar.color || '');
        setKilometraje(vehiculoEditar.kilometraje || 0);
        setVencimientoSoat(vehiculoEditar.vencimiento_soat || '');
        setVencimientoRevisionTecnica(vehiculoEditar.vencimiento_revision_tecnica || '');
        setTrabajadorAsignadoId(vehiculoEditar.trabajador_asignado_id || '');
        setEstado(vehiculoEditar.estado || 'OPERATIVO');
        setObservaciones(vehiculoEditar.observaciones || '');
      } else {
        setPlaca('');
        setMarca('');
        setModelo('');
        setAnio('');
        setColor('');
        setKilometraje(0);
        setVencimientoSoat('');
        setVencimientoRevisionTecnica('');
        setTrabajadorAsignadoId('');
        setEstado('OPERATIVO');
        setObservaciones('');
      }
      setTimeout(() => inputPlacaRef.current?.focus(), 80);
    }
  }, [isOpen, vehiculoEditar]);

  const cargarTrabajadores = async () => {
    try {
      const { data } = await supabase
        .from('trabajadores')
        .select('id, nombre, cargo')
        .eq('estado', 'ACTIVO')
        .order('nombre');
      if (data) setTrabajadores(data);
    } catch (e) {
      console.error('Error al cargar trabajadores:', e);
    }
  };

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
    if (!placa.trim()) {
      avisar('⚠️ La placa del vehículo es obligatoria.');
      document.getElementById('input-veh-placa')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        placa: placa.trim().toUpperCase(),
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        anio: anio ? Number(anio) : null,
        color: color.trim() || null,
        kilometraje: kilometraje ? Number(kilometraje) : 0,
        vencimiento_soat: vencimientoSoat || null,
        vencimiento_revision_tecnica: vencimientoRevisionTecnica || null,
        trabajador_asignado_id: trabajadorAsignadoId ? Number(trabajadorAsignadoId) : null,
        estado,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (vehiculoEditar) {
        const { error } = await supabase
          .from('vehiculos')
          .update(payload)
          .eq('id', vehiculoEditar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehiculos')
          .insert(payload);
        if (error) throw error;
      }

      avisar('✅ Vehículo guardado con éxito.');
      await onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar vehículo:', err);
      avisar(`⚠️ No se pudo guardar vehículo: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Car size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                {vehiculoEditar ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                {vehiculoEditar ? 'Actualizar datos de la unidad vehicular' : 'Registrar vehículo o móvil de servicio'}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-vehiculo"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleGuardar} className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Placa *</label>
              <input
                ref={inputPlacaRef}
                id="input-veh-placa"
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-marca')}
                placeholder="Ej: ABC-123"
                required
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold uppercase focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Marca</label>
              <input
                id="input-veh-marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-modelo')}
                placeholder="Ej: Toyota"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Modelo</label>
              <input
                id="input-veh-modelo"
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-anio')}
                placeholder="Ej: Hilux"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Año</label>
              <input
                id="input-veh-anio"
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value ? parseInt(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-color')}
                placeholder="Ej: 2021"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Color</label>
              <input
                id="input-veh-color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-km')}
                placeholder="Ej: Blanco"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Kilometraje Actual</label>
              <input
                id="input-veh-km"
                type="number"
                min="0"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value ? parseInt(e.target.value) : 0)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-soat')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Vencimiento SOAT</label>
              <input
                id="input-veh-soat"
                type="date"
                value={vencimientoSoat}
                onChange={(e) => setVencimientoSoat(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-rev-tec')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Vencimiento Rev. Técnica</label>
              <input
                id="input-veh-rev-tec"
                type="date"
                value={vencimientoRevisionTecnica}
                onChange={(e) => setVencimientoRevisionTecnica(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'select-veh-conductor')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Conductor / Asignado</label>
              <select
                id="select-veh-conductor"
                value={trabajadorAsignadoId}
                onChange={(e) => setTrabajadorAsignadoId(e.target.value ? Number(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownEnter(e, 'select-veh-estado')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              >
                <option value="">-- Sin conductor asignado --</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.cargo ? `(${t.cargo})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Estado</label>
              <select
                id="select-veh-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-veh-obs')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              >
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="EN_TALLER">EN TALLER</option>
                <option value="DE_BAJA">DE BAJA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Observaciones</label>
            <input
              id="input-veh-obs"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              onKeyDown={(e) => handleKeyDownEnter(e, 'btn-guardar-vehiculo')}
              placeholder="Notas sobre el vehículo..."
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
              id="btn-guardar-vehiculo"
              type="submit"
              disabled={guardando}
              className="px-6 py-2 bg-[var(--color-ink)] text-[var(--color-accent)] font-black uppercase tracking-wider border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-accent)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar (Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
