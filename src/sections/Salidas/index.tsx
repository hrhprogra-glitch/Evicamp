import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../db/supabase';
import { HeaderSalidas } from './components/HeaderSalidas';
import { TablaSalidas } from './components/TablaSalidas';
import { ModalNuevaSalida } from './components/ModalNuevaSalida';
import { ModalDetalleSalida } from './components/ModalDetalleSalida';
import type { Salida, TipoSalida, EstadoSalida } from './types';

export const Salidas: React.FC = () => {
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoSalida | 'TODOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSalida | 'TODOS'>('TODOS');

  // Modales / sub sesión
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [salidaParaContinuar, setSalidaParaContinuar] = useState<Salida | null>(null);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<Salida | null>(null);
  // De dónde se abrió la sub sesión, para devolver el selector al botón o a la fila correcta (178).
  const [origenSubSesion, setOrigenSubSesion] = useState<{ tipo: 'boton' } | { tipo: 'fila'; codigo: string }>({ tipo: 'boton' });

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  const fetchSalidas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          customer:customers(id, name, dni, ruc, telefono, direccion),
          bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
          trabajadores:salida_trabajadores(
            id, salida_id, trabajador_id, rol,
            trabajador:trabajadores(id, nombre, cargo, telefono, dni)
          ),
          items:salida_items(*)
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      setSalidas((data as any[]) || []);
    } catch (err) {
      console.error('Error cargando salidas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalidas();
  }, []);

  // Autofoco inicial en el buscador de salidas
  useEffect(() => {
    const t = setTimeout(() => {
      document.getElementById('buscador-salidas')?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  // Manejo de teclado entre buscador, paginación y tabla
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalNuevoOpen || salidaSeleccionada) return;

      if (e.key === 'ArrowDown') {
        const active = document.activeElement;
        if (active?.id === 'buscador-salidas') {
          e.preventDefault();
          const pagBtn = document.getElementById('btn-pagina-ant-salidas-arriba');
          pagBtn?.focus();
        } else if (
          active?.id === 'btn-pagina-ant-salidas-arriba' ||
          active?.id === 'btn-pagina-sig-salidas-arriba'
        ) {
          e.preventDefault();
          const primeraFila = document.querySelector('[data-fila-salida="true"]') as HTMLElement | null;
          primeraFila?.focus();
        } else if (active?.getAttribute('data-fila-salida') === 'true') {
          e.preventDefault();
          const siguienteFila = active.nextElementSibling as HTMLElement | null;
          if (siguienteFila && siguienteFila.getAttribute('data-fila-salida') === 'true') {
            siguienteFila.focus();
          }
        }
      } else if (e.key === 'ArrowUp') {
        const active = document.activeElement;
        if (active?.getAttribute('data-fila-salida') === 'true') {
          const anteriorFila = active.previousElementSibling as HTMLElement | null;
          if (anteriorFila && anteriorFila.getAttribute('data-fila-salida') === 'true') {
            e.preventDefault();
            anteriorFila.focus();
          } else {
            e.preventDefault();
            document.getElementById('btn-pagina-ant-salidas-arriba')?.focus();
          }
        } else if (
          active?.id === 'btn-pagina-ant-salidas-arriba' ||
          active?.id === 'btn-pagina-sig-salidas-arriba'
        ) {
          e.preventDefault();
          document.getElementById('buscador-salidas')?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalNuevoOpen, salidaSeleccionada]);

  // Filtrado
  const salidasFiltradas = useMemo(() => {
    return salidas.filter((s) => {
      if (filtroTipo !== 'TODOS' && s.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'TODOS' && s.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchCodigo = s.codigo?.toLowerCase().includes(q);
        const matchCliente = s.customer?.name?.toLowerCase().includes(q);
        const matchDoc = (s.customer?.dni || s.customer?.ruc)?.toLowerCase().includes(q);
        const matchBien = s.bien?.nombre?.toLowerCase().includes(q);
        const matchDir = s.direccion?.toLowerCase().includes(q);
        const matchTrab = (s.trabajadores || []).some((t) =>
          t.trabajador?.nombre?.toLowerCase().includes(q)
        );
        const matchItems = (s.items || []).some((it) =>
          it.descripcion?.toLowerCase().includes(q)
        );
        return matchCodigo || matchCliente || matchDoc || matchBien || matchDir || matchTrab || matchItems;
      }
      return true;
    });
  }, [salidas, filtroTipo, filtroEstado, busqueda]);

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
    setOrigenSubSesion({ tipo: 'boton' });
    setModalNuevoOpen(true);
  };

  const handleContinuarSalida = (salida: Salida) => {
    setSalidaParaContinuar(salida);
    setOrigenSubSesion({ tipo: 'fila', codigo: salida.codigo || '' });
    setModalNuevoOpen(true);
  };

  // Al volver de la sub sesión, el selector regresa a quien la abrió. El botón y la tabla se vuelven a montar
  // después de cerrar, por eso se busca con un pequeño espera; si la fila ya no está, cae al botón/buscador.
  const cerrarSubSesion = () => {
    setModalNuevoOpen(false);
    setSalidaParaContinuar(null);
    const origen = origenSubSesion;
    setTimeout(() => {
      let destino: HTMLElement | null = null;
      if (origen.tipo === 'fila' && origen.codigo) {
        destino = Array.from(document.querySelectorAll<HTMLElement>('[data-fila-salida="true"]'))
          .find((fila) => fila.innerText.includes(origen.codigo)) || null;
      }
      if (!destino) destino = document.getElementById('btn-nueva-salida');
      (destino || document.getElementById('buscador-salidas'))?.focus();
    }, 120);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      {/* En la sub sesión grande se ocultan la cabecera y la tabla: todo el espacio es para el formulario. */}
      {!modalNuevoOpen && (
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
          onNuevaSalida={handleNuevaSalida}
          metricas={metricas}
        />
      )}

      {!modalNuevoOpen && (
        <div className="px-3 sm:px-4 lg:px-6 flex flex-col gap-4">
          <TablaSalidas
            salidas={salidasPaginadas}
            onVerDetalle={(salida) => setSalidaSeleccionada(salida)}
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={(pag) => setPaginaActual(pag)}
          />
        </div>
      )}

      {/* Nueva / Continuar Salida como sub sesión grande dentro de la sección (178). */}
      {modalNuevoOpen && (
        <div className="px-3 sm:px-4 lg:px-6 pb-6">
          <ModalNuevaSalida
            isOpen={modalNuevoOpen}
            modo="sesion"
            salidaRaiz={salidaParaContinuar}
            onClose={cerrarSubSesion}
            onSuccess={() => {
              fetchSalidas();
            }}
          />
        </div>
      )}

      {/* Modal Detalle Salida */}
      {!modalNuevoOpen && salidaSeleccionada && (
        <ModalDetalleSalida
          salida={salidaSeleccionada}
          isOpen={!!salidaSeleccionada}
          onClose={() => setSalidaSeleccionada(null)}
          onReload={async () => {
            fetchSalidas();
            if (salidaSeleccionada) {
              const { data } = await supabase
                .from('salidas')
                .select(`
                  *,
                  customer:customers(id, name, dni, ruc, telefono, direccion),
                  bien:bienes_cliente(id, nombre, tipo, direccion, ubicacion),
                  trabajadores:salida_trabajadores(
                    id, salida_id, trabajador_id, rol,
                    trabajador:trabajadores(id, nombre, cargo, telefono, dni)
                  ),
                  items:salida_items(*)
                `)
                .eq('id', salidaSeleccionada.id)
                .single();
              if (data) setSalidaSeleccionada(data as any);
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
