import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wrench, Car, Plus, HandHelping, Search, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { supabase } from '../../../../db/supabase';
import { avisar, usePermiso, avisarSinPermiso } from '../../../../utils/permisos';
import { confirmar } from '../../../../utils/dialogos';
import type { Herramienta, Vehiculo } from './types';
import { TablaHerramientas } from './TablaHerramientas';
import { TablaVehiculos } from './TablaVehiculos';
import { ModalNuevaHerramienta } from './ModalNuevaHerramienta';
import { ModalPrestarHerramienta } from './ModalPrestarHerramienta';
import { ModalHistorialPrestamos } from './ModalHistorialPrestamos';
import { ModalNuevoVehiculo } from './ModalNuevoVehiculo';
import { ModalMantenimiento } from './ModalMantenimiento';
import { ModalHistorialMantenimientos } from './ModalHistorialMantenimientos';

export const Activos: React.FC = () => {
  const [subtab, setSubtab] = useState<'HERRAMIENTAS' | 'VEHICULOS'>('HERRAMIENTAS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Datos
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Modales Herramientas
  const [modalHerrOpen, setModalHerrOpen] = useState(false);
  const [herramientaAEditar, setHerramientaAEditar] = useState<Herramienta | null>(null);
  const [modalPrestarOpen, setModalPrestarOpen] = useState(false);
  const [herramientaAPrestar, setHerramientaAPrestar] = useState<Herramienta | null>(null);
  const [modalHistorialPrestamosOpen, setModalHistorialPrestamosOpen] = useState(false);
  const [herramientaHistorial, setHerramientaHistorial] = useState<Herramienta | null>(null);

  // Modales Vehículos
  const [modalVehOpen, setModalVehOpen] = useState(false);
  const [vehiculoAEditar, setVehiculoAEditar] = useState<Vehiculo | null>(null);
  const [modalMantOpen, setModalMantOpen] = useState(false);
  const [vehiculoAMant, setVehiculoAMant] = useState<Vehiculo | null>(null);
  const [modalHistorialMantOpen, setModalHistorialMantOpen] = useState(false);
  const [vehiculoHistorial, setVehiculoHistorial] = useState<Vehiculo | null>(null);

  // Permisos
  const puedeCrear = usePermiso('herramientas_crear');
  const puedeEditar = usePermiso('herramientas_editar');

  const buscadorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resHerr, resVeh, resTrab] = await Promise.all([
        supabase.from('herramientas').select('*').order('nombre'),
        supabase.from('vehiculos').select('*, trabajador:trabajadores(nombre)').order('placa'),
        supabase.from('trabajadores').select('id, nombre'),
      ]);

      if (resHerr.error) throw resHerr.error;
      if (resVeh.error) throw resVeh.error;

      setHerramientas(resHerr.data || []);

      const vehFormateados: Vehiculo[] = (resVeh.data || []).map((v: any) => ({
        ...v,
        trabajador_asignado_nombre: v.trabajador?.nombre || null,
      }));
      setVehiculos(vehFormateados);
    } catch (err: any) {
      console.error('Error al cargar activos:', err);
      avisar('⚠️ Error al cargar herramientas y vehículos.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado
  const herramientasFiltradas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return herramientas;
    return herramientas.filter((h) =>
      h.nombre.toLowerCase().includes(q) ||
      (h.codigo && h.codigo.toLowerCase().includes(q)) ||
      (h.marca && h.marca.toLowerCase().includes(q)) ||
      h.categoria.toLowerCase().includes(q)
    );
  }, [herramientas, searchQuery]);

  const vehiculosFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return vehiculos;
    return vehiculos.filter((v) =>
      v.placa.toLowerCase().includes(q) ||
      (v.marca && v.marca.toLowerCase().includes(q)) ||
      (v.modelo && v.modelo.toLowerCase().includes(q)) ||
      (v.trabajador_asignado_nombre && v.trabajador_asignado_nombre.toLowerCase().includes(q))
    );
  }, [vehiculos, searchQuery]);

  // Métricas

  const totalVeh = vehiculos.length;
  const vehOperativos = vehiculos.filter((v) => v.estado === 'OPERATIVO').length;

  // Alertas SOAT y Rev Técnica (vencen en <= 30 días o ya vencidos)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vehConAlertaSoat = vehiculos.filter((v) => {
    if (!v.vencimiento_soat) return false;
    const f = new Date(v.vencimiento_soat + 'T00:00:00');
    const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30;
  });

  const vehConAlertaRev = vehiculos.filter((v) => {
    if (!v.vencimiento_revision_tecnica) return false;
    const f = new Date(v.vencimiento_revision_tecnica + 'T00:00:00');
    const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30;
  });

  // Acciones Herramientas
  const handleEliminarHerramienta = async (h: Herramienta) => {
    if (!puedeEditar) { avisarSinPermiso('eliminar herramientas'); return; }
    if (h.cantidad_en_uso > 0) {
      avisar(`⚠️ No se puede eliminar: tiene ${h.cantidad_en_uso} unidades prestadas a trabajadores.`);
      return;
    }
    const ok = await confirmar(`¿Seguro que deseas eliminar la herramienta "${h.nombre}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('herramientas').delete().eq('id', h.id);
      if (error) throw error;
      avisar('✅ Herramienta eliminada.');
      setHerramientas((prev) => prev.filter((item) => item.id !== h.id));
    } catch (e: any) {
      avisar(`⚠️ Falló la eliminación: ${e.message}`);
    }
  };

  // Acciones Vehículos
  const handleEliminarVehiculo = async (v: Vehiculo) => {
    if (!puedeEditar) { avisarSinPermiso('eliminar vehículos'); return; }
    const ok = await confirmar(`¿Seguro que deseas eliminar el vehículo placa "${v.placa}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('vehiculos').delete().eq('id', v.id);
      if (error) throw error;
      avisar('✅ Vehículo eliminado.');
      setVehiculos((prev) => prev.filter((item) => item.id !== v.id));
    } catch (e: any) {
      avisar(`⚠️ Falló la eliminación: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5 font-mono text-[var(--color-ink)]">
      {/* TARJETAS DE MÉTRICAS: solo en Vehículos (las de Herramientas se quitaron el 12/11/2026, pedido del dueño) */}
      {subtab === 'VEHICULOS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mismo estilo que las tarjetas de Utilidades. El cuadro "Mantenimientos" se quitó: repetía el botón "Mantenimiento". */}
          <div className="tarjeta-sobria p-4 bg-[var(--color-surface)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Flota de vehículos</span>
            <div className="text-xl font-black mt-0.5 text-[var(--color-ink)]">{totalVeh} unidades</div>
            <span className="text-[10px] font-bold text-[var(--color-muted)]">{vehOperativos} operativos</span>
          </div>
          <div className="tarjeta-sobria p-4 bg-[var(--color-surface)]">
            <span className={`text-[10px] font-black uppercase tracking-wider ${vehConAlertaSoat.length > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>Alertas SOAT</span>
            <div className={`text-xl font-black mt-0.5 ${vehConAlertaSoat.length > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>{vehConAlertaSoat.length} por vencer / vencidos</div>
            <span className="text-[10px] font-bold text-[var(--color-muted)]">Vencen en 30 días o menos</span>
          </div>
          <div className="tarjeta-sobria p-4 bg-[var(--color-surface)]">
            <span className={`text-[10px] font-black uppercase tracking-wider ${vehConAlertaRev.length > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>Alertas Rev. Técnica</span>
            <div className={`text-xl font-black mt-0.5 ${vehConAlertaRev.length > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink)]'}`}>{vehConAlertaRev.length} por vencer / vencidos</div>
            <span className="text-[10px] font-bold text-[var(--color-muted)]">Requieren inspección</span>
          </div>
        </div>
      )}

      {/* CONTROLES Y SUB-PESTAÑAS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Switch Sub-pestañas */}
        <div className="pestanas-sobrias flex shrink-0">
          <button
            id="btn-subtab-herramientas"
            onClick={() => setSubtab('HERRAMIENTAS')}
            data-activa={subtab === 'HERRAMIENTAS'}
            className="flex items-center gap-2 px-4 h-12 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            <Wrench size={14} /> Herramientas ({herramientas.length})
          </button>
          <button
            id="btn-subtab-vehiculos"
            onClick={() => setSubtab('VEHICULOS')}
            data-activa={subtab === 'VEHICULOS'}
            className="flex items-center gap-2 px-4 h-12 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            <Car size={14} /> Vehículos ({vehiculos.length})
          </button>
        </div>

        {/* Buscador */}
        <div className="buscador-sobrio flex-1">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            ref={buscadorRef}
            id="buscador-activos"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={subtab === 'HERRAMIENTAS' ? 'Buscar herramienta por código, nombre o marca...' : 'Buscar vehículo por placa, marca o conductor...'}
            autoComplete="off"
          />
        </div>

        {/* Botones de Acción rápida */}
        <div className="flex items-center gap-2 shrink-0">
          {subtab === 'HERRAMIENTAS' ? (
            <>
              <button
                id="btn-prestar-herramienta"
                onClick={() => {
                  setHerramientaAPrestar(null);
                  setModalPrestarOpen(true);
                }}
                className="boton-cabecera px-4 h-12 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <HandHelping size={15} /> Prestar
              </button>
              <button
                id="btn-historial-prestamos"
                onClick={() => { setHerramientaHistorial(null); setModalHistorialPrestamosOpen(true); }}
                title="Ver todas las entregas y devoluciones de herramientas"
                className="boton-cabecera px-4 h-12 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <History size={15} /> Historial
              </button>
              <button
                id="btn-nueva-herramienta"
                onClick={() => {
                  if (!puedeCrear) { avisarSinPermiso('crear herramientas'); return; }
                  setHerramientaAEditar(null);
                  setModalHerrOpen(true);
                }}
                className="boton-cabecera px-4 h-12 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <Plus size={15} /> Nueva Herramienta
              </button>
            </>
          ) : (
            <>
              <button
                id="btn-nuevo-mantenimiento"
                onClick={() => {
                  setVehiculoAMant(null);
                  setModalMantOpen(true);
                }}
                className="boton-cabecera px-4 h-12 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <Wrench size={15} /> Mantenimiento
              </button>
              <button
                id="btn-nuevo-vehiculo"
                onClick={() => {
                  if (!puedeCrear) { avisarSinPermiso('crear vehículos'); return; }
                  setVehiculoAEditar(null);
                  setModalVehOpen(true);
                }}
                className="boton-cabecera px-4 h-12 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <Plus size={15} /> Nuevo Vehículo
              </button>
            </>
          )}
        </div>
      </div>

      {/* CONTENIDO DE TABLA */}
      {subtab === 'HERRAMIENTAS' ? (
        <TablaHerramientas
          herramientas={herramientasFiltradas}
          onPrestar={(h) => {
            setHerramientaAPrestar(h);
            setModalPrestarOpen(true);
          }}
          onHistorial={(h) => {
            setHerramientaHistorial(h);
            setModalHistorialPrestamosOpen(true);
          }}
          onEditar={(h) => {
            if (!puedeEditar) { avisarSinPermiso('editar herramientas'); return; }
            setHerramientaAEditar(h);
            setModalHerrOpen(true);
          }}
          onEliminar={handleEliminarHerramienta}
        />
      ) : (
        <TablaVehiculos
          vehiculos={vehiculosFiltrados}
          onMantenimiento={(v) => {
            setVehiculoAMant(v);
            setModalMantOpen(true);
          }}
          onHistorial={(v) => {
            setVehiculoHistorial(v);
            setModalHistorialMantOpen(true);
          }}
          onEditar={(v) => {
            if (!puedeEditar) { avisarSinPermiso('editar vehículos'); return; }
            setVehiculoAEditar(v);
            setModalVehOpen(true);
          }}
          onEliminar={handleEliminarVehiculo}
        />
      )}

      {/* MODALES */}
      <ModalNuevaHerramienta
        isOpen={modalHerrOpen}
        onClose={() => setModalHerrOpen(false)}
        herramientaEditar={herramientaAEditar}
        onSaved={cargarDatos}
      />

      <ModalPrestarHerramienta
        isOpen={modalPrestarOpen}
        onClose={() => setModalPrestarOpen(false)}
        herramientaPreseleccionada={herramientaAPrestar}
        herramientas={herramientas}
        onPrestamoExitoso={cargarDatos}
      />

      <ModalHistorialPrestamos
        isOpen={modalHistorialPrestamosOpen}
        onClose={() => setModalHistorialPrestamosOpen(false)}
        herramienta={herramientaHistorial}
        onDevolucionExitosa={cargarDatos}
      />

      <ModalNuevoVehiculo
        isOpen={modalVehOpen}
        onClose={() => setModalVehOpen(false)}
        vehiculoEditar={vehiculoAEditar}
        onSaved={cargarDatos}
      />

      <ModalMantenimiento
        isOpen={modalMantOpen}
        onClose={() => setModalMantOpen(false)}
        vehiculoPreseleccionado={vehiculoAMant}
        vehiculos={vehiculos}
        onSaved={cargarDatos}
      />

      <ModalHistorialMantenimientos
        isOpen={modalHistorialMantOpen}
        onClose={() => setModalHistorialMantOpen(false)}
        vehiculo={vehiculoHistorial}
      />
    </div>
  );
};
