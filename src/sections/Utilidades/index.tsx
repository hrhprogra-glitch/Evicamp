import { useState, useEffect } from 'react';
import { BarChart3, Truck } from 'lucide-react';

import { FiltrosUtilidades } from './components/FiltrosUtilidades';
import { TarjetasResumen } from './components/TarjetasResumen';
import { TablaAnalisisProductos } from './components/TablaAnalisisProductos';
import { TableroGanancias } from './components/TableroGanancias';
import { AnalisisSalidasProductos } from './components/AnalisisSalidasProductos';
import { calcularAnalisis } from './calcularAnalisis';

import type { AnalisisProducto, StatsFiltro } from './types';
// 🎯 MOTOR ÚNICO DE INGRESO TOTAL: misma fórmula y mismas fechas que Resumen,
// Reportes, Finanzas y Punto de Venta, para que el monto SIEMPRE coincida entre pantallas.
import { fechaLocalPeru, primerDiaMesPeru, haceNDiasPeru } from '../../utils/ingresos';

import { cacheUtilidadesMemoria, setCacheUtilidades } from '../../utils/cacheModulos';
import { useTiposNegocio } from '../../utils/tiposNegocio';
// SiuMax Nego, paso 3h: con "Talleres y servicios" también las Utilidades de servicios (de SiuMax Servic)
import { PestanasUtilidades, pestanasDe, type PestanaUtilidades } from './PestanasUtilidades';
import { UtilidadesServicios } from './servicios/UtilidadesServicios';

const pestanaGuardada = (): PestanaUtilidades | null => {
  try { return (sessionStorage.getItem('utilidades_pestana') as PestanaUtilidades) || null; } catch { return null; }
};

interface UtilidadesProps {
  onNavigate?: (view: string, state?: any) => void;
  vistaInicial?: 'productos' | 'salidas';
}

