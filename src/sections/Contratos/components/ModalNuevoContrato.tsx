import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Repeat, DollarSign, MapPin, Wrench } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import type { Contrato, FrecuenciaContrato, EstadoContrato } from '../types';

interface ModalNuevoContratoProps {
  contratoEditar?: Contrato | null;
  onClose: (guardado?: boolean) => void;
}

export const ModalNuevoContrato: React.FC<ModalNuevoContratoProps> = ({ contratoEditar, onClose }) => {
  useCerrarConEscape(true, () => onClose());

  const [titulo, setTitulo] = useState(contratoEditar?.titulo || '');
  const [customerId, setCustomerId] = useState<string>(contratoEditar?.customer_id ? String(contratoEditar.customer_id) : '');
  const [bienId, setBienId] = useState<string>(contratoEditar?.bien_id ? String(contratoEditar.bien_id) : '');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaContrato>(contratoEditar?.frecuencia || 'MENSUAL');
  const [diasSemana, setDiasSemana] = useState<number[]>(contratoEditar?.dias_semana || [1]); // 1=Lunes
  const [diaCobro, setDiaCobro] = useState<number>(contratoEditar?.dia_cobro || 1);
  const [precioPeriodo, setPrecioPeriodo] = useState<string>(contratoEditar?.precio_periodo ? String(contratoEditar.precio_periodo) : '0.00');
  const [moneda, setMoneda] = useState(contratoEditar?.moneda || 'PEN');
  const [fechaInicio, setFechaInicio] = useState(contratoEditar?.fecha_inicio || new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(contratoEditar?.fecha_fin || '');
  const [estado, setEstado] = useState<EstadoContrato>(contratoEditar?.estado || 'ACTIVO');
  const [tecnicoId, setTecnicoId] = useState<string>(contratoEditar?.tecnico_principal_id ? String(contratoEditar.tecnico_principal_id) : '');
  const [direccion, setDireccion] = useState(contratoEditar?.direccion || '');
  const [ubicacion, setUbicacion] = useState(contratoEditar?.ubicacion || '');
  const [notas, setNotas] = useState(contratoEditar?.notas || '');

  const [clientes, setClientes] = useState<{ id: number; name: string; direccion?: string; ubicacion?: string }[]>([]);
  const [bienes, setBienes] = useState<{ id: number; customer_id: number; nombre: string; tipo: string; direccion?: string; ubicacion?: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<{ id: number; nombre: string; cargo?: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatosAuxiliares();
  }, []);

  const cargarDatosAuxiliares = async () => {
    try {
      const [resCli, resBienes, resTrab] = await Promise.all([
        supabase.from('customers').select('id, name, direccion, ubicacion').order('name'),
        supabase.from('bienes_cliente').select('id, customer_id, nombre, tipo, direccion, ubicacion').order('nombre'),
        supabase.from('trabajadores').select('id, nombre, cargo').eq('estado', 'ACTIVO').order('nombre'),
      ]);

      if (resCli.data) setClientes(resCli.data);
      if (resBienes.data) setBienes(resBienes.data);
      if (resTrab.data) setTrabajadores(resTrab.data);
    } catch (err) {
      console.error('Error cargando datos auxiliares en contrato:', err);
    }
  };

  const bienesFiltrados = customerId
    ? bienes.filter((b) => b.customer_id === Number(customerId))
    : bienes;

  const handleClienteChange = (cid: string) => {
    setCustomerId(cid);
    const cli = clientes.find((c) => c.id === Number(cid));
    if (cli) {
      if (cli.direccion && !direccion) setDireccion(cli.direccion);
      if (cli.ubicacion && !ubicacion) setUbicacion(cli.ubicacion);
    }
    const bs = bienes.filter((b) => b.customer_id === Number(cid));
    if (bs.length === 1) {
      setBienId(String(bs[0].id));
      if (bs[0].direccion) setDireccion(bs[0].direccion);
      if (bs[0].ubicacion) setUbicacion(bs[0].ubicacion);
    } else {
      setBienId('');
    }
  };

  const handleBienChange = (bid: string) => {
    setBienId(bid);
    const b = bienes.find((x) => x.id === Number(bid));
    if (b) {
      if (b.direccion) setDireccion(b.direccion);
      if (b.ubicacion) setUbicacion(b.ubicacion);
    }
  };

  const toggleDiaSemana = (dia: number) => {
    if (diasSemana.includes(dia)) {
      if (diasSemana.length > 1) {
        setDiasSemana(diasSemana.filter((d) => d !== dia));
      }
    } else {
      setDiasSemana([...diasSemana, dia].sort());
    }
  };

  // Regla 9 SiuMax: Enter es como un clic, el selector se queda en el campo
  // (en una lista o una fecha, Enter la abre)
  const handleEnterKey = (e: React.KeyboardEvent, _nextId?: string) => enterSeQueda(e);

  const handleGuardar = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!titulo.trim()) {
      avisar('Por favor escribe un título o nombre para el contrato.');
      document.getElementById('input-titulo-contrato')?.focus();
      return;
    }

    if (!customerId) {
      avisar('Por favor selecciona el cliente.');
      document.getElementById('select-cliente-contrato')?.focus();
      return;
    }

    if (!fechaInicio) {
      avisar('Por favor indica la fecha de inicio.');
      document.getElementById('input-fecha-inicio-contrato')?.focus();
      return;
    }

    const precio = parseFloat(precioPeriodo) || 0;
    if (precio < 0) {
      avisar('El precio por período no puede ser negativo.');
      document.getElementById('input-precio-contrato')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const datos: any = {
        titulo: titulo.trim(),
        customer_id: Number(customerId),
        bien_id: bienId ? Number(bienId) : null,
        frecuencia,
        dias_semana: diasSemana,
        dia_cobro: Math.max(1, Math.min(31, Number(diaCobro) || 1)),
        precio_periodo: precio,
        moneda,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        estado,
        direccion: direccion.trim() || null,
        ubicacion: ubicacion.trim() || null,
        tecnico_principal_id: tecnicoId ? Number(tecnicoId) : null,
        notas: notas.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (contratoEditar) {
        const { error } = await supabase
          .from('contratos')
          .update(datos)
          .eq('id', contratoEditar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contratos')
          .insert([datos]);
        if (error) throw error;
      }

      avisar(contratoEditar ? 'Contrato actualizado correctamente.' : 'Contrato creado exitosamente.');
      onClose(true);
    } catch (err: any) {
      console.error('Error guardando contrato:', err);
      avisar('Error al guardar contrato: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const NOMBRES_DIAS = [
    { num: 1, label: 'Lun' },
    { num: 2, label: 'Mar' },
    { num: 3, label: 'Mié' },
    { num: 4, label: 'Jue' },
    { num: 5, label: 'Vie' },
    { num: 6, label: 'Sáb' },
    { num: 7, label: 'Dom' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-contrato"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-2xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Repeat size={18} />
            </div>
            <div>
              <h2 id="modal-titulo-contrato" className="ventana-cabecera__titulo">
                {contratoEditar ? `Editar Contrato · ${contratoEditar.codigo}` : 'Nuevo Contrato de Servicio'}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Servicios periódicos (semanal, quincenal, mensual)
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-contrato"
            onClick={() => onClose()}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form noValidate onSubmit={(e) => { e.preventDefault(); handleGuardar(); }} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
              Nombre / Título del Contrato *
            </label>
            <input
              id="input-titulo-contrato"
              type="text"
              required
              autoFocus
              placeholder="Ej: Mantenimiento Mensual Piscina Olímpica, Servicio Quincenal de Jardines..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => handleEnterKey(e, 'select-cliente-contrato')}
              className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]"
            />
          </div>

          {/* Cliente y Bien atendido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Cliente *
              </label>
              <select
                id="select-cliente-contrato"
                value={customerId}
                onChange={(e) => handleClienteChange(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'select-bien-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Lo que se atiende (Bien / Equipo)
              </label>
              <select
                id="select-bien-contrato"
                value={bienId}
                onChange={(e) => handleBienChange(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'select-frecuencia-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              >
                <option value="">-- Ninguno / Todo el local --</option>
                {bienesFiltrados.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frecuencia, Precio y Cobro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Frecuencia del Servicio *
              </label>
              <select
                id="select-frecuencia-contrato"
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value as FrecuenciaContrato)}
                onKeyDown={(e) => handleEnterKey(e, 'input-precio-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              >
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal (cada 15 días)</option>
                <option value="MENSUAL">Mensual</option>
                <option value="BIMESTRAL">Bimestral</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Precio por Período (S/) *
              </label>
              <input
                id="input-precio-contrato"
                type="number"
                step="0.01"
                min="0"
                value={precioPeriodo}
                onChange={(e) => setPrecioPeriodo(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-dia-cobro-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Día de Cobro (1 al 31)
              </label>
              <input
                id="input-dia-cobro-contrato"
                type="number"
                min="1"
                max="31"
                value={diaCobro}
                onChange={(e) => setDiaCobro(Number(e.target.value))}
                onKeyDown={(e) => handleEnterKey(e, 'input-fecha-inicio-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Días de la semana si es SEMANAL */}
          {frecuencia === 'SEMANAL' && (
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-2">
                Días de visita por semana:
              </span>
              <div className="flex flex-wrap gap-2">
                {NOMBRES_DIAS.map((d) => {
                  const sel = diasSemana.includes(d.num);
                  return (
                    <button
                      type="button"
                      key={d.num}
                      onClick={() => toggleDiaSemana(d.num)}
                      className={`h-8 px-3 font-mono text-xs font-bold border ${
                        sel
                          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fechas de inicio / fin y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Fecha Inicio *
              </label>
              <input
                id="input-fecha-inicio-contrato"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-fecha-fin-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Fecha Fin (Opcional)
              </label>
              <input
                id="input-fecha-fin-contrato"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'select-tecnico-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Estado del Contrato
              </label>
              <select
                id="select-estado-contrato"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoContrato)}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              >
                <option value="ACTIVO">Activo</option>
                <option value="PAUSADO">Pausado</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Técnico Principal */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
              Técnico o Responsable Asignado
            </label>
            <select
              id="select-tecnico-contrato"
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              onKeyDown={(e) => handleEnterKey(e, 'input-direccion-contrato')}
              className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            >
              <option value="">-- Sin técnico asignado fijo --</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} {t.cargo ? `(${t.cargo})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Dirección y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Dirección del Servicio
              </label>
              <input
                id="input-direccion-contrato"
                type="text"
                placeholder="Av. Los Laureles 123, Urb. Primavera..."
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-ubicacion-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Link de Google Maps
              </label>
              <input
                id="input-ubicacion-contrato"
                type="text"
                placeholder="https://maps.google.com/?q=..."
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-notas-contrato')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
              Notas / Especificaciones Técnicas
            </label>
            <textarea
              id="input-notas-contrato"
              rows={2}
              placeholder="Instrucciones para la visita, llaves, contacto local, etc."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full p-2 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] resize-none"
            />
          </div>
        </form>

        {/* Pie de modal */}
        <div className="h-14 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
          >
            Cancelar
          </button>

          <button
            id="btn-guardar-contrato"
            type="button"
            disabled={guardando}
            onClick={handleGuardar}
            className="h-10 px-6 font-mono text-xs font-black uppercase tracking-widest bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <Save size={15} />
            <span>{guardando ? 'Guardando...' : 'Guardar Contrato'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
