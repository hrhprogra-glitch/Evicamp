import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import type { CartItem } from './types';
import type { Product } from '../Inventario/types';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
// Componentes modulares
import { TerminalBusqueda } from './components/TerminalBusqueda';
import { TicketVenta } from './components/TicketVenta';
import { ModalCobro } from './components/ModalCobro';
import { ModalBalanza } from './components/ModalBalanza';
import { ModalPrecioConsumo } from './components/ModalPrecioConsumo';
import { TicketImprimible } from './components/TicketImprimible';
export const POS: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
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
  // 6. PROCESAR EL PAGO FINAL (ACTUALIZADO CON SOPORTE PARA FIADOS)
  const handleConfirmPayment = async (
    pagos: { efectivo: number, yape: number, tarjeta: number },
    imprimirBoleta: boolean,
    fiadoData?: any // <-- RECIBE LOS DATOS DEL FIADO
  ) => {
    const totalVenta = cart.reduce((a, b) => a + b.subtotal, 0);
    const totalIngresado = pagos.efectivo + pagos.yape + pagos.tarjeta;
    
    let vuelto = 0;
    if (totalIngresado > totalVenta) {
      vuelto = totalIngresado - totalVenta;
    }

    // === GUARDADO REAL DE FIADO EN SUPABASE ===
    if (fiadoData) {
      const nuevoFiadoId = Date.now().toString();
      const fechaHoy = new Date().toISOString();

      const { error } = await supabase.from('fiados').insert([{
        id: nuevoFiadoId,
        customer_id: fiadoData.clienteId || null, // Se enlaza al cliente real
        customer_name: fiadoData.clienteNombre,
        amount: fiadoData.montoDeuda,
        paid_amount: 0,
        date_given: fechaHoy,
        expected_pay_date: fiadoData.fechaVencimiento,
        status: 'PENDIENTE',
        is_synced: '1'
      }]);

      if (error) {
        alert("Error de base de datos al guardar la deuda: " + error.message);
        return;
      }
      
      alert(`CRÉDITO REGISTRADO EN EL SISTEMA\n\nCliente: ${fiadoData.clienteNombre}\nDeuda: S/ ${fiadoData.montoDeuda.toFixed(2)}`);
    }

    // Si se exige imprimir, guardamos el snapshot del carrito
    if (imprimirBoleta) {
      setUltimaVenta({
        cart: [...cart],
        total: totalVenta,
        pagos: { efectivo: pagos.efectivo, yape: pagos.yape, tarjeta: pagos.tarjeta },
        vuelto: vuelto,
        nroBoleta: `B001-${Math.floor(Math.random() * 1000000).toString().padStart(8, '0')}`,
        fiadoData: fiadoData // <-- PASAMOS LA INFO DEL FIADO AL TICKET
      });

      setTimeout(() => {
        handlePrint();
      }, 100); 
    } else {
      if (!fiadoData) {
        alert(`Venta registrada.\nVuelto: S/ ${vuelto.toFixed(2)}`);
      }
    }

    // Limpiamos la caja
    setCart([]);
    setIsCobroModalOpen(false);
  };
  return (
    <div className="flex h-full w-full bg-transparent font-mono gap-6 relative z-0">
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
      {/* COMPONENTE DE IMPRESIÓN */}
      {ultimaVenta && (
        <TicketImprimible
          ref={componentRef}
          cart={ultimaVenta.cart}
          total={ultimaVenta.total}
          pagos={ultimaVenta.pagos}
          vuelto={ultimaVenta.vuelto}
          nroBoleta={ultimaVenta.nroBoleta}
          fiadoData={ultimaVenta.fiadoData} // <-- CONECTAMOS LA INFO AQUÍ
        />
      )}
    </div>
  );
};