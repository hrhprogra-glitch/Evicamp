import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import type { CartItem } from './types';
import type { Product } from '../Inventario/types';
import { useRef } from 'react';
import { Wallet, Printer, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
// Componentes modulares
import { TerminalBusqueda } from './components/TerminalBusqueda';
import { TicketVenta } from './components/TicketVenta';
import { ModalCobro } from './components/ModalCobro';
import { ModalBalanza } from './components/ModalBalanza';
import { ModalPrecioConsumo } from './components/ModalPrecioConsumo';
import { TicketImprimible } from './components/TicketImprimible';

export const POS: React.FC = () => {
  const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null);
const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
  // NUEVO: Estados para la impresión de la última boleta
  const [ultimaVenta, setUltimaVenta] = useState<any>(null);
  // NUEVO: SISTEMA DE TICKETS EN ESPERA (Múltiples Cajas)
  const [heldCarts, setHeldCarts] = useState<CartItem[][]>([]);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [isBalanzaModalOpen, setIsBalanzaModalOpen] = useState(false); // <-- NUEVO
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [isPrecioModalOpen, setIsPrecioModalOpen] = useState(false); // <-- NUEVO
  const [selectedConsumoProduct, setSelectedConsumoProduct] = useState<Product | null>(null); // <-- NUEVO
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, // <-- Corrección de arquitectura v3
    documentTitle: 'Boleta de Venta',
    onAfterPrint: () => console.log('Impresión finalizada'),
  });
  // 1. CARGAR PRODUCTOS AL ABRIR LA VENTANA
  useEffect(() => {
    const fetchProducts = async () => {
      // Bloqueo de Seguridad: Verificar Caja
      const { data: session } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').maybeSingle();
      setHasOpenSession(!!session);
      const { data } = await supabase.from('products').select('*');
      if (data) {
        const mapeados: Product[] = data.map((p: any) => ({
          id: p.id,
          name: p.name || 'SIN NOMBRE',
          price: Number(p.price) || 0,
          cost: Number(p.cost_price) || 0,
          quantity: Number(p.quantity) || 0,
          minStock: Number(p.min_stock) || 0,
          code: p.code || 'NO-SKU',
          barcode: p.barcode || '',
          category: p.category || 'GENERAL',
          // CORRECCIÓN ESTRATÉGICA: Interceptar 'CONSUMPTION' desde la BD
          unit: p.control_type === 'CONSUMPTION' ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
          control_type: p.control_type // Añadimos esto para validaciones estrictas
        }));
        setProductos(mapeados);
      }
    };
    fetchProducts();
  }, []);

  // 2. FUNCIÓN PARA DISPARAR PRODUCTOS AL CARRITO (CON BALANZA Y CONSUMO)
  const handleAddToCart = (producto: Product) => {
    // BLOQUEO DE SEGURIDAD: Solo consultar, no vender si está cerrado
    if (hasOpenSession === false) {
      alert("🔒 CAJA CERRADA: Modo Consulta activado. Ve a la pestaña de Finanzas y apertura la caja para poder vender.");
      return;
    }

    // Si el producto se vende por Kilo, abrir balanza
    if (producto.unit === 'KG') {
      setSelectedWeightProduct(producto);
      setIsBalanzaModalOpen(true);
      setSearchQuery('');
      return;
    }

    // NUEVO: Si es consumo, pedir el precio
    if (producto.unit === 'CONSUMO') {
      setSelectedConsumoProduct(producto);
      setIsPrecioModalOpen(true);
      setSearchQuery('');
      return;
    }

    // Flujo normal para unidades
    setCart(prevCart => {
      const existe = prevCart.find(item => item.id === producto.id);
      if (existe) {
        return prevCart.map(item => 
          item.id === producto.id 
            ? { ...item, cartQuantity: item.cartQuantity + 1, subtotal: (item.cartQuantity + 1) * item.price }
            : item
        );
      } else {
        return [{ ...producto, cartQuantity: 1, subtotal: producto.price }, ...prevCart];
      }
    });
    setSearchQuery(''); 
  };

  // 2.1 CONFIRMAR PESO DESDE LA BALANZA
  const handleConfirmWeight = (weight: number) => {
    if (!selectedWeightProduct) return;
    setCart(prevCart => {
      const existe = prevCart.find(item => item.id === selectedWeightProduct.id);
      if (existe) {
        const nuevaQty = existe.cartQuantity + weight;
        return prevCart.map(item => item.id === selectedWeightProduct.id ? { ...item, cartQuantity: nuevaQty, subtotal: nuevaQty * item.price } : item);
      } else {
        return [{ ...selectedWeightProduct, cartQuantity: weight, subtotal: weight * selectedWeightProduct.price }, ...prevCart];
      }
    });
    setSelectedWeightProduct(null);
  };

  // 2.2 CONFIRMAR PRECIO MANUAL (CONSUMO)
  // Reemplaza tu función handleConfirmPrecio (alrededor de la línea 81) con esta:
