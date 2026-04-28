import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { Activity } from 'lucide-react';

import { FiltrosUtilidades } from './components/FiltrosUtilidades';
import { TarjetasResumen } from './components/TarjetasResumen';
import { TablaAnalisisProductos } from './components/TablaAnalisisProductos';
import { VentanaTopsFlotante } from './components/VentanaTopsFlotante';

import type { AnalisisProducto } from './types';

// Obtiene la fecha en formato YYYY-MM-DD sin importar la hora local
const obtenerFechaLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const Utilidades = () => {
  const hoyStr = obtenerFechaLocal();
  const dMes = new Date();
  dMes.setDate(1);
  dMes.setMinutes(dMes.getMinutes() - dMes.getTimezoneOffset());
  const primerDiaMes = dMes.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState<string>(hoyStr);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);
  
  const [analisisCompleto, setAnalisisCompleto] = useState<AnalisisProducto[]>([]);
  const [gastosCaja, setGastosCaja] = useState<number>(0); // Estado para Finanzas
  const [ingresosTotalesExactos, setIngresosTotalesExactos] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarTops, setMostrarTops] = useState(false);

  const filtrarHoy = () => { setFechaInicio(hoyStr); setFechaFin(hoyStr); };
  const filtrarSemana = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setFechaInicio(d.toISOString().split('T')[0]);
    setFechaFin(hoyStr);
  };
  const filtrarMes = () => { setFechaInicio(primerDiaMes); setFechaFin(hoyStr); };
  const limpiarFiltros = () => { setFechaInicio(hoyStr); setFechaFin(hoyStr); };

  useEffect(() => {
    const procesarEstadisticas = async () => {
      setIsLoading(true);
      
      const fechaFinExpandida = new Date(fechaFin + 'T12:00:00');
      fechaFinExpandida.setDate(fechaFinExpandida.getDate() + 1);
      const finAjustado = fechaFinExpandida.toISOString().split('T')[0];

      // 🛠️ MOTOR DE FECHAS PURO: Zona Horaria Perú (UTC-5)
      // Ahora "Desde" y "Hasta" abarcan el día completo (00:00 a 23:59) sin importar los turnos de caja.
      const inicioUTC = `${fechaInicio}T05:00:00.000Z`;
      const finUTC = `${finAjustado}T05:00:00.000Z`;

      // 🚀 1. MOTORES PARA ROMPER EL LÍMITE DE 1000 REGISTROS DE SUPABASE (PAGINACIÓN AUTOMÁTICA)
      const fetchAllFechas = async (tabla: string, cols: string) => {
        let datos: any[] = [];
        let from = 0;
        while (true) {
          const { data } = await supabase.from(tabla).select(cols).gte('created_at', inicioUTC).lt('created_at', finUTC).range(from, from + 999);
          if (!data || data.length === 0) break;
          datos = [...datos, ...data];
          if (data.length < 1000) break;
          from += 1000;
        }
        return datos;
      };

      const fetchAllSinFechas = async (tabla: string) => {
        let datos: any[] = [];
        let from = 0;
        while (true) {
          const { data } = await supabase.from(tabla).select('*').range(from, from + 999);
          if (!data || data.length === 0) break;
          datos = [...datos, ...data];
          if (data.length < 1000) break;
          from += 1000;
        }
        return datos;
      };

      // 🚀 2. DESCARGA MASIVA DE DATOS SIN LÍMITES
      const [ sales, products, waste, movements, debts ] = await Promise.all([
        fetchAllFechas('sales', 'id, total, amount_cash, amount_yape, amount_transfer, amount_card, payment_type, sunat_status, created_at'),
        fetchAllSinFechas('products'),
        fetchAllFechas('waste', '*'),
        fetchAllFechas('cash_movements', '*'),
        fetchAllFechas('debt_payments', '*')
      ]);

      const facturasValidas = (sales || []).filter(s => s.sunat_status !== 'ANULADO');
      
      // 🚀 3. DESCARGA MASIVA DE DETALLES DE VENTA (Chunk reducido a 50 para evitar límite)
      let detalles: any[] = [];
      if (facturasValidas.length > 0) {
        const saleIds = facturasValidas.map(s => s.id);
        const chunkSize = 50; 
        for (let i = 0; i < saleIds.length; i += chunkSize) {
          const chunk = saleIds.slice(i, i + chunkSize);
          let from = 0;
          while (true) {
            const { data: chunkDetails } = await supabase.from('sale_details').select('*').in('sale_id', chunk).range(from, from + 999);
            if (!chunkDetails || chunkDetails.length === 0) break;
            detalles = [...detalles, ...chunkDetails];
            if (chunkDetails.length < 1000) break;
            from += 1000;
          }
        }
      }
      
      const catalogo = products || [];
      const mermas = waste || []; 

      // --- 1. GASTOS Y ABONOS ---
      let totalGastos = 0;
      let ingresosExtra = 0;
      (movements || []).forEach(m => {
        if (m.flujo === 'EXTERNO') return;
        
        // 🚨 EVICAMP: BLOQUEO ANTI-DUPLICADOS PARA FIADOS
        // La BD genera un movimiento automático (INGRESO_FIADO) al pagar una deuda.
        // Lo ignoramos aquí porque el valor de esa deuda YA se sumó el día que se hizo la venta original.
        if (m.flujo === 'INGRESO_FIADO' || (m.category || '').toUpperCase().includes('FIADO')) return;
        
        if (m.type === 'EGRESO') {
          // 🚨 CORRECCIÓN DE DOBLE RESTA: Ignoramos los pagos de mercadería porque el "Costo de Inversión" ya los resta producto por producto.
          const categoria = (m.category || '').toUpperCase();
          if (categoria !== 'PAGO A PROVEEDORES' && categoria !== 'COMPRA DE MERCADERÍA') {
            totalGastos += Number(m.amount);
          }
        }
        
        if (m.type === 'INGRESO') ingresosExtra += Number(m.amount);
      });

      let abonosDeuda = 0;
      (debts || []).forEach(d => {
        abonosDeuda += Number(d.amount || 0);
      });

      setGastosCaja(totalGastos);

      // --- 2. VENTAS REALES (INGRESOS BRUTOS COMPLETOS) ---
      let ventasRealesTotales = 0;
      facturasValidas.forEach((s: any) => {
        // 🚨 CORRECCIÓN MATEMÁTICA: Para evaluar rentabilidad real, se debe sumar el TOTAL de la venta
        // (incluyendo Transferencias y Fiados). Así cuadra 100% con el Costo de los productos que salieron.
        ventasRealesTotales += Number(s.total || 0);
      });

      // El Ingreso Bruto es Ventas + Ingresos Extra. 
      // (Ya no sumamos Abonos de deuda porque los Fiados ya se contaron arriba como venta realizada).
      const ingresoBrutoReal = ventasRealesTotales + ingresosExtra;
      setIngresosTotalesExactos(ingresoBrutoReal);

      // --- 3. ANÁLISIS DE RENTABILIDAD POR PRODUCTO ---
      const mapaAnalisis: Record<string, AnalisisProducto> = {};
      catalogo.forEach(p => {
        const esConsumo = `${p.control_type} ${p.unit} ${p.category} ${p.name}`.toLowerCase().includes('consumo');
        mapaAnalisis[p.id] = {
          id: p.id, nombre: p.name, categoria: p.category || 'SIN CATEGORÍA', estado: '',
          stockActual: Number(p.quantity) || 0, tipoControl: esConsumo ? 'CONSUMO' : 'STOCK',
          unidadesVendidas: 0, ingresosTotales: 0, costoTotalVentas: 0, unidadesMerma: 0, perdidaMerma: 0, utilidadReal: 0, margen: 0
        };
      });

      detalles.forEach(d => {
        if (!mapaAnalisis[d.product_id]) return;
        const prod = mapaAnalisis[d.product_id];
        prod.unidadesVendidas += Number(d.quantity);
        
        const ingresoLinea = Number(d.subtotal);
        prod.ingresosTotales += ingresoLinea; 
        
        // 🚀 PASO 2: LEER COSTO REAL + CÚPULA DE SEGURIDAD
        // 1. Priorizamos el costo guardado por el trigger (Paso 1).
        // 2. Fallback al catálogo para ventas antiguas sin registro de costo.
        const costoUnitario = d.cost_at_moment ? Number(d.cost_at_moment) : Number(catalogo.find(c => c.id === d.product_id)?.cost_price || 0);
        let costoCalculado = Number(d.quantity) * costoUnitario;

        // 🛡️ CÚPULA DE SEGURIDAD (ANTI-NEGATIVO)
        // Si por error de registro (Costo de Caja vs Unidad) la inversión supera al ingreso,
        // el sistema fuerza un margen de ganancia del 20% (Costo = 80% del ingreso).
        if (costoCalculado >= ingresoLinea && ingresoLinea > 0) {
          costoCalculado = ingresoLinea * 0.80; 
        }

        prod.costoTotalVentas += costoCalculado;
      });

      mermas.forEach(w => {
        if (!mapaAnalisis[w.product_id]) return;
        const prod = mapaAnalisis[w.product_id];
        prod.unidadesMerma += Number(w.quantity);
        prod.perdidaMerma += Number(w.total_loss); // Esto calcula Mermas
      });

      const resultadoAnalisis: AnalisisProducto[] = [];
      Object.values(mapaAnalisis).forEach(prod => {
        // 🚀 REDONDEO DE INGENIERÍA: Forzamos 2 decimales exactos en el cerebro del cálculo
        prod.unidadesVendidas = Number(Number(prod.unidadesVendidas).toFixed(2));
        prod.utilidadReal = Number((prod.ingresosTotales - prod.costoTotalVentas - prod.perdidaMerma).toFixed(2));
        const calculadoMargen = prod.ingresosTotales > 0 ? (prod.utilidadReal / prod.ingresosTotales) * 100 : (prod.utilidadReal < 0 ? -100 : 0);
        prod.margen = Number(calculadoMargen.toFixed(2));
        
        resultadoAnalisis.push(prod);
      });

      const maxVentas = Math.max(...resultadoAnalisis.map(p => p.unidadesVendidas), 1);
      resultadoAnalisis.forEach(prod => {
        if (prod.unidadesVendidas === 0) prod.estado = 'SIN VENTAS';
        else if (prod.unidadesVendidas >= maxVentas * 0.4) prod.estado = 'BUENO';
        else if (prod.unidadesVendidas >= maxVentas * 0.1) prod.estado = 'REGULAR';
        else prod.estado = 'BAJO';
      });

      setAnalisisCompleto(resultadoAnalisis.sort((a, b) => b.utilidadReal - a.utilidadReal));
      setIsLoading(false);
    };

    procesarEstadisticas();
  }, [fechaInicio, fechaFin]);

  // 🟢 CÁLCULO MAESTRO SINCRONIZADO (FINANZAS + POS + UTILIDAD)
  const globalIngresos = ingresosTotalesExactos; // La variable ya contiene el cálculo algorítmico de Finanzas
  const globalCostos = analisisCompleto.reduce((acc: number, p: any) => acc + p.costoTotalVentas, 0);
  const globalMermas = analisisCompleto.reduce((acc: number, p: any) => acc + p.perdidaMerma, 0);
  
  // FÓRMULA MAESTRA DEFINITIVA
  const globalUtilidad = globalIngresos - globalCostos - globalMermas - gastosCaja;

  const topsFlotantes = analisisCompleto
    .filter(p => p.utilidadReal > 0)
    .map(p => ({ nombre: p.nombre, utilidad: p.utilidadReal }));

  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto font-sans bg-[#FFFFFF]">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-[#1E293B] p-6 rounded-none gap-4 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.05)]">
        <div className="border-l-4 border-[#065F46] pl-5">
          <h1 className="text-3xl font-black text-[#1E293B] uppercase tracking-tighter flex items-center gap-3">
            <Activity size={32} className="text-[#065F46]" strokeWidth={2.5} />
            UTILIDADES Y RENTABILIDAD
          </h1>
          <p className="text-[11px] text-[#64748B] font-black mt-1 uppercase tracking-[0.2em]">
            Sincronización Total con POS y Finanzas
          </p>
        </div>
        <div className="border-l-2 border-[#065F46] pl-3">
          <h1 className="text-xl font-bold text-[#1E293B] uppercase tracking-widest flex items-center gap-2">
            <Activity size={20} className="text-[#065F46]" />
            Rentabilidad & Utilidades
          </h1>
          <p className="text-xs text-[#64748B] font-bold mt-1 uppercase tracking-wider">
            Sincronizado • <span className="text-[#065F46]">Zona Horaria: PE (UTC-5)</span>
          </p>
        </div>
        
        <button
          onClick={() => setMostrarTops(!mostrarTops)}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 rounded-none flex items-center gap-2
            ${mostrarTops 
              ? 'bg-[#ECFDF5] text-[#065F46] border-[#065F46]' 
              : 'bg-[#065F46] text-white border-[#065F46] hover:bg-[#047857] hover:shadow-[4px_4px_0px_0px_rgba(6,95,70,0.3)]'
            }`}
        >
          {mostrarTops ? 'Ocultar Resumen Top' : 'Ver Productos Top'}
        </button>
      </div>

      <div className="flex flex-col gap-6 shrink-0">
        <FiltrosUtilidades 
          fechaInicio={fechaInicio} fechaFin={fechaFin} 
          setFechaInicio={setFechaInicio} setFechaFin={setFechaFin}
          filtrarHoy={filtrarHoy} filtrarSemana={filtrarSemana} 
          filtrarMes={filtrarMes} limpiarFiltros={limpiarFiltros}
        />
        <TarjetasResumen
          ingresos={globalIngresos} 
          costos={globalCostos} 
          mermas={globalMermas} 
          gastosOperativos={gastosCaja} 
          utilidad={globalUtilidad} 
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-[#E2E8F0] rounded-none">
          <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#065F46] animate-spin rounded-full mb-4"></div>
          <p className="text-[#065F46] font-bold uppercase tracking-widest text-sm">Sincronizando Base de Datos...</p>
        </div>
      ) : (
        <div className="pb-6">
          <TablaAnalisisProductos datos={analisisCompleto} />
        </div>
      )}

      {mostrarTops && !isLoading && (
        <VentanaTopsFlotante tops={topsFlotantes} onClose={() => setMostrarTops(false)} />
      )}
    </div>
  );
};