import React, { useState, useEffect, useRef } from 'react';
import { X, HandHelping, Save } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Herramienta } from './types';

interface ModalPrestarHerramientaProps {
  isOpen: boolean;
  onClose: () => void;
  herramientaPreseleccionada?: Herramienta | null;
  herramientas: Herramienta[];
  onPrestamoExitoso: () => void;
}

export const ModalPrestarHerramienta: React.FC<ModalPrestarHerramientaProps> = ({
  isOpen,
  onClose,
  herramientaPreseleccionada,
  herramientas,
  onPrestamoExitoso,
}) => {
  const [herramientaId, setHerramientaId] = useState<number | ''>('');
  const [trabajadorId, setTrabajadorId] = useState<number | ''>('');
  const [trabajadorNombre, setTrabajadorNombre] = useState('');
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [notas, setNotas] = useState('');
  const [trabajadores, setTrabajadores] = useState<{ id: number; nombre: string; cargo: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  const selectHerrRef = useRef<HTMLSelectElement>(null);

  const herramientaActual = herramientas.find((h) => h.id === Number(herramientaId));
  const disponibles = herramientaActual ? Math.max(0, herramientaActual.cantidad_total - herramientaActual.cantidad_en_uso) : 0;

  useEffect(() => {
    if (isOpen) {
      if (herramientaPreseleccionada) {
        setHerramientaId(herramientaPreseleccionada.id);
      } else if (herramientas.length > 0) {
        const primeraDisp = herramientas.find((h) => (h.cantidad_total - h.cantidad_en_uso) > 0);
        setHerramientaId(primeraDisp ? primeraDisp.id : herramientas[0].id);
      }
      setCantidad(1);
      setFechaEsperada('');
      setNotas('');
      cargarTrabajadores();
      setTimeout(() => selectHerrRef.current?.focus(), 80);
    }
  }, [isOpen, herramientaPreseleccionada, herramientas]);

  const cargarTrabajadores = async () => {
    try {
      const { data } = await supabase
        .from('trabajadores')
        .select('id, nombre, cargo')
        .eq('estado', 'ACTIVO')
        .order('nombre');
      if (data) {
        setTrabajadores(data);
        if (data.length > 0) {
          setTrabajadorId(data[0].id);
          setTrabajadorNombre(data[0].nombre);
        }
      }
    } catch (e) {
      console.error('Error al cargar trabajadores:', e);
    }
  };

  useCerrarConEscape(isOpen, onClose);

  if (!isOpen) return null;

  const handleKeyDownEnter = (e: React.KeyboardEvent, nextId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById(nextId)?.focus();
    }
  };

  const handlePrestar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!herramientaId) {
      avisar('⚠️ Selecciona una herramienta.');
      return;
    }
    const trab = trabajadores.find((t) => t.id === Number(trabajadorId));
    const nomTrab = trab?.nombre || trabajadorNombre || '';
    if (!nomTrab.trim()) {
      avisar('⚠️ Selecciona o ingresa el nombre del trabajador.');
      return;
    }
    const cantNum = Number(cantidad);
    if (cantNum <= 0) {
      avisar('⚠️ La cantidad debe ser mayor a 0.');
      return;
    }
    if (disponibles < cantNum) {
      avisar(`⚠️ Stock disponible insuficiente (${disponibles} disponibles).`);
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_prestar_herramienta', {
        p_herramienta_id: Number(herramientaId),
        p_trabajador_id: trabajadorId ? Number(trabajadorId) : null,
        p_trabajador_nombre: nomTrab.trim(),
        p_cantidad: cantNum,
        p_fecha_esperada: fechaEsperada || null,
        p_notas: notas.trim() || null,
      });

      if (error) throw error;

      avisar('✅ Préstamo registrado correctamente.');
      await onPrestamoExitoso();
      onClose();
    } catch (err: any) {
      console.error('Error al prestar herramienta:', err);
      avisar(`⚠️ No se pudo registrar el préstamo: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-lg flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera */}
        <div style={{ '--icono': '#2563eb' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <HandHelping size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                Prestar Herramienta a Trabajador
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Asignar equipo y registrar entrega temporal
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-prestamo"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handlePrestar} className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
          <div>
            <label className="block font-bold uppercase mb-1">Herramienta *</label>
            <select
              ref={selectHerrRef}
              id="select-herr-prestamo"
              value={herramientaId}
              onChange={(e) => setHerramientaId(e.target.value ? Number(e.target.value) : '')}
              onKeyDown={(e) => handleKeyDownEnter(e, 'select-trabajador-prestamo')}
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            >
              <option value="">-- Seleccionar Herramienta --</option>
              {herramientas.map((h) => {
                const disp = Math.max(0, h.cantidad_total - h.cantidad_en_uso);
                return (
                  <option key={h.id} value={h.id} disabled={disp <= 0}>
                    {h.codigo ? `[${h.codigo}] ` : ''}{h.nombre} ({disp} disp / {h.cantidad_total} tot)
                  </option>
                );
              })}
            </select>
            {herramientaActual && (
              <div className="mt-1 text-[11px] font-bold text-neutral-500">
                Disponibles para entrega: <span className="text-[var(--color-ink)] underline">{disponibles} unidades</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Trabajador que la recibe *</label>
            <select
              id="select-trabajador-prestamo"
              value={trabajadorId}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setTrabajadorId(val);
                const trab = trabajadores.find((t) => t.id === val);
                if (trab) setTrabajadorNombre(trab.nombre);
              }}
              onKeyDown={(e) => handleKeyDownEnter(e, 'input-cant-prestamo')}
              className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
            >
              <option value="">-- Seleccionar Trabajador --</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.cargo ? `(${t.cargo})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Cantidad a entregar *</label>
              <input
                id="input-cant-prestamo"
                type="number"
                min="1"
                max={disponibles || 1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-fecha-esperada-prestamo')}
                required
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Fecha esperada devolución</label>
              <input
                id="input-fecha-esperada-prestamo"
                type="date"
                value={fechaEsperada}
                onChange={(e) => setFechaEsperada(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-notas-prestamo')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">Notas / Motivo del préstamo</label>
            <input
              id="input-notas-prestamo"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onKeyDown={(e) => handleKeyDownEnter(e, 'btn-guardar-prestamo')}
              placeholder="Ej: Para obra en Surco / mantenimiento general"
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
              id="btn-guardar-prestamo"
              type="submit"
              disabled={guardando}
              className="px-6 py-2 bg-blue-600 text-white font-black uppercase tracking-wider border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} /> {guardando ? 'Registrando...' : 'Confirmar Préstamo (Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