const handleConfirmPrecio = (precio: number, cantidad: number) => {
  if (!selectedConsumoProduct) return;
  
  setCart(prevCart => {
    const existe = prevCart.find(item => item.id === selectedConsumoProduct.id);
    if (existe) {
      // Sobrescribe el precio con el ingresado manualmente y suma la cantidad
      const nuevaQty = existe.cartQuantity + cantidad;
      return prevCart.map(item => 
        item.id === selectedConsumoProduct.id 
          ? { ...item, price: precio, cartQuantity: nuevaQty, subtotal: precio * nuevaQty } 
          : item
      );
    } else {
      // Agrega el nuevo ítem de consumo al ticket
      return [{ ...selectedConsumoProduct, cartQuantity: cantidad, price: precio, subtotal: precio * cantidad }, ...prevCart];
    }
  });
  
  // Limpia el estado y cierra el modal explícitamente
  setSelectedConsumoProduct(null);
  setIsPrecioModalOpen(false); 
};

  // 2.3 EDITAR PRECIO MANUALMENTE DESDE EL TICKET
  const updatePrice = (id: string, newPrice: number) => {
    setCart(cart.map(item => 
      item.id === id ? { ...item, price: newPrice, subtotal: newPrice * item.cartQuantity } : item
    ));
  };
  // 3. EDITAR CANTIDAD MANUALMENTE (+ / - o PESO)
  const updateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      // Si llega a 0, lo eliminamos del carrito
      setCart(cart.filter(item => item.id !== id));
      return;
    }
    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, cartQuantity: newQty, subtotal: newQty * item.price } 
        : item
    ));
  };
  // 4. NUEVO: PONER TICKET EN ESPERA (Guardar Caja)
  const holdCurrentCart = () => {
    if (cart.length > 0) {
      if (heldCarts.length >= 5) {
        alert("Límite máximo: Tienes 5 tickets en espera. Termina alguno antes de guardar otro.");
        return;
      }
      setHeldCarts([...heldCarts, cart]); // Guarda el carrito actual en la lista de espera
      setCart([]); // Deja la caja vacía y lista para el siguiente cliente
    }
  };

  // 5. NUEVO: RECUPERAR TICKET EN ESPERA
  const restoreCart = (index: number) => {
    const restored = heldCarts[index];
    const newHeld = heldCarts.filter((_, i) => i !== index);
    
    // Si la caja actual tenía cosas, la mandamos a espera para no perderla (Intercambio)
    if (cart.length > 0) {
      newHeld.push(cart);
    }
    
    setHeldCarts(newHeld);
    setCart(restored);
  };
  // 6. PROCESAR PAGO (GUARDA VENTA, REDUCE STOCK Y REGISTRA FIADOS)
  const handleConfirmPayment = async (
    pagos: { efectivo: number, yape: number, tarjeta: number },
    imprimirBoleta: boolean,
    fiadoData?: any 
  ) => {
    const totalVenta = cart.reduce((a, b) => a + b.subtotal, 0);
    const totalIngresado = pagos.efectivo + pagos.yape + pagos.tarjeta;
    
    let vuelto = 0;
    if (totalIngresado > totalVenta) {
      vuelto = totalIngresado - totalVenta;
    }

    // === 1. PREPARACIÓN DE ID DE VENTA (Generamos el ID primero para enlazar todo) ===
    let saleId = Date.now().toString(); 
    const { data: backupData } = await supabase
      .from('sales')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (backupData && backupData.length > 0 && backupData[0].id) {
      const match = String(backupData[0].id).match(/\d+/);
      if (match) saleId = (Number(match[0]) + 1).toString();
    }

    // === 2. GUARDADO DE FIADO EN SUPABASE ===
    if (fiadoData) {
      const { error: fiadoError } = await supabase.from('fiados').insert([{
        id: Date.now().toString(),
        sale_id: saleId, // 🛡️ ENLACE VITAL: Amarramos el fiado a su boleta para que Reportes lo pueda leer
        customer_id: fiadoData.clienteId ? Number(fiadoData.clienteId) : null,
        customer_name: fiadoData.clienteNombre,
        amount: Number(fiadoData.montoDeuda),
        paid_amount: 0,
        date_given: new Date().toISOString(),
        expected_pay_date: fiadoData.fechaVencimiento,
        status: 'PENDIENTE',
        is_synced: 1
      }]);
      if (fiadoError) { 
        alert(`Error al guardar deuda: ${fiadoError.message}`); 
        return; 
      }
    }

    // === 3. GUARDADO EN HISTORIAL DE VENTAS ===
    // 🛡️ PROTECCIÓN FINANCIERA: Si no entró dinero y hay deuda, es 'credito'. Si no, detecta el método.
    let tipoPago = 'efectivo';
    if (totalIngresado === 0 && fiadoData) tipoPago = 'credito';
    else if (pagos.yape > 0) tipoPago = 'yape';
    else if (pagos.tarjeta > 0) tipoPago = 'tarjeta';

    const { error: saleError } = await supabase
      .from('sales')
      .insert([{
        id: saleId,
        total: totalVenta,
        payment_type: tipoPago, // 🛡️ Finanzas ya no lo sumará si es 'credito'
        amount_cash: Math.max(0, pagos.efectivo - vuelto),
        amount_yape: pagos.yape,
        amount_card: pagos.tarjeta,
        amount_credit: fiadoData ? Number(fiadoData.montoDeuda) : 0, // 🛡️ Registramos lo que quedó debiendo
        sunat_status: 'ACEPTADO',
        created_at: new Date().toISOString(), 
        is_synced: 1 
      }]);

    if (saleError) {
      alert(`Error crítico al registrar la venta principal: ${saleError.message}`);
      return;
    }

    // === 4. GUARDADO DE DETALLES (LA BD SE ENCARGA DEL INVENTARIO Y LOTES) ===
    for (const item of cart) {
      const { error: detailError } = await supabase.from('sale_details').insert([{
        sale_id: saleId,
        product_id: item.id,
        product_name: item.name,
        quantity: Number(item.cartQuantity), 
        price_at_moment: Number(item.price), 
        subtotal: Number(item.subtotal),     
        cost_at_moment: Number(item.cost) || 0,
        is_synced: 1 
      }]);

      if (detailError) {
        console.error(`Fallo crítico al guardar detalle de ${item.name}: ${detailError.message}`);
        continue;
      }

      // 🛡️ INYECCIÓN REACTIVA: Refresca el stock visual sin chocar con la base de datos
      if (item.unit !== 'CONSUMO') {
        setProductos(prevProductos => 
          prevProductos.map(p => p.id === item.id ? { ...p, quantity: p.quantity - Number(item.cartQuantity) } : p)
        );
      }
    }

    // === 5. PROCESAR IMPRESIÓN Y LIMPIAR CAJA ===
    if (imprimirBoleta) {
      setUltimaVenta({
        cart: [...cart],
        total: totalVenta,
        pagos: { efectivo: pagos.efectivo, yape: pagos.yape, tarjeta: pagos.tarjeta },
        vuelto: vuelto,
        nroBoleta: `B001-${String(saleId).padStart(8, '0')}`,
        fiadoData: fiadoData 
      });
      // 🚀 ABRIMOS NUESTRO NUEVO MODAL EN LUGAR DE IMPRIMIR DIRECTO
      setIsVistaPreviaOpen(true);
    } else {
      alert(`✅ Venta completada con éxito.\nInventario descontado correctamente.\nVuelto: S/ ${vuelto.toFixed(2)}`);
    }

    setCart([]);
    setIsCobroModalOpen(false);
  };
  return (
    <div className={`flex h-full w-full bg-transparent font-mono gap-6 relative z-0 ${hasOpenSession === false ? 'pt-16' : ''}`}>
      
      {/* BARRA DE ADVERTENCIA - MODO CONSULTA */}
      {hasOpenSession === false && (
        <div className="absolute top-0 left-0 w-full bg-[#EF4444] text-white p-3 flex justify-center items-center gap-2 font-black text-xs uppercase tracking-[0.2em] z-50 shadow-[0_4px_0_0_#1E293B] border-b-2 border-[#1E293B]">
          <Wallet size={16} /> Caja Cerrada: Modo de solo consulta. Ve a Finanzas para aperturar la caja.
        </div>
      )}
      <TerminalBusqueda 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        productos={productos}
        onAddToCart={handleAddToCart}
      />
      <TicketVenta 
        cart={cart} 
        setCart={setCart} 
        updateQuantity={updateQuantity}
        updatePrice={updatePrice} // <-- AÑADIDO
        heldCarts={heldCarts}
        holdCurrentCart={holdCurrentCart}
        restoreCart={restoreCart}
        onPagar={() => setIsCobroModalOpen(true)} // <-- NUEVO
      />

      {/* MODAL BALANZA */}
      <ModalBalanza 
        isOpen={isBalanzaModalOpen}
        onClose={() => setIsBalanzaModalOpen(false)}
        product={selectedWeightProduct}
        onConfirm={handleConfirmWeight}
      />
      {/* Reemplaza <ModalPrecioManual ... /> por este bloque: */}
<ModalPrecioConsumo 
  isOpen={isPrecioModalOpen}
  onClose={() => {
    setIsPrecioModalOpen(false);
    setSelectedConsumoProduct(null);
  }}
  producto={selectedConsumoProduct}
  onConfirm={handleConfirmPrecio}
/>
      {/* MODAL DE COBRO */}
      <ModalCobro 
        isOpen={isCobroModalOpen}
        onClose={() => setIsCobroModalOpen(false)}
        cart={cart}
        total={cart.reduce((acc, item) => acc + item.subtotal, 0)}
        onConfirm={handleConfirmPayment}
      />
      {/* VISTA PREVIA DEL TICKET (NUEVO MODAL) */}
      {isVistaPreviaOpen && ultimaVenta && (
        <div className="fixed inset-0 bg-[#1E293B]/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1E293B] shadow-[8px_8px_0_0_#1E293B] flex flex-col max-h-[95vh] w-full max-w-md animate-fade-in">
            
            {/* CABECERA */}
            <div className="bg-[#3B82F6] text-white p-4 flex justify-between items-center border-b-2 border-[#1E293B] shrink-0">
              <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Printer size={18} /> Vista Previa del Ticket
              </h2>
              <button onClick={() => setIsVistaPreviaOpen(false)} className="hover:rotate-90 transition-transform cursor-pointer">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            {/* CONTENEDOR DEL TICKET (Fondo gris y zoom automático) */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] flex justify-center custom-scrollbar">
              {/* Le aplicamos un scale-110 para que en la PC se vea un poco más grande y nítido */}
              <div className="transform scale-110 origin-top pb-10">
                <TicketImprimible
                  ref={componentRef}
                  cart={ultimaVenta.cart}
                  total={ultimaVenta.total}
                  pagos={ultimaVenta.pagos}
                  vuelto={ultimaVenta.vuelto}
                  nroBoleta={ultimaVenta.nroBoleta}
                  fiadoData={ultimaVenta.fiadoData}
                />
              </div>
            </div>

            {/* BOTONES */}
            <div className="p-4 bg-white border-t-2 border-[#1E293B] flex gap-3 shrink-0">
              <button 
                onClick={() => setIsVistaPreviaOpen(false)} 
                className="flex-1 border-2 border-[#1E293B] bg-white text-[#1E293B] py-3 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer shadow-[4px_4px_0_0_#1E293B] active:translate-y-[4px] active:shadow-none"
              >
                Nueva Venta
              </button>
              <button 
                onClick={() => handlePrint()} 
                className="flex-1 border-2 border-[#1E293B] bg-[#10B981] text-[#1E293B] py-3 font-black text-xs uppercase tracking-widest hover:bg-[#059669] hover:text-white transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#1E293B] active:translate-y-[4px] active:shadow-none cursor-pointer"
              >
                <Printer size={18} /> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};