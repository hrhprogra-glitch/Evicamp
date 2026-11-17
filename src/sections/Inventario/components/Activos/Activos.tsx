import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wrench, Car, Plus, HandHelping, Search, History } from 'lucide-react';
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
