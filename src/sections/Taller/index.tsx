// src/sections/Taller/index.tsx
// Módulo principal de Taller y Reparaciones (Fase 12)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../db/supabase';
import { avisar } from '../../utils/dialogos';
import type { TallerOrden, EstadoOrdenTaller } from './types';
import { HeaderTaller } from './components/HeaderTaller';
import { TablaTaller } from './components/TablaTaller';
import { ModalNuevaOrden } from './components/ModalNuevaOrden';
import { ModalDetalleOrden } from './components/ModalDetalleOrden';
import { generarHtmlTicketTaller } from './components/TicketTaller';

export const Taller: React.FC = () => {
  const [ordenes, setOrdenes] = useState<TallerOrden[]>([]);
  const [clientes, setClientes] = useState<{ id: number; name: string; telefono?: string | null; dni?: string | null; ruc?: string | null }[]>([]);
  const [trabajadores, setTrabajadores] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<{ id: number; name: string; price: number; quantity: number }[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<{ nombre: string; ruc?: string; direccion?: string; telefono?: string; logo?: string }>({
    nombre: 'SERVICIO TÉCNICO',
  });

  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  // Paginación de la lista del taller (franja siempre visible).
  const [pagTaller, setPagTaller] = useState(1);
  const [cargando, setCargando] = useState<boolean>(true);

  // Modales
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [ordenDetalleId, setOrdenDetalleId] = useState<number | null>(null);

  // Cargar órdenes
  const cargarOrdenes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('taller_ordenes')
        .select(`
          *,
          customer:customers(id, name, telefono, dni, ruc, direccion),
          tecnico:trabajadores(id, nombre),
          bien:bienes_cliente(id, nombre, tipo, direccion)
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      setOrdenes((data as TallerOrden[]) || []);
    } catch (err: any) {
      console.error('Error al cargar órdenes de taller:', err);
    }
  }, []);

  // Cargar catálogo auxiliar
  const cargarAuxiliares = useCallback(async () => {
    try {
      // Clientes
      const { data: cData } = await supabase.from('customers').select('id, name, telefono, dni, ruc').order('name');
      if (cData) setClientes(cData);

      // Trabajadores
      const { data: tData } = await supabase.from('trabajadores').select('id, nombre').order('nombre');
      if (tData) setTrabajadores(tData);

      // Productos
      const { data: pData } = await supabase.from('products').select('id, name, price, quantity').order('name');
      if (pData) setProductos(pData);

      // Empresa
      const { data: eData } = await supabase.from('empresa_config').select('*').limit(1).single();
      if (eData) {
        setEmpresaConfig({
          nombre: eData.nombre_empresa || eData.razon_social || 'SERVICIO TÉCNICO',
          ruc: eData.ruc || undefined,
          direccion: eData.direccion || undefined,
          telefono: eData.telefono || undefined,
          logo: eData.logo_url || undefined,
        });
      }
    } catch (err: any) {
      console.error('Error al cargar datos auxiliares del taller:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setCargando(true);
      await Promise.all([cargarOrdenes(), cargarAuxiliares()]);
      setCargando(false);
    };
    init();
  }, [cargarOrdenes, cargarAuxiliares]);

  // Manejo de orden creada con impresión automática
  const handleOrdenCreada = async (nuevaId: number, imprimirTicketAuto: boolean) => {
    setModalNuevaAbierto(false);
    await cargarOrdenes();

    if (imprimirTicketAuto) {
      try {
        const { data: ordenCreada } = await supabase
          .from('taller_ordenes')
          .select(`
            *,
            customer:customers(id, name, telefono, dni, ruc, direccion),
            tecnico:trabajadores(id, nombre),
            bien:bienes_cliente(id, nombre, tipo, direccion)
          `)
          .eq('id', nuevaId)
          .single();

        if (ordenCreada) {
          const html = generarHtmlTicketTaller(ordenCreada as TallerOrden, empresaConfig, 'RECEPCION');
          const win = window.open('', '_blank', 'width=450,height=650');
          if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 250);
          }
        }
      } catch (err) {
        console.error('Error al auto-imprimir ticket:', err);
      }
    }
  };

  // Filtrado reactivo
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      // Filtro por estado
      if (filtroEstado !== 'TODOS' && o.estado !== filtroEstado) {
        return false;
      }
      // Filtro por búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = [
          o.codigo,
          o.customer?.name,
          o.customer?.telefono,
          o.tipo_equipo,
          o.marca,
          o.modelo,
          o.serie,
          o.falla_reportada,
          o.tecnico?.nombre,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [ordenes, filtroEstado, busqueda]);

  const TALLER_POR_PAGINA = 50;
  const totalPagTaller = Math.max(1, Math.ceil(ordenesFiltradas.length / TALLER_POR_PAGINA));
  const ordenesPaginadas = ordenesFiltradas.slice((pagTaller - 1) * TALLER_POR_PAGINA, pagTaller * TALLER_POR_PAGINA);
  useEffect(() => { setPagTaller(1); }, [busqueda, filtroEstado]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      {/* Cabecera, KPIs y Filtros */}
      <HeaderTaller
        ordenes={ordenes}
        filtroEstado={filtroEstado}
        onCambiarFiltroEstado={setFiltroEstado}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        onNuevaOrden={() => setModalNuevaAbierto(true)}
      />

      <div className="flex flex-col gap-4">
        {/* Tabla de órdenes */}
        <TablaTaller
          ordenes={ordenesPaginadas}
          pagina={pagTaller}
          totalPaginas={totalPagTaller}
          onCambiarPagina={setPagTaller}
          onSeleccionarOrden={(orden) => setOrdenDetalleId(orden.id)}
        />
      </div>

      {/* Modal Nueva Orden (Recepción de Equipo) */}
      {modalNuevaAbierto && (
        <ModalNuevaOrden
          clientes={clientes}
          trabajadores={trabajadores}
          onCerrar={() => setModalNuevaAbierto(false)}
          onOrdenCreada={handleOrdenCreada}
        />
      )}

      {/* Modal Detalle de Orden */}
      {ordenDetalleId !== null && (
        <ModalDetalleOrden
          ordenId={ordenDetalleId}
          trabajadores={trabajadores}
          productos={productos}
          empresaConfig={empresaConfig}
          onCerrar={() => setOrdenDetalleId(null)}
          onActualizado={cargarOrdenes}
        />
      )}
    </div>
  );
};
