// Sección COTIZACIONES de SiuMax Nego (paso 3h, 12/11/2026). Una sola pantalla para Comercio y Servicios (decidido
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

interface Props {
  onNavigatePOS?: () => void;
}

export const Cotizaciones: React.FC<Props> = ({ onNavigatePOS }) => {
  const tipos = useTiposNegocio();
  const conComercio = tipos.includes('comercio');
  const conServicios = tipos.includes('servicios');

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [nueva, setNueva] = useState<{ coti: Cotizacion | null; detalles?: CotizacionItem[] } | null>(null);
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);

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

  const filtradas = useMemo(() => cotizaciones.filter((c) =>
    (filtroEstado === 'TODOS' || c.estado === filtroEstado) &&
    coincideBusqueda([c.numero, c.cliente_nombre, c.cliente_documento, c.cliente_telefono, c.observaciones, c.bien?.nombre], busqueda),
  ), [cotizaciones, filtroEstado, busqueda]);

  // Al cerrar una ventana, el selector vuelve a la fila de esa cotización (o a "Nueva cotización")
  const volverA = (id?: number) => setTimeout(() => {
    const fila = id ? document.getElementById(`fila-coti-${id}`) : null;
    (fila || document.getElementById('btn-nueva-cotizacion'))?.focus();
  }, 80);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      <HeaderCotizaciones
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={setFiltroEstado}
        cotizaciones={cotizaciones}
        encontradas={filtradas.length}
        onNueva={() => setNueva({ coti: null })}
      />
      <div className="px-3 sm:px-4 lg:px-6 pb-6">
        {cargando ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-sm">Cargando cotizaciones…</div>
        ) : (
          <TablaCotizaciones cotizaciones={filtradas} conBien={conServicios} onVerDetalle={setDetalle} />
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
