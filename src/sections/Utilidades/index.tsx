import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { Activity } from 'lucide-react';

import { FiltrosUtilidades } from './components/FiltrosUtilidades';
import { TarjetasResumen } from './components/TarjetasResumen';
import { TablaAnalisisProductos } from './components/TablaAnalisisProductos';
import { VentanaTopsFlotante } from './components/VentanaTopsFlotante';

import type { AnalisisProducto, StatsFiltro } from './types';

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
  const [statsFiltro, setStatsFiltro] = useState<StatsFiltro>({ ingresos: 0, costos: 0, mermas: 0, hayFiltros: false });

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
    const procesarEstadisticas = async (silencioso = false) => {
      if (!silencioso) setIsLoading(true);


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
      const [ sales, products, waste, movements, debts, batches ] = await Promise.all([
        fetchAllFechas('sales', 'id, total, amount_cash, amount_yape, amount_transfer, amount_card, amount_credit, payment_type, sunat_status, created_at'),
        fetchAllSinFechas('products'),
        fetchAllFechas('waste', '*'),
        fetchAllFechas('cash_movements', '*'),
        fetchAllFechas('debt_payments', '*'),
        fetchAllSinFechas('batches')
      ]);

      // 🚨 CORRECCIÓN: Costo de respaldo por LOTE MÁS RECIENTE (id numérico más alto), no el campo
      // "cost_price" del producto, que no se actualiza al comprar mercadería nueva y queda desactualizado.
      // Esto solo se usa cuando la venta no tiene guardado su propio costo exacto (cost_at_moment).
      const idLoteMasRecientePorProducto: Record<string, number> = {};
      const costoLoteMasReciente: Record<string, number> = {};
      (batches || []).forEach((b: any) => {
        const idLote = Number(b.id || 0);
        if (idLoteMasRecientePorProducto[b.product_id] === undefined || idLote > idLoteMasRecientePorProducto[b.product_id]) {
          idLoteMasRecientePorProducto[b.product_id] = idLote;
          costoLoteMasReciente[b.product_id] = Number(b.cost_unit) || 0;
        }
      });

      const facturasValidas = (sales || []).filter(s => s.sunat_status !== 'ANULADO');
      const salesById = new Map(facturasValidas.map((s: any) => [s.id, s]));

      // 🔄 FIADOS DE OTRO DÍA PAGADOS DENTRO DE ESTE RANGO: si hoy cobras una deuda de una
      // venta de OTRO día, esa venta no está en "facturasValidas" (quedó fuera por fecha) y su
      // producto nunca reflejaría el abono. La traemos aparte SOLO para el análisis por producto
      // (nunca para "ventasRealesTotales" de abajo, porque el dinero pagado AL MOMENTO de esa
      // venta ya se contó en el período en que ocurrió; aquí solo interesa el abono de hoy).
      const ventasParaProductos = [...facturasValidas];
      // Fiados cuyo ticket original fue ANULADO: sus abonos viejos no deben seguir sumando
      // utilidad para siempre (ver uso más abajo, en el cálculo de "abonosDeuda").
      const fiadoIdsAnulados = new Set<number>();
      const fiadoIdsConAbonoEnRango = Array.from(new Set((debts || []).map((d: any) => d.fiado_id).filter(Boolean)));
      if (fiadoIdsConAbonoEnRango.length > 0) {
        const { data: fiadosDeAbonos } = await supabase
          .from('fiados')
          .select('id, sale_id, status')
          .in('id', fiadoIdsConAbonoEnRango);

        (fiadosDeAbonos || []).forEach((f: any) => {
          if (f.status === 'ANULADO') fiadoIdsAnulados.add(f.id);
        });

        const saleIdsFaltantes = Array.from(new Set(
          (fiadosDeAbonos || [])
            .map((f: any) => f.sale_id)
            .filter((sid: any) => sid && !salesById.has(sid))
        ));

        if (saleIdsFaltantes.length > 0) {
          const { data: ventasExtra } = await supabase
            .from('sales')
            .select('id, total, amount_cash, amount_yape, amount_transfer, amount_card, amount_credit, payment_type, sunat_status, created_at')
            .in('id', saleIdsFaltantes);

          (ventasExtra || []).forEach((s: any) => {
            if (s.sunat_status === 'ANULADO') return;
            ventasParaProductos.push(s);
            salesById.set(s.id, s);
          });
        }
      }

      // 🚀 3. DESCARGA MASIVA DE DETALLES DE VENTA (Chunk reducido a 50 para evitar límite)
      let detalles: any[] = [];
      if (ventasParaProductos.length > 0) {
        const saleIds = ventasParaProductos.map(s => s.id);
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

      // 🧾 FIADOS DE LAS VENTAS DEL RANGO: para poder mostrar, por producto, si la venta se pagó
      // o quedó fiada, y cuánto se abonó / cuánto falta. Buscamos por sale_id exacto (no por fecha)
      // para no perder el match si el fiado se registró unos milisegundos fuera de rango.
      const idsConCredito = ventasParaProductos.filter((s: any) => Number(s.amount_credit || 0) > 0).map((s: any) => s.id);
      const fiadosMap: Record<string, any> = {};
      if (idsConCredito.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < idsConCredito.length; i += chunkSize) {
          const chunk = idsConCredito.slice(i, i + chunkSize);
          const { data: fiadosChunk } = await supabase
            .from('fiados')
            .select('sale_id, customer_name, amount, paid_amount')
            .in('sale_id', chunk);
          (fiadosChunk || []).forEach((f: any) => { fiadosMap[f.sale_id] = f; });
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
        // La BD genera un movimiento automático (INGRESO_FIADO) al pagar una deuda, pero ese mismo
        // abono ya se cuenta abajo vía "abonosDeuda" (tabla debt_payments). Lo ignoramos aquí para
        // no sumarlo dos veces.
        if (m.flujo === 'INGRESO_FIADO') return;

        if (m.type === 'EGRESO') {
          // 🚨 CORRECCIÓN DE DOBLE RESTA: Ignoramos los pagos de mercadería/proveedores porque el
          // "Costo de Inversión" ya los resta producto por producto. "cash_movements" no tiene una
          // columna de categoría propia, así que lo detectamos por texto en la descripción (el campo
          // que sí existe y donde se escribe el motivo del movimiento).
          const descripcion = (m.description || '').toUpperCase();
          const esCompraMercaderia = descripcion.includes('PROVEEDOR') || descripcion.includes('MERCADER');
          if (!esCompraMercaderia) {
            totalGastos += Number(m.amount);
          }
        }
        
        if (m.type === 'INGRESO') ingresosExtra += Number(m.amount);
      });

      let abonosDeuda = 0;
      (debts || []).forEach((d: any) => {
        // 🛡️ Si el ticket de esta deuda fue ANULADO después del abono, ese dinero ya se revirtió
        // en caja (ver Reportes -> Anular Ticket) y no debe seguir sumando utilidad para siempre.
        if (fiadoIdsAnulados.has(d.fiado_id)) return;
        abonosDeuda += Number(d.amount || 0);
      });

      setGastosCaja(totalGastos);

      // --- 2. VENTAS REALES (INGRESO DE CAJA, IGUAL QUE POS Y FINANZAS) ---
      // Solo se cuenta el dinero efectivamente cobrado en cada venta (efectivo/yape/tarjeta/transferencia).
      // La parte fiada (amount_credit) NO suma aquí hasta que el cliente la paga.
      let ventasRealesTotales = 0;
      facturasValidas.forEach((s: any) => {
        ventasRealesTotales += Number(s.amount_cash || 0) + Number(s.amount_yape || 0) + Number(s.amount_card || 0) + Number(s.amount_transfer || 0);
      });

      // El Ingreso Bruto es Ventas cobradas + Ingresos Extra + Abonos de fiados pagados en el rango
      // (el abono es el momento exacto en que ese dinero realmente entra a caja).
      const ingresoBrutoReal = ventasRealesTotales + ingresosExtra + abonosDeuda;
      setIngresosTotalesExactos(ingresoBrutoReal);

      // --- 3. ANÁLISIS DE RENTABILIDAD POR PRODUCTO ---
      const mapaAnalisis: Record<string, AnalisisProducto> = {};
      catalogo.forEach(p => {
        const esConsumo = `${p.control_type} ${p.unit} ${p.category} ${p.name}`.toLowerCase().includes('consumo');
        const esPeso = String(p.unit || '').toUpperCase() === 'KG' || p.control_type === 'WEIGHT';
        mapaAnalisis[p.id] = {
          id: p.id, nombre: p.name, categoria: p.category || 'SIN CATEGORÍA', estado: '',
          stockActual: Number(p.quantity) || 0, tipoControl: esConsumo ? 'CONSUMO' : 'STOCK',
          unidadesVendidas: 0, ingresosTotales: 0, costoTotalVentas: 0, unidadesMerma: 0, perdidaMerma: 0, utilidadReal: 0, margen: 0,
          unidadMedida: esConsumo ? 'CONSUMO' : (esPeso ? 'KG' : 'UND'),
          ventasDetalle: []
        };
      });

      detalles.forEach(d => {
        if (!mapaAnalisis[d.product_id]) return;
        const prod = mapaAnalisis[d.product_id];

        const cantidadLinea = Number(d.quantity) || 0;
        const ingresoLinea = Number(d.subtotal) || 0;

        // 🧾 ESTADO DE PAGO DE LA VENTA (igual que Reportes/Resumen/Finanzas): una venta fiada
        // no se marca a nivel de producto, sino a nivel de venta completa (así se guarda el crédito).
        const ventaOrigen: any = salesById.get(d.sale_id);
        const creditoOriginal = Number(ventaOrigen?.amount_credit || 0);
        const esFiado = creditoOriginal > 0;
        const fiado = fiadosMap[d.sale_id];
        // Si el fiado ya no tiene registro (dato huérfano), usamos el crédito original como deuda de respaldo.
        const deudaTotal = fiado ? Number(fiado.amount || 0) : creditoOriginal;
        const restante = esFiado ? Math.max(0, deudaTotal - (fiado ? Number(fiado.paid_amount || 0) : 0)) : 0;
        const abonado = esFiado ? Math.max(0, deudaTotal - restante) : 0;

        // 💰 SOLO LO PAGADO: si la venta no es fiada, la línea entra al 100%. Si es fiada,
        // prorrateamos kilos/unidades, ingreso Y costo por la fracción de ESA venta ya abonada
        // (no hay forma de saber qué producto específico del carrito quedó fiado cuando la
        // venta mezcla pagado + fiado, así que repartimos el abono proporcionalmente).
        const fraccionPagada = esFiado ? (deudaTotal > 0 ? abonado / deudaTotal : 1) : 1;

        // 🚀 PASO 2: LEER COSTO REAL + CÚPULA DE SEGURIDAD
        // 1. Priorizamos el costo guardado por el trigger al momento de la venta.
        // 2. Si no existe (venta sin ese registro), usamos el costo del LOTE MÁS RECIENTE del producto.
        // 3. Como último recurso, el "cost_price" del catálogo (puede estar desactualizado).
        const costoUnitario = d.cost_at_moment
          ? Number(d.cost_at_moment)
          : (costoLoteMasReciente[d.product_id] ?? Number(catalogo.find(c => c.id === d.product_id)?.cost_price || 0));
        let costoLineaTotal = cantidadLinea * costoUnitario;

        // 🛡️ CÚPULA DE SEGURIDAD (ANTI-NEGATIVO)
        // Si por error de registro (Costo de Caja vs Unidad) la inversión supera al ingreso facturado,
        // el sistema fuerza un margen de ganancia del 20% (Costo = 80% del ingreso). Se compara contra
        // el ingreso FACTURADO (no el cobrado) porque es la relación real costo-vs-precio de venta.
        if (costoLineaTotal >= ingresoLinea && ingresoLinea > 0) {
          costoLineaTotal = ingresoLinea * 0.80;
        }

        prod.unidadesVendidas += cantidadLinea * fraccionPagada;
        prod.ingresosTotales += ingresoLinea * fraccionPagada;
        prod.costoTotalVentas += costoLineaTotal * fraccionPagada;

        // 🧾 DETALLE POR VENTA: para el modal "Ver ventas" del producto. Aquí sí mostramos la
        // cantidad y el monto COMPLETOS del ticket (no prorrateados), junto con su estado de pago.
        prod.ventasDetalle!.push({
          saleId: String(d.sale_id),
          fecha: ventaOrigen?.created_at || '',
          cantidad: cantidadLinea,
          monto: ingresoLinea,
          esFiado,
          clienteNombre: fiado?.customer_name || null,
          montoAbonado: esFiado ? abonado : undefined,
          montoRestante: esFiado ? restante : undefined,
          fiadoCompleto: esFiado ? restante <= 0.009 : undefined
        });
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
        prod.ventasDetalle?.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
      if (!silencioso) setIsLoading(false);
    };

    procesarEstadisticas();

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
  }, [fechaInicio, fechaFin]);

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
          filtrarHoy={filtrarHoy} filtrarSemana={filtrarSemana}
          filtrarMes={filtrarMes}
        />
        <TarjetasResumen
          ingresos={globalIngresos}
          costos={globalCostos}
          mermas={globalMermas}
          gastosOperativos={gastosCaja}
          utilidad={globalUtilidad}
          filtrado={statsFiltro.hayFiltros}
        />
      </div>

      {/* La tabla permanece siempre montada (aunque esté cargando) para no perder
          la categoría, rotación, búsqueda y página que el usuario ya eligió. */}
      <div className="relative pb-6">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center py-20 bg-white/85 backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#065F46] animate-spin rounded-full mb-4"></div>
            <p className="text-[#065F46] font-bold uppercase tracking-widest text-sm">Sincronizando Base de Datos...</p>
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

      {mostrarTops && !isLoading && (
        <VentanaTopsFlotante tops={topsFlotantes} onClose={() => setMostrarTops(false)} />
      )}
    </div>
  );
};