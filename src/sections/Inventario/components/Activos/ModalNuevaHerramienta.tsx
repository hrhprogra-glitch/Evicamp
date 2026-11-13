import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Wrench, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar } from '../../../../utils/permisos';
import { useCerrarConEscape } from '../../../../utils/useCerrarConEscape';
import type { Herramienta } from './types';

interface ModalNuevaHerramientaProps {
  isOpen: boolean;
  onClose: () => void;
  herramientaEditar?: Herramienta | null;
  onSaved: () => void;
}

export const ModalNuevaHerramienta: React.FC<ModalNuevaHerramientaProps> = ({
  isOpen,
  onClose,
  herramientaEditar,
  onSaved,
}) => {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('GENERAL');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [cantidadTotal, setCantidadTotal] = useState(1);
  const [estado, setEstado] = useState<'OPERATIVO' | 'EN_MANTENIMIENTO' | 'DE_BAJA'>('OPERATIVO');
  const [ubicacion, setUbicacion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const inputCodigoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (herramientaEditar) {
        setCodigo(herramientaEditar.codigo || '');
        setNombre(herramientaEditar.nombre);
        setCategoria(herramientaEditar.categoria || 'GENERAL');
        setMarca(herramientaEditar.marca || '');
        setModelo(herramientaEditar.modelo || '');
        setSerie(herramientaEditar.serie || '');
        setCantidadTotal(herramientaEditar.cantidad_total || 1);
        setEstado(herramientaEditar.estado || 'OPERATIVO');
        setUbicacion(herramientaEditar.ubicacion || '');
        setObservaciones(herramientaEditar.observaciones || '');
      } else {
        setCodigo('');
        setNombre('');
        setCategoria('GENERAL');
        setMarca('');
        setModelo('');
        setSerie('');
        setCantidadTotal(1);
        setEstado('OPERATIVO');
        setUbicacion('');
        setObservaciones('');
      }
      setTimeout(() => inputCodigoRef.current?.focus(), 80);
    }
  }, [isOpen, herramientaEditar]);

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
    if (!nombre.trim()) {
      avisar('⚠️ El nombre de la herramienta es obligatorio.');
      document.getElementById('input-herr-nombre')?.focus();
      return;
    }
    if (cantidadTotal < 0) {
      avisar('⚠️ La cantidad no puede ser negativa.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        codigo: codigo.trim() || null,
        nombre: nombre.trim(),
        categoria: categoria.trim() || 'GENERAL',
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        serie: serie.trim() || null,
        cantidad_total: Number(cantidadTotal),
        estado,
        ubicacion: ubicacion.trim() || null,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (herramientaEditar) {
        const { error } = await supabase
          .from('herramientas')
          .update(payload)
          .eq('id', herramientaEditar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('herramientas')
          .insert({
            ...payload,
            cantidad_en_uso: 0,
          });
        if (error) throw error;
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar herramienta:', err);
      avisar(`⚠️ No se pudo guardar: ${err.message || 'Error desconocido'}`);
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
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                {herramientaEditar ? 'Editar Herramienta' : 'Nueva Herramienta'}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                {herramientaEditar ? 'Actualizar datos del activo' : 'Registrar equipo o herramienta en el inventario'}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-herramienta"
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
              <label className="block font-bold uppercase mb-1">Código / Referencia</label>
              <input
                ref={inputCodigoRef}
                id="input-herr-codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-nombre')}
                placeholder="Ej: HER-001"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Nombre *</label>
              <input
                id="input-herr-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-categoria')}
                placeholder="Ej: Taladro Percutor 750W"
                required
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Categoría</label>
              <input
                id="input-herr-categoria"
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-marca')}
                placeholder="Ej: Eléctrica"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Marca</label>
              <input
                id="input-herr-marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-modelo')}
                placeholder="Ej: Bosch"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Modelo</label>
              <input
                id="input-herr-modelo"
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-serie')}
                placeholder="Ej: GSB 13 RE"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">N° Serie</label>
              <input
                id="input-herr-serie"
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-cantidad')}
                placeholder="Ej: SN-9283748"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Cantidad Total *</label>
              <input
                id="input-herr-cantidad"
                type="number"
                min="0"
                value={cantidadTotal}
                onChange={(e) => setCantidadTotal(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'select-herr-estado')}
                required
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Estado</label>
              <select
                id="select-herr-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-ubicacion')}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              >
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="EN_MANTENIMIENTO">EN MANTENIMIENTO</option>
                <option value="DE_BAJA">DE BAJA</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase mb-1">Ubicación en Almacén</label>
              <input
                id="input-herr-ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'input-herr-observaciones')}
                placeholder="Ej: Estante 3 - Gaveta B"
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
            <div>
              <label className="block font-bold uppercase mb-1">Observaciones</label>
              <input
                id="input-herr-observaciones"
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, 'btn-guardar-herramienta')}
                placeholder="Notas adicionales..."
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] p-2 font-bold focus:outline-none focus:bg-[var(--color-surface)]"
              />
            </div>
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
              id="btn-guardar-herramienta"
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
