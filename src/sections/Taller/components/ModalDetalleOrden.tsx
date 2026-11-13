// src/sections/Taller/components/ModalDetalleOrden.tsx
// Modal de gestión detallada de orden de taller: estado, diagnóstico, repuestos, cobros e impresión

import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  X,
  Printer,
  MessageSquare,
  DollarSign,
  Plus,
  Trash2,
  Check,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileText,
  Package,
} from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar, confirmar } from '../../../utils/dialogos';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { TallerOrden, TallerRepuesto, TallerPago, EstadoOrdenTaller, PrioridadOrden } from '../types';
import { generarHtmlTicketTaller } from './TicketTaller';
import { ModalRegistrarPagoTaller } from './ModalRegistrarPagoTaller';

interface Props {
  ordenId: number;
  trabajadores: { id: number; nombre: string }[];
  productos: { id: number; name: string; price: number; quantity: number }[];
  empresaConfig?: { nombre: string; ruc?: string; direccion?: string; telefono?: string; logo?: string };
  onCerrar: () => void;
  onActualizado: () => void;
}

const ESTADOS: { clave: EstadoOrdenTaller; label: string }[] = [
  { clave: 'RECIBIDO', label: 'Recibido' },
  { clave: 'DIAGNOSTICO', label: 'En Diagnóstico' },
  { clave: 'PRESUPUESTADO', label: 'Presupuestado' },
  { clave: 'EN_PROCESO', label: 'En Reparación' },
  { clave: 'LISTO', label: 'Listo para Entrega' },
  { clave: 'ENTREGADO', label: 'Entregado al Cliente' },
  { clave: 'CANCELADO', label: 'Cancelado' },
];

const PRIORIDADES: PrioridadOrden[] = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'];

const claseInput =
  'w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] rounded-none';
const claseBoton =
  'px-3 py-1.5 border-2 border-[var(--color-ink)] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer disabled:opacity-50 rounded-none transition-all';

