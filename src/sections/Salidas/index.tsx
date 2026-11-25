import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../db/supabase';
import { HeaderSalidas } from './components/HeaderSalidas';
import { TablaSalidas } from './components/TablaSalidas';
import { ModalNuevaSalida } from './components/ModalNuevaSalida';
import { ModalDetalleSalida } from './components/ModalDetalleSalida';
import { conNombreClienteNota } from './clienteNota';
import type { Salida, TipoSalida, EstadoSalida } from './types';
import { coincideBusqueda } from '../../utils/busqueda';

interface SalidasProps {
  salidaIdInicial?: number;
  onVolver?: () => void;
}

export const Salidas: React.FC<SalidasProps> = ({ salidaIdInicial, onVolver }) => {
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoSalida | 'TODOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSalida | 'TODOS'>('TODOS');
  // 221: fecha elegida en la barra; vacío = TODAS (no se oculta ningún día)
  const [filtroFecha, setFiltroFecha] = useState('');

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [salidaParaContinuar, setSalidaParaContinuar] = useState<Salida | null>(null);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<Salida | null>(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  const fetchSalidas = async () => {
    setLoading(true);
    const selectBase = `
          *,
          customer:customers(id, name, dni, ruc, telefono, direccion),
          bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
          trabajadores:salida_trabajadores(
            id, salida_id, trabajador_id, rol,
            trabajador:trabajadores(id, nombre, cargo, telefono, dni)
          ),
          items:salida_items(*)
        `;
    const selectConDevoluciones = `${selectBase}, devoluciones:salida_devoluciones(*, trabajador:trabajadores(id, nombre))`;
    try {
      let { data, error } = await supabase
        .from('salidas')
        .select(selectConDevoluciones)
        .order('id', { ascending: false });

      // Compatibilidad: si la tabla de devoluciones no existe en alguna BD, reintentar sin ella.
      if (error && /salida_devoluciones|relation|schema cache/i.test(error.message || '')) {
        const retry = await supabase.from('salidas').select(selectBase).order('id', { ascending: false });
        data = retry.data as any;
        error = retry.error as any;
      }

      if (error) throw error;
      // Las notas llevan el nombre escrito en observaciones; el cliente interno solo es una referencia.
      setSalidas(((data as any[]) || []).map(conNombreClienteNota));
    } catch (err) {
      console.error('Error cargando salidas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalidas();
  }, []);

  const salidaInicialAbierta = useRef(false);
  useEffect(() => {
    if (salidaInicialAbierta.current || !salidaIdInicial || loading) return;
    const encontrada = salidas.find((s) => Number(s.id) === Number(salidaIdInicial));
    if (encontrada) {
      setSalidaSeleccionada(encontrada);
      salidaInicialAbierta.current = true;
    }
  }, [salidas, salidaIdInicial, loading]);

  // Autofoco inicial en el buscador de salidas
  useEffect(() => {
    const t = setTimeout(() => {
      document.getElementById('buscador-salidas')?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  // (24/11/2026) Antes había aquí un listener global que también movía el foco entre filas.
  // La fila ya lo hace en TablaSalidas.tsx y, como el foco cambiaba antes de que este listener
  // recibiera la tecla, bajaba (y subía) DOBLE. Cada control mueve el selector una sola vez:
  // la sub-barra en HeaderSalidas, la paginación en PaginacionSobrio y las filas en TablaSalidas.

  // Filtrado
  const salidasFiltradas = useMemo(() => {
    return salidas.filter((s) => {
      if (filtroTipo !== 'TODOS' && s.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'TODOS' && s.estado !== filtroEstado) return false;
      if (filtroFecha && String(s.fecha || '').slice(0, 10) !== filtroFecha) return false;
      if (busqueda.trim()) {
        // Mismo buscador flexible que el detalle y Devolver: ignora tildes, mayúsculas,
        // espacios de más y encuentra palabras aunque estén en otro orden.
        const campos: (string | null | undefined)[] = [
          s.codigo,
          s.customer?.name,
          s.customer?.dni,
          s.customer?.ruc,
          s.bien?.nombre,
          s.direccion,
          ...(s.trabajadores || []).map((t) => t.trabajador?.nombre),
          ...(s.items || []).map((it) => it.descripcion),
        ];
        return coincideBusqueda(campos, busqueda);
      }
      return true;
    });
  }, [salidas, filtroTipo, filtroEstado, filtroFecha, busqueda]);

  // Métricas (cuadros de la cabecera)
  const metricas = useMemo(() => {
    let enProceso = 0;
    let finalizadas = 0;
    let canceladas = 0;

    for (const s of salidas) {
      if (s.estado === 'EN_PROCESO') enProceso++;
      else if (s.estado === 'FINALIZADO') finalizadas++;
      else if (s.estado === 'CANCELADO') canceladas++;
    }

    return {
      total: salidas.length,
      enProceso,
      finalizadas,
      canceladas,
    };
  }, [salidas]);

  // Paginación
  const totalPaginas = Math.ceil(salidasFiltradas.length / ITEMS_POR_PAGINA);
  const salidasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return salidasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [salidasFiltradas, paginaActual]);

  const handleNuevaSalida = () => {
    setSalidaParaContinuar(null);
    setModalNuevoOpen(true);
  };

  const handleContinuarSalida = (salida: Salida) => {
    setSalidaParaContinuar(salida);
    setModalNuevoOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      <HeaderSalidas
        busqueda={busqueda}
        onBusquedaChange={(val) => {
          setBusqueda(val);
          setPaginaActual(1);
        }}
        filtroTipo={filtroTipo}
        onFiltroTipoChange={(t) => {
          setFiltroTipo(t);
          setPaginaActual(1);
        }}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={(st) => {
          setFiltroEstado(st);
          setPaginaActual(1);
        }}
        filtroFecha={filtroFecha}
        onFiltroFechaChange={(f) => {
          setFiltroFecha(f);
          setPaginaActual(1);
        }}
        onNuevaSalida={handleNuevaSalida}
        metricas={metricas}
        onVolver={onVolver}
      />

      <div className="flex flex-col gap-4">
        <TablaSalidas
          salidas={salidasPaginadas}
          onVerDetalle={(salida) => setSalidaSeleccionada(salida)}
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          onCambiarPagina={(pag) => setPaginaActual(pag)}
        />
      </div>

      {/* Modal Nueva / Continuar Salida */}
      {modalNuevoOpen && (
        <ModalNuevaSalida
          isOpen={modalNuevoOpen}
          salidaRaiz={salidaParaContinuar}
          onClose={() => {
            setModalNuevoOpen(false);
            setSalidaParaContinuar(null);
          }}
          onSuccess={() => {
            fetchSalidas();
          }}
        />
      )}

      {/* Modal Detalle Salida */}
      {salidaSeleccionada && (
        <ModalDetalleSalida
          salida={salidaSeleccionada}
          isOpen={!!salidaSeleccionada}
          onClose={() => setSalidaSeleccionada(null)}
          onReload={async () => {
            fetchSalidas();
            if (salidaSeleccionada) {
              const base = `
                  *,
                  customer:customers(id, name, dni, ruc, telefono, direccion),
                  bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
                  trabajadores:salida_trabajadores(
                    id, salida_id, trabajador_id, rol,
                    trabajador:trabajadores(id, nombre, cargo, telefono, dni)
                  ),
                  items:salida_items(*)
                `;
              let { data, error } = await supabase
                .from('salidas')
                .select(`${base}, devoluciones:salida_devoluciones(*, trabajador:trabajadores(id, nombre))`)
                .eq('id', salidaSeleccionada.id)
                .single();
              if (error && /salida_devoluciones|relation|schema cache/i.test(error.message || '')) {
                const retry = await supabase.from('salidas').select(base).eq('id', salidaSeleccionada.id).single();
                data = retry.data as any;
                error = retry.error as any;
              }
              if (data) setSalidaSeleccionada(conNombreClienteNota(data as any));
            }
          }}
          onContinuar={(salida) => {
            setSalidaSeleccionada(null);
            handleContinuarSalida(salida);
          }}
        />
      )}
    </div>
  );
};

export default Salidas;
