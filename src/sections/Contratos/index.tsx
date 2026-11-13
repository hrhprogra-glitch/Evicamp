import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { HeaderContratos } from './components/HeaderContratos';
import { TablaContratos } from './components/TablaContratos';
import { TablaVisitas } from './components/TablaVisitas';
import { TablaCobros } from './components/TablaCobros';
import { ModalNuevoContrato } from './components/ModalNuevoContrato';
import { ModalDetalleContrato } from './components/ModalDetalleContrato';
import { ModalRegistrarConsumo } from './components/ModalRegistrarConsumo';
import { ModalRegistrarPago } from './components/ModalRegistrarPago';
import { avisar } from '../../utils/dialogos';
import type { Contrato, VisitaContrato, CobroContrato } from './types';

export const Contratos: React.FC = () => {
  const [pestana, setPestana] = useState<'contratos' | 'visitas' | 'cobros'>('contratos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [visitas, setVisitas] = useState<VisitaContrato[]>([]);
  const [cobros, setCobros] = useState<CobroContrato[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [contratoEditar, setContratoEditar] = useState<Contrato | null>(null);
  const [contratoDetalle, setContratoDetalle] = useState<Contrato | null>(null);
  const [visitaConsumo, setVisitaConsumo] = useState<VisitaContrato | null>(null);
  const [cobroPago, setCobroPago] = useState<CobroContrato | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resCon, resVis, resCob] = await Promise.all([
        supabase
          .from('contratos')
          .select(`
            *,
            customer:customers(id, name, dni, ruc, telefono, direccion),
            bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
            tecnico:trabajadores(id, nombre, cargo, telefono)
          `)
          .order('id', { ascending: false }),
        supabase
          .from('contrato_visitas')
          .select(`
            *,
            contrato:contratos(id, codigo, titulo, customer_id, customer:customers(id, name)),
            tecnico:trabajadores(id, nombre),
            consumos:contrato_consumos(*)
          `)
          .order('fecha_programada', { ascending: false })
          .limit(100),
        supabase
          .from('contrato_cobros')
          .select(`
            *,
            contrato:contratos(id, codigo, titulo),
            customer:customers(id, name, dni, ruc)
          `)
          .order('fecha_vencimiento', { ascending: false })
          .limit(100),
      ]);

      if (resCon.data) setContratos(resCon.data);
      if (resVis.data) setVisitas(resVis.data);
      if (resCob.data) setCobros(resCob.data);
    } catch (err) {
      console.error('Error cargando contratos:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleMarcarVisitaRealizada = async (visitaId: number) => {
    try {
      const { error } = await supabase
        .from('contrato_visitas')
        .update({
          estado: 'REALIZADO',
          fecha_ejecutada: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitaId);

      if (error) throw error;
      avisar('Visita marcada como realizada.');
      cargarDatos();
    } catch (err: any) {
      console.error('Error actualizando visita:', err);
      avisar('Error: ' + err.message);
    }
  };

  // Filtrado de contratos
  const contratosFiltrados = contratos.filter((c) => {
    if (filtroEstado !== 'TODOS' && c.estado !== filtroEstado) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const tituloMatch = c.titulo.toLowerCase().includes(q);
    const codigoMatch = c.codigo.toLowerCase().includes(q);
    const clienteMatch = c.customer?.name ? c.customer.name.toLowerCase().includes(q) : false;
    const bienMatch = c.bien?.nombre ? c.bien.nombre.toLowerCase().includes(q) : false;
    return tituloMatch || codigoMatch || clienteMatch || bienMatch;
  });

  // Filtrado de visitas
  const visitasFiltradas = visitas.filter((v) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const codigoMatch = v.contrato?.codigo ? v.contrato.codigo.toLowerCase().includes(q) : false;
    const tituloMatch = v.contrato?.titulo ? v.contrato.titulo.toLowerCase().includes(q) : false;
    const clienteMatch = v.contrato?.customer?.name ? v.contrato.customer.name.toLowerCase().includes(q) : false;
    const fechaMatch = v.fecha_programada.includes(q);
    return codigoMatch || tituloMatch || clienteMatch || fechaMatch;
  });

  // Filtrado de cobros
  const cobrosFiltrados = cobros.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const perMatch = c.periodo.toLowerCase().includes(q);
    const codigoMatch = c.contrato?.codigo ? c.contrato.codigo.toLowerCase().includes(q) : false;
    const tituloMatch = c.contrato?.titulo ? c.contrato.titulo.toLowerCase().includes(q) : false;
    const clienteMatch = c.customer?.name ? c.customer.name.toLowerCase().includes(q) : false;
    return perMatch || codigoMatch || tituloMatch || clienteMatch;
  });

  // Métricas
  const totalActivos = contratos.filter((c) => c.estado === 'ACTIVO').length;
  const deudaTotal = cobros.reduce((acc, c) => acc + Math.max(0, c.monto - (c.monto_pagado || 0)), 0);
  const visitasPendientes = visitas.filter((v) => v.estado === 'PENDIENTE').length;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      <HeaderContratos
        pestana={pestana}
        onCambiarPestana={setPestana}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={setFiltroEstado}
        onNuevoContrato={() => {
          setContratoEditar(null);
          setModalNuevoAbierto(true);
        }}
        metricas={{ totalActivos, deudaTotal, visitasPendientes }}
      />

      <div className="px-3 sm:px-4 lg:px-6 flex-1 overflow-y-auto min-h-0">
        {cargando ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-xs">Cargando contratos...</div>
        ) : pestana === 'contratos' ? (
          <TablaContratos
            contratos={contratosFiltrados}
            onVerDetalle={(c) => setContratoDetalle(c)}
            onEditar={(c) => {
              setContratoEditar(c);
              setModalNuevoAbierto(true);
            }}
          />
        ) : pestana === 'visitas' ? (
          <TablaVisitas
            visitas={visitasFiltradas}
            onRegistrarConsumo={(v) => setVisitaConsumo(v)}
            onMarcarRealizada={handleMarcarVisitaRealizada}
          />
        ) : (
          <TablaCobros
            cobros={cobrosFiltrados}
            onRegistrarPago={(c) => setCobroPago(c)}
          />
        )}
      </div>

      {/* Modales */}
      {modalNuevoAbierto && (
        <ModalNuevoContrato
          contratoEditar={contratoEditar}
          onClose={(guardado) => {
            setModalNuevoAbierto(false);
            setContratoEditar(null);
            if (guardado) cargarDatos();
          }}
        />
      )}

      {contratoDetalle && (
        <ModalDetalleContrato
          contrato={contratoDetalle}
          onClose={() => {
            setContratoDetalle(null);
            cargarDatos();
          }}
          onEditar={(c) => {
            setContratoDetalle(null);
            setContratoEditar(c);
            setModalNuevoAbierto(true);
          }}
        />
      )}

      {visitaConsumo && (
        <ModalRegistrarConsumo
          visita={visitaConsumo}
          onClose={(guardado) => {
            setVisitaConsumo(null);
            if (guardado) cargarDatos();
          }}
        />
      )}

      {cobroPago && (
        <ModalRegistrarPago
          cobro={cobroPago}
          onClose={(guardado) => {
            setCobroPago(null);
            if (guardado) cargarDatos();
          }}
        />
      )}
    </div>
  );
};