export const Utilidades = ({ onNavigate, vistaInicial }: UtilidadesProps) => {
  const tipos = useTiposNegocio();
  const conComercio = tipos.includes('comercio');
  const conServicios = tipos.includes('servicios');
  // Utilidades muestra solo Productos (pedido del dueño, 24/11/2026).
  const conComercioVista = true;
  const conServiciosVista = false;
  // Pestaña elegida; si no es del tipo de negocio, la primera que sí lo sea (Productos con Comercio)
  const [pestanaElegida, setPestanaElegida] = useState<PestanaUtilidades | null>(pestanaGuardada);
  const permitidas = pestanasDe(conComercioVista, conServiciosVista).map((t) => t.id);
  const pestana: PestanaUtilidades = pestanaElegida && permitidas.includes(pestanaElegida) ? pestanaElegida : (permitidas[0] || 'productos');
  const cambiarPestana = (p: PestanaUtilidades) => {
    setPestanaElegida(p);
    try { sessionStorage.setItem('utilidades_pestana', p); } catch { /* sin almacenamiento */ }
    setTimeout(() => document.getElementById(`btn-tab-util-${p}`)?.focus(), 60);
  };
  const verProductos = pestana === 'productos';
  const hoyStr = fechaLocalPeru();
  const primerDiaMes = primerDiaMesPeru();

  const [fechaInicio, setFechaInicio] = useState<string>(hoyStr);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);

  const tieneCacheInicial = cacheUtilidadesMemoria &&
    cacheUtilidadesMemoria.fechaInicio === hoyStr &&
    cacheUtilidadesMemoria.fechaFin === hoyStr;

  const [analisisCompleto, setAnalisisCompleto] = useState<AnalisisProducto[]>(() => tieneCacheInicial ? cacheUtilidadesMemoria!.analisis : []);
  const [gastosCaja, setGastosCaja] = useState<number>(() => tieneCacheInicial ? cacheUtilidadesMemoria!.gastos : 0);
  const [ingresosTotalesExactos, setIngresosTotalesExactos] = useState<number>(() => tieneCacheInicial ? cacheUtilidadesMemoria!.ingresoTotal : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarTablero, setMostrarTablero] = useState(false);
  const [vista, setVista] = useState<'productos' | 'salidas'>(vistaInicial === 'salidas' ? 'salidas' : 'productos');
  const [statsFiltro, setStatsFiltro] = useState<StatsFiltro>({ ingresos: 0, costos: 0, mermas: 0, hayFiltros: false });

  useEffect(() => {
    if (vistaInicial) setVista(vistaInicial);
  }, [vistaInicial]);

  const filtrarHoy = () => { setFechaInicio(hoyStr); setFechaFin(hoyStr); };
  const filtrarSemana = () => { setFechaInicio(haceNDiasPeru(7)); setFechaFin(hoyStr); };
  const filtrarMes = () => { setFechaInicio(primerDiaMes); setFechaFin(hoyStr); };
  const limpiarFiltros = () => { setFechaInicio(hoyStr); setFechaFin(hoyStr); };

  useEffect(() => {
    if (!verProductos) return; // en las pestañas de servicios no se calcula lo de productos
    const procesarEstadisticas = async (silencioso = false) => {
      const tieneCacheValido = cacheUtilidadesMemoria && cacheUtilidadesMemoria.fechaInicio === fechaInicio && cacheUtilidadesMemoria.fechaFin === fechaFin;
      if (!silencioso && !tieneCacheValido && analisisCompleto.length === 0) setIsLoading(true);


      // Todo el cálculo vive en calcularAnalisis.ts (lo comparte "Gráficos y detalles"; mismas fórmulas de siempre)
      const r = await calcularAnalisis(fechaInicio, fechaFin);
      setGastosCaja(r.gastos);
      setIngresosTotalesExactos(r.ingresoTotal);
      setCacheUtilidades({
        fechaInicio,
        fechaFin,
        gastos: r.gastos,
        ingresoTotal: r.ingresoTotal,
        analisis: r.analisis,
      });
      setAnalisisCompleto(r.analisis);
      setIsLoading(false);
    };

    const tieneCacheValido = cacheUtilidadesMemoria && cacheUtilidadesMemoria.fechaInicio === fechaInicio && cacheUtilidadesMemoria.fechaFin === fechaFin;
    procesarEstadisticas(!!tieneCacheValido);

    // 🛡️ EVICAMP: Si la pestaña estuvo inactiva (u otra caja/dispositivo registró ventas),
    // al volver a mirarla se refrescan los totales en silencio, sin tapar la tabla con el loader.
    const refrescarSilencioso = () => procesarEstadisticas(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refrescarSilencioso();
    };
    window.addEventListener('focus', refrescarSilencioso);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refrescarSilencioso);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fechaInicio, fechaFin, verProductos]);

  // 🟢 CÁLCULO MAESTRO SINCRONIZADO (FINANZAS + POS + UTILIDAD)
  // Sin filtros en la tabla: se usa el total exacto del período (Finanzas).
  // Con un filtro de categoría/rotación/búsqueda activo: las tarjetas muestran
  // solo lo que la tabla está mostrando en ese momento.
  const globalIngresos = statsFiltro.hayFiltros ? statsFiltro.ingresos : ingresosTotalesExactos;
  const globalCostos = statsFiltro.hayFiltros ? statsFiltro.costos : analisisCompleto.reduce((acc: number, p: any) => acc + p.costoTotalVentas, 0);
  const globalMermas = statsFiltro.hayFiltros ? statsFiltro.mermas : analisisCompleto.reduce((acc: number, p: any) => acc + p.perdidaMerma, 0);

  // FÓRMULA MAESTRA DEFINITIVA
  // Sin filtro: se resta Gastos Operativos del período completo (utilidad real del negocio).
  // Con filtro (ej. una categoría): los Gastos Operativos NO son un dato por producto/categoría,
  // así que no se pueden repartir — se omiten para que la tarjeta cuadre exacto con la suma de
  // "Utilidad Neta" que se ve en la tabla filtrada.
  const globalUtilidad = statsFiltro.hayFiltros
    ? (globalIngresos - globalCostos - globalMermas)
    : (globalIngresos - globalCostos - globalMermas - gastosCaja);

  if (!verProductos) {
    return <UtilidadesServicios pestana={pestana} onCambiarPestana={cambiarPestana} conComercio={conComercioVista} />;
  }

  const tabsVista: { id: 'productos' | 'salidas'; label: string; Icono: typeof BarChart3; buscador: string }[] = [
    { id: 'productos', label: 'Productos', Icono: BarChart3, buscador: 'buscador-global-utilidades' },
    { id: 'salidas', label: 'Análisis de salidas', Icono: Truck, buscador: 'buscador-analisis-salidas' },
  ];
  const ir = (id: string) => document.getElementById(id)?.focus();
  const pestanasVista = (
    <div role="tablist" aria-label="Utilidades" className="pestanas-sobrias flex min-w-0 w-full md:w-auto">
      {tabsVista.map(({ id, label, Icono, buscador }, i) => (
        <button
          key={id}
          id={`btn-tab-util-${id}`}
          role="tab"
          aria-selected={vista === id}
          data-activa={vista === id}
          type="button"
          onClick={() => setVista(id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); ir(i < tabsVista.length - 1 ? `btn-tab-util-${tabsVista[i + 1].id}` : 'btn-tops-utilidades'); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) ir(`btn-tab-util-${tabsVista[i - 1].id}`); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); ir(buscador); }
            else if (e.key === 'ArrowUp') e.preventDefault();
          }}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 2xl:px-4 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap rounded-none cursor-pointer"
        >
          <Icono size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-10 text-[var(--color-ink)] font-mono h-full bg-[var(--color-bg)] relative">
      <FiltrosUtilidades
        onToggleTops={() => setMostrarTablero(true)}
        pestanas={pestanasVista}
      />

      {vista === 'salidas' ? (
        <AnalisisSalidasProductos onNavigate={onNavigate} />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          <TarjetasResumen
            ingresos={globalIngresos}
            costos={globalCostos}
            mermas={globalMermas}
            gastosOperativos={gastosCaja}
            utilidad={globalUtilidad}
            filtrado={statsFiltro.hayFiltros}
          />

          {/* La tabla permanece siempre montada (aunque esté cargando) para no perder
              la categoría, rotación, búsqueda y página que el usuario ya eligió. */}
          <div className="relative">
            {isLoading && analisisCompleto.length === 0 && (
              <div className="absolute inset-0 bg-[var(--color-surface)]/85 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
                  <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
                </div>
              </div>
            )}
            <TablaAnalisisProductos
              datos={analisisCompleto}
              fechaInicio={fechaInicio} fechaFin={fechaFin}
              setFechaInicio={setFechaInicio} setFechaFin={setFechaFin}
              limpiarFechas={limpiarFiltros}
              onStatsFiltradasChange={setStatsFiltro}
            />
          </div>
        </div>
      )}

      {/* 05/11/2026: "Top 5 rentables" pasó a ser "Gráficos y detalles" (tablero de ganancias y pérdidas) */}
      {mostrarTablero && (
        <TableroGanancias
          onClose={() => { setMostrarTablero(false); setTimeout(() => document.getElementById('btn-tops-utilidades')?.focus(), 50); }}
        />
      )}
    </div>
  );
};