export const ModalDetalleOrden: React.FC<Props> = ({
  ordenId,
  trabajadores,
  productos,
  empresaConfig,
  onCerrar,
  onActualizado,
}) => {
  useCerrarConEscape(true, () => onCerrar());
  const cuerpo = useRef<HTMLDivElement>(null);

  const [orden, setOrden] = useState<TallerOrden | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState<'FICHA' | 'REPUESTOS' | 'PAGOS'>('FICHA');

  // Submodal registrar pago
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);

  // Campos editables
  const [estado, setEstado] = useState<EstadoOrdenTaller>('RECIBIDO');
  const [diagnostico, setDiagnostico] = useState('');
  const [solucion, setSolucion] = useState('');
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [prioridad, setPrioridad] = useState<PrioridadOrden>('NORMAL');
  const [costoManoObra, setCostoManoObra] = useState<string>('0');
  const [mesesGarantia, setMesesGarantia] = useState<number>(1);
  const [notas, setNotas] = useState('');

  // Repuestos formulario rápido
  const [repuestoProdId, setRepuestoProdId] = useState<string>('');
  const [repuestoDesc, setRepuestoDesc] = useState('');
  const [repuestoCant, setRepuestoCant] = useState('1');
  const [repuestoPrecio, setRepuestoPrecio] = useState('0');
  const [repuestoEsExterno, setRepuestoEsExterno] = useState(false);
  const [guardandoRepuesto, setGuardandoRepuesto] = useState(false);

  // Cargar orden completa
  const cargarOrden = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('taller_ordenes')
        .select(`
          *,
          customer:customers(id, name, telefono, dni, ruc, direccion),
          tecnico:trabajadores(id, nombre),
          bien:bienes_cliente(id, nombre, tipo, direccion),
          taller_repuestos(*),
          taller_pagos(*)
        `)
        .eq('id', ordenId)
        .single();

      if (error) throw error;
      if (data) {
        setOrden(data as TallerOrden);
        setEstado(data.estado);
        setDiagnostico(data.diagnostico || '');
        setSolucion(data.solucion_aplicada || '');
        setTecnicoId(data.tecnico_id ? String(data.tecnico_id) : '');
        setPrioridad(data.prioridad || 'NORMAL');
        setCostoManoObra(String(data.costo_mano_obra || 0));
        setMesesGarantia(data.meses_garantia ?? 1);
        setNotas(data.notas || '');
      }
    } catch (err: any) {
      console.error('Error al cargar detalle de orden de taller:', err);
      avisar('No se pudo cargar la información de la orden.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOrden();
  }, [ordenId]);

  // Regla de SiuMax Nego: Enter nunca pasa al siguiente campo (el selector se queda; se mueve con flechas)
  const handleKeyDown = (e: React.KeyboardEvent) => enterSeQueda(e);

  // Imprimir ticket
  const imprimir = (tipo: 'RECEPCION' | 'ENTREGA') => {
    if (!orden) return;
    const html = generarHtmlTicketTaller(
      orden,
      empresaConfig || { nombre: 'SERVICIO TÉCNICO' },
      tipo
    );
    const win = window.open('', '_blank', 'width=450,height=650');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
  };

  // Enviar mensaje por WhatsApp
  const enviarWhatsApp = () => {
    if (!orden) return;
    const tel = orden.customer?.telefono?.replace(/\D/g, '') || '';
    if (!tel) {
      avisar('El cliente no tiene un teléfono registrado.');
      return;
    }
    const num = tel.length === 9 ? `51${tel}` : tel;
    const texto = `Hola *${orden.customer?.name}*, le informamos sobre su equipo *${orden.tipo_equipo} ${orden.marca || ''}* (Orden *${orden.codigo}*):%0A` +
      `📌 *Estado actual:* ${estado}%0A` +
      (diagnostico ? `🔍 *Diagnóstico:* ${diagnostico}%0A` : '') +
      `💰 *Total presupuesto:* S/ ${Number(orden.total).toFixed(2)}%0A` +
      `💵 *Saldo a pagar:* S/ ${Number(orden.saldo).toFixed(2)}%0A%0A` +
      `Cualquier consulta estamos a su entera disposición.`;

    window.open(`https://wa.me/${num}?text=${texto}`, '_blank');
  };

  // Cambiar estado mediante RPC
  const cambiarEstado = async (nuevoEstado: EstadoOrdenTaller) => {
    if (!orden) return;
    try {
      const { error } = await supabase.rpc('fn_cambiar_estado_taller', {
        p_orden_id: orden.id,
        p_nuevo_estado: nuevoEstado,
        p_diagnostico: diagnostico.trim() || null,
        p_solucion: solucion.trim() || null,
      });

      if (error) throw error;
      setEstado(nuevoEstado);
      await avisar(`Estado cambiado a ${nuevoEstado}.`);
      cargarOrden();
      onActualizado();
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      avisar(err?.message || 'Error al cambiar estado de la orden.');
    }
  };

  // Guardar ficha técnica y costos
  const guardarCambios = async () => {
    if (!orden) return;
    setGuardando(true);
    try {
      const manoObraNum = parseFloat(costoManoObra) || 0;
      const repuestosNum = Number(orden.costo_repuestos) || 0;
      const totalNum = manoObraNum + repuestosNum;
      const adelantoNum = Number(orden.adelanto) || 0;
      const saldoNum = Math.max(0, totalNum - adelantoNum);

      const { error } = await supabase
        .from('taller_ordenes')
        .update({
          estado,
          diagnostico: diagnostico.trim() || null,
          solucion_aplicada: solucion.trim() || null,
          tecnico_id: tecnicoId ? parseInt(tecnicoId) : null,
          prioridad,
          costo_mano_obra: manoObraNum,
          total: totalNum,
          saldo: saldoNum,
          meses_garantia: mesesGarantia,
          notas: notas.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orden.id);

      if (error) throw error;

      await avisar('Cambios guardados con éxito.');
      cargarOrden();
      onActualizado();
    } catch (err: any) {
      console.error('Error al guardar orden:', err);
      avisar(err?.message || 'Error al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  // Agregar repuesto
  const agregarRepuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden) return;
    const cant = parseFloat(repuestoCant);
    const prec = parseFloat(repuestoPrecio);
    const desc = repuestoDesc.trim();

    if (!desc) {
      avisar('Ingrese la descripción del repuesto o seleccione uno del inventario.');
      return;
    }
    if (isNaN(cant) || cant <= 0) {
      avisar('Cantidad inválida.');
      return;
    }

    setGuardandoRepuesto(true);
    try {
      const sub = cant * (isNaN(prec) ? 0 : prec);
      const { error } = await supabase.from('taller_repuestos').insert({
        orden_id: orden.id,
        product_id: repuestoProdId ? parseInt(repuestoProdId) : null,
        descripcion: desc,
        cantidad: cant,
        precio_unitario: prec,
        costo_unitario: 0,
        subtotal: sub,
        es_externo: repuestoEsExterno,
      });

      if (error) throw error;

      // Recalcular repuestos de la orden
      const { data: repuestosActuales } = await supabase
        .from('taller_repuestos')
        .select('subtotal')
        .eq('orden_id', orden.id);

      const nuevoCostoRepuestos = (repuestosActuales || []).reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0);
      const manoObraNum = parseFloat(costoManoObra) || 0;
      const nuevoTotal = manoObraNum + nuevoCostoRepuestos;
      const nuevoSaldo = Math.max(0, nuevoTotal - (Number(orden.adelanto) || 0));

      await supabase
        .from('taller_ordenes')
        .update({
          costo_repuestos: nuevoCostoRepuestos,
          total: nuevoTotal,
          saldo: nuevoSaldo,
        })
        .eq('id', orden.id);

      // Limpiar campos de repuesto
      setRepuestoProdId('');
      setRepuestoDesc('');
      setRepuestoCant('1');
      setRepuestoPrecio('0');
      setRepuestoEsExterno(false);

      await avisar('Repuesto agregado correctamente.');
      cargarOrden();
      onActualizado();
    } catch (err: any) {
      console.error('Error al agregar repuesto:', err);
      avisar(err?.message || 'Error al agregar repuesto.');
    } finally {
      setGuardandoRepuesto(false);
    }
  };

  // Eliminar repuesto
  const eliminarRepuesto = async (repuestoId: number) => {
    if (!orden) return;
    const ok = await confirmar('¿Está seguro de quitar este repuesto de la orden?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('taller_repuestos').delete().eq('id', repuestoId);
      if (error) throw error;

      // Recalcular
      const { data: repuestosActuales } = await supabase
        .from('taller_repuestos')
        .select('subtotal')
        .eq('orden_id', orden.id);

      const nuevoCostoRepuestos = (repuestosActuales || []).reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0);
      const manoObraNum = parseFloat(costoManoObra) || 0;
      const nuevoTotal = manoObraNum + nuevoCostoRepuestos;
      const nuevoSaldo = Math.max(0, nuevoTotal - (Number(orden.adelanto) || 0));

      await supabase
        .from('taller_ordenes')
        .update({
          costo_repuestos: nuevoCostoRepuestos,
          total: nuevoTotal,
          saldo: nuevoSaldo,
        })
        .eq('id', orden.id);

      await avisar('Repuesto eliminado.');
      cargarOrden();
      onActualizado();
    } catch (err: any) {
      console.error('Error al eliminar repuesto:', err);
      avisar(err?.message || 'Error al eliminar repuesto.');
    }
  };

  // Seleccionar producto del catálogo para repuesto
  const seleccionarProducto = (prodIdStr: string) => {
    setRepuestoProdId(prodIdStr);
    if (!prodIdStr) return;
    const p = productos.find((item) => item.id === parseInt(prodIdStr));
    if (p) {
      setRepuestoDesc(p.name);
      setRepuestoPrecio(String(p.price || 0));
      setRepuestoEsExterno(false);
    }
  };

  if (cargando || !orden) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 font-mono">
        <div className="bg-[var(--color-bg)] border-4 border-[var(--color-ink)] p-8 flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--color-ink)]" />
          <span className="text-xs font-black uppercase">Cargando orden de taller...</span>
        </div>
      </div>
    );
  }

  const saldo = Number(orden.saldo) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        ref={cuerpo}
        onKeyDown={handleKeyDown}
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-4xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* CABECERA SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <span className="font-mono text-xs font-black">{orden.codigo.replace('ORD-', '')}</span>
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                {orden.codigo} · {orden.tipo_equipo} {orden.marca ? `- ${orden.marca}` : ''} {orden.modelo ? `(${orden.modelo})` : ''}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Cliente: {orden.customer?.name} {orden.customer?.telefono ? ` • Tel: ${orden.customer.telefono}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="btn-whatsapp-taller"
              type="button"
              onClick={enviarWhatsApp}
              className="px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-black uppercase flex items-center gap-1 hover:bg-emerald-700 cursor-pointer rounded-none border border-emerald-700"
              title="Notificar por WhatsApp"
            >
              <MessageSquare size={14} /> WhatsApp
            </button>
            <button
              id="btn-ticket-recepcion"
              type="button"
              onClick={() => imprimir('RECEPCION')}
              className="px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] text-[11px] font-black uppercase flex items-center gap-1 hover:border-[var(--color-ink)] cursor-pointer rounded-none"
              title="Ticket de Recepción"
            >
              <Printer size={14} /> Ticket Rec.
            </button>
            <button
              id="btn-ticket-entrega"
              type="button"
              onClick={() => imprimir('ENTREGA')}
              className="px-2.5 py-1.5 bg-[var(--color-accent)] text-[var(--color-ink)] border border-[var(--color-ink)] text-[11px] font-black uppercase flex items-center gap-1 hover:brightness-105 cursor-pointer rounded-none"
              title="Ticket de Entrega con Garantía"
            >
              <Printer size={14} /> Constancia Ent.
            </button>
            <button
              id="btn-cerrar-modal-taller"
              type="button"
              onClick={onCerrar}
              className="ventana-cerrar"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* WORKFLOW DE ESTADO */}
        <div className="bg-white border-b-2 border-[var(--color-border)] p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-[var(--color-ink)]">Estado:</span>
            <select
              id="taller-select-estado"
              value={estado}
              onChange={(e) => cambiarEstado(e.target.value as EstadoOrdenTaller)}
              className="border-2 border-[var(--color-ink)] bg-[var(--color-accent)] p-1 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer"
            >
              {ESTADOS.map((est) => (
                <option key={est.clave} value={est.clave}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resumen financiero rápido */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-[var(--color-muted)] font-bold">TOTAL: </span>
              <span className="font-black text-[var(--color-ink)]">S/ {Number(orden.total).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--color-muted)] font-bold">ABONADO: </span>
              <span className="font-black text-emerald-700">S/ {Number(orden.adelanto).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--color-muted)] font-bold">SALDO: </span>
              <span className={`font-black ${saldo > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                S/ {saldo.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex border-b-2 border-[var(--color-border)] bg-[var(--color-bg)]">
          <button
            id="btn-tab-taller-ficha"
            type="button"
            onClick={() => setTab('FICHA')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-r-2 border-[var(--color-border)] transition-colors cursor-pointer ${
              tab === 'FICHA'
                ? 'bg-white text-[var(--color-ink)] border-b-2 border-b-white -mb-[2px]'
                : 'text-[var(--color-muted)] hover:bg-gray-100'
            }`}
          >
            <FileText size={14} /> Ficha Técnica & Diagnóstico
          </button>
          <button
            id="btn-tab-taller-repuestos"
            type="button"
            onClick={() => setTab('REPUESTOS')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-r-2 border-[var(--color-border)] transition-colors cursor-pointer ${
              tab === 'REPUESTOS'
                ? 'bg-white text-[var(--color-ink)] border-b-2 border-b-white -mb-[2px]'
                : 'text-[var(--color-muted)] hover:bg-gray-100'
            }`}
          >
            <Package size={14} /> Repuestos ({orden.taller_repuestos?.length || 0})
          </button>
          <button
            id="btn-tab-taller-pagos"
            type="button"
            onClick={() => setTab('PAGOS')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'PAGOS'
                ? 'bg-white text-[var(--color-ink)] border-b-2 border-b-white -mb-[2px]'
                : 'text-[var(--color-muted)] hover:bg-gray-100'
            }`}
          >
            <DollarSign size={14} /> Pagos & Saldo ({orden.taller_pagos?.length || 0})
          </button>
        </div>

        {/* CUERPO DE PESTAÑAS */}
        <div className="p-4 overflow-y-auto flex-1 bg-white">
          {/* TAB 1: FICHA */}
          {tab === 'FICHA' && (
            <div className="flex flex-col gap-4">
              {/* Información del equipo */}
              <div className="p-3 bg-[var(--color-bg)] border-2 border-[var(--color-border)] text-xs">
                <div className="font-black uppercase tracking-wider text-[var(--color-ink)] mb-2 flex items-center gap-1.5">
                  <Wrench size={14} /> Datos del Equipo Recibido
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-[var(--color-muted)] block">Tipo:</span>
                    <span className="font-bold">{orden.tipo_equipo}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block">Marca / Modelo:</span>
                    <span className="font-bold">{orden.marca || '-'} / {orden.modelo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block">Nº Serie:</span>
                    <span className="font-bold">{orden.serie || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block">Color:</span>
                    <span className="font-bold">{orden.color || '-'}</span>
                  </div>
                </div>
                {orden.accesorios && (
                  <div className="mt-2 text-[11px] border-t border-[var(--color-border)] pt-1">
                    <span className="text-[var(--color-muted)] font-bold">Accesorios / Dejado con: </span>
                    <span>{orden.accesorios}</span>
                  </div>
                )}
                <div className="mt-2 text-[11px] border-t border-[var(--color-border)] pt-1">
                  <span className="text-rose-700 font-black">Falla reportada por el cliente: </span>
                  <span className="font-bold">{orden.falla_reportada}</span>
                </div>
              </div>

              {/* Diagnóstico y Solución */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Diagnóstico Técnico / Problema detectado
                  </label>
                  <textarea
                    id="taller-input-diagnostico"
                    rows={4}
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    placeholder="Detalle de la falla encontrada por el técnico..."
                    className={claseInput}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Solución Aplicada / Trabajo Realizado
                  </label>
                  <textarea
                    id="taller-input-solucion"
                    rows={4}
                    value={solucion}
                    onChange={(e) => setSolucion(e.target.value)}
                    placeholder="Detalle de reparación, cambios efectuados, ajustes..."
                    className={claseInput}
                  />
                </div>
              </div>

              {/* Parámetros de orden y garantía */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t-2 border-[var(--color-border)]">
                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Técnico Asignado
                  </label>
                  <select
                    id="taller-select-tecnico"
                    value={tecnicoId}
                    onChange={(e) => setTecnicoId(e.target.value)}
                    className={claseInput}
                  >
                    <option value="">-- Sin Asignar --</option>
                    {trabajadores.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Prioridad
                  </label>
                  <select
                    id="taller-select-prioridad"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as PrioridadOrden)}
                    className={claseInput}
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Mano de Obra (S/)
                  </label>
                  <input
                    id="taller-input-mano-obra"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costoManoObra}
                    onChange={(e) => setCostoManoObra(e.target.value)}
                    className={claseInput}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                    Garantía (Meses)
                  </label>
                  <input
                    id="taller-input-garantia"
                    type="number"
                    min="0"
                    max="60"
                    value={mesesGarantia}
                    onChange={(e) => setMesesGarantia(parseInt(e.target.value) || 0)}
                    className={claseInput}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase mb-1 text-[var(--color-ink)]">
                  Notas Internas
                </label>
                <input
                  id="taller-input-notas"
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales para el equipo de trabajo..."
                  className={claseInput}
                />
              </div>
            </div>
          )}

          {/* TAB 2: REPUESTOS */}
          {tab === 'REPUESTOS' && (
            <div className="flex flex-col gap-4">
              {/* Formulario rápido para agregar repuesto */}
              <form onSubmit={agregarRepuesto} className="p-3 bg-[var(--color-bg)] border-2 border-[var(--color-border)] flex flex-col gap-2">
                <div className="text-[11px] font-black uppercase text-[var(--color-ink)] flex items-center gap-1.5">
                  <Plus size={14} /> Agregar Repuesto o Material a la Reparación
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-0.5">
                      Desde inventario (Opcional)
                    </label>
                    <select
                      id="taller-select-repuesto-prod"
                      value={repuestoProdId}
                      onChange={(e) => seleccionarProducto(e.target.value)}
                      className={claseInput}
                    >
                      <option value="">-- Repuesto libre / externo --</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.quantity} | S/ {Number(p.price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-0.5">
                      Descripción del repuesto *
                    </label>
                    <input
                      id="taller-input-repuesto-desc"
                      type="text"
                      required
                      value={repuestoDesc}
                      onChange={(e) => setRepuestoDesc(e.target.value)}
                      placeholder="Ej: Pantalla OLED, Resistencia, etc."
                      className={claseInput}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-0.5">
                      Cant.
                    </label>
                    <input
                      id="taller-input-repuesto-cant"
                      type="number"
                      step="1"
                      min="1"
                      value={repuestoCant}
                      onChange={(e) => setRepuestoCant(e.target.value)}
                      className={claseInput}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-muted)] mb-0.5">
                      Precio (S/)
                    </label>
                    <input
                      id="taller-input-repuesto-precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={repuestoPrecio}
                      onChange={(e) => setRepuestoPrecio(e.target.value)}
                      className={claseInput}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      id="btn-agregar-repuesto-taller"
                      type="submit"
                      disabled={guardandoRepuesto}
                      className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] w-full py-2 hover:brightness-105`}
                      title="Agregar repuesto"
                    >
                      {guardandoRepuesto ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista de repuestos */}
              <div className="border-2 border-[var(--color-border)] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[var(--color-bg)] border-b-2 border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-ink)]">
                    <tr>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 text-center w-20">Cantidad</th>
                      <th className="p-2 text-right w-24">Precio Unit.</th>
                      <th className="p-2 text-right w-24">Subtotal</th>
                      <th className="p-2 text-center w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!orden.taller_repuestos || orden.taller_repuestos.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-[var(--color-muted)] italic">
                          No se han registrado repuestos en esta orden.
                        </td>
                      </tr>
                    ) : (
                      orden.taller_repuestos.map((r, idx) => (
                        <tr key={r.id || idx} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                          <td className="p-2 font-bold text-[var(--color-ink)]">
                            {r.descripcion}
                            {r.es_externo && (
                              <span className="ml-2 text-[9px] bg-gray-200 px-1 py-0.5 uppercase">Externo</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-bold">{r.cantidad}</td>
                          <td className="p-2 text-right font-mono">S/ {Number(r.precio_unitario).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-black">S/ {Number(r.subtotal).toFixed(2)}</td>
                          <td className="p-2 text-center">
                            {r.id && (
                              <button
                                id={`btn-eliminar-repuesto-${r.id}`}
                                type="button"
                                onClick={() => eliminarRepuesto(r.id!)}
                                className="p-1 text-rose-700 hover:bg-rose-100 rounded-none cursor-pointer"
                                title="Eliminar repuesto"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-[var(--color-bg)] border-t-2 border-[var(--color-border)] text-xs font-black">
                    <tr>
                      <td colSpan={3} className="p-2 text-right uppercase">
                        Total Repuestos:
                      </td>
                      <td className="p-2 text-right font-mono text-[var(--color-ink)]">
                        S/ {Number(orden.costo_repuestos).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAGOS */}
          {tab === 'PAGOS' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 border-2 border-amber-300">
                <div>
                  <div className="text-xs font-black uppercase text-amber-900">Estado de Cuenta de la Orden</div>
                  <div className="text-[11px] text-amber-800">
                    Total: S/ {Number(orden.total).toFixed(2)} | Cobrado: S/ {Number(orden.adelanto).toFixed(2)} | Pendiente: S/ {Number(orden.saldo).toFixed(2)}
                  </div>
                </div>

                <button
                  id="btn-abrir-pago-taller"
                  type="button"
                  onClick={() => setModalPagoAbierto(true)}
                  className="px-3 py-2 bg-emerald-600 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#064e3b] hover:bg-emerald-700 cursor-pointer"
                >
                  <DollarSign size={15} /> Registrar Abono / Cobro
                </button>
              </div>

              {/* Historial de pagos */}
              <div className="border-2 border-[var(--color-border)] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[var(--color-bg)] border-b-2 border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-ink)]">
                    <tr>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Método</th>
                      <th className="p-2">Referencia</th>
                      <th className="p-2">Notas</th>
                      <th className="p-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!orden.taller_pagos || orden.taller_pagos.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[var(--color-muted)] italic">
                          No se han registrado pagos para esta orden.
                        </td>
                      </tr>
                    ) : (
                      orden.taller_pagos.map((p, idx) => (
                        <tr key={p.id || idx} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                          <td className="p-2 font-mono text-[11px]">{p.fecha}</td>
                          <td className="p-2 font-bold text-[11px] uppercase text-[var(--color-ink)]">{p.tipo}</td>
                          <td className="p-2">
                            <span className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 text-[10px] font-bold">
                              {p.metodo}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-[11px] text-[var(--color-muted)]">{p.referencia || '-'}</td>
                          <td className="p-2 text-[11px]">{p.notas || '-'}</td>
                          <td className="p-2 text-right font-mono font-black text-emerald-700">
                            S/ {Number(p.monto).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-[var(--color-bg)] border-t-2 border-[var(--color-border)] text-xs font-black">
                    <tr>
                      <td colSpan={5} className="p-2 text-right uppercase">Total Abonado:</td>
                      <td className="p-2 text-right font-mono text-emerald-700">
                        S/ {Number(orden.adelanto).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex items-center justify-between">
          <button
            id="btn-cerrar-detalle-taller"
            type="button"
            onClick={onCerrar}
            className={`${claseBoton} bg-white text-[var(--color-ink)] hover:bg-gray-100`}
          >
            Cerrar
          </button>

          <button
            id="btn-guardar-detalle-taller"
            type="button"
            onClick={guardarCambios}
            disabled={guardando}
            className={`${claseBoton} bg-[var(--color-accent)] text-[var(--color-ink)] hover:brightness-105 shadow-[2px_2px_0_0_var(--color-ink)]`}
          >
            {guardando ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Check size={14} /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* SUBMODAL REGISTRAR PAGO */}
      {modalPagoAbierto && orden && (
        <ModalRegistrarPagoTaller
          orden={orden}
          onCerrar={() => setModalPagoAbierto(false)}
          onPagoRegistrado={() => {
            cargarOrden();
            onActualizado();
          }}
        />
      )}
    </div>
  );
};
