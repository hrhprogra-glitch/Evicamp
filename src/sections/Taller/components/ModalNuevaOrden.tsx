// src/sections/Taller/components/ModalNuevaOrden.tsx
// Modal para recibir un equipo en el taller y generar orden de reparación

import React, { useState, useEffect, useRef } from 'react';
import { Wrench, Plus, X, User, Printer, Calendar, Clock, Loader2, Phone, Hash } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { PrioridadOrden } from '../types';

interface Props {
  clientes: { id: number; name: string; telefono?: string | null; dni?: string | null; ruc?: string | null }[];
  trabajadores: { id: number; nombre: string }[];
  onCerrar: () => void;
  onOrdenCreada: (ordenId: number, imprimirTicket: boolean) => void;
}

const claseInput =
  'w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] rounded-none';
const claseBoton =
  'px-4 py-2 border-2 border-[var(--color-ink)] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1 cursor-pointer disabled:opacity-50 rounded-none';

export const ModalNuevaOrden: React.FC<Props> = ({
  clientes,
  trabajadores,
  onCerrar,
  onOrdenCreada,
}) => {
  useCerrarConEscape(true, () => onCerrar());
  const cuerpo = useRef<HTMLDivElement>(null);

  // Cliente
  const [customerId, setCustomerId] = useState<string>('');
  const [bienesCliente, setBienesCliente] = useState<{ id: number; nombre: string; tipo?: string }[]>([]);
  const [bienId, setBienId] = useState<string>('');

  // Datos del equipo
  const [tipoEquipo, setTipoEquipo] = useState('Equipo / Maquinaria');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [color, setColor] = useState('');
  const [accesorios, setAccesorios] = useState('');

  // Falla y asignación
  const [fallaReportada, setFallaReportada] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadOrden>('NORMAL');
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [fechaPrometida, setFechaPrometida] = useState('');

  // Costos iniciales
  const [costoManoObra, setCostoManoObra] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [metodoAdelanto, setMetodoAdelanto] = useState('EFECTIVO');
  const [imprimirTicket, setImprimirTicket] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Cargar bienes del cliente al cambiar
  useEffect(() => {
    if (!customerId) {
      setBienesCliente([]);
      setBienId('');
      return;
    }
    void supabase
      .from('bienes_cliente')
      .select('id, nombre, tipo')
      .eq('customer_id', customerId)
      .order('nombre')
      .then(({ data }) => setBienesCliente((data as any[]) || []));
  }, [customerId]);

  // Si elige un bien del cliente, autollenar tipo y marca
  const handleSeleccionarBien = (id: string) => {
    setBienId(id);
    const bien = bienesCliente.find((b) => String(b.id) === id);
    if (bien) {
      setTipoEquipo(bien.tipo || 'Equipo');
      setMarca(bien.nombre);
    }
  };

  // Regla 9 SiuMax: Enter es como un clic, el selector se queda en el campo
  // (Enter en un botón sigue siendo clic; en una lista o fecha la abre; nunca envía el formulario desde un campo)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => enterSeQueda(e);

  // Guardar orden
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      void avisar('Selecciona un cliente para registrar el ingreso al taller.');
      return;
    }
    if (!fallaReportada.trim()) {
      void avisar('Describe el problema o falla reportada por el cliente.');
      return;
    }

    setGuardando(true);
    try {
      const cManoObra = Math.max(0, Number(costoManoObra) || 0);
      const mAdelanto = Math.max(0, Number(adelanto) || 0);
      const totalEstimado = cManoObra;
      const saldo = Math.max(0, totalEstimado - mAdelanto);

      const { data: orden, error } = await supabase
        .from('taller_ordenes')
        .insert({
          customer_id: Number(customerId),
          bien_id: bienId ? Number(bienId) : null,
          tipo_equipo: tipoEquipo.trim() || 'Equipo',
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          serie: serie.trim() || null,
          color: color.trim() || null,
          accesorios: accesorios.trim() || null,
          falla_reportada: fallaReportada.trim(),
          prioridad,
          tecnico_id: tecnicoId ? Number(tecnicoId) : null,
          fecha_prometida: fechaPrometida || null,
          costo_mano_obra: cManoObra,
          costo_repuestos: 0,
          total: totalEstimado,
          adelanto: mAdelanto,
          saldo,
          estado: 'RECIBIDO',
        })
        .select('id, codigo')
        .single();

      if (error || !orden) {
        throw new Error(error?.message || 'Error al guardar');
      }

      // Si hubo adelanto, registrar pago
      if (mAdelanto > 0) {
        await supabase.rpc('fn_registrar_pago_taller', {
          p_orden_id: orden.id,
          p_monto: mAdelanto,
          p_metodo: metodoAdelanto,
          p_tipo: 'ADELANTO',
          p_notas: 'Adelanto al recibir equipo',
        });
      }

      await avisar(`✅ Orden generada con éxito: ${orden.codigo}.\nEquipo recibido correctamente en taller.`);
      onOrdenCreada(orden.id, imprimirTicket);
    } catch (err: any) {
      void avisar(`No se pudo crear la orden: ${err?.message || err}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono"
    >
      <div
        ref={cuerpo}
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-3xl max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] flex flex-col overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">Recibir equipo en taller</h2>
              <p className="ventana-cabecera__subtitulo">Nueva orden de reparación / mantenimiento</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-cerrar-modal-nueva-orden"
            onClick={onCerrar}
            aria-label="Cerrar (Esc)"
            title="Cerrar (Esc)"
            className="ventana-cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} onKeyDown={handleKeyDown} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-xs">
            {/* SECCIÓN 1: CLIENTE */}
            <div className="border-2 border-[var(--color-border)] p-3 bg-[var(--color-bg)] flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                <User size={12} /> Cliente y Bien Atendido
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">
                    Cliente <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="orden-taller-cliente"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className={claseInput}
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.telefono ? `(${c.telefono})` : ''} {c.dni ? `· DNI: ${c.dni}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">
                    Equipo registrado (opcional)
                  </label>
                  <select
                    id="orden-taller-bien"
                    value={bienId}
                    onChange={(e) => handleSeleccionarBien(e.target.value)}
                    disabled={!customerId || bienesCliente.length === 0}
                    className={claseInput}
                  >
                    <option value="">-- Ninguno / Registro nuevo --</option>
                    {bienesCliente.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} {b.tipo ? `(${b.tipo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS DEL EQUIPO */}
            <div className="border-2 border-[var(--color-border)] p-3 bg-white flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                <Wrench size={12} /> Características del Equipo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Tipo de equipo</label>
                  <input
                    id="orden-taller-tipo"
                    value={tipoEquipo}
                    onChange={(e) => setTipoEquipo(e.target.value)}
                    placeholder="Ej: Bomba sumergible, Laptop, Motor"
                    className={claseInput}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Marca</label>
                  <input
                    id="orden-taller-marca"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej: Pedrollo, HP, Honda"
                    className={claseInput}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Modelo</label>
                  <input
                    id="orden-taller-modelo"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej: 4BLOCKm, Pavilion 15"
                    className={claseInput}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">N° de Serie</label>
                  <input
                    id="orden-taller-serie"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    placeholder="Número de serie o placa"
                    className={claseInput}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Color / Estado visual</label>
                  <input
                    id="orden-taller-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej: Azul, raspones leves"
                    className={claseInput}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Accesorios dejados</label>
                  <input
                    id="orden-taller-accesorios"
                    value={accesorios}
                    onChange={(e) => setAccesorios(e.target.value)}
                    placeholder="Ej: Cargador, cable de poder, caja"
                    className={claseInput}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: PROBLEMA / FALLA REPORTADA */}
            <div className="border-2 border-[var(--color-border)] p-3 bg-white flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">
                Falla reportada por el cliente <span className="text-red-600">*</span>
              </label>
              <textarea
                id="orden-taller-falla"
                rows={2}
                required
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                placeholder="Describe el motivo de ingreso, problema reportado o mantenimiento solicitado..."
                className={`${claseInput} font-mono`}
              />
            </div>

            {/* SECCIÓN 4: ASIGNACIÓN Y TIEMPOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Técnico asignado</label>
                <select
                  id="orden-taller-tecnico"
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value)}
                  className={claseInput}
                >
                  <option value="">-- Por asignar en diagnóstico --</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Prioridad</label>
                <select
                  id="orden-taller-prioridad"
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as PrioridadOrden)}
                  className={claseInput}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="BAJA">Baja</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Fecha prometida</label>
                <input
                  id="orden-taller-fecha-promesa"
                  type="date"
                  value={fechaPrometida}
                  onChange={(e) => setFechaPrometida(e.target.value)}
                  className={claseInput}
                />
              </div>
            </div>

            {/* SECCIÓN 5: COSTOS Y ADELANTO */}
            <div className="border-2 border-[var(--color-border)] p-3 bg-[var(--color-bg)] grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">
                  Mano de obra estimada (S/)
                </label>
                <input
                  id="orden-taller-mano-obra"
                  type="number"
                  min="0"
                  step="any"
                  value={costoManoObra}
                  onChange={(e) => setCostoManoObra(e.target.value)}
                  placeholder="0.00"
                  className={claseInput}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Adelanto abonado (S/)</label>
                <input
                  id="orden-taller-adelanto"
                  type="number"
                  min="0"
                  step="any"
                  value={adelanto}
                  onChange={(e) => setAdelanto(e.target.value)}
                  placeholder="0.00"
                  className={claseInput}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-ink)]">Medio de pago</label>
                <select
                  id="orden-taller-metodo"
                  value={metodoAdelanto}
                  onChange={(e) => setMetodoAdelanto(e.target.value)}
                  disabled={!adelanto || Number(adelanto) <= 0}
                  className={claseInput}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
            </div>

            {/* Checkbox de ticket */}
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px] text-[var(--color-ink)]">
              <input
                type="checkbox"
                id="orden-taller-check-ticket"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-ink)] rounded-none cursor-pointer"
              />
              <Printer size={14} /> Imprimir ticket de recepción automáticamente tras guardar
            </label>
          </div>

          {/* Pie de modal */}
          <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex justify-end gap-2 shrink-0">
            <button
              type="button"
              id="btn-cancelar-nueva-orden"
              onClick={onCerrar}
              className={`${claseBoton} bg-white text-[var(--color-ink)]`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-guardar-orden-taller"
              disabled={guardando}
              className={`${claseBoton} bg-[var(--color-ink)] text-[var(--color-accent)]`}
            >
              {guardando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Plus size={16} /> Registrar ingreso
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
