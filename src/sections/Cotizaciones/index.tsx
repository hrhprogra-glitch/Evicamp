// Pestaña COTIZACIONES de la sección ENCARGOS de SiuMax Nego (paso 3h, 12/11/2026; desde el mismo día dentro de
// Encargos, con Pedidos, pedido del dueño). Una sola pantalla para Comercio y Servicios (decidido
// por el dueño): reemplaza la pestaña Cotizaciones de Clientes (Comerc) y la sección Cotizaciones de SiuMax Servic.
// Las cotizaciones de la Caja (ModalCotizacionPOS) también salen aquí.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../db/supabase';
import { traerTodo } from '../../utils/traerTodo';
import { coincideBusqueda } from '../../utils/busqueda';
import { useTiposNegocio } from '../../utils/tiposNegocio';
import type { Cotizacion, CotizacionItem } from './types';
import { aCotizacion } from './types';
import { HeaderCotizaciones } from './components/HeaderCotizaciones';
import { TablaCotizaciones } from './components/TablaCotizaciones';
import { ModalNuevaCotizacion } from './components/ModalNuevaCotizacion';
import { ModalDetalleCotizacion } from './components/ModalDetalleCotizacion';
import { PaginacionSobrio } from '../../components/PaginacionSobrio';

interface Props {
  onNavigatePOS?: () => void;
  pedirNueva?: number; // cada vez que sube, abre "Nueva cotización" (el botón está en la cabecera de Encargos)
}

export const Cotizaciones: React.FC<Props> = ({ onNavigatePOS, pedirNueva = 0 }) => {
  const tipos = useTiposNegocio();
  const conComercio = tipos.includes('comercio');
  const conServicios = tipos.includes('servicios');

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [nueva, setNueva] = useState<{ coti: Cotizacion | null; detalles?: CotizacionItem[] } | null>(null);
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);

  // Paginación SiuMax Sobrio: 50 filas por página, igual que el resto de Nego (18/11/2026)
  const POR_PAGINA = 50;
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await traerTodo(() => supabase.from('cotizaciones').select('*').order('id', { ascending: false }));
      if (error) throw error;
      let bienes: Map<number, { id: number; nombre: string; tipo: string }> | undefined;
      if (conServicios) {
        const { data: b } = await supabase.from('bienes_cliente').select('id, nombre, tipo');
        bienes = new Map((b || []).map((x: any) => [Number(x.id), x]));
      }
      setCotizaciones((data || []).map((c: any) => aCotizacion(c, bienes)));
    } catch (err) {
      console.error('Error cargando cotizaciones:', err);
    } finally {
      setCargando(false);
    }
  }, [conServicios]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (pedirNueva > 0) setNueva({ coti: null }); }, [pedirNueva]);

  const filtradas = useMemo(() => cotizaciones.filter((c) =>
    (filtroEstado === 'TODOS' || c.estado === filtroEstado) &&
    coincideBusqueda([c.numero, c.cliente_nombre, c.cliente_documento, c.cliente_telefono, c.observaciones, c.bien?.nombre], busqueda),
  ), [cotizaciones, filtroEstado, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginadas = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina],
  );

  // Cambiar búsqueda o filtro vuelve a la página 1 (y nunca queda una página vacía)
  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPagina(1); };
  const cambiarFiltro = (v: string) => { setFiltroEstado(v); setPagina(1); };
  useEffect(() => {
    setPagina((p) => Math.min(p, Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))));
  }, [filtradas.length]);

  // Al cerrar una ventana, el selector vuelve a la fila de esa cotización (o a "Nueva cotización")
  const volverA = (id?: number) => setTimeout(() => {
    const idx = id ? filtradas.findIndex((c) => c.id === id) : -1;
    if (idx >= 0) setPagina(Math.floor(idx / POR_PAGINA) + 1);
    setTimeout(() => {
      const fila = id ? document.getElementById(`fila-coti-${id}`) : null;
      (fila || document.getElementById('btn-nueva-cotizacion'))?.focus();
    }, 80);
  }, 80);

  return (
    <div className="flex flex-col gap-4 p-0 w-full font-mono relative">
      <HeaderCotizaciones
        busqueda={busqueda}
        onBusquedaChange={cambiarBusqueda}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={cambiarFiltro}
        cotizaciones={cotizaciones}
        encontradas={filtradas.length}
      />
      <div className="pb-6">
        {cargando ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-sm">Cargando cotizaciones…</div>
        ) : (
          <TablaCotizaciones
            cotizaciones={paginadas}
            total={filtradas.length}
            pagina={pagina}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPagina}
            conBien={conServicios}
            onVerDetalle={setDetalle}
          />
        )}
      </div>

      {nueva && (
        <ModalNuevaCotizacion
          cotizacionEditar={nueva.coti}
          detallesEditar={nueva.detalles}
          conServicios={conServicios}
          onClose={async (guardado, idGuardado) => {
            const id = idGuardado || nueva.coti?.id;
            setNueva(null);
            if (guardado) await cargar();
            volverA(id);
          }}
        />
      )}
      {detalle && (
        <ModalDetalleCotizacion
          cotizacion={detalle}
          conComercio={conComercio}
          conServicios={conServicios}
          onNavigatePOS={onNavigatePOS}
          onEditar={(c, detalles) => { setDetalle(null); setNueva({ coti: c, detalles }); }}
          onClose={async (actualizado) => {
            const id = detalle.id;
            setDetalle(null);
            if (actualizado) await cargar();
            volverA(id);
          }}
        />
      )}
    </div>
  );
};

export default Cotizaciones;
