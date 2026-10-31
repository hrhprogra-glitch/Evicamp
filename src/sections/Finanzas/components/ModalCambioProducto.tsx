import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftRight, X, Search, Check, AlertTriangle, 
  Receipt, Package, Printer, ChevronRight, CornerDownLeft, ShieldCheck 
} from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import type { CambioProducto } from '../types';
import type { Product } from '../../Inventario/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSaleId?: number | string | null;
  sessionId?: string | null;
  onCambioGuardado?: () => void;
}

interface ItemDetalleVenta {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price_at_moment: number;
  numero_serie?: string | null;
  garantia_hasta?: string | null;
  subtotal: number;
}

export const ModalCambioProducto: React.FC<Props> = ({
  isOpen,
  onClose,
  initialSaleId = null,
  sessionId = null,
  onCambioGuardado
}) => {
  // Búsqueda y carga de ticket
  const [cargandoTicket, setCargandoTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Datos del ticket cargado
  const [ticketData, setTicketData] = useState<{
    id: number;
    customer_name: string | null;
    created_at: string;
    detalles: ItemDetalleVenta[];
  } | null>(null);

  // Producto a devolver (del ticket)
  const [selectedDetalleIndex, setSelectedDetalleIndex] = useState<number>(-1);
  const [cantidadDevolver, setCantidadDevolver] = useState<string>('1');
  const [serieDevuelta, setSerieDevuelta] = useState<string>('');

  // Producto nuevo que se lleva
  const [busquedaCatalogo, setBusquedaCatalogo] = useState<string>('');
  const [catalogoResultados, setCatalogoResultados] = useState<Product[]>([]);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number>(0);
  const [buscandoCatalogo, setBuscandoCatalogo] = useState<boolean>(false);
  const [productoNuevo, setProductoNuevo] = useState<Product | null>(null);
  const [cantidadNueva, setCantidadNueva] = useState<string>('1');
  const [serieNueva, setSerieNueva] = useState<string>('');

  // Metadatos del cambio y Pago Mixto de la diferencia
  const [motivo, setMotivo] = useState<string>('');
  const [pagoEf, setPagoEf] = useState<string>('');
  const [pagoYap, setPagoYap] = useState<string>('');
  const [pagoTar, setPagoTar] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [cambioFinalizado, setCambioFinalizado] = useState<CambioProducto | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Cargar ticket al abrir si hay initialSaleId
  useEffect(() => {
    if (isOpen) {
      setCambioFinalizado(null);
      setTicketError(null);
      setSelectedDetalleIndex(-1);
      setProductoNuevo(null);
      setMotivo('');
      setSerieDevuelta('');
      setSerieNueva('');
      setCantidadDevolver('1');
      setCantidadNueva('1');
      setIndiceSeleccionado(0);
      setPagoEf('');
      setPagoYap('');
      setPagoTar('');

      if (initialSaleId) {
        void cargarTicket(String(initialSaleId));
      } else {
        setTicketData(null);
      }
    }
  }, [isOpen, initialSaleId]);

  // Cierre con Escape compatible con pila de modales
  useCerrarConEscape(isOpen, onClose);

  // Focus trap y navegación por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        return;
      }

      if (e.key === 'Tab') {
        e.stopPropagation();
        const modal = document.getElementById('modal-cambio-producto');
        if (!modal) return;
        const focusables = Array.from(modal.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), select:not([disabled]), [role="option"], [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null && !el.classList.contains('hidden'));

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && (document.activeElement === first || !focusables.includes(document.activeElement as HTMLElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !focusables.includes(document.activeElement as HTMLElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen]);

  const seleccionarProducto = (prod: Product) => {
    setProductoNuevo(prod);
    setBusquedaCatalogo('');
    setCatalogoResultados([]);
    setIndiceSeleccionado(0);
    setCantidadNueva('1');
    setTimeout(() => {
      const cantInput = document.getElementById('input-cantidad-nueva') as HTMLInputElement | null;
      cantInput?.focus();
      cantInput?.select();
    }, 60);
  };

  // Búsqueda en catálogo de productos con debounce
  useEffect(() => {
    if (!busquedaCatalogo.trim()) {
      setCatalogoResultados([]);
      setIndiceSeleccionado(0);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoCatalogo(true);
      try {
        const q = busquedaCatalogo.trim();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', 1)
          .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,code.ilike.%${q}%`)
          .limit(8);

        if (!error && data) {
          setCatalogoResultados(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price || 0),
            cost: Number(p.cost_price || 0),
            quantity: Number(p.quantity || 0),
            minStock: Number(p.min_stock || 0),
            code: p.code,
            barcode: p.barcode,
            category: p.category,
            unit: p.unit,
            controlaSeries: Boolean(p.controla_series),
            mesesGarantia: Number(p.meses_garantia || 0)
          })));
          setIndiceSeleccionado(0);
        }
      } catch (err) {
        console.error('Error buscando catálogo:', err);
      } finally {
        setBuscandoCatalogo(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busquedaCatalogo]);

  // Auto-scroll del selector de catálogo
  useEffect(() => {
    if (catalogoResultados.length > 0) {
      const el = document.getElementById(`catalogo-item-${indiceSeleccionado}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [indiceSeleccionado, catalogoResultados.length]);

  const cargarTicket = async (idInput: string) => {
    const rawDigits = idInput.replace(/[^0-9]/g, '');
    if (!rawDigits) return;

    setCargandoTicket(true);
    setTicketError(null);
    setTicketData(null);
    setSelectedDetalleIndex(-1);

    try {
      let venta: { id: number | string; customer_name?: string | null; created_at: string; sunat_status?: string | null } | null = null;
      const numInput = Number(rawDigits);

      // 1. Si tiene 10 o más dígitos, intentar primero búsqueda exacta por ID
      if (rawDigits.length >= 10 && !isNaN(numInput)) {
        const { data: vExact, error: errExact } = await supabase
          .from('sales')
          .select('id, customer_name, created_at, sunat_status')
          .eq('id', numInput)
          .maybeSingle();

        if (errExact) throw errExact;
        if (vExact) venta = vExact;
      }

      // 2. Si no se encontró por ID exacto, buscar en las ventas recientes (para los 6 dígitos del ticket impreso ej: 623154)
      if (!venta) {
        const { data: ultimasVentas, error: errUltimas } = await supabase
          .from('sales')
          .select('id, customer_name, created_at, sunat_status')
          .order('id', { ascending: false })
          .limit(300);

        if (errUltimas) throw errUltimas;

        if (ultimasVentas && ultimasVentas.length > 0) {
          venta = ultimasVentas.find((s: any) => {
            const sid = String(s.id);
            const ultimos6 = sid.slice(-6);
            return (
              sid === rawDigits ||
              ultimos6 === rawDigits ||
              ultimos6 === rawDigits.padStart(6, '0') ||
              sid.endsWith(rawDigits)
            );
          }) || null;
        }
      }

      // 3. Fallback directo por si es un ID bajo antiguo
      if (!venta && !isNaN(numInput)) {
        const { data: vFallback } = await supabase
          .from('sales')
          .select('id, customer_name, created_at, sunat_status')
          .eq('id', numInput)
          .maybeSingle();
        if (vFallback) venta = vFallback;
      }

      if (!venta) {
        setTicketError(`No se encontró el ticket #${rawDigits}. Verifica el número en tu comprobante o en la tabla de Finanzas.`);
        return;
      }

      if (venta.sunat_status === 'ANULADO') {
        setTicketError(`El ticket #${String(venta.id).slice(-6)} está ANULADO. No se pueden realizar cambios sobre ventas anuladas.`);
        return;
      }

      // 4. Obtener detalles de productos vendidos usando el ID real de la venta
      const { data: detalles, error: errDetalles } = await supabase
        .from('sale_details')
        .select('*')
        .eq('sale_id', venta.id)
        .order('id', { ascending: true });

      if (errDetalles) throw errDetalles;

      if (!detalles || detalles.length === 0) {
        setTicketError(`El ticket #${String(venta.id).slice(-6)} no tiene productos registrados.`);
        return;
      }

      setTicketData({
        id: Number(venta.id),
        customer_name: venta.customer_name || 'CLIENTE',
        created_at: venta.created_at,
        detalles: detalles.map((d: any) => ({
          id: d.id,
          product_id: d.product_id,
          product_name: d.product_name,
          quantity: Number(d.quantity || 1),
          price_at_moment: Number(d.price_at_moment || 0),
          numero_serie: d.numero_serie || null,
          garantia_hasta: d.garantia_hasta || null,
          subtotal: Number(d.subtotal || 0)
        }))
      });

      // Seleccionar primer producto por defecto si hay uno solo y enfocar catálogo
      if (detalles.length === 1) {
        setSelectedDetalleIndex(0);
        setCantidadDevolver('1');
        setSerieDevuelta(detalles[0].numero_serie || '');
        setTimeout(() => document.getElementById('input-buscar-nuevo')?.focus(), 100);
      } else {
        setTimeout(() => document.getElementById('select-producto-devuelto')?.focus(), 100);
      }
    } catch (err: any) {
      console.error('Error al cargar ticket:', err);
      setTicketError(err.message || 'Error al consultar ticket');
    } finally {
      setCargandoTicket(false);
    }
  };

  const itemDevuelto = ticketData && selectedDetalleIndex >= 0 ? ticketData.detalles[selectedDetalleIndex] : null;

  // Cantidades numéricas seguras
  const cantDevolverNum = itemDevuelto
    ? Math.min(itemDevuelto.quantity, Math.max(1, Number(cantidadDevolver) || 1))
    : Math.max(1, Number(cantidadDevolver) || 1);
  const cantNuevaNum = Math.max(1, Number(cantidadNueva) || 1);

  // Cálculos financieros
  const totalDevuelto = itemDevuelto ? Math.round(itemDevuelto.price_at_moment * cantDevolverNum * 100) / 100 : 0;
  const totalNuevo = productoNuevo ? Math.round(productoNuevo.price * cantNuevaNum * 100) / 100 : 0;
  const diferencia = Math.round((totalNuevo - totalDevuelto) * 100) / 100;

  // Montos ingresados en pago mixto
  const numEf = Math.round((Number(pagoEf) || 0) * 100) / 100;
  const numYap = Math.round((Number(pagoYap) || 0) * 100) / 100;
  const numTar = Math.round((Number(pagoTar) || 0) * 100) / 100;
  const totalCubierto = Math.round((numEf + numYap + numTar) * 100) / 100;
  const faltaCubrir = Math.round(Math.max(0, diferencia - totalCubierto) * 100) / 100;
  const sobrante = Math.round(Math.max(0, totalCubierto - diferencia) * 100) / 100;
  const pagoValido = diferencia <= 0 || (totalCubierto > 0 && Math.abs(diferencia - totalCubierto) < 0.01);
  const puedeConfirmar = Boolean(ticketData && itemDevuelto && productoNuevo && !guardando && (diferencia <= 0 || pagoValido));

  const partesMetodo: string[] = [];
  if (numEf > 0) partesMetodo.push(`Efectivo: S/ ${numEf.toFixed(2)}`);
  if (numYap > 0) partesMetodo.push(`Yape: S/ ${numYap.toFixed(2)}`);
  if (numTar > 0) partesMetodo.push(`Tarjeta: S/ ${numTar.toFixed(2)}`);

  const pagoExacto = (metodo: 'EFECTIVO' | 'YAPE' | 'TARJETA') => {
    if (diferencia <= 0) return;
    const difStr = diferencia.toFixed(2);
    if (metodo === 'EFECTIVO') {
      setPagoEf(difStr);
      setPagoYap('');
      setPagoTar('');
      setTimeout(() => document.getElementById('pago-cambio-efectivo')?.focus(), 30);
    } else if (metodo === 'YAPE') {
      setPagoEf('');
      setPagoYap(difStr);
      setPagoTar('');
      setTimeout(() => document.getElementById('pago-cambio-yape')?.focus(), 30);
    } else if (metodo === 'TARJETA') {
      setPagoEf('');
      setPagoYap('');
      setPagoTar(difStr);
      setTimeout(() => document.getElementById('pago-cambio-tarjeta')?.focus(), 30);
    }
  };

  // Sincronizar pago por defecto (Efectivo) cuando cambia la diferencia a favor de la tienda
  useEffect(() => {
    if (diferencia > 0) {
      setPagoEf(diferencia.toFixed(2));
      setPagoYap('');
      setPagoTar('');
    } else {
      setPagoEf('');
      setPagoYap('');
      setPagoTar('');
    }
  }, [diferencia]);

  const handleConfirmarCambio = async () => {
    if (!ticketData || !itemDevuelto || !productoNuevo || !puedeConfirmar) return;
    setGuardando(true);

    try {
      // Determinar método de pago para el registro del cambio
      let metodoFinal: string | null = null;
      if (diferencia > 0) {
        if (partesMetodo.length === 1) {
          if (numEf > 0) metodoFinal = 'EFECTIVO';
          else if (numYap > 0) metodoFinal = 'YAPE';
          else if (numTar > 0) metodoFinal = 'TARJETA';
        } else if (partesMetodo.length > 1) {
          metodoFinal = `MIXTO (${partesMetodo.join(', ')})`;
        } else {
          metodoFinal = 'EFECTIVO';
        }
      } else if (diferencia < 0) {
        metodoFinal = 'EFECTIVO';
      }

      // 1. Registrar en cambios_productos
      const nuevoCambio: Partial<CambioProducto> = {
        id: Date.now(),
        sale_id: Number(ticketData.id),
        session_id: sessionId || null,
        usuario: 'Caja',
        customer_name: ticketData.customer_name,
        producto_devuelto_id: itemDevuelto.product_id,
        producto_devuelto_nombre: itemDevuelto.product_name,
        cantidad_devuelta: cantDevolverNum,
        precio_devuelto: itemDevuelto.price_at_moment,
        serie_devuelta: serieDevuelta.trim() || null,
        producto_nuevo_id: Number(productoNuevo.id),
        producto_nuevo_nombre: productoNuevo.name,
        cantidad_nueva: cantNuevaNum,
        precio_nuevo: productoNuevo.price,
        serie_nueva: serieNueva.trim() || null,
        diferencia: diferencia,
        payment_type: metodoFinal,
        motivo: motivo.trim() || 'CAMBIO DE PRODUCTO'
      };

      const { data: cambioInsertado, error: errCambio } = await supabase
        .from('cambios_productos')
        .insert([nuevoCambio])
        .select()
        .single();

      if (errCambio) throw errCambio;

      // 2. Ajuste de stock en inventory_movements y actualización directa en products
      // + Stock del producto devuelto
      await supabase.from('inventory_movements').insert([{
        product_id: itemDevuelto.product_id,
        product_name: itemDevuelto.product_name,
        change_amount: cantDevolverNum,
        operation_type: 'DEVOLUCION',
        reason: 'CAMBIO_PRODUCTO',
        notes: `Ingreso por cambio de producto (Ticket #${String(ticketData.id).slice(-6)})${serieDevuelta ? ` · Serie: ${serieDevuelta}` : ''}`,
        user: 'Caja',
        is_synced: 1
      }]);

      if (itemDevuelto.product_id) {
        const { data: pDev } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', itemDevuelto.product_id)
          .maybeSingle();
        if (pDev) {
          await supabase
            .from('products')
            .update({ quantity: Number(pDev.quantity || 0) + cantDevolverNum })
            .eq('id', itemDevuelto.product_id);
        }
      }

      // - Stock del producto nuevo que se entrega
      await supabase.from('inventory_movements').insert([{
        product_id: Number(productoNuevo.id),
        product_name: productoNuevo.name,
        change_amount: -cantNuevaNum,
        operation_type: 'VENTA',
        reason: 'CAMBIO_PRODUCTO',
        notes: `Salida por cambio de producto (Ticket #${String(ticketData.id).slice(-6)})${serieNueva ? ` · Serie: ${serieNueva}` : ''}`,
        user: 'Caja',
        is_synced: 1
      }]);

      if (productoNuevo.id) {
        const { data: pNue } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', Number(productoNuevo.id))
          .maybeSingle();
        if (pNue) {
          await supabase
            .from('products')
            .update({ quantity: Number(pNue.quantity || 0) - cantNuevaNum })
            .eq('id', Number(productoNuevo.id));
        }
      }

      // 3. Actualizar directamente el ticket con el producto nuevo
      if (cantDevolverNum >= itemDevuelto.quantity) {
        // Se reemplaza la línea del producto devuelto por el producto nuevo
        await supabase
          .from('sale_details')
          .update({
            product_id: Number(productoNuevo.id),
            product_name: productoNuevo.name,
            quantity: cantNuevaNum,
            price_at_moment: productoNuevo.price,
            subtotal: Math.round(productoNuevo.price * cantNuevaNum * 100) / 100,
            numero_serie: serieNueva.trim() || null
          })
          .eq('id', itemDevuelto.id);
      } else {
        // Si devolvió solo parte de la cantidad (ej. 1 de 2), se resta de la original y se agrega la nueva
        const restoCant = itemDevuelto.quantity - cantDevolverNum;
        await supabase
          .from('sale_details')
          .update({
            quantity: restoCant,
            subtotal: Math.round(itemDevuelto.price_at_moment * restoCant * 100) / 100
          })
          .eq('id', itemDevuelto.id);

        await supabase
          .from('sale_details')
          .insert([{
            sale_id: Number(ticketData.id),
            product_id: Number(productoNuevo.id),
            product_name: productoNuevo.name,
            quantity: cantNuevaNum,
            price_at_moment: productoNuevo.price,
            subtotal: Math.round(productoNuevo.price * cantNuevaNum * 100) / 100,
            numero_serie: serieNueva.trim() || null,
            is_synced: 1
          }]);
      }

      // 4. Actualizar total y métodos de pago del ticket en sales
      const { data: vActual } = await supabase
        .from('sales')
        .select('*')
        .eq('id', ticketData.id)
        .maybeSingle();

      if (vActual) {
        const nuevoTotal = Math.max(0, Math.round((Number(vActual.total || 0) + diferencia) * 100) / 100);

        let nuevoCash = Number(vActual.amount_cash || 0);
        let nuevoYape = Number(vActual.amount_yape || 0);
        let nuevoCard = Number(vActual.amount_card || 0);

        if (diferencia > 0) {
          nuevoCash = Math.round((nuevoCash + numEf) * 100) / 100;
          nuevoYape = Math.round((nuevoYape + numYap) * 100) / 100;
          nuevoCard = Math.round((nuevoCard + numTar) * 100) / 100;
        } else if (diferencia < 0) {
          nuevoCash = Math.max(0, Math.round((nuevoCash - Math.abs(diferencia)) * 100) / 100);
        }

        const metodos = [
          nuevoCash > 0 ? 'EFECTIVO' : null,
          nuevoYape > 0 ? 'YAPE' : null,
          nuevoCard > 0 ? 'TARJETA' : null,
          Number(vActual.amount_credit || 0) > 0 ? 'FIADO' : null
        ].filter(Boolean);

        const tipoFinal = metodos.length === 1 ? metodos[0] : (metodos.length > 1 ? 'MIXTO' : 'EFECTIVO');

        await supabase
          .from('sales')
          .update({
            total: nuevoTotal,
            amount_cash: nuevoCash,
            amount_yape: nuevoYape,
            amount_card: nuevoCard,
            payment_type: tipoFinal
          })
          .eq('id', ticketData.id);
      }

      // 5. Limpiar cualquier movimiento previo de diferencia para este ticket, manteniendo la tabla 100% limpia
      await supabase
        .from('cash_movements')
        .delete()
        .ilike('description', `%${String(ticketData.id).slice(-6)}%`);

      setCambioFinalizado(cambioInsertado as CambioProducto);
      onCambioGuardado?.();
    } catch (err: any) {
      console.error('Error al guardar cambio:', err);
      alert('❌ Error al procesar cambio de producto: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const imprimirVale = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      id="modal-cambio-producto"
      aria-labelledby="modal-cambio-title"
    >
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-2xl flex flex-col font-mono max-h-[92vh]">
        {/* CABECERA */}
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 border border-blue-600 flex items-center justify-center text-blue-800">
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 id="modal-cambio-title" className="text-[var(--color-ink)] font-black text-sm sm:text-base uppercase tracking-wider">
                Cambio de Producto
              </h2>
              <p className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-widest">
                Reemplazo de mercadería, ajuste de inventario y cuadre de caja
              </p>
            </div>
          </div>

          <button 
            id="btn-cerrar-modal-cambio"
            onClick={onClose} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (document.getElementById('input-buscar-nuevo')) {
                  document.getElementById('input-buscar-nuevo')?.focus();
                } else if (document.getElementById('select-producto-devuelto')) {
                  document.getElementById('select-producto-devuelto')?.focus();
                }
              }
            }}
            title="Cerrar ventana (Esc)"
            className="p-1.5 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTENEDOR CON SCROLL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4 bg-[var(--color-bg)]">
          {/* SI EL CAMBIO YA SE COMPLETÓ, MOSTRAR VALE DE IMPRESIÓN */}
          {cambioFinalizado ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 flex items-center gap-3">
                <Check size={28} className="text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-black text-sm uppercase">¡Cambio realizado con éxito!</h3>
                  <p className="text-xs">
                    El stock se ha actualizado y la diferencia financiera se registró en la caja.
                  </p>
                </div>
              </div>

              {/* VALE DE CAMBIO IMPRIMIBLE */}
              <div 
                ref={printAreaRef}
                className="bg-white border-2 border-black p-4 text-xs font-mono max-w-md mx-auto shadow-md"
              >
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h4 className="font-black text-sm uppercase">VALE DE CAMBIO DE PRODUCTO</h4>
                  <p className="text-[10px]">TICKET ORIGINAL: #{String(cambioFinalizado.sale_id).slice(-6)}</p>
                  <p className="text-[10px]">FECHA: {new Date(cambioFinalizado.fecha || cambioFinalizado.created_at || Date.now()).toLocaleString('es-PE')}</p>
                  <p className="text-[10px]">CLIENTE: {cambioFinalizado.customer_name || 'CLIENTE'}</p>
                </div>

                <div className="space-y-2 border-b-2 border-black pb-2 mb-2">
                  <div className="p-1.5 bg-red-50 border border-red-200">
                    <span className="text-[10px] font-black text-red-800 uppercase block">PRODUCTO DEVUELTO (-)</span>
                    <p className="font-bold uppercase">{cambioFinalizado.cantidad_devuelta} × {cambioFinalizado.producto_devuelto_nombre}</p>
                    <p className="text-[11px]">Valor: S/ {(cambioFinalizado.precio_devuelto * cambioFinalizado.cantidad_devuelta).toFixed(2)}</p>
                    {cambioFinalizado.serie_devuelta && <p className="text-[10px] font-mono">Serie/IMEI: {cambioFinalizado.serie_devuelta}</p>}
                  </div>

                  <div className="p-1.5 bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-black text-emerald-800 uppercase block">PRODUCTO NUEVO ENTREGADO (+)</span>
                    <p className="font-bold uppercase">{cambioFinalizado.cantidad_nueva} × {cambioFinalizado.producto_nuevo_nombre}</p>
                    <p className="text-[11px]">Valor: S/ {(cambioFinalizado.precio_nuevo * cambioFinalizado.cantidad_nueva).toFixed(2)}</p>
                    {cambioFinalizado.serie_nueva && <p className="text-[10px] font-mono">Serie/IMEI: {cambioFinalizado.serie_nueva}</p>}
                  </div>
                </div>

                <div className="font-black text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>DIFERENCIA:</span>
                    <span>
                      {cambioFinalizado.diferencia > 0 
                        ? `CLIENTE PAGÓ: S/ ${cambioFinalizado.diferencia.toFixed(2)} (${cambioFinalizado.payment_type})`
                        : cambioFinalizado.diferencia < 0
                          ? `TIENDA DEVOLVIÓ: S/ ${Math.abs(cambioFinalizado.diferencia).toFixed(2)} (EFECTIVO)`
                          : 'S/ 0.00 (CAMBIO EXACTO)'}
                    </span>
                  </div>
                  {cambioFinalizado.motivo && (
                    <p className="text-[10px] font-normal text-gray-600 mt-1">Motivo: {cambioFinalizado.motivo}</p>
                  )}
                </div>

                <div className="text-center border-t border-dashed border-gray-400 mt-3 pt-2 text-[10px] text-gray-500">
                  *** SIUMAX COMERC · COMPROBANTE OFICIAL ***
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={imprimirVale}
                  className="bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_0_var(--color-ink)]"
                >
                  <Printer size={15} /> Imprimir Comprobante
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white text-[var(--color-ink)] font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] cursor-pointer shadow-[2px_2px_0_0_var(--color-ink)]"
                >
                  Cerrar [ESC]
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* INFORMACIÓN DEL TICKET ORIGINAL */}
              <div className="border-2 border-[var(--color-ink)] bg-white p-3 shadow-[3px_3px_0_0_var(--color-ink)]">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-[var(--color-ink)]" />
                    <div>
                      <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">Ticket Original</span>
                      <h3 className="text-sm font-black uppercase text-[var(--color-ink)]">
                        Ticket #{ticketData ? String(ticketData.id).slice(-6) : (initialSaleId ? String(initialSaleId).slice(-6) : '---')}
                      </h3>
                    </div>
                  </div>

                  {ticketData && (
                    <div className="text-[11px] text-[var(--color-muted)] flex flex-wrap gap-3">
                      <span><b>Cliente:</b> <span className="text-[var(--color-ink)] uppercase font-bold">{ticketData.customer_name || 'CLIENTE GENERAL'}</span></span>
                      <span><b>Fecha:</b> {new Date(ticketData.created_at).toLocaleDateString('es-PE')}</span>
                      <span><b>Líneas vendidas:</b> {ticketData.detalles.length}</span>
                    </div>
                  )}

                  {cargandoTicket && (
                    <span className="text-xs font-bold text-blue-600 animate-pulse">
                      ⏳ Cargando datos del ticket...
                    </span>
                  )}
                </div>

                {ticketError && (
                  <p className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 border border-red-200">
                    ❌ {ticketError}
                  </p>
                )}
              </div>

              {/* PASO 1: PRODUCTO A DEVOLVER (DEL TICKET) */}
              {ticketData && (
                <div className="border-2 border-[var(--color-ink)] bg-white p-3 shadow-[3px_3px_0_0_var(--color-ink)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                    <span className="text-xs font-black uppercase text-red-700">Producto que el Cliente Devuelve (-)</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[var(--color-muted)] block">
                      Seleccionar producto del ticket:
                    </label>
                    <select
                      id="select-producto-devuelto"
                      value={selectedDetalleIndex}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSelectedDetalleIndex(idx);
                        if (idx >= 0) {
                          const item = ticketData.detalles[idx];
                          setCantidadDevolver('1');
                          setSerieDevuelta(item.numero_serie || '');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          try {
                            (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.();
                          } catch {}
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (itemDevuelto) {
                            document.getElementById('input-cantidad-devolver')?.focus();
                          } else {
                            document.getElementById('input-buscar-nuevo')?.focus();
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          document.getElementById('btn-cerrar-modal-cambio')?.focus();
                        }
                      }}
                      className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] text-xs font-bold p-2 focus:bg-white uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                    >
                      <option value={-1}>-- Seleccione el producto a devolver --</option>
                      {ticketData.detalles.map((item, idx) => (
                        <option key={item.id} value={idx}>
                          {item.product_name} (Cant. comprada: {item.quantity} · S/ {item.price_at_moment.toFixed(2)} c/u)
                        </option>
                      ))}
                    </select>

                    {itemDevuelto && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-red-50/50 p-2 border border-red-200">
                        <div>
                          <label className="text-[10px] font-black uppercase text-red-900 block mb-1">
                            Cantidad a devolver:
                            {itemDevuelto && (
                              <span className="ml-1 text-[9px] font-normal text-red-700 lowercase">
                                (máx. comprada: {itemDevuelto.quantity})
                              </span>
                            )}
                          </label>
                          <input
                            id="input-cantidad-devolver"
                            type="text"
                            inputMode="numeric"
                            value={cantidadDevolver}
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              setCantidadDevolver(raw);
                            }}
                            onBlur={() => {
                              if (!cantidadDevolver || Number(cantidadDevolver) < 1) {
                                setCantidadDevolver('1');
                              } else if (itemDevuelto && Number(cantidadDevolver) > itemDevuelto.quantity) {
                                setCantidadDevolver(String(itemDevuelto.quantity));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('input-serie-devuelta')?.focus();
                              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                e.preventDefault();
                                document.getElementById('select-producto-devuelto')?.focus();
                              }
                            }}
                            className="w-full bg-white border border-red-300 text-xs font-black p-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-red-900 block mb-1">
                            Nº Serie / IMEI devuelto (si aplica):
                          </label>
                          <input
                            id="input-serie-devuelta"
                            type="text"
                            placeholder="Ej. SN-981247"
                            value={serieDevuelta}
                            onChange={(e) => setSerieDevuelta(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                document.getElementById('input-cantidad-devolver')?.focus();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                document.getElementById('select-producto-devuelto')?.focus();
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('input-buscar-nuevo')?.focus();
                              }
                            }}
                            className="w-full bg-white border border-red-300 text-xs font-mono p-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
                          />
                        </div>

                        <div className="sm:col-span-2 flex justify-between items-center pt-1 border-t border-red-200 text-xs font-black text-red-950">
                          <span>Monto a favor del cliente:</span>
                          <span className="text-sm">S/ {totalDevuelto.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 2: PRODUCTO NUEVO QUE SE LLEVA (CATÁLOGO) */}
              {itemDevuelto && (
                <div className="border-2 border-[var(--color-ink)] bg-white p-3 shadow-[3px_3px_0_0_var(--color-ink)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                    <span className="text-xs font-black uppercase text-emerald-800">Producto Nuevo que el Cliente se Lleva (+)</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[var(--color-muted)] block">
                      Buscar en catálogo de productos:
                    </label>
                    <div className="relative">
                      <input
                        id="input-buscar-nuevo"
                        type="text"
                        placeholder="Buscar por nombre, código de barras o SKU..."
                        value={busquedaCatalogo}
                        onChange={(e) => {
                          setBusquedaCatalogo(e.target.value);
                          setIndiceSeleccionado(0);
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (catalogoResultados.length > 0) {
                              setIndiceSeleccionado((prev) => {
                                const next = Math.min(catalogoResultados.length - 1, prev + 1);
                                document.getElementById(`catalogo-item-${next}`)?.scrollIntoView({ block: 'nearest' });
                                return next;
                              });
                            } else if (productoNuevo) {
                              document.getElementById('btn-cambiar-nuevo')?.focus();
                            } else {
                              document.getElementById('btn-cancelar-cambio')?.focus();
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (catalogoResultados.length > 0 && indiceSeleccionado > 0) {
                              setIndiceSeleccionado((prev) => {
                                const next = Math.max(0, prev - 1);
                                document.getElementById(`catalogo-item-${next}`)?.scrollIntoView({ block: 'nearest' });
                                return next;
                              });
                            } else if (document.getElementById('input-serie-devuelta')) {
                              document.getElementById('input-serie-devuelta')?.focus();
                            } else if (document.getElementById('input-cantidad-devolver')) {
                              document.getElementById('input-cantidad-devolver')?.focus();
                            } else {
                              document.getElementById('select-producto-devuelto')?.focus();
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            // 1. Si ya hay resultados visibles, seleccionar el producto seleccionado actualmente
                            if (catalogoResultados.length > 0) {
                              const prod = catalogoResultados[indiceSeleccionado] || catalogoResultados[0];
                              if (prod) {
                                seleccionarProducto(prod);
                              }
                              return;
                            }

                            // 2. Si el usuario escribió o escaneó un código y presionó Enter de inmediato (antes del debounce)
                            if (busquedaCatalogo.trim()) {
                              setBuscandoCatalogo(true);
                              try {
                                const q = busquedaCatalogo.trim();
                                const { data, error } = await supabase
                                  .from('products')
                                  .select('*')
                                  .eq('is_active', 1)
                                  .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,code.ilike.%${q}%`)
                                  .limit(8);

                                if (!error && data && data.length > 0) {
                                  const mapeado: Product = {
                                    id: data[0].id,
                                    name: data[0].name,
                                    price: Number(data[0].price || 0),
                                    cost: Number(data[0].cost_price || 0),
                                    quantity: Number(data[0].quantity || 0),
                                    minStock: Number(data[0].min_stock || 0),
                                    code: data[0].code,
                                    barcode: data[0].barcode,
                                    category: data[0].category,
                                    unit: data[0].unit,
                                    controlaSeries: Boolean(data[0].controla_series),
                                    mesesGarantia: Number(data[0].meses_garantia || 0)
                                  };
                                  seleccionarProducto(mapeado);
                                }
                              } catch (err) {
                                console.error('Error buscando catálogo al presionar Enter:', err);
                              } finally {
                                setBuscandoCatalogo(false);
                              }
                            }
                          } else if (e.key === 'Escape') {
                            if (catalogoResultados.length > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              setCatalogoResultados([]);
                            }
                          }
                        }}
                        className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] text-xs font-bold p-2 pl-8 focus:bg-white uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                      />
                      <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--color-muted)]" />
                    </div>

                    {/* LISTA DE COINCIDENCIAS (SELECTOR DE GRILLA / LISTA) */}
                    {catalogoResultados.length > 0 && !productoNuevo && (
                      <div 
                        id="lista-resultados-catalogo"
                        role="listbox"
                        aria-label="Resultados de búsqueda"
                        className="border-2 border-[var(--color-ink)] max-h-56 overflow-y-auto bg-white divide-y-2 divide-[var(--color-border)] shadow-[4px_4px_0_0_var(--color-ink)] custom-scrollbar"
                      >
                        {catalogoResultados.map((prod, idx) => {
                          const isSelected = idx === indiceSeleccionado;
                          return (
                            <button
                              key={prod.id}
                              id={`catalogo-item-${idx}`}
                              type="button"
                              data-cambio-prod-item="true"
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={isSelected ? 0 : -1}
                              onClick={() => seleccionarProducto(prod)}
                              onMouseEnter={() => setIndiceSeleccionado(idx)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx < catalogoResultados.length - 1) {
                                    setIndiceSeleccionado(idx + 1);
                                    document.getElementById(`catalogo-item-${idx + 1}`)?.focus();
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) {
                                    setIndiceSeleccionado(idx - 1);
                                    document.getElementById(`catalogo-item-${idx - 1}`)?.focus();
                                  } else {
                                    document.getElementById('input-buscar-nuevo')?.focus();
                                  }
                                } else if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  seleccionarProducto(prod);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCatalogoResultados([]);
                                  document.getElementById('input-buscar-nuevo')?.focus();
                                }
                              }}
                              className={`w-full text-left p-3 text-xs flex justify-between items-center transition-all cursor-pointer border-b-2 border-[var(--color-border)] last:border-b-0 ${
                                isSelected
                                  ? 'bg-[var(--color-ink)] text-white shadow-inner ring-2 ring-inset ring-[var(--color-accent)] font-black'
                                  : 'bg-white hover:bg-slate-100 text-[var(--color-ink)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 border ${
                                  isSelected 
                                    ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' 
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <p className={`font-black uppercase truncate text-xs ${isSelected ? 'text-white' : 'text-[var(--color-ink)]'}`}>
                                    {prod.name}
                                  </p>
                                  <span className={`text-[10px] font-mono block ${isSelected ? 'text-slate-300' : 'text-[var(--color-muted)]'}`}>
                                    SKU: {prod.code || '---'} · Stock: {prod.quantity} {prod.controlaSeries ? '· 🔢 Serie/IMEI' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-black font-mono text-xs ${isSelected ? 'text-[var(--color-accent)] font-black' : 'text-emerald-700'}`}>
                                  S/ {prod.price.toFixed(2)}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-black uppercase bg-[var(--color-accent)] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0_0_black] flex items-center gap-1">
                                    [ENTER ⏎]
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* PRODUCTO NUEVO SELECCIONADO */}
                    {productoNuevo && (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black text-emerald-900 uppercase">Seleccionado:</span>
                            <p className="text-xs font-black uppercase text-emerald-950">{productoNuevo.name}</p>
                            <span className="text-[10px] text-gray-600">
                              Precio: S/ {productoNuevo.price.toFixed(2)} c/u · Stock Disp.: {productoNuevo.quantity}
                            </span>
                          </div>
                          <button
                            id="btn-cambiar-nuevo"
                            type="button"
                            onClick={() => {
                              setProductoNuevo(null);
                              setTimeout(() => document.getElementById('input-buscar-nuevo')?.focus(), 50);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('input-cantidad-nueva')?.focus();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                document.getElementById('input-buscar-nuevo')?.focus();
                              }
                            }}
                            className="text-[10px] font-black text-red-600 hover:underline focus:underline focus:bg-red-50 uppercase cursor-pointer"
                          >
                            Cambiar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200">
                          <div>
                            <label className="text-[10px] font-black uppercase text-emerald-900 block mb-1">
                              Cantidad a entregar:
                              {productoNuevo && (
                                <span className="ml-1 text-[9px] font-normal text-emerald-700 lowercase">
                                  (stock: {productoNuevo.quantity})
                                </span>
                              )}
                            </label>
                            <input
                              id="input-cantidad-nueva"
                              type="text"
                              inputMode="numeric"
                              value={cantidadNueva}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                setCantidadNueva(raw);
                              }}
                              onBlur={() => {
                                if (!cantidadNueva || Number(cantidadNueva) < 1) {
                                  setCantidadNueva('1');
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (document.getElementById('input-serie-nueva')) {
                                    document.getElementById('input-serie-nueva')?.focus();
                                  } else if (document.getElementById('btn-exacto-efectivo-cambio')) {
                                    document.getElementById('btn-exacto-efectivo-cambio')?.focus();
                                  } else if (document.getElementById('pago-cambio-efectivo')) {
                                    document.getElementById('pago-cambio-efectivo')?.focus();
                                  } else {
                                    document.getElementById('input-motivo-cambio')?.focus();
                                  }
                                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  document.getElementById('btn-cambiar-nuevo')?.focus();
                                }
                              }}
                              className="w-full bg-white border border-emerald-400 text-xs font-black p-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black uppercase text-emerald-900 block mb-1">
                              {productoNuevo.controlaSeries ? 'Nº Serie / IMEI Nuevo (Requerido):' : 'Nº Serie / IMEI (Opcional):'}
                            </label>
                            <input
                              id="input-serie-nueva"
                              type="text"
                              placeholder="Ej. SN-NEW-5491"
                              value={serieNueva}
                              onChange={(e) => setSerieNueva(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  document.getElementById('input-cantidad-nueva')?.focus();
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  document.getElementById('btn-cambiar-nuevo')?.focus();
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (document.getElementById('btn-exacto-efectivo-cambio')) {
                                    document.getElementById('btn-exacto-efectivo-cambio')?.focus();
                                  } else if (document.getElementById('pago-cambio-efectivo')) {
                                    document.getElementById('pago-cambio-efectivo')?.focus();
                                  } else {
                                    document.getElementById('input-motivo-cambio')?.focus();
                                  }
                                }
                              }}
                              className="w-full bg-white border border-emerald-400 text-xs font-mono p-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-emerald-200 text-xs font-black text-emerald-950">
                          <span>Valor nuevo producto:</span>
                          <span className="text-sm">S/ {totalNuevo.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 3: CÁLCULO DE DIFERENCIA Y CONFIRMACIÓN */}
              {itemDevuelto && productoNuevo && (
                <div className="border-2 border-[var(--color-ink)] bg-white p-3 shadow-[3px_3px_0_0_var(--color-ink)] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center text-[10px] font-black">3</span>
                    <span className="text-xs font-black uppercase text-[var(--color-ink)]">Balance y Cuadre de Caja</span>
                  </div>

                  <div className="p-3 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                       <span>Valor devuelto:</span>
                      <span className="font-black text-red-600">- S/ {totalDevuelto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Valor nuevo:</span>
                      <span className="font-black text-emerald-700">+ S/ {totalNuevo.toFixed(2)}</span>
                    </div>

                    <div className="border-t-2 border-black pt-2 flex justify-between items-center text-sm font-black">
                      <span>DIFERENCIA A LIQUIDAR:</span>
                      <span className={diferencia > 0 ? 'text-blue-700 text-base' : diferencia < 0 ? 'text-amber-700 text-base' : 'text-gray-700 text-base'}>
                        {diferencia > 0 && `+ S/ ${diferencia.toFixed(2)} (COBRAR)`}
                        {diferencia < 0 && `- S/ ${Math.abs(diferencia).toFixed(2)} (DEVOLVER)`}
                        {diferencia === 0 && 'S/ 0.00 (EXACTO)'}
                      </span>
                    </div>

                    {/* SI EL CLIENTE PAGA DIFERENCIA: PAGO MIXTO */}
                    {diferencia > 0 && (
                      <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-400 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)]">
                            Cobro de Diferencia (Permite Pago Mixto):
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            Efectivo, Yape o Tarjeta
                          </span>
                        </div>

                        {/* BOTONES DE PAGO EXACTO RÁPIDO */}
                        <div className="flex gap-2">
                          <button
                            id="btn-exacto-efectivo-cambio"
                            type="button"
                            onClick={() => pagoExacto('EFECTIVO')}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (document.getElementById('input-serie-nueva')) {
                                  document.getElementById('input-serie-nueva')?.focus();
                                } else {
                                  document.getElementById('input-cantidad-nueva')?.focus();
                                }
                              } else if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                document.getElementById('btn-exacto-yape-cambio')?.focus();
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('pago-cambio-efectivo')?.focus();
                              }
                            }}
                            className="flex-1 bg-white border-2 border-emerald-600 text-emerald-700 font-black text-[11px] uppercase py-1.5 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            💵 Todo Efectivo
                          </button>
                          <button
                            id="btn-exacto-yape-cambio"
                            type="button"
                            onClick={() => pagoExacto('YAPE')}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (document.getElementById('input-serie-nueva')) {
                                  document.getElementById('input-serie-nueva')?.focus();
                                } else {
                                  document.getElementById('input-cantidad-nueva')?.focus();
                                }
                              } else if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                document.getElementById('btn-exacto-efectivo-cambio')?.focus();
                              } else if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                document.getElementById('btn-exacto-tarjeta-cambio')?.focus();
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('pago-cambio-yape')?.focus();
                              }
                            }}
                            className="flex-1 bg-white border-2 border-purple-600 text-purple-700 font-black text-[11px] uppercase py-1.5 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            📱 Todo Yape
                          </button>
                          <button
                            id="btn-exacto-tarjeta-cambio"
                            type="button"
                            onClick={() => pagoExacto('TARJETA')}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (document.getElementById('input-serie-nueva')) {
                                  document.getElementById('input-serie-nueva')?.focus();
                                } else {
                                  document.getElementById('input-cantidad-nueva')?.focus();
                                }
                              } else if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                document.getElementById('btn-exacto-yape-cambio')?.focus();
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                document.getElementById('pago-cambio-tarjeta')?.focus();
                              }
                            }}
                            className="flex-1 bg-white border-2 border-blue-600 text-blue-700 font-black text-[11px] uppercase py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            💳 Todo Tarjeta
                          </button>
                        </div>

                        {/* 3 CASILLAS DE PAGO */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Efectivo */}
                          <div className="bg-white border-2 border-[var(--color-ink)] p-2 focus-within:ring-2 focus-within:ring-emerald-600">
                            <label htmlFor="pago-cambio-efectivo" className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-800 mb-1">
                              💵 Efectivo (S/)
                            </label>
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">S/</span>
                              <input
                                id="pago-cambio-efectivo"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={pagoEf}
                                onChange={(e) => setPagoEf(e.target.value.replace(/[^0-9.]/g, ''))}
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    document.getElementById('pago-cambio-yape')?.focus();
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    document.getElementById('btn-exacto-efectivo-cambio')?.focus();
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    document.getElementById('input-motivo-cambio')?.focus();
                                  }
                                }}
                                className="w-full bg-transparent pl-6 pr-1 py-1 text-sm font-black text-right outline-none text-[var(--color-ink)] focus:bg-emerald-50/50"
                              />
                            </div>
                          </div>

                          {/* Yape / Plin */}
                          <div className="bg-white border-2 border-[var(--color-ink)] p-2 focus-within:ring-2 focus-within:ring-purple-600">
                            <label htmlFor="pago-cambio-yape" className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-800 mb-1">
                              📱 Yape / Plin (S/)
                            </label>
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">S/</span>
                              <input
                                id="pago-cambio-yape"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={pagoYap}
                                onChange={(e) => setPagoYap(e.target.value.replace(/[^0-9.]/g, ''))}
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    document.getElementById('pago-cambio-efectivo')?.focus();
                                  } else if (e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    document.getElementById('pago-cambio-tarjeta')?.focus();
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    document.getElementById('btn-exacto-yape-cambio')?.focus();
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    document.getElementById('input-motivo-cambio')?.focus();
                                  }
                                }}
                                className="w-full bg-transparent pl-6 pr-1 py-1 text-sm font-black text-right outline-none text-[var(--color-ink)] focus:bg-purple-50/50"
                              />
                            </div>
                          </div>

                          {/* Tarjeta */}
                          <div className="bg-white border-2 border-[var(--color-ink)] p-2 focus-within:ring-2 focus-within:ring-blue-600">
                            <label htmlFor="pago-cambio-tarjeta" className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-800 mb-1">
                              💳 Tarjeta (S/)
                            </label>
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">S/</span>
                              <input
                                id="pago-cambio-tarjeta"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={pagoTar}
                                onChange={(e) => setPagoTar(e.target.value.replace(/[^0-9.]/g, ''))}
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    document.getElementById('pago-cambio-yape')?.focus();
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    document.getElementById('btn-exacto-tarjeta-cambio')?.focus();
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    document.getElementById('input-motivo-cambio')?.focus();
                                  }
                                }}
                                className="w-full bg-transparent pl-6 pr-1 py-1 text-sm font-black text-right outline-none text-[var(--color-ink)] focus:bg-blue-50/50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RESUMEN DE COBERTURA Y AVISOS */}
                        <div className="flex flex-wrap justify-between items-center text-xs p-2 bg-slate-100 border border-slate-300">
                          <span className="font-bold text-gray-700">Diferencia requerida: <b>S/ {diferencia.toFixed(2)}</b></span>
                          <span className="font-bold text-gray-700">Total cubierto: <b className={pagoValido ? 'text-emerald-700' : 'text-red-600'}>S/ {totalCubierto.toFixed(2)}</b></span>
                        </div>

                        {faltaCubrir > 0.009 && (
                          <p className="text-[11px] font-black text-amber-900 bg-amber-50 p-2 border border-amber-300 flex items-center gap-1.5">
                            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                            <span>Falta cubrir <b>S/ {faltaCubrir.toFixed(2)}</b> para liquidar la diferencia.</span>
                          </p>
                        )}

                        {sobrante > 0.009 && (
                          <p className="text-[11px] font-black text-red-900 bg-red-50 p-2 border border-red-300 flex items-center gap-1.5">
                            <AlertTriangle size={15} className="shrink-0 text-red-600" />
                            <span>El total ingresado supera la diferencia por <b>S/ {sobrante.toFixed(2)}</b>. Ajusta los montos.</span>
                          </p>
                        )}

                        {pagoValido && totalCubierto > 0 && (
                          <p className="text-[11px] font-black text-emerald-900 bg-emerald-50 p-2 border border-emerald-300 flex items-center gap-1.5">
                            <Check size={15} className="shrink-0 text-emerald-600" />
                            <span>Pago exacto: <b>{partesMetodo.length > 1 ? `Mixto (${partesMetodo.join(' + ')})` : partesMetodo[0] || 'Listo'}</b></span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* SI LA TIENDA DEVUELVE PLATA */}
                    {diferencia < 0 && (
                      <p className="mt-2 text-[11px] font-bold text-amber-900 bg-amber-50 p-2 border border-amber-200">
                        ⚠️ El negocio debe entregar <b>S/ {Math.abs(diferencia).toFixed(2)}</b> en efectivo al cliente. Se registrará como EGRESO en la caja.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-[var(--color-muted)] block mb-1">
                      Motivo del cambio (opcional):
                    </label>
                    <input
                      id="input-motivo-cambio"
                      type="text"
                      placeholder="Ej. Medida incorrecta, cliente prefirió otro modelo..."
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          document.getElementById('btn-confirmar-cambio')?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (document.getElementById('pago-cambio-efectivo')) {
                            document.getElementById('pago-cambio-efectivo')?.focus();
                          } else if (document.getElementById('input-serie-nueva')) {
                            document.getElementById('input-serie-nueva')?.focus();
                          } else {
                            document.getElementById('input-cantidad-nueva')?.focus();
                          }
                        }
                      }}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-ink)] text-xs p-2 focus:bg-white uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                    />
                  </div>

                  <button
                    id="btn-confirmar-cambio"
                    type="button"
                    disabled={!puedeConfirmar}
                    onClick={handleConfirmarCambio}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('btn-cancelar-cambio')?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-motivo-cambio')?.focus();
                      }
                    }}
                    className={`w-full font-black text-sm uppercase py-3 border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-black ${
                      !puedeConfirmar
                        ? 'bg-gray-300 text-gray-600 border-gray-400 shadow-none cursor-not-allowed opacity-60'
                        : 'bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black cursor-pointer'
                    }`}
                  >
                    <Check size={18} /> {guardando ? 'Procesando Cambio...' : 'Confirmar y Realizar Cambio'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* PIE */}
        {!cambioFinalizado && (
          <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex justify-end shrink-0">
            <button
              id="btn-cancelar-cambio"
              type="button"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (document.getElementById('btn-confirmar-cambio')) {
                    document.getElementById('btn-confirmar-cambio')?.focus();
                  } else {
                    document.getElementById('input-buscar-nuevo')?.focus();
                  }
                }
              }}
              className="bg-white text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white font-black text-xs uppercase px-4 py-2 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
            >
              Cancelar [ESC]
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
