import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Clock, MapPin, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import type { Trabajo, EstadoTrabajo, PrioridadTrabajo } from '../types';

interface ModalNuevoTrabajoProps {
  isOpen: boolean;
  trabajoEditar?: Trabajo | null;
  fechaInicial?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalNuevoTrabajo: React.FC<ModalNuevoTrabajoProps> = ({
  isOpen,
  trabajoEditar,
  fechaInicial,
  onClose,
  onSuccess,
}) => {
  useCerrarConEscape(isOpen, onClose);

  const [titulo, setTitulo] = useState('');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [bienId, setBienId] = useState<number | ''>('');
  const [direccion, setDireccion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fecha, setFecha] = useState(fechaInicial || new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('11:00');
  const [prioridad, setPrioridad] = useState<PrioridadTrabajo>('NORMAL');
  const [estado, setEstado] = useState<EstadoTrabajo>('PENDIENTE');
  const [descripcion, setDescripcion] = useState('');
  const [notas, setNotas] = useState('');
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<number[]>([]);

  // Listas de apoyo
  const [clientes, setClientes] = useState<any[]>([]);
  const [todosBienes, setTodosBienes] = useState<any[]>([]);
  const [bienesCliente, setBienesCliente] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    if (!isOpen) return;

    const cargarCatalogos = async () => {
      try {
        const [resClientes, resBienes, resTrabajadores] = await Promise.all([
          supabase.from('customers').select('id, name, dni, ruc, direccion').order('name'),
          supabase.from('bienes_cliente').select('id, customer_id, nombre, tipo, direccion, ubicacion').order('nombre'),
          supabase.from('trabajadores').select('id, nombre, cargo, dni').eq('estado', 'ACTIVO').order('nombre'),
        ]);

        if (resClientes.data) setClientes(resClientes.data);
        if (resBienes.data) setTodosBienes(resBienes.data);
        if (resTrabajadores.data) setTrabajadores(resTrabajadores.data);
      } catch (err) {
        console.error('Error cargando catálogos para agenda:', err);
      }
    };

    cargarCatalogos();
  }, [isOpen]);

