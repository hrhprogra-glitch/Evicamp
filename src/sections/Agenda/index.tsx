import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../db/supabase';
import { HeaderAgenda } from './components/HeaderAgenda';
import { VistaDia } from './components/VistaDia';
import { VistaSemana } from './components/VistaSemana';
import { VistaMes } from './components/VistaMes';
import { ModalNuevoTrabajo } from './components/ModalNuevoTrabajo';
import { ModalDetalleTrabajo } from './components/ModalDetalleTrabajo';
import { ModalNuevaSalida } from '../Salidas/components/ModalNuevaSalida';
import { avisar } from '../../utils/dialogos';
import type { Trabajo, VistaAgenda, EstadoTrabajo } from './types';

export const Agenda: React.FC = () => {
  const [vista, setVista] = useState<VistaAgenda>('DIA');

  const [fechaActual, setFechaActual] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoTrabajo | 'TODOS'>('TODOS');

  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [trabajoParaEditar, setTrabajoParaEditar] = useState<Trabajo | null>(null);
  const [fechaParaNuevo, setFechaParaNuevo] = useState<string>('');
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);

  // Modal Nueva Salida vinculada
  const [modalSalidaOpen, setModalSalidaOpen] = useState(false);
  const [datosSalidaIniciales, setDatosSalidaIniciales] = useState<any | null>(null);
  const [trabajoParaSalida, setTrabajoParaSalida] = useState<Trabajo | null>(null);

  // Cargar datos
  const fetchDatos = async () => {
    setLoading(true);
    try {
      const [resTrabajos, resTrabajadores] = await Promise.all([
        supabase
          .from('agenda_trabajos')
          .select(`
            *,
            customer:customers(id, name, dni, ruc, telefono, direccion),
            bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
            trabajadores:agenda_trabajadores(
              id, trabajo_id, trabajador_id,
              trabajador:trabajadores(id, nombre, cargo, dni, telefono)
            )
          `)
          .order('fecha', { ascending: true })
          .order('hora_inicio', { ascending: true, nullsFirst: false }),
        supabase
          .from('trabajadores')
          .select('id, nombre, cargo, dni')
          .eq('estado', 'ACTIVO')
          .order('nombre'),
      ]);

      if (resTrabajos.error) throw resTrabajos.error;
      setTrabajos((resTrabajos.data as Trabajo[]) || []);
      if (resTrabajadores.data) setTrabajadores(resTrabajadores.data);
    } catch (err) {
      console.error('Error cargando datos de agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  // Autofoco inicial en el buscador de la agenda
  useEffect(() => {
    const t = setTimeout(() => {
      document.getElementById('buscador-agenda')?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  // Manejo de fechas y navegación temporal
  const fechaObj = useMemo(() => {
    const [y, m, d] = fechaActual.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [fechaActual]);

  const onAnterior = () => {
    const d = new Date(fechaObj);
    if (vista === 'MES') {
      d.setMonth(d.getMonth() - 1);
    } else if (vista === 'SEMANA') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setFechaActual(d.toISOString().slice(0, 10));
  };

  const onSiguiente = () => {
    const d = new Date(fechaObj);
    if (vista === 'MES') {
      d.setMonth(d.getMonth() + 1);
    } else if (vista === 'SEMANA') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setFechaActual(d.toISOString().slice(0, 10));
  };

  const onHoy = () => {
    setFechaActual(new Date().toISOString().slice(0, 10));
  };

  // Título del rango según vista
  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const DIAS_SEMANA_COMPLETOS = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  const tituloRango = useMemo(() => {
    const diaNum = fechaObj.getDate();
    const mesNombre = MESES[fechaObj.getMonth()];
    const anio = fechaObj.getFullYear();

    if (vista === 'MES') {
      return `${mesNombre} ${anio}`;
    }

    if (vista === 'SEMANA') {
      // Calcular lunes y domingo de la semana
      const diaSem = fechaObj.getDay();
      const difLunes = diaSem === 0 ? -6 : 1 - diaSem;
      const lunes = new Date(fechaObj);
      lunes.setDate(fechaObj.getDate() + difLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);

      const dLunes = lunes.getDate();
      const dDom = domingo.getDate();
      const mesLunes = MESES[lunes.getMonth()].slice(0, 3);
      const mesDom = MESES[domingo.getMonth()].slice(0, 3);

      return `Semana: ${dLunes} ${mesLunes} - ${dDom} ${mesDom} ${anio}`;
    }

    const diaNombre = DIAS_SEMANA_COMPLETOS[fechaObj.getDay()];
    return `${diaNombre} ${diaNum} de ${mesNombre} ${anio}`;
  }, [fechaObj, vista]);

  // Días de la semana para VistaSemana
  const diasSemana = useMemo(() => {
    const hoyStr = new Date().toISOString().slice(0, 10);
    const diaSem = fechaObj.getDay();
    const difLunes = diaSem === 0 ? -6 : 1 - diaSem;
    const lunes = new Date(fechaObj);
    lunes.setDate(fechaObj.getDate() + difLunes);

    const NOMBRES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const resultado = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const fStr = d.toISOString().slice(0, 10);
      resultado.push({
        fecha: fStr,
        nombreDia: NOMBRES[i],
        esHoy: fStr === hoyStr,
      });
    }

    return resultado;
  }, [fechaObj]);

  // Días del mes para VistaMes
  const diasMes = useMemo(() => {
    const hoyStr = new Date().toISOString().slice(0, 10);
    const y = fechaObj.getFullYear();
    const m = fechaObj.getMonth();

    const primerDia = new Date(y, m, 1);
    const ultimoDia = new Date(y, m + 1, 0);

    // Ajuste lunes = 0
    let primerDiaSem = primerDia.getDay() - 1;
    if (primerDiaSem === -1) primerDiaSem = 6;

    const resultado = [];

    // Días del mes anterior
    for (let i = primerDiaSem - 1; i >= 0; i--) {
      const d = new Date(y, m, -i);
      const fStr = d.toISOString().slice(0, 10);
      resultado.push({
        fecha: fStr,
        numeroDia: d.getDate(),
        esMesActual: false,
        esHoy: fStr === hoyStr,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const d = new Date(y, m, i);
      const fStr = d.toISOString().slice(0, 10);
      resultado.push({
        fecha: fStr,
        numeroDia: i,
        esMesActual: true,
        esHoy: fStr === hoyStr,
      });
    }

    // Días del mes siguiente para completar múltiplos de 7
    const restantes = (7 - (resultado.length % 7)) % 7;
    for (let i = 1; i <= restantes; i++) {
      const d = new Date(y, m + 1, i);
      const fStr = d.toISOString().slice(0, 10);
      resultado.push({
        fecha: fStr,
        numeroDia: i,
        esMesActual: false,
        esHoy: fStr === hoyStr,
      });
    }

    return resultado;
  }, [fechaObj]);

  // Trabajos filtrados por búsqueda y estado
  const trabajosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return trabajos.filter((t) => {
      // Filtro de estado
      if (filtroEstado !== 'TODOS' && t.estado !== filtroEstado) {
        return false;
      }

      // Filtro de búsqueda
      if (!q) return true;

      const coincideTitulo = t.titulo ? t.titulo.toLowerCase().includes(q) : false;
      const coincideCliente = t.customer?.name ? t.customer.name.toLowerCase().includes(q) : false;
      const coincideBien = t.bien?.nombre ? t.bien.nombre.toLowerCase().includes(q) : false;
      const coincideDireccion = t.direccion ? t.direccion.toLowerCase().includes(q) : false;
      const coincideTecnico = t.trabajadores?.some((trab) =>
        trab.trabajador?.nombre ? trab.trabajador.nombre.toLowerCase().includes(q) : false
      ) || false;

      return (
        coincideTitulo ||
        coincideCliente ||
        coincideBien ||
        coincideDireccion ||
        coincideTecnico
      );
    });
  }, [trabajos, busqueda, filtroEstado]);

  // Trabajos del día actual
  const trabajosDelDia = useMemo(() => {
    return trabajosFiltrados.filter((t) => t.fecha === fechaActual);
  }, [trabajosFiltrados, fechaActual]);

  // Acciones
  const handleAbrirNuevo = (fecha?: string) => {
    setTrabajoParaEditar(null);
    setFechaParaNuevo(fecha || fechaActual);
    setModalNuevoOpen(true);
  };

  const handleEditarTrabajo = (t: Trabajo) => {
    setTrabajoParaEditar(t);
    setFechaParaNuevo(t.fecha);
    setModalNuevoOpen(true);
  };

  const handleGenerarSalida = (t: Trabajo) => {
    setTrabajoParaSalida(t);
    setDatosSalidaIniciales({
      tipo: 'SERVICIO',
      customerId: t.customer_id || '',
      bienId: t.bien_id || '',
      direccion: t.direccion || '',
      ubicacion: t.ubicacion || '',
      trabajadoresIds: t.trabajadores?.map((tr) => tr.trabajador_id) || [],
      observaciones: `Trabajo agenda: ${t.titulo}`,
    });
    setModalSalidaOpen(true);
  };

  const handleSalidaCreada = async (salidaCreada: any) => {
    if (trabajoParaSalida && salidaCreada?.id) {
      try {
        await supabase
          .from('agenda_trabajos')
          .update({ salida_id: salidaCreada.id, updated_at: new Date().toISOString() })
          .eq('id', trabajoParaSalida.id);
      } catch (err) {
        console.warn('Error vinculando salida a trabajo de agenda:', err);
      }
    }
    avisar('✓ Salida de material generada exitosamente');
    fetchDatos();
  };

  // Métricas para la cabecera (según el día, semana o mes visible)
  const metricas = useMemo(() => {
    const base =
      vista === 'DIA'
        ? trabajos.filter((t) => t.fecha === fechaActual)
        : vista === 'SEMANA'
        ? trabajos.filter((t) => diasSemana.some((d) => d.fecha === t.fecha))
        : trabajos.filter((t) => t.fecha.startsWith(fechaActual.slice(0, 7)));

    return {
      total: base.length,
      pendientes: base.filter((t) => t.estado === 'PENDIENTE').length,
      seguimiento: base.filter((t) => t.estado === 'SEGUIMIENTO').length,
      completados: base.filter((t) => t.estado === 'COMPLETADO').length,
    };
  }, [trabajos, vista, fechaActual, diasSemana]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      <HeaderAgenda
        vista={vista}
        setVista={setVista}
        fechaActual={fechaActual}
        setFechaActual={setFechaActual}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        onNuevoTrabajo={() => handleAbrirNuevo()}
        onAnterior={onAnterior}
        onSiguiente={onSiguiente}
        onHoy={onHoy}
        tituloRango={tituloRango}
        metricas={metricas}
      />

      <div className="px-3 sm:px-4 lg:px-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--color-muted)] uppercase">
            Cargando agenda...
          </div>
        ) : (
          <>
            {vista === 'DIA' && (
              <VistaDia
                trabajos={trabajosDelDia}
                fecha={fechaActual}
                onSeleccionarTrabajo={(t) => setTrabajoSeleccionado(t)}
                onNuevoTrabajo={() => handleAbrirNuevo()}
              />
            )}

            {vista === 'SEMANA' && (
              <VistaSemana
                trabajos={trabajosFiltrados}
                diasSemana={diasSemana}
                onSeleccionarTrabajo={(t) => setTrabajoSeleccionado(t)}
                onCrearEnFecha={(f) => handleAbrirNuevo(f)}
              />
            )}

            {vista === 'MES' && (
              <VistaMes
                trabajos={trabajosFiltrados}
                diasMes={diasMes}
                onSeleccionarDia={(f) => {
                  setFechaActual(f);
                  setVista('DIA');
                }}
                onCrearEnFecha={(f) => handleAbrirNuevo(f)}
                onSeleccionarTrabajo={(t) => setTrabajoSeleccionado(t)}
              />
            )}
          </>
        )}
      </div>

      {/* Modal Nuevo / Editar Trabajo */}
      <ModalNuevoTrabajo
        isOpen={modalNuevoOpen}
        trabajoEditar={trabajoParaEditar}
        fechaInicial={fechaParaNuevo}
        onClose={() => setModalNuevoOpen(false)}
        onSuccess={() => {
          avisar(trabajoParaEditar ? '✓ Trabajo actualizado' : '✓ Trabajo programado en agenda');
          fetchDatos();
        }}
      />

      {/* Modal Detalle Trabajo */}
      <ModalDetalleTrabajo
        trabajo={trabajoSeleccionado}
        onClose={() => setTrabajoSeleccionado(null)}
        onEditar={handleEditarTrabajo}
        onGenerarSalida={handleGenerarSalida}
        onEstadoCambiado={() => {
          avisar('✓ Estado actualizado');
          fetchDatos();
          setTrabajoSeleccionado(null);
        }}
        onEliminado={() => {
          avisar('✓ Trabajo eliminado');
          fetchDatos();
        }}
      />

      {/* Modal Salida de Materiales vinculada a trabajo */}
      <ModalNuevaSalida
        isOpen={modalSalidaOpen}
        datosIniciales={datosSalidaIniciales}
        onClose={() => {
          setModalSalidaOpen(false);
          setTrabajoParaSalida(null);
          setDatosSalidaIniciales(null);
        }}
        onSuccess={handleSalidaCreada}
      />
    </div>
  );
};