  // Actualizar datos al abrir o cambiar trabajoEditar
  useEffect(() => {
    if (!isOpen) return;

    if (trabajoEditar) {
      setTitulo(trabajoEditar.titulo || '');
      setCustomerId(trabajoEditar.customer_id || '');
      setBienId(trabajoEditar.bien_id || '');
      setDireccion(trabajoEditar.direccion || '');
      setUbicacion(trabajoEditar.ubicacion || '');
      setFecha(trabajoEditar.fecha || new Date().toISOString().slice(0, 10));
      setHoraInicio(trabajoEditar.hora_inicio ? trabajoEditar.hora_inicio.slice(0, 5) : '');
      setHoraFin(trabajoEditar.hora_fin ? trabajoEditar.hora_fin.slice(0, 5) : '');
      setPrioridad(trabajoEditar.prioridad || 'NORMAL');
      setEstado(trabajoEditar.estado || 'PENDIENTE');
      setDescripcion(trabajoEditar.descripcion || '');
      setNotas(trabajoEditar.notas || '');
      if (trabajoEditar.trabajadores) {
        setTrabajadoresSeleccionados(trabajoEditar.trabajadores.map((t) => t.trabajador_id));
      } else {
        setTrabajadoresSeleccionados([]);
      }
    } else {
      setTitulo('');
      setCustomerId('');
      setBienId('');
      setDireccion('');
      setUbicacion('');
      setFecha(fechaInicial || new Date().toISOString().slice(0, 10));
      setHoraInicio('09:00');
      setHoraFin('11:00');
      setPrioridad('NORMAL');
      setEstado('PENDIENTE');
      setDescripcion('');
      setNotas('');
      setTrabajadoresSeleccionados([]);
    }

    // En celular/tablet (pantalla táctil) NO abrir el teclado al entrar: eso hacía que el navegador hiciera scroll
    // apenas se abría la ventana y el trabajador sintiera que "intenta bajar y como que sube". En PC se mantiene
    // el foco automático para seguir trabajando solo con teclado.
    setTimeout(() => {
      if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) return;
      document.getElementById('input-titulo-trabajo')?.focus();
    }, 60);
  }, [isOpen, trabajoEditar, fechaInicial]);

  // Filtrar bienes según el cliente seleccionado
  useEffect(() => {
    if (customerId) {
      const filtrados = todosBienes.filter((b) => b.customer_id === Number(customerId));
      setBienesCliente(filtrados);
    } else {
      setBienesCliente([]);
    }
  }, [customerId, todosBienes]);

  // Al elegir cliente, si no hay dirección, tomar la del cliente
  const handleCambioCliente = (id: number | '') => {
    setCustomerId(id);
    setBienId('');
    if (id) {
      const cli = clientes.find((c) => c.id === id);
      if (cli && cli.direccion && !direccion) {
        setDireccion(cli.direccion);
      }
    }
  };

  // Al elegir bien, si tiene dirección o mapa, auto-completar
  const handleCambioBien = (id: number | '') => {
    setBienId(id);
    if (id) {
      const b = bienesCliente.find((bien) => bien.id === id);
      if (b) {
        if (b.direccion) setDireccion(b.direccion);
        if (b.ubicacion) setUbicacion(b.ubicacion);
      }
    }
  };

  const toggleTrabajador = (id: number) => {
    setTrabajadoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Regla 9 SiuMax: Enter es como un clic, el selector se queda en el campo
  // (en una lista, fecha u hora, Enter la abre)
  const handleEnterKey = (e: React.KeyboardEvent, _nextId?: string) => enterSeQueda(e);

  const handleGuardar = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!titulo.trim()) {
      avisar('Por favor escribe un título para el trabajo.');
      document.getElementById('input-titulo-trabajo')?.focus();
      return;
    }

    if (!fecha) {
      avisar('Por favor selecciona una fecha.');
      document.getElementById('input-fecha-trabajo')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const datosTrabajo: any = {
        titulo: titulo.trim(),
        customer_id: customerId ? Number(customerId) : null,
        bien_id: bienId ? Number(bienId) : null,
        direccion: direccion.trim() || null,
        ubicacion: ubicacion.trim() || null,
        fecha,
        hora_inicio: horaInicio ? `${horaInicio}:00` : null,
        hora_fin: horaFin ? `${horaFin}:00` : null,
        prioridad,
        estado,
        descripcion: descripcion.trim() || null,
        notas: notas.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let trabajoId = trabajoEditar?.id;

      if (trabajoEditar) {
        const { error: errUpdate } = await supabase
          .from('agenda_trabajos')
          .update(datosTrabajo)
          .eq('id', trabajoEditar.id);

        if (errUpdate) throw errUpdate;

        // Limpiar y re-insertar asignaciones de trabajadores
        await supabase.from('agenda_trabajadores').delete().eq('trabajo_id', trabajoEditar.id);
      } else {
        const { data: insertData, error: errInsert } = await supabase
          .from('agenda_trabajos')
          .insert([datosTrabajo])
          .select('id')
          .single();

        if (errInsert) throw errInsert;
        trabajoId = insertData.id;
      }

      // Asignar trabajadores
      if (trabajoId && trabajadoresSeleccionados.length > 0) {
        const filasTrabajadores = trabajadoresSeleccionados.map((tid) => ({
          trabajo_id: trabajoId,
          trabajador_id: tid,
        }));

        const { error: errTrab } = await supabase
          .from('agenda_trabajadores')
          .insert(filasTrabajadores);

        if (errTrab) console.warn('Error asignando trabajadores a agenda:', errTrab);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar trabajo en agenda:', err);
      avisar(`Error al guardar: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm font-mono"
    >
      <div className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full h-[100dvh] sm:h-auto max-w-2xl flex flex-col max-h-[100dvh] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden">
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                {trabajoEditar ? 'Editar Trabajo' : 'Nuevo Trabajo en Agenda'}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Programación de visita, técnico y cliente
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-trabajo"
            type="button"
            onClick={onClose}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario: Enter no pasa al siguiente campo; se mueve con flechas */}
        <form
          id="form-nuevo-trabajo"
          onSubmit={handleGuardar}
          noValidate
          data-evitar-scroll-foco
          data-evitar-foco-auto
          className="flex-1 overflow-y-auto p-4 sm:p-4 flex flex-col gap-4 sm:gap-3"
        >
          {/* Título */}
          <div>
            <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Título del Trabajo *
            </label>
            <input
              id="input-titulo-trabajo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => handleEnterKey(e, 'select-cliente-trabajo')}
              placeholder="Ej. Mantenimiento de piscina, Revisión de bomba, Instalación..."
              className="w-full p-3 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Cliente y Lo que se atiende */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Cliente (Opcional)
              </label>
              <select
                id="select-cliente-trabajo"
                value={customerId}
                onChange={(e) => handleCambioCliente(e.target.value ? Number(e.target.value) : '')}
                onKeyDown={(e) => handleEnterKey(e, 'select-bien-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">-- Sin cliente asignado --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.dni ? `(${c.dni})` : c.ruc ? `(${c.ruc})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Lo que se atiende (Bien)
              </label>
              <select
                id="select-bien-trabajo"
                value={bienId}
                onChange={(e) => handleCambioBien(e.target.value ? Number(e.target.value) : '')}
                disabled={!customerId}
                onKeyDown={(e) => handleEnterKey(e, 'input-direccion-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Seleccionar bien / piscina / equipo --</option>
                {bienesCliente.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tipo}: {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dirección y Ubicación (Maps) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Dirección / Lugar
              </label>
              <input
                id="input-direccion-trabajo"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-ubicacion-trabajo')}
                placeholder="Av. Principal 123, Urb..."
                className="w-full p-3 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Link de Google Maps
              </label>
              <input
                id="input-ubicacion-trabajo"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-fecha-trabajo')}
                placeholder="https://maps.google.com/..."
                className="w-full p-3 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Fecha, Hora Inicio, Hora Fin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                id="input-fecha-trabajo"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-hora-inicio-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Hora Inicio
              </label>
              <input
                id="input-hora-inicio-trabajo"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-hora-fin-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Hora Fin
              </label>
              <input
                id="input-hora-fin-trabajo"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'select-prioridad-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Prioridad y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Prioridad
              </label>
              <select
                id="select-prioridad-trabajo"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as PrioridadTrabajo)}
                onKeyDown={(e) => handleEnterKey(e, 'select-estado-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
                Estado
              </label>
              <select
                id="select-estado-trabajo"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoTrabajo)}
                onKeyDown={(e) => handleEnterKey(e, 'input-descripcion-trabajo')}
                className="w-full p-3 sm:px-2 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] font-bold text-[var(--color-ink)] rounded-none cursor-pointer outline-none focus:border-[var(--color-accent)]"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="SEGUIMIENTO">Volver a ir (Seguimiento)</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Técnicos Asignados (multi-select rápido con botones/chips) */}
          <div>
            <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Técnicos Asignados
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] min-h-[44px]">
              {trabajadores.length === 0 ? (
                <span className="text-[11px] text-[var(--color-muted)]">
                  No hay trabajadores registrados en Clientes &gt; Trabajadores.
                </span>
              ) : (
                trabajadores.map((t) => {
                  const seleccionado = trabajadoresSeleccionados.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      id={`chip-trabajador-${t.id}`}
                      onClick={() => toggleTrabajador(t.id)}
                      className={`px-3 py-2 sm:px-2.5 sm:py-1 text-sm sm:text-xs font-bold uppercase transition-colors cursor-pointer rounded-none border min-h-[44px] sm:min-h-0 ${
                        seleccionado
                          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                          : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:bg-slate-100'
                      }`}
                    >
                      {seleccionado ? '✓ ' : '+ '}
                      {t.nombre}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Descripción del Trabajo
            </label>
            <textarea
              id="input-descripcion-trabajo"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles sobre lo que se debe realizar en la visita..."
              className="w-full p-3 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Notas Internas */}
          <div>
            <label className="block text-xs sm:text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Notas Internas
            </label>
            <textarea
              id="input-notas-trabajo"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones para los técnicos, materiales requeridos, etc..."
              className="w-full p-3 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] rounded-none outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </form>

        {/* Botones de Acción fijos al pie */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] shrink-0">
          <button
            id="btn-cancelar-trabajo"
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-[var(--color-border)] bg-white text-sm sm:text-xs font-bold uppercase text-[var(--color-ink)] hover:bg-slate-200 cursor-pointer rounded-none"
          >
            Cancelar
          </button>
          <button
            id="btn-guardar-trabajo"
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-1.5 px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-sm sm:text-xs font-black uppercase border border-[var(--color-accent-dark)] cursor-pointer rounded-none active:scale-[0.98]"
          >
            <Save size={15} />
            {guardando ? 'Guardando...' : trabajoEditar ? 'Actualizar Trabajo' : 'Guardar Trabajo'}
          </button>
        </div>
      </div>
    </div>
  );
};
